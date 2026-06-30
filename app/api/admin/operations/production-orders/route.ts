import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import {
  CreateProductionOrderSchema,
  getFirstValidationMessage,
} from "./production-orders.helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const productionOrders = await prisma.operationProductionOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            material: true,
          },
        },
        events: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    return NextResponse.json({ productionOrders });
  } catch (error) {
    console.error("[operations/production-orders] GET error:", error);
    return NextResponse.json(
      { error: "Error al listar ordenes de produccion" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const body = await req.json().catch(() => ({}));
  const parsed = CreateProductionOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: getFirstValidationMessage(parsed.error) },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const createdById = auth.session.user.id || null;
  const items = data.items || [];
  const outputType = data.outputType || data.productType || "";

  try {
    const productionOrder = await prisma.$transaction(async (tx) => {
      if (items.length > 0) {
        const materialIds = [...new Set(items.map((item) => item.materialId))];
        const existingMaterials = await tx.operationMaterial.findMany({
          where: { id: { in: materialIds } },
          select: { id: true },
        });

        if (existingMaterials.length !== materialIds.length) {
          throw new Error("INVALID_MATERIAL");
        }
      }

      return tx.operationProductionOrder.create({
        data: {
          code: data.code,
          title: data.title,
          status: data.status || "draft",
          plannedQuantity: data.plannedQuantity,
          producedQuantity: data.producedQuantity || 0,
          outputType,
          notes: data.notes || null,
          items: {
            create: items.map((item) => ({
              materialId: item.materialId,
              plannedQuantity: item.plannedQuantity,
              consumedQuantity: item.consumedQuantity || 0,
              unit: item.unit,
            })),
          },
          events: {
            create: {
              eventType: "CREATED",
              quantity: data.plannedQuantity,
              reason: "Orden de produccion creada",
              metadataJson: JSON.stringify({
                status: data.status || "draft",
                outputType,
                itemCount: items.length,
              }),
              createdById,
            },
          },
        },
        include: {
          items: {
            include: {
              material: true,
            },
          },
          events: {
            orderBy: { createdAt: "desc" },
          },
        },
      });
    });

    return NextResponse.json({ productionOrder }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_MATERIAL") {
      return NextResponse.json(
        { error: "Uno o mas materialId no existen" },
        { status: 400 }
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya existe una orden de produccion con ese code" },
        { status: 409 }
      );
    }

    console.error("[operations/production-orders] POST error:", error);
    return NextResponse.json(
      { error: "Error al crear orden de produccion" },
      { status: 500 }
    );
  }
}
