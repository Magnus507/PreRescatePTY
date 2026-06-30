import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { CreateReturnSchema, getFirstValidationMessage } from "./returns.helpers";

export const dynamic = "force-dynamic";

const warrantySelect = {
  id: true,
  code: true,
  status: true,
  coverageStatus: true,
  customerName: true,
} as const;

const replacementSelect = {
  id: true,
  code: true,
  status: true,
  replacementType: true,
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

export const returnInclude = {
  warranty: {
    select: warrantySelect,
  },
  replacement: {
    select: replacementSelect,
  },
  commercialOrder: {
    select: commercialOrderSelect,
  },
  finishedGood: {
    select: finishedGoodSelect,
  },
  originalDispatch: {
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
    replacementId?: string | null;
    commercialOrderId?: string | null;
    finishedGoodId?: string | null;
    originalDispatchId?: string | null;
  }
) {
  if (data.warrantyId) {
    const warranty = await tx.operationWarranty.findUnique({
      where: { id: data.warrantyId },
      select: { id: true },
    });
    if (!warranty) throw new Error("INVALID_WARRANTY");
  }

  if (data.replacementId) {
    const replacement = await tx.operationReplacement.findUnique({
      where: { id: data.replacementId },
      select: { id: true },
    });
    if (!replacement) throw new Error("INVALID_REPLACEMENT");
  }

  if (data.commercialOrderId) {
    const commercialOrder = await tx.operationCommercialOrder.findUnique({
      where: { id: data.commercialOrderId },
      select: { id: true },
    });
    if (!commercialOrder) throw new Error("INVALID_COMMERCIAL_ORDER");
  }

  if (data.finishedGoodId) {
    const finishedGood = await tx.operationFinishedGood.findUnique({
      where: { id: data.finishedGoodId },
      select: { id: true },
    });
    if (!finishedGood) throw new Error("INVALID_FINISHED_GOOD");
  }

  if (data.originalDispatchId) {
    const dispatch = await tx.operationDispatch.findUnique({
      where: { id: data.originalDispatchId },
      select: { id: true },
    });
    if (!dispatch) throw new Error("INVALID_DISPATCH");
  }
}

function relationErrorResponse(error: Error) {
  if (error.message === "INVALID_WARRANTY") {
    return NextResponse.json({ error: "warrantyId no existe" }, { status: 400 });
  }

  if (error.message === "INVALID_REPLACEMENT") {
    return NextResponse.json({ error: "replacementId no existe" }, { status: 400 });
  }

  if (error.message === "INVALID_COMMERCIAL_ORDER") {
    return NextResponse.json({ error: "commercialOrderId no existe" }, { status: 400 });
  }

  if (error.message === "INVALID_FINISHED_GOOD") {
    return NextResponse.json({ error: "finishedGoodId no existe" }, { status: 400 });
  }

  if (error.message === "INVALID_DISPATCH") {
    return NextResponse.json({ error: "originalDispatchId no existe" }, { status: 400 });
  }

  return null;
}

export async function GET() {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const returns = await prisma.operationReturn.findMany({
      orderBy: { createdAt: "desc" },
      include: returnInclude,
    });

    return NextResponse.json({ returns });
  } catch (error) {
    console.error("[operations/returns] GET error:", error);
    return NextResponse.json(
      { error: "Error al listar devoluciones" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const body = await req.json().catch(() => ({}));
  const parsed = CreateReturnSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: getFirstValidationMessage(parsed.error) },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const createdById = auth.session.user.id || null;

  try {
    const operationReturn = await prisma.$transaction(async (tx) => {
      await assertRelationsExist(tx, data);

      return tx.operationReturn.create({
        data: {
          code: data.code,
          status: data.status || "draft",
          returnType: data.returnType || "customer_return",
          reason: data.reason || null,
          resolution: data.resolution || null,
          customerName: data.customerName || null,
          customerEmail: data.customerEmail || null,
          customerPhone: data.customerPhone || null,
          warrantyId: data.warrantyId || null,
          replacementId: data.replacementId || null,
          commercialOrderId: data.commercialOrderId || null,
          finishedGoodId: data.finishedGoodId || null,
          originalDispatchId: data.originalDispatchId || null,
          notes: data.notes || null,
          events: {
            create: {
              eventType: "CREATED",
              reason: data.reason || "Devolucion creada",
              metadataJson: JSON.stringify({
                returnType: data.returnType || "customer_return",
                warrantyId: data.warrantyId || null,
                replacementId: data.replacementId || null,
                commercialOrderId: data.commercialOrderId || null,
                finishedGoodId: data.finishedGoodId || null,
              }),
              createdById,
            },
          },
        },
        include: returnInclude,
      });
    });

    return NextResponse.json({ return: operationReturn }, { status: 201 });
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
        { error: "Ya existe una devolucion con ese code" },
        { status: 409 }
      );
    }

    console.error("[operations/returns] POST error:", error);
    return NextResponse.json(
      { error: "Error al crear devolucion" },
      { status: 500 }
    );
  }
}
