import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import {
  CreateFinishedGoodSchema,
  getFirstValidationMessage,
} from "./finished-goods.helpers";
import { loadInventoryStockRows } from "@/lib/operations/inventory-stock";

export const dynamic = "force-dynamic";

const packingBatchSelect = {
  id: true,
  code: true,
  status: true,
  packageType: true,
  plannedQuantity: true,
  packedQuantity: true,
  rejectedQuantity: true,
  labelCode: true,
} as const;

const balanceEventSelect = {
  eventType: true,
  quantity: true,
} as const;

export async function GET() {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const stockRows = await loadInventoryStockRows();
    const balanceByCode = new Map(stockRows.map((row) => [row.productCode, row.availableCount]));
    const finishedGoods = await prisma.operationFinishedGood.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        packingBatch: {
          select: packingBatchSelect,
        },
        events: {
          select: balanceEventSelect,
        },
      },
    });

    return NextResponse.json({
      finishedGoods: finishedGoods.map((finishedGood) => ({
        ...finishedGood,
        balance: balanceByCode.get(finishedGood.code) ?? 0,
      })),
    });
  } catch (error) {
    console.error("[operations/finished-goods] GET error:", error);
    return NextResponse.json(
      { error: "Error al listar producto terminado" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const body = await req.json().catch(() => ({}));
  const parsed = CreateFinishedGoodSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: getFirstValidationMessage(parsed.error) },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const createdById = auth.session.user.id || null;
  const unit = data.unit || "unit";

  try {
    const finishedGood = await prisma.$transaction(async (tx) => {
      if (data.packingBatchId) {
        const packingBatch = await tx.operationPackingBatch.findUnique({
          where: { id: data.packingBatchId },
          select: { id: true, status: true },
        });

        if (!packingBatch) {
          throw new Error("INVALID_PACKING_BATCH");
        }

        if (packingBatch.status !== "completed") {
          throw new Error("INVALID_PACKING_STATUS");
        }
      }

      return tx.operationFinishedGood.create({
        data: {
          code: data.code,
          name: data.name,
          productType: data.productType,
          status: data.status || "active",
          unit,
          packingBatchId: data.packingBatchId || null,
          notes: data.notes || null,
          events: data.initialQuantity
            ? {
                create: {
                  eventType: "RECEIPT",
                  quantity: data.initialQuantity,
                  unit,
                  reason: "Ingreso inicial de producto terminado",
                  referenceType: data.packingBatchId ? "packing_batch" : null,
                  referenceId: data.packingBatchId || null,
                  metadataJson: JSON.stringify({
                    source: "initialQuantity",
                    packingBatchId: data.packingBatchId || null,
                  }),
                  createdById,
                },
              }
            : undefined,
        },
        include: {
          packingBatch: {
            select: packingBatchSelect,
          },
          events: {
            orderBy: { createdAt: "desc" },
          },
        },
      });
    });

    return NextResponse.json(
      {
        finishedGood: {
          ...finishedGood,
          balance: (await loadInventoryStockRows()).find((row) => row.productCode === finishedGood.code)?.availableCount ?? 0,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_PACKING_BATCH") {
      return NextResponse.json(
        { error: "packingBatchId no existe" },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "INVALID_PACKING_STATUS") {
      return NextResponse.json(
        { error: "El batch de empaque debe estar completed para ingresar a Inventario PT" },
        { status: 400 }
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya existe un producto terminado con ese code" },
        { status: 409 }
      );
    }

    console.error("[operations/finished-goods] POST error:", error);
    return NextResponse.json(
      { error: "Error al crear producto terminado" },
      { status: 500 }
    );
  }
}
