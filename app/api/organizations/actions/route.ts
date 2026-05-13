import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountStateService } from "@/domains/accounts/services/account-state.service";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.accountId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = session.user.id;
  const accountId = session.user.accountId;
  const { action, data } = await req.json();

  try {
    switch (action) {
      case "add-member": {
        const { 
          email, password, firstName, lastName, position, 
          departmentId, locationId, employeeId, shift,
          occupationalRisks, medicalRestrictions, emergencyProtocol 
        } = data;

        // Quota check
        const state = await AccountStateService.getAccountState(userId);
        if (!state.canAddFamilyMember) {
           return NextResponse.json({ error: "Límite de miembros alcanzado. Contacta a soporte para aumentar tu cupo." }, { status: 403 });
        }

        // Check if user already exists
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return NextResponse.json({ error: "El email ya está registrado" }, { status: 400 });

        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user and link to account
        const newUser = await prisma.user.create({
          data: {
            email,
            passwordHash: hashedPassword,
            accountId,
            role: "member",
            status: "active",
            profile: {
              create: {
                firstName,
                lastName,
                accountId,
                bloodType: "Pendiente"
              }
            }
          },
          include: { profile: true }
        });

        // Add to organization members
        const org = await prisma.organization.findFirst({ where: { accountId } });
        if (org && newUser.profile) {
          await prisma.organizationMember.create({
            data: {
              organizationId: org.id,
              profileId: newUser.profile.id,
              position,
              departmentId: departmentId || null,
              locationId: locationId || null,
              employeeId,
              shift,
              occupationalRisks: occupationalRisks || [],
              medicalRestrictions,
              emergencyProtocol
            }
          });
        }

        return NextResponse.json({ message: "Miembro añadido correctamente", userId: newUser.id });
      }

      case "update-organization": {
        const org = await prisma.organization.findFirst({ where: { accountId } });
        if (!org) return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });

        await prisma.organization.update({
          where: { id: org.id },
          data: {
            displayName: data.displayName,
            organizationType: data.organizationType,
            emergencyButton1Label: data.emergencyButton1Label,
            emergencyButton1Phone: data.emergencyButton1Phone,
            emergencyButton2Label: data.emergencyButton2Label,
            emergencyButton2Phone: data.emergencyButton2Phone,
            emergencyButton3Label: data.emergencyButton3Label,
            emergencyButton3Phone: data.emergencyButton3Phone,
          }
        });

        return NextResponse.json({ message: "Configuración de empresa actualizada" });
      }

      case "reset-password": {
        const { userId, newPassword } = data;

        // Verify user belongs to same account
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.accountId !== accountId) {
          return NextResponse.json({ error: "Permiso denegado" }, { status: 403 });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
          where: { id: userId },
          data: { passwordHash: hashedPassword }
        });

        return NextResponse.json({ message: "Contraseña actualizada" });
      }

      case "assign-chip": {
        const { chipId, memberId } = data;

        // Verify chip and member belong to same account
        const chip = await prisma.chip.findUnique({ where: { id: chipId } });
        const member = await prisma.user.findUnique({ 
          where: { id: memberId },
          include: { profile: true } 
        });

        if (!chip || chip.accountId !== accountId || !member || member.accountId !== accountId) {
          return NextResponse.json({ error: "Chip o Miembro no válido para esta cuenta" }, { status: 400 });
        }

        if (!member.profile) return NextResponse.json({ error: "El miembro no tiene perfil médico" }, { status: 400 });

        // Assign chip to profile and set ownership so emergency notifications fire
        await prisma.chip.update({
          where: { id: chipId },
          data: {
            assignedProfileId: member.profile.id,
            ownerUserId: member.id,
            status: "activated",
            activatedAt: chip.activatedAt || new Date(),
            serviceStartDate: chip.serviceStartDate || new Date(),
            serviceEndDate: chip.serviceEndDate || new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 2), // 2 Years
            serviceStatus: "active"
          }
        });

        return NextResponse.json({ message: "Chip asignado correctamente" });
      }

      case "mass-assign-chips": {
        const { assignments } = data; // Array of { chipId, memberId }
        
        let successCount = 0;
        for (const assign of assignments) {
          const chip = await prisma.chip.findUnique({ where: { id: assign.chipId } });
          const member = await prisma.user.findUnique({ where: { id: assign.memberId }, include: { profile: true } });
          
          if (chip && member && chip.accountId === accountId && member.accountId === accountId && member.profile) {
            await prisma.chip.update({
              where: { id: assign.chipId },
              data: {
                assignedProfileId: member.profile.id,
                ownerUserId: member.id,
                status: "activated",
                activatedAt: chip.activatedAt || new Date(),
                serviceStartDate: chip.serviceStartDate || new Date(),
                serviceEndDate: chip.serviceEndDate || new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 2), // 2 Years
                serviceStatus: "active"
              }
            });
            successCount++;
          }
        }
        return NextResponse.json({ message: `Asignación masiva exitosa: ${successCount} chips asignados.` });
      }

      case "toggle-status": {
        const { userId, status } = data;

        // Verify user belongs to same account
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.accountId !== accountId) {
          return NextResponse.json({ error: "Permiso denegado" }, { status: 403 });
        }

        await prisma.user.update({
          where: { id: userId },
          data: { status }
        });

        return NextResponse.json({ message: `Estado actualizado a ${status}` });
      }

      default:
        return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in organization action:", error);
    return NextResponse.json({ error: "Error al procesar la acción" }, { status: 500 });
  }
}
