import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { CreateWarrantySchema, getFirstValidationMessage } from "./warranties.helpers";

export const dynamic = "force-dynamic";

const commercialOrderSelect = {
  id: true,
  code: true,
  status: true,
  customerName: true,
  customerEmail: true,
  customerPhone: true,
  paymentStatus: true,
  fulfillmentStatus: true,
} as const;

const commercialOrderItemSelect = {
  id: true,
  productCode: true,
  productName: true,
  quantity: true,
  unit: true,
} as const;

const finishedGoodSelect = {
  id: true,
  code: true,
  name: true,
  productType: true,
  status: true,
  unit: true,
} as const;

const dispatchSelect = {
  id: true,
  code: true,
  status: true,
  destinationType: true,
  destinationName: true,
} as const;

const warrantyInclude = {
  commercialOrder: {
    select: commercialOrderSelect,
  },
  commercialOrderItem: {
    select: commercialOrderItemSelect,
  },
  finishedGood: {
    select: finishedGoodSelect,
  },
  dispatch: {
    select: dispatchSelect,
  },
  events: {
    orderBy: { createdAt: "desc" },
    take: 10,
  },
} as const;

export async function GET() {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const warranties = await prisma.operationWarranty.findMany({
      orderBy: { createdAt: "desc" },
      include: warrantyInclude,
    });

    return NextResponse.json({ warranties });
  } catch (error) {
    console.error("[operations/warranties] GET error:", error);
    return NextResponse.json(
      { error: "Error al listar garantias" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const body = await req.json().catch(() => ({}));
  const parsed = CreateWarrantySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: getFirstValidationMessage(parsed.error) },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const createdById = auth.session.user.id || null;

  try {
    const warranty = await prisma.$transaction(async (tx) => {
      if (data.commercialOrderId) {
        const commercialOrder = await tx.operationCommercialOrder.findUnique({
          where: { id: data.commercialOrderId },
          select: { id: true },
        });

        if (!commercialOrder) {
          throw new Error("INVALID_COMMERCIAL_ORDER");
        }
      }

      if (data.commercialOrderItemId) {
        const commercialOrderItem = await tx.operationCommercialOrderItem.findUnique({
          where: { id: data.commercialOrderItemId },
          select: { id: true, commercialOrderId: true },
        });

        if (!commercialOrderItem) {
          throw new Error("INVALID_COMMERCIAL_ORDER_ITEM");
        }

        if (
          data.commercialOrderId &&
          commercialOrderItem.commercialOrderId !== data.commercialOrderId
        ) {
          throw new Error("COMMERCIAL_ITEM_ORDER_MISMATCH");
        }
      }

      if (data.finishedGoodId) {
        const finishedGood = await tx.operationFinishedGood.findUnique({
          where: { id: data.finishedGoodId },
          select: { id: true },
        });

        if (!finishedGood) {
          throw new Error("INVALID_FINISHED_GOOD");
        }
      }

      if (data.dispatchId) {
        const dispatch = await tx.operationDispatch.findUnique({
          where: { id: data.dispatchId },
          select: { id: true },
        });

        if (!dispatch) {
          throw new Error("INVALID_DISPATCH");
        }
      }

      return tx.operationWarranty.create({
        data: {
          code: data.code,
          status: data.status || "active",
          warrantyType: data.warrantyType || "standard",
          coverageStatus: data.coverageStatus || "valid",
          startDate: data.startDate || null,
          endDate: data.endDate || null,
          customerName: data.customerName || null,
          customerEmail: data.customerEmail || null,
          customerPhone: data.customerPhone || null,
          serialReference: data.serialReference || null,
          commercialOrderId: data.commercialOrderId || null,
          commercialOrderItemId: data.commercialOrderItemId || null,
          finishedGoodId: data.finishedGoodId || null,
          dispatchId: data.dispatchId || null,
          notes: data.notes || null,
          events: {
            create: {
              eventType: "CREATED",
              reason: "Garantia creada",
              metadataJson: JSON.stringify({
                warrantyType: data.warrantyType || "standard",
                coverageStatus: data.coverageStatus || "valid",
                commercialOrderId: data.commercialOrderId || null,
                finishedGoodId: data.finishedGoodId || null,
                dispatchId: data.dispatchId || null,
              }),
              createdById,
            },
          },
        },
        include: warrantyInclude,
      });
    });

    return NextResponse.json({ warranty }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_COMMERCIAL_ORDER") {
      return NextResponse.json(
        { error: "commercialOrderId no existe" },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "INVALID_COMMERCIAL_ORDER_ITEM") {
      return NextResponse.json(
        { error: "commercialOrderItemId no existe" },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "COMMERCIAL_ITEM_ORDER_MISMATCH") {
      return NextResponse.json(
        { error: "commercialOrderItemId no pertenece a commercialOrderId" },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "INVALID_FINISHED_GOOD") {
      return NextResponse.json(
        { error: "finishedGoodId no existe" },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "INVALID_DISPATCH") {
      return NextResponse.json(
        { error: "dispatchId no existe" },
        { status: 400 }
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya existe una garantia con ese code" },
        { status: 409 }
      );
    }

    console.error("[operations/warranties] POST error:", error);
    return NextResponse.json(
      { error: "Error al crear garantia" },
      { status: 500 }
    );
  }
}
