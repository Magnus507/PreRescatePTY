import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { CreateReplacementSchema, getFirstValidationMessage } from "./replacements.helpers";

export const dynamic = "force-dynamic";

const warrantySelect = {
  id: true,
  code: true,
  status: true,
  coverageStatus: true,
  customerName: true,
  serialReference: true,
} as const;

const commercialOrderSelect = {
  id: true,
  code: true,
  status: true,
  customerName: true,
  customerEmail: true,
  customerPhone: true,
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

export const replacementInclude = {
  warranty: {
    select: warrantySelect,
  },
  commercialOrder: {
    select: commercialOrderSelect,
  },
  originalFinishedGood: {
    select: finishedGoodSelect,
  },
  replacementFinishedGood: {
    select: finishedGoodSelect,
  },
  originalDispatch: {
    select: dispatchSelect,
  },
  replacementDispatch: {
    select: dispatchSelect,
  },
  events: {
    orderBy: { createdAt: "desc" },
    take: 10,
  },
} as const;

async function assertRelationsExist(
  tx: Prisma.TransactionClient,
  data: {
    warrantyId?: string | null;
    commercialOrderId?: string | null;
    originalFinishedGoodId?: string | null;
    replacementFinishedGoodId?: string | null;
    originalDispatchId?: string | null;
    replacementDispatchId?: string | null;
  }
) {
  if (data.warrantyId) {
    const warranty = await tx.operationWarranty.findUnique({
      where: { id: data.warrantyId },
      select: { id: true },
    });

    if (!warranty) throw new Error("INVALID_WARRANTY");
  }

  if (data.commercialOrderId) {
    const commercialOrder = await tx.operationCommercialOrder.findUnique({
      where: { id: data.commercialOrderId },
      select: { id: true },
    });

    if (!commercialOrder) throw new Error("INVALID_COMMERCIAL_ORDER");
  }

  const finishedGoodIds = [
    data.originalFinishedGoodId,
    data.replacementFinishedGoodId,
  ].filter(Boolean) as string[];

  if (finishedGoodIds.length > 0) {
    const finishedGoods = await tx.operationFinishedGood.findMany({
      where: { id: { in: finishedGoodIds } },
      select: { id: true },
    });

    if (finishedGoods.length !== new Set(finishedGoodIds).size) {
      throw new Error("INVALID_FINISHED_GOOD");
    }
  }

  const dispatchIds = [
    data.originalDispatchId,
    data.replacementDispatchId,
  ].filter(Boolean) as string[];

  if (dispatchIds.length > 0) {
    const dispatches = await tx.operationDispatch.findMany({
      where: { id: { in: dispatchIds } },
      select: { id: true },
    });

    if (dispatches.length !== new Set(dispatchIds).size) {
      throw new Error("INVALID_DISPATCH");
    }
  }
}

function relationErrorResponse(error: Error) {
  if (error.message === "INVALID_WARRANTY") {
    return NextResponse.json({ error: "warrantyId no existe" }, { status: 400 });
  }

  if (error.message === "INVALID_COMMERCIAL_ORDER") {
    return NextResponse.json({ error: "commercialOrderId no existe" }, { status: 400 });
  }

  if (error.message === "INVALID_FINISHED_GOOD") {
    return NextResponse.json(
      { error: "Uno o mas finishedGoodId no existen" },
      { status: 400 }
    );
  }

  if (error.message === "INVALID_DISPATCH") {
    return NextResponse.json(
      { error: "Uno o mas dispatchId no existen" },
      { status: 400 }
    );
  }

  return null;
}

export async function GET() {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const replacements = await prisma.operationReplacement.findMany({
      orderBy: { createdAt: "desc" },
      include: replacementInclude,
    });

    return NextResponse.json({ replacements });
  } catch (error) {
    console.error("[operations/replacements] GET error:", error);
    return NextResponse.json(
      { error: "Error al listar reemplazos" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const body = await req.json().catch(() => ({}));
  const parsed = CreateReplacementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: getFirstValidationMessage(parsed.error) },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const createdById = auth.session.user.id || null;

  try {
    const replacement = await prisma.$transaction(async (tx) => {
      await assertRelationsExist(tx, data);

      return tx.operationReplacement.create({
        data: {
          code: data.code,
          status: data.status || "draft",
          replacementType: data.replacementType || "warranty",
          reason: data.reason || null,
          customerName: data.customerName || null,
          customerEmail: data.customerEmail || null,
          customerPhone: data.customerPhone || null,
          warrantyId: data.warrantyId || null,
          commercialOrderId: data.commercialOrderId || null,
          originalFinishedGoodId: data.originalFinishedGoodId || null,
          replacementFinishedGoodId: data.replacementFinishedGoodId || null,
          originalDispatchId: data.originalDispatchId || null,
          replacementDispatchId: data.replacementDispatchId || null,
          notes: data.notes || null,
          events: {
            create: {
              eventType: "CREATED",
              reason: data.reason || "Reemplazo creado",
              metadataJson: JSON.stringify({
                replacementType: data.replacementType || "warranty",
                warrantyId: data.warrantyId || null,
                commercialOrderId: data.commercialOrderId || null,
                replacementFinishedGoodId: data.replacementFinishedGoodId || null,
              }),
              createdById,
            },
          },
        },
        include: replacementInclude,
      });
    });

    return NextResponse.json({ replacement }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const response = relationErrorResponse(error);
      if (response) return response;
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya existe un reemplazo con ese code" },
        { status: 409 }
      );
    }

    console.error("[operations/replacements] POST error:", error);
    return NextResponse.json(
      { error: "Error al crear reemplazo" },
      { status: 500 }
    );
  }
}
