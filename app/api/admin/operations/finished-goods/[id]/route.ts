import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import {
  calculateFinishedGoodBalance,
  getFirstValidationMessage,
  UpdateFinishedGoodSchema,
} from "../finished-goods.helpers";
import { Prisma } from "@prisma/client";

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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const finishedGood = await prisma.operationFinishedGood.findUnique({
      where: { id },
      include: {
        packingBatch: {
          select: packingBatchSelect,
        },
        events: {
          orderBy: { createdAt: "desc" },
          include: {
            createdBy: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!finishedGood) {
      return NextResponse.json(
        { error: "Producto terminado no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      finishedGood: {
        ...finishedGood,
        balance: calculateFinishedGoodBalance(finishedGood.events),
      },
    });
  } catch (error) {
    console.error("[operations/finished-goods/:id] GET error:", error);
    return NextResponse.json(
      { error: "Error al cargar producto terminado" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = UpdateFinishedGoodSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: getFirstValidationMessage(parsed.error) },
      { status: 400 }
    );
  }

  const data = parsed.data;

  try {
    const finishedGood = await prisma.operationFinishedGood.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!finishedGood) {
      return NextResponse.json(
        { error: "Producto terminado no encontrado" },
        { status: 404 }
      );
    }

    const updatedFinishedGood = await prisma.operationFinishedGood.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.productType !== undefined ? { productType: data.productType } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.unit !== undefined ? { unit: data.unit } : {}),
        ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
      },
    });

    return NextResponse.json({ finishedGood: updatedFinishedGood });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya existe un producto terminado con ese code" },
        { status: 409 }
      );
    }

    console.error("[operations/finished-goods/:id] PATCH error:", error);
    return NextResponse.json(
      { error: "Error al actualizar producto terminado" },
      { status: 500 }
    );
  }
}
