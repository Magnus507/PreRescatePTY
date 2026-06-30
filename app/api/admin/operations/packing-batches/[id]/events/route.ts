import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import {
  CreatePackingEventSchema,
  getFirstValidationMessage,
} from "../../packing-batches.helpers";

export const dynamic = "force-dynamic";

const terminalStatuses = new Set(["completed", "cancelled"]);

const productionOrderSelect = {
  id: true,
  code: true,
  title: true,
  status: true,
  plannedQuantity: true,
  producedQuantity: true,
  outputType: true,
} as const;

const qcInspectionSelect = {
  id: true,
  code: true,
  status: true,
  inspectionType: true,
  inspectedQuantity: true,
  passedQuantity: true,
  failedQuantity: true,
} as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = CreatePackingEventSchema.safeParse(body);
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
      const packingBatch = await tx.operationPackingBatch.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          packedQuantity: true,
          rejectedQuantity: true,
        },
      });

      if (!packingBatch) {
        return null;
      }

      if (terminalStatuses.has(packingBatch.status)) {
        throw new Error("TERMINAL_PACKING_BATCH");
      }

      const event = await tx.operationPackingEvent.create({
        data: {
          packingBatchId: id,
          eventType: data.eventType,
          quantity: data.quantity || null,
          reason: data.reason || null,
          metadataJson: data.metadataJson || null,
          createdById,
        },
      });

      const updateData: {
        status?: string;
        packedQuantity?: number;
        rejectedQuantity?: number;
      } = {};

      if (data.eventType === "STARTED") {
        updateData.status = "in_progress";
      } else if (data.eventType === "PACKED" && data.quantity) {
        updateData.packedQuantity = packingBatch.packedQuantity + data.quantity;
      } else if (data.eventType === "REJECTED" && data.quantity) {
        updateData.rejectedQuantity = packingBatch.rejectedQuantity + data.quantity;
      } else if (data.eventType === "COMPLETED") {
        updateData.status = "completed";
      } else if (data.eventType === "CANCELLED") {
        updateData.status = "cancelled";
      }

      const updatedBatch =
        Object.keys(updateData).length > 0
          ? await tx.operationPackingBatch.update({
              where: { id },
              data: updateData,
              include: {
                productionOrder: {
                  select: productionOrderSelect,
                },
                qcInspection: {
                  select: qcInspectionSelect,
                },
              },
            })
          : await tx.operationPackingBatch.findUnique({
              where: { id },
              include: {
                productionOrder: {
                  select: productionOrderSelect,
                },
                qcInspection: {
                  select: qcInspectionSelect,
                },
              },
            });

      return {
        event,
        packingBatch: updatedBatch,
      };
    });

    if (!result) {
      return NextResponse.json(
        { error: "Batch de empaque no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "TERMINAL_PACKING_BATCH") {
      return NextResponse.json(
        { error: "No se pueden registrar eventos sobre empaque completado o cancelado" },
        { status: 400 }
      );
    }

    console.error("[operations/packing-batches/:id/events] POST error:", error);
    return NextResponse.json(
      { error: "Error al crear evento de empaque" },
      { status: 500 }
    );
  }
}
