import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { z } from "zod";

const CreatePointOfSaleSchema = z.object({
  name: z.string().min(1, "name es requerido"),
  address: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["admin", "superadmin"].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get("isActive");

    const where: Record<string, unknown> = {};
    if (isActive !== null) where.isActive = isActive === "true";

    const points = await prisma.pointOfSale.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { chips: true },
        },
      },
    });

    return NextResponse.json({ points });
  } catch (error) {
    console.error("[points-of-sale] GET error:", error);
    return NextResponse.json({ error: "Error al listar puntos de venta" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["admin", "superadmin"].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const adminId = session.user.id;

  const limiter = await rateLimit("admin-create-pos", adminId, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!limiter.allowed) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta nuevamente en un minuto." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = CreatePointOfSaleSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return NextResponse.json(
      { error: firstError?.message || "Datos inválidos" },
      { status: 400 }
    );
  }

  const { name, address, contactName, contactPhone } = parsed.data;

  try {
    const existing = await prisma.pointOfSale.findFirst({
      where: { name },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe un punto de venta con ese nombre" },
        { status: 409 }
      );
    }

    const point = await prisma.$transaction(async (tx) => {
      const created = await tx.pointOfSale.create({
        data: { name, address, contactName, contactPhone },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: adminId,
          entityType: "PointOfSale",
          entityId: created.id,
          action: "point_of_sale_created",
          oldValuesJson: null,
          newValuesJson: JSON.stringify({ name, address, contactName, contactPhone }),
        },
      });

      return created;
    });

    return NextResponse.json({ point }, { status: 201 });
  } catch (error) {
    console.error("[points-of-sale] POST error:", error);
    return NextResponse.json({ error: "Error al crear punto de venta" }, { status: 500 });
  }
}