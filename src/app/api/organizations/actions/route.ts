import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !(session.user as any).accountId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const accountId = (session.user as any).accountId;
  const { action, data } = await req.json();

  try {
    switch (action) {
      case "add-member": {
        const { email, password, firstName, lastName, position, department } = data;

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
              department,
            }
          });
        }

        return NextResponse.json({ message: "Miembro añadido correctamente", userId: newUser.id });
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

        // Assign chip to profile
        await prisma.chip.update({
          where: { id: chipId },
          data: {
            assignedProfileId: member.profile.id,
            status: "activated",
            activatedAt: chip.activatedAt || new Date(),
            serviceStartDate: chip.serviceStartDate || new Date(),
            serviceEndDate: chip.serviceEndDate || new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 2), // 2 Years
            serviceStatus: "active"
          }
        });

        return NextResponse.json({ message: "Chip asignado correctamente" });
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
