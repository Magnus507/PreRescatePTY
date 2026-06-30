import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import {
  CreateDispatchSchema,
  getFirstValidationMessage,
} from "./dispatches.helpers";

export const dynamic = "force-dynamic";

const finishedGoodSelect = {
  id: true,
  code: true,
  name: true,
  productType: true,
  status: true,
  unit: true,
} as const;

const dispatchInclude = {
  items: {
    include: {
      finishedGood: {
        select: finishedGoodSelect,
      },
    },
  },
  events: {
    orderBy: { createdAt: "desc" },
  },
} as const;

export async function GET() {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const dispatches = await prisma.operationDispatch.findMany({
      orderBy: { createdAt: "desc" },
      include: dispatchInclude,
    });

    return NextResponse.json({ dispatches });
  } catch (error) {
    console.error("[operations/dispatches] GET error:", error);
    return NextResponse.json(
      { error: "Error al listar despachos" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const body = await req.json().catch(() => ({}));
  const parsed = CreateDispatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: getFirstValidationMessage(parsed.error) },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const createdById = auth.session.user.id || null;
  const finishedGoodIds = [...new Set(data.items.map((item) => item.finishedGoodId))];

  try {
    const dispatch = await prisma.$transaction(async (tx) => {
      const finishedGoods = await tx.operationFinishedGood.findMany({
        where: { id: { in: finishedGoodIds } },
        select: { id: true },
      });

      if (finishedGoods.length !== finishedGoodIds.length) {
        throw new Error("INVALID_FINISHED_GOOD");
      }

      return tx.operationDispatch.create({
        data: {
          code: data.code,
          destinationType: data.destinationType || "customer",
          destinationName: data.destinationName || null,
          destinationReference: data.destinationReference || null,
          destinationAddress: data.destinationAddress || null,
          scheduledAt: data.scheduledAt || null,
          notes: data.notes || null,
          items: {
            create: data.items.map((item) => ({
              finishedGoodId: item.finishedGoodId,
              quantity: item.quantity,
              unit: item.unit,
              notes: item.notes || null,
            })),
          },
          events: {
            create: {
              eventType: "CREATED",
              reason: "Despacho creado",
              metadataJson: JSON.stringify({
                destinationType: data.destinationType || "customer",
                itemCount: data.items.length,
              }),
              createdById,
            },
          },
        },
        include: dispatchInclude,
      });
    });

    return NextResponse.json({ dispatch }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_FINISHED_GOOD") {
      return NextResponse.json(
        { error: "Uno o mas finishedGoodId no existen" },
        { status: 400 }
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya existe un despacho con ese code" },
        { status: 409 }
      );
    }

    console.error("[operations/dispatches] POST error:", error);
    return NextResponse.json(
      { error: "Error al crear despacho" },
      { status: 500 }
    );
  }
}
