import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { z } from "zod";
import { ORDER_REVIEW_ROLES, requireRole } from "@/lib/rbac";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";

const ConsignSchema = z.object({
  chipIds: z.array(z.string().min(1)).min(1, "chipIds debe contener al menos un chip"),
});

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(ORDER_REVIEW_ROLES);
  if (!auth.authorized) return auth.response;
  const adminId = auth.session.user.id;
  const requestId = getAuditRequestId(req);

  const limiter = await rateLimit("admin-consign", adminId, {
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
  const parsed = ConsignSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return NextResponse.json(
      { error: firstError?.message || "Datos inválidos" },
      { status: 400 }
    );
  }

  const { chipIds } = parsed.data;
  const uniqueChipIds = [...new Set(chipIds)];

  if (uniqueChipIds.length !== chipIds.length) {
    return NextResponse.json(
      { error: "chipIds contiene valores duplicados" },
      { status: 400 }
    );
  }

  const pos = await prisma.pointOfSale.findUnique({
    where: { id },
    select: { id: true, name: true, isActive: true },
  });

  if (!pos) {
    return NextResponse.json({ error: "Punto de venta no encontrado" }, { status: 404 });
  }

  if (!pos.isActive) {
    return NextResponse.json({ error: "El punto de venta está inactivo" }, { status: 400 });
  }

  const chips = await prisma.chip.findMany({
    where: { id: { in: uniqueChipIds } },
    select: { id: true, status: true, isPhysical: true, ownerUserId: true, assignedProfileId: true, pointOfSaleId: true },
  });

  if (chips.length !== uniqueChipIds.length) {
    return NextResponse.json({ error: "Uno o más chips no existen" }, { status: 400 });
  }

  const invalidChips: { id: string; reason: string }[] = [];
  for (const chip of chips) {
    if (chip.status !== "inventory") {
      invalidChips.push({ id: chip.id, reason: `status es "${chip.status}", debe ser "inventory"` });
    } else if (!chip.isPhysical) {
      invalidChips.push({ id: chip.id, reason: "chip digital, solo físicos pueden consignarse" });
    } else if (chip.ownerUserId !== null) {
      invalidChips.push({ id: chip.id, reason: "chip ya tiene propietario asignado" });
    } else if (chip.assignedProfileId !== null) {
      invalidChips.push({ id: chip.id, reason: "chip ya tiene perfil asignado" });
    } else if (chip.pointOfSaleId !== null) {
      invalidChips.push({ id: chip.id, reason: "chip ya está consignado en un punto de venta" });
    }
  }

  if (invalidChips.length > 0) {
    return NextResponse.json(
      { error: "Uno o más chips no pueden consignarse", details: invalidChips },
      { status: 400 }
    );
  }

  const now = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.chip.updateMany({
        where: { id: { in: uniqueChipIds } },
        data: { status: "consigned", pointOfSaleId: id, consignedAt: now },
      });

      await writeAuditLog(tx, {
        actorUserId: adminId,
        entityType: "point_of_sale",
        entityId: id,
        action: "point_of_sale.chips_consigned",
        requestId,
        after: { chipIds: uniqueChipIds, pointOfSaleName: pos.name },
      });
    });

    return NextResponse.json({
      ok: true,
      consigned: uniqueChipIds.length,
      pointOfSale: { id: pos.id, name: pos.name },
      chipIds: uniqueChipIds,
    });
  } catch (error) {
    console.error("[consign] Transaction error:", error);
    return NextResponse.json({ error: "Error al consignar chips" }, { status: 500 });
  }
}
