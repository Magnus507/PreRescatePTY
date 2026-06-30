import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import {
  CreateFinishedGoodEventSchema,
  calculateFinishedGoodBalance,
  getFirstValidationMessage,
} from "../../finished-goods.helpers";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = CreateFinishedGoodEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: getFirstValidationMessage(parsed.error) },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const createdById = auth.session.user.id || null;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const finishedGood = await tx.operationFinishedGood.findUnique({
        where: { id },
        select: {
          id: true,
          unit: true,
        },
      });

      if (!finishedGood) {
        return null;
      }

      const event = await tx.operationFinishedGoodEvent.create({
        data: {
          finishedGoodId: id,
          eventType: data.eventType,
          quantity: data.quantity,
          unit: data.unit || finishedGood.unit,
          reason: data.reason || null,
          referenceType: data.referenceType || null,
          referenceId: data.referenceId || null,
          metadataJson: data.metadataJson || null,
          createdById,
        },
      });

      const events = await tx.operationFinishedGoodEvent.findMany({
        where: { finishedGoodId: id },
        select: {
          eventType: true,
          quantity: true,
        },
      });

      return {
        event,
        balance: calculateFinishedGoodBalance(events),
      };
    });

    if (!result) {
      return NextResponse.json(
        { error: "Producto terminado no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("[operations/finished-goods/:id/events] POST error:", error);
    return NextResponse.json(
      { error: "Error al crear evento de producto terminado" },
      { status: 500 }
    );
  }
}
