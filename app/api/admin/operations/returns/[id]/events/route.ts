import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import {
  CreateReturnEventSchema,
  getFirstValidationMessage,
} from "../../returns.helpers";
import { returnInclude } from "../../returns.include";

export const dynamic = "force-dynamic";

const terminalStatuses = new Set(["completed", "cancelled"]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = CreateReturnEventSchema.safeParse(body);
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
      const operationReturn = await tx.operationReturn.findUnique({
        where: { id },
        include: {
          finishedGood: {
            select: {
              id: true,
              code: true,
              unit: true,
            },
          },
        },
      });

      if (!operationReturn) {
        return null;
      }

      if (terminalStatuses.has(operationReturn.status)) {
        throw new Error("TERMINAL_RETURN");
      }

      if (
        ["RECEIVED", "ACCEPTED", "REJECTED", "RETURNED_TO_INVENTORY"].includes(data.eventType) &&
        !data.quantity
      ) {
        throw new Error("QUANTITY_REQUIRED");
      }

      if (data.eventType === "RETURNED_TO_INVENTORY" && !operationReturn.finishedGoodId) {
        throw new Error("MISSING_FINISHED_GOOD");
      }

      const event = await tx.operationReturnEvent.create({
        data: {
          returnId: id,
          eventType: data.eventType,
          quantity: data.quantity || null,
          reason: data.reason || null,
          referenceType: data.referenceType || null,
          referenceId: data.referenceId || null,
          metadataJson: data.metadataJson || null,
          createdById,
        },
      });

      let finishedGoodEventId: string | null = null;

      if (data.eventType === "RETURNED_TO_INVENTORY") {
        const finishedGoodEvent = await tx.operationFinishedGoodEvent.create({
          data: {
            finishedGoodId: operationReturn.finishedGoodId as string,
            eventType: "RETURN",
            quantity: data.quantity as number,
            unit: operationReturn.finishedGood?.unit || "unit",
            reason: data.reason || `Retorno por devolucion ${operationReturn.code}`,
            referenceType: "return",
            referenceId: operationReturn.id,
            metadataJson: JSON.stringify({
              returnCode: operationReturn.code,
              returnEventId: event.id,
              finishedGoodCode: operationReturn.finishedGood?.code || null,
            }),
            createdById,
          },
        });
        finishedGoodEventId = finishedGoodEvent.id;
      }

      const updateData: {
        status?: string;
        resolution?: string;
        receivedQuantity?: { increment: number };
        acceptedQuantity?: { increment: number };
        rejectedQuantity?: { increment: number };
        receivedAt?: Date;
        inspectedAt?: Date;
        completedAt?: Date;
        cancelledAt?: Date;
      } = {};

      if (data.eventType === "RECEIVED") {
        updateData.status = "received";
        updateData.receivedAt = new Date();
        updateData.receivedQuantity = { increment: data.quantity || 0 };
      } else if (data.eventType === "INSPECTED") {
        updateData.status = "inspected";
        updateData.inspectedAt = new Date();
      } else if (data.eventType === "ACCEPTED") {
        updateData.acceptedQuantity = { increment: data.quantity || 0 };
      } else if (data.eventType === "REJECTED") {
        updateData.rejectedQuantity = { increment: data.quantity || 0 };
      } else if (data.eventType === "RETURNED_TO_INVENTORY") {
        updateData.resolution = "returned_to_inventory";
      } else if (data.eventType === "DISCARDED") {
        updateData.status = "discarded";
        updateData.resolution = "discarded";
      } else if (data.eventType === "COMPLETED") {
        updateData.status = "completed";
        updateData.completedAt = new Date();
      } else if (data.eventType === "CANCELLED") {
        updateData.status = "cancelled";
        updateData.cancelledAt = new Date();
      }

      const updatedReturn =
        Object.keys(updateData).length > 0
          ? await tx.operationReturn.update({
              where: { id },
              data: updateData,
              include: returnInclude,
            })
          : await tx.operationReturn.findUnique({
              where: { id },
              include: returnInclude,
            });

      return {
        event,
        return: updatedReturn,
        finishedGoodEventId,
      };
    });

    if (!result) {
      return NextResponse.json(
        { error: "Devolucion no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "TERMINAL_RETURN") {
      return NextResponse.json(
        { error: "No se pueden registrar eventos sobre devoluciones completed o cancelled" },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "QUANTITY_REQUIRED") {
      return NextResponse.json(
        { error: "quantity positivo es requerido para este evento" },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "MISSING_FINISHED_GOOD") {
      return NextResponse.json(
        { error: "finishedGoodId es requerido para retornar a Inventario PT" },
        { status: 400 }
      );
    }

    console.error("[operations/returns/:id/events] POST error:", error);
    return NextResponse.json(
      { error: "Error al crear evento de devolucion" },
      { status: 500 }
    );
  }
}
