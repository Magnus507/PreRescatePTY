import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { validateRegister } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateRegister(body);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { email: emailLower, password, phone } = validation.data;

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email: emailLower },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Este email ya está registrado" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Find or create the "Básico" package
    let pkg = await prisma.package.findUnique({ where: { name: "Básico" } });
    if (!pkg) {
      pkg = await prisma.package.create({
        data: { name: "Básico", maxChips: 1, price: 20, isActive: true },
      });
    }

    // Create account + user in transaction
    const user = await prisma.$transaction(async (tx) => {
      const account = await tx.account.create({
        data: {
          accountType: "personal",
          accountName: emailLower,
          status: "active",
          packageId: pkg!.id,
          maxChipsAllocated: pkg!.maxChips,
        },
      });

      const newUser = await tx.user.create({
        data: {
          email: emailLower,
          phone: phone || null,
          passwordHash,
          accountId: account.id,
          role: "owner",
        },
      });

      // Set account owner
      await tx.account.update({
        where: { id: account.id },
        data: { ownerUserId: newUser.id },
      });

      // Create blank profile so the user can activate chips immediately
      await tx.profile.create({
        data: {
          userId: newUser.id,
          accountId: account.id,
          firstName: "",
          lastName: "",
          bloodType: "Pendiente",
        },
      });

      return newUser;
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        entityType: "user",
        entityId: user.id,
        action: "create",
        newValuesJson: JSON.stringify({ email: emailLower }),
      },
    });

    return NextResponse.json(
      { message: "Cuenta creada exitosamente", userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
