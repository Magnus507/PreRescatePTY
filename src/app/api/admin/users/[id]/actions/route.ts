import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Check if the current session is an admin
async function isAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return false;
  const role = (session.user as { role?: string }).role;
  return role === "admin" || role === "superadmin";
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = await params;
  
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { action, data } = body;

  try {
    switch (action) {
      case "reset-password": {
        const { password } = data;
        if (!password) {
          return NextResponse.json({ error: "Contraseña requerida" }, { status: 400 });
        }
        
        const passwordHash = await bcrypt.hash(password, 10);
        
        await prisma.user.update({
          where: { id: userId },
          data: { passwordHash },
        });
        
        return NextResponse.json({ message: "Contraseña actualizada exitosamente" });
      }

      case "convert-to-org": {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: { account: true, profile: true },
        });

        if (!user || !user.accountId) {
          return NextResponse.json({ error: "Usuario o cuenta no encontrada" }, { status: 404 });
        }

        // 1. Update Account Type to 'company'
        await prisma.account.update({
          where: { id: user.accountId },
          data: { 
            accountType: "company",
            accountName: data.legalName || `${user.profile?.firstName} ${user.profile?.lastName} Org`
          },
        });

        // 2. Create Organization record
        const organization = await prisma.organization.create({
          data: {
            accountId: user.accountId,
            legalName: data.legalName || `${user.profile?.firstName} ${user.profile?.lastName} Corp`,
            displayName: data.displayName || data.legalName || `${user.profile?.firstName} Corp`,
            organizationType: "company",
            status: "active",
            contactEmail: user.email,
            contactPhone: user.phone,
          },
        });

        return NextResponse.json({ 
          message: "Cuenta convertida a corporativa exitosamente", 
          organization 
        });
      }

      case "update-plan": {
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user || !user.accountId) {
          return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        const { packageId, maxChips } = data;
        
        await prisma.account.update({
          where: { id: user.accountId },
          data: {
            packageId: packageId || undefined,
            maxChipsAllocated: maxChips !== undefined ? parseInt(maxChips) : undefined,
          },
        });

        return NextResponse.json({ message: "Plan y límites actualizados correctamente" });
      }

      case "add-member": {
        const { email, password, role, phone, bloodType } = data;
        const targetOrgId = userId; // In this case 'userId' was used as orgId in the UI call

        const org = await prisma.organization.findUnique({
          where: { id: targetOrgId },
        });

        if (!org) {
          return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        
        const newUser = await prisma.user.create({
          data: {
            email,
            passwordHash,
            phone: phone || null,
            role: "user",
            status: "active",
            accountId: org.accountId,
            profile: {
              create: {
                firstName: "Nuevo",
                lastName: "Miembro",
                bloodType: "O+", // Default for new corporate members
              },
            },

          },
        });

        // If HR role, we could potentially set something else, but roles are mostly system-wide for now
        // Maybe add to a specific 'Member' table if we had one, but for now organization mapping is via accountId

        return NextResponse.json({ 
          message: "Miembro añadido exitosamente", 
          user: { id: newUser.id, email: newUser.email } 
        });
      }

      default:
        return NextResponse.json({ error: "Acción administrativa no reconocida" }, { status: 400 });
    }
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "El email ya está en uso" }, { status: 400 });
    }
    console.error("Admin Action Error:", error);
    return NextResponse.json({ 
      error: error.message || "Error interno al procesar la acción administrativa" 
    }, { status: 500 });
  }
}

