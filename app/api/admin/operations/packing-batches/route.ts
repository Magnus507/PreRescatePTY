import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import {
  CreatePackingBatchSchema,
  getFirstValidationMessage,
} from "./packing-batches.helpers";

export const dynamic = "force-dynamic";

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

export async function GET() {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const packingBatches = await prisma.operationPackingBatch.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        productionOrder: {
          select: productionOrderSelect,
        },
        qcInspection: {
          select: qcInspectionSelect,
        },
      },
    });

    return NextResponse.json({ packingBatches });
  } catch (error) {
    console.error("[operations/packing-batches] GET error:", error);
    return NextResponse.json(
      { error: "Error al listar batches de empaque" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const body = await req.json().catch(() => ({}));
  const parsed = CreatePackingBatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: getFirstValidationMessage(parsed.error) },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const createdById = auth.session.user.id || null;

  try {
    const packingBatch = await prisma.$transaction(async (tx) => {
      if (data.productionOrderId) {
        const productionOrder = await tx.operationProductionOrder.findUnique({
          where: { id: data.productionOrderId },
          select: { id: true },
        });

        if (!productionOrder) {
          throw new Error("INVALID_PRODUCTION_ORDER");
        }
      }

      if (data.qcInspectionId) {
        const qcInspection = await tx.operationQcInspection.findUnique({
          where: { id: data.qcInspectionId },
          select: { id: true, status: true },
        });

        if (!qcInspection) {
          throw new Error("INVALID_QC_INSPECTION");
        }

        if (qcInspection.status !== "completed" && qcInspection.status !== "rework_required") {
          throw new Error("INVALID_QC_STATUS");
        }
      }

      return tx.operationPackingBatch.create({
        data: {
          code: data.code,
          productionOrderId: data.productionOrderId || null,
          qcInspectionId: data.qcInspectionId || null,
          packageType: data.packageType || "standard",
          plannedQuantity: data.plannedQuantity || 0,
          labelCode: data.labelCode || null,
          notes: data.notes || null,
          events: {
            create: {
              eventType: "CREATED",
              reason: "Batch de empaque creado",
              metadataJson: JSON.stringify({
                productionOrderId: data.productionOrderId || null,
                qcInspectionId: data.qcInspectionId || null,
                packageType: data.packageType || "standard",
              }),
              createdById,
            },
          },
        },
        include: {
          productionOrder: {
            select: productionOrderSelect,
          },
          qcInspection: {
            select: qcInspectionSelect,
          },
          events: {
            orderBy: { createdAt: "desc" },
          },
        },
      });
    });

    return NextResponse.json({ packingBatch }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_PRODUCTION_ORDER") {
      return NextResponse.json(
        { error: "productionOrderId no existe" },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "INVALID_QC_INSPECTION") {
      return NextResponse.json(
        { error: "qcInspectionId no existe" },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "INVALID_QC_STATUS") {
      return NextResponse.json(
        { error: "QC debe estar completed o rework_required para empaque" },
        { status: 400 }
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya existe un batch de empaque con ese code" },
        { status: 409 }
      );
    }

    console.error("[operations/packing-batches] POST error:", error);
    return NextResponse.json(
      { error: "Error al crear batch de empaque" },
      { status: 500 }
    );
  }
}
