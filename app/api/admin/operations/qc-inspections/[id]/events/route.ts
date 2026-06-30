import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import {
  CreateQcInspectionEventSchema,
  getFirstValidationMessage,
} from "../../qc-inspections.helpers";

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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = CreateQcInspectionEventSchema.safeParse(body);
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
      const qcInspection = await tx.operationQcInspection.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          inspectedQuantity: true,
          passedQuantity: true,
          failedQuantity: true,
        },
      });

      if (!qcInspection) {
        return null;
      }

      if (terminalStatuses.has(qcInspection.status)) {
        throw new Error("TERMINAL_QC_INSPECTION");
      }

      const passedQuantity =
        data.eventType === "PASSED" ? data.passedQuantity || data.quantity || 0 : data.passedQuantity || null;
      const failedQuantity =
        data.eventType === "FAILED" ? data.failedQuantity || data.quantity || 0 : data.failedQuantity || null;
      const quantity = data.quantity || passedQuantity || failedQuantity || null;

      const event = await tx.operationQcInspectionEvent.create({
        data: {
          qcInspectionId: id,
          eventType: data.eventType,
          quantity,
          passedQuantity,
          failedQuantity,
          reason: data.reason || null,
          metadataJson: data.metadataJson || null,
          createdById,
        },
      });

      const updateData: {
        status?: string;
        inspectedQuantity?: number;
        passedQuantity?: number;
        failedQuantity?: number;
      } = {};

      if (data.eventType === "STARTED") {
        updateData.status = "in_progress";
      } else if (data.eventType === "PASSED" && passedQuantity) {
        updateData.passedQuantity = qcInspection.passedQuantity + passedQuantity;
        updateData.inspectedQuantity = qcInspection.inspectedQuantity + passedQuantity;
      } else if (data.eventType === "FAILED" && failedQuantity) {
        updateData.failedQuantity = qcInspection.failedQuantity + failedQuantity;
        updateData.inspectedQuantity = qcInspection.inspectedQuantity + failedQuantity;
      } else if (data.eventType === "REWORK_REQUIRED") {
        updateData.status = "rework_required";
      } else if (data.eventType === "COMPLETED") {
        updateData.status = "completed";
      } else if (data.eventType === "CANCELLED") {
        updateData.status = "cancelled";
      }

      const updatedInspection =
        Object.keys(updateData).length > 0
          ? await tx.operationQcInspection.update({
              where: { id },
              data: updateData,
              include: {
                productionOrder: {
                  select: productionOrderSelect,
                },
              },
            })
          : await tx.operationQcInspection.findUnique({
              where: { id },
              include: {
                productionOrder: {
                  select: productionOrderSelect,
                },
              },
            });

      return {
        event,
        qcInspection: updatedInspection,
      };
    });

    if (!result) {
      return NextResponse.json(
        { error: "Inspeccion QC no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "TERMINAL_QC_INSPECTION") {
      return NextResponse.json(
        { error: "No se pueden registrar eventos sobre QC completada o cancelada" },
        { status: 400 }
      );
    }

    console.error("[operations/qc-inspections/:id/events] POST error:", error);
    return NextResponse.json(
      { error: "Error al crear evento QC" },
      { status: 500 }
    );
  }
}
