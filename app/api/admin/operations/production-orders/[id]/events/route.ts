import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import {
  CreateProductionEventSchema,
  getFirstValidationMessage,
} from "../../production-orders.helpers";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = CreateProductionEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: getFirstValidationMessage(parsed.error) },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const createdById = auth.session.user.id || null;

  try {
    const event = await prisma.$transaction(async (tx) => {
      const productionOrder = await tx.operationProductionOrder.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!productionOrder) {
        return null;
      }

      return tx.operationProductionEvent.create({
        data: {
          productionOrderId: id,
          eventType: data.eventType,
          quantity: data.quantity || null,
          reason: data.reason || null,
          metadataJson: data.metadataJson || null,
          createdById,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      });
    });

    if (!event) {
      return NextResponse.json(
        { error: "Orden de produccion no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error("[operations/production-orders/:id/events] POST error:", error);
    return NextResponse.json(
      { error: "Error al crear evento de produccion" },
      { status: 500 }
    );
  }
}
