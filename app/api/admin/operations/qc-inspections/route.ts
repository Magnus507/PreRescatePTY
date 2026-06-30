import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import {
  CreateQcInspectionSchema,
  getFirstValidationMessage,
} from "./qc-inspections.helpers";

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

export async function GET() {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const qcInspections = await prisma.operationQcInspection.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        productionOrder: {
          select: productionOrderSelect,
        },
      },
    });

    return NextResponse.json({ qcInspections });
  } catch (error) {
    console.error("[operations/qc-inspections] GET error:", error);
    return NextResponse.json(
      { error: "Error al listar inspecciones QC" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const body = await req.json().catch(() => ({}));
  const parsed = CreateQcInspectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: getFirstValidationMessage(parsed.error) },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const createdById = auth.session.user.id || null;

  try {
    const qcInspection = await prisma.$transaction(async (tx) => {
      if (data.productionOrderId) {
        const productionOrder = await tx.operationProductionOrder.findUnique({
          where: { id: data.productionOrderId },
          select: { id: true, status: true },
        });

        if (!productionOrder) {
          throw new Error("INVALID_PRODUCTION_ORDER");
        }

        if (productionOrder.status === "cancelled") {
          throw new Error("CANCELLED_PRODUCTION_ORDER");
        }
      }

      return tx.operationQcInspection.create({
        data: {
          code: data.code,
          productionOrderId: data.productionOrderId || null,
          inspectionType: data.inspectionType || "standard",
          notes: data.notes || null,
          events: {
            create: {
              eventType: "CREATED",
              reason: "Inspeccion QC creada",
              metadataJson: JSON.stringify({
                productionOrderId: data.productionOrderId || null,
                inspectionType: data.inspectionType || "standard",
              }),
              createdById,
            },
          },
        },
        include: {
          productionOrder: {
            select: productionOrderSelect,
          },
          events: {
            orderBy: { createdAt: "desc" },
          },
        },
      });
    });

    return NextResponse.json({ qcInspection }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_PRODUCTION_ORDER") {
      return NextResponse.json(
        { error: "productionOrderId no existe" },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "CANCELLED_PRODUCTION_ORDER") {
      return NextResponse.json(
        { error: "No se puede crear QC sobre produccion cancelada" },
        { status: 400 }
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya existe una inspeccion QC con ese code" },
        { status: 409 }
      );
    }

    console.error("[operations/qc-inspections] POST error:", error);
    return NextResponse.json(
      { error: "Error al crear inspeccion QC" },
      { status: 500 }
    );
  }
}
