import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; preparationId: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id: productionOrderId, preparationId } = await params;

  try {
    const item = await prisma.operationDigitalBatchItem.findFirst({
      where: { id: preparationId, productionOrderId },
    });
    if (!item) {
      return NextResponse.json({ error: "Preparacion no encontrada" }, { status: 404 });
    }

    const updated = await prisma.operationDigitalBatchItem.update({
      where: { id: item.id },
      data: {
        nfcProgrammed: true,
        preparedAt: item.preparedAt || new Date(),
      },
    });

    await prisma.operationProductionEvent.create({
      data: {
        productionOrderId,
        eventType: "NFC_PROGRAMMED",
        quantity: 1,
        reason: "NFC programado para unidad de preparacion",
        metadataJson: JSON.stringify({ preparationId: item.id }),
        createdById: auth.session.user.id || null,
      },
    });

    return NextResponse.json({ item: updated });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "No se pudo actualizar la preparacion" }, { status: 409 });
    }

    console.error("[operations/production-orders/:id/unit-preparation/:preparationId/nfc-programmed] POST error:", error);
    return NextResponse.json({ error: "Error al marcar NFC programado" }, { status: 500 });
  }
}
