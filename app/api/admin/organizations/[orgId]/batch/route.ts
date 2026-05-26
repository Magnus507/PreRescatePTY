import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin" && session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { departmentName, quantity, emailPrefix, tempPassword } = await req.json();
    const { orgId } = await params;

    if (!departmentName || !quantity || quantity < 1 || quantity > 200) {
      return NextResponse.json({ error: "Departamento y cantidad válida (1-200) son requeridos" }, { status: 400 });
    }

    if (!tempPassword || tempPassword.length < 8) {
      return NextResponse.json({ error: "Contraseña temporal debe tener al menos 8 caracteres" }, { status: 400 });
    }

    // Verify organization exists
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { account: true }
    });

    if (!org) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    }

    const accountId = org.accountId;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create or find department (under a default location)
    let location = await prisma.organizationLocation.findFirst({
      where: { organizationId: orgId }
    });

    if (!location) {
      location = await prisma.organizationLocation.create({
        data: {
          organizationId: orgId,
          name: "Sede Principal",
          updatedAt: new Date()
        }
      });
    }

    let department = await prisma.organizationDepartment.findFirst({
      where: { locationId: location.id, name: departmentName }
    });

    if (!department) {
      department = await prisma.organizationDepartment.create({
        data: {
          locationId: location.id,
          name: departmentName,
          updatedAt: new Date()
        }
      });
    }

    // Generate slug from org name
    const orgSlug = org.legalName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
    const deptSlug = departmentName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
    const prefix = emailPrefix || `${deptSlug}`;

    // Create users in batch
    const createdMembers: { email: string; index: number }[] = [];

    const result = await prisma.$transaction(async (tx) => {
      for (let i = 1; i <= quantity; i++) {
        const paddedIndex = String(i).padStart(3, '0');
        const email = `${prefix}_${paddedIndex}@${orgSlug}.prerescue.id`;

        // Check if email already exists
        const existing = await tx.user.findUnique({ where: { email } });
        if (existing) continue;

        const user = await tx.user.create({
          data: {
            email,
            passwordHash: hashedPassword,
            accountId,
            role: "member",
            status: "active",
            profile: {
              create: {
                firstName: `${departmentName} #${paddedIndex}`,
                lastName: org.legalName,
                accountId,
                bloodType: "Pendiente"
              }
            }
          },
          include: { profile: true }
        });

        if (user.profile) {
          await tx.organizationMember.create({
            data: {
              organizationId: orgId,
              profileId: user.profile.id,
              departmentId: department!.id,
              locationId: location!.id,
              position: departmentName,
              memberStatus: "active"
            }
          });
        }

        createdMembers.push({ email, index: i });
      }

      // Update account limits to accommodate new members
      const totalMembers = await tx.user.count({ where: { accountId } });
      await tx.account.update({
        where: { id: accountId },
        data: {
          maxProfilesAllocated: Math.max(totalMembers + 10, org.account.maxProfilesAllocated || 0),
        }
      });

      return createdMembers;
    }, { timeout: 60000 }); // 60s for large batches

    return NextResponse.json({
      message: `Lote "${departmentName}" creado exitosamente con ${result.length} miembros.`,
      department: departmentName,
      membersCreated: result.length,
      emails: result.map(m => m.email),
      tempPassword
    }, { status: 201 });

  } catch (error: any) {
    console.error("Error creating batch:", error);
    return NextResponse.json({
      error: "Error al crear el lote",
      details: error?.message || String(error)
    }, { status: 500 });
  }
}
