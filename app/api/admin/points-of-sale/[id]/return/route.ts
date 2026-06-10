import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { z } from "zod";

const ReturnSchema = z.object({
  chipIds: z.array(z.string().min(1)).min(1, "chipIds debe contener al menos un chip"),
});

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["admin", "superadmin"].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const adminId = session.user.id;

  const limiter = await rateLimit("admin-return-pos", adminId, {
    limit: 20,
    windowMs: 60_000,
  });
  if (!limiter.allowed) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta nuevamente en un minuto." },
      { status: 429 }
    );
  }

  const { id } = await context.params;

  const body = await req.json().catch(() => ({}));
  const parsed = ReturnSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return NextResponse.json(
      { error: firstError?.message || "Datos inválidos" },
      { status: 400 }
    );
  }

  const { chipIds } = parsed.data;
  const uniqueChipIds = [...new Set(chipIds)];

  const pos = await prisma.pointOfSale.findUnique({
    where: { id },
    select: { id: true, name: true },
  });

  if (!pos) {
    return NextResponse.json({ error: "Punto de venta no encontrado" }, { status: 404 });
  }

  const chips = await prisma.chip.findMany({
    where: { id: { in: uniqueChipIds } },
    select: { id: true, status: true, pointOfSaleId: true, ownerUserId: true, assignedProfileId: true },
  });

  if (chips.length !== uniqueChipIds.length) {
    return NextResponse.json({ error: "Uno o más chips no existen" }, { status: 400 });
  }

  const invalidChips: { id: string; reason: string }[] = [];
  for (const chip of chips) {
    if (chip.status !== "consigned") {
      invalidChips.push({ id: chip.id, reason: `status es "${chip.status}", debe ser "consigned"` });
    } else if (chip.pointOfSaleId !== id) {
      invalidChips.push({ id: chip.id, reason: "chip no pertenece a este punto de venta" });
    } else if (chip.ownerUserId !== null) {
      invalidChips.push({ id: chip.id, reason: "chip tiene propietario asignado" });
    } else if (chip.assignedProfileId !== null) {
      invalidChips.push({ id: chip.id, reason: "chip tiene perfil asignado" });
    }
  }

  if (invalidChips.length > 0) {
    return NextResponse.json(
      { error: "Uno o más chips no pueden devolverse", details: invalidChips },
      { status: 400 }
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.chip.updateMany({
        where: { id: { in: uniqueChipIds } },
        data: { status: "inventory", pointOfSaleId: null, consignedAt: null },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: adminId,
          entityType: "PointOfSale",
          entityId: id,
          action: "chips_returned_from_consignment",
          oldValuesJson: null,
          newValuesJson: JSON.stringify({ chipIds: uniqueChipIds, pointOfSaleName: pos.name }),
        },
      });
    });

    return NextResponse.json({
      ok: true,
      returned: uniqueChipIds.length,
      pointOfSale: { id: pos.id, name: pos.name },
      chipIds: uniqueChipIds,
    });
  } catch (error) {
    console.error("[return] Transaction error:", error);
    return NextResponse.json({ error: "Error al devolver chips" }, { status: 500 });
  }
}