import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import {
  DigitalBatchActionSchema,
  UpdateDigitalBatchSchema,
  buildInternalLabel,
  buildInternalUrl,
  getFirstValidationMessage,
} from "../digital-batches.helpers";

export const dynamic = "force-dynamic";

const itemSelect = {
  id: true,
  internalLabel: true,
  sequenceNumber: true,
  qrUrl: true,
  nfcUrl: true,
  activationUrl: true,
  shortCode: true,
  status: true,
  consumedAt: true,
  consumedReferenceType: true,
  consumedReferenceId: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const batch = await prisma.operationDigitalBatch.findUnique({
      where: { id },
      include: { items: { select: itemSelect, orderBy: { sequenceNumber: "asc" } } },
    });

    if (!batch) {
      return NextResponse.json({ error: "Lote digital no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ batch });
  } catch (error) {
    console.error("[operations/digital-batches/:id] GET error:", error);
    return NextResponse.json({ error: "Error al cargar lote digital" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = UpdateDigitalBatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: getFirstValidationMessage(parsed.error) }, { status: 400 });
  }

  const data = parsed.data;

  try {
    const current = await prisma.operationDigitalBatch.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!current) {
      return NextResponse.json({ error: "Lote digital no encontrado" }, { status: 404 });
    }

    const batch = await prisma.operationDigitalBatch.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name || null } : {}),
        ...(data.productType !== undefined ? { productType: data.productType } : {}),
        ...(data.finishedGoodCode !== undefined ? { finishedGoodCode: data.finishedGoodCode } : {}),
        ...(data.prefix !== undefined ? { prefix: data.prefix } : {}),
        ...(data.startNumber !== undefined ? { startNumber: data.startNumber } : {}),
        ...(data.endNumber !== undefined ? { endNumber: data.endNumber } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
      },
    });

    return NextResponse.json({ batch });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un lote digital con esos datos" }, { status: 409 });
    }
    console.error("[operations/digital-batches/:id] PATCH error:", error);
    return NextResponse.json({ error: "Error al actualizar lote digital" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = DigitalBatchActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: getFirstValidationMessage(parsed.error) }, { status: 400 });
  }

  try {
    const batch = await prisma.operationDigitalBatch.findUnique({
      where: { id },
      include: { items: { select: itemSelect, orderBy: { sequenceNumber: "asc" } } },
    });

    if (!batch) {
      return NextResponse.json({ error: "Lote digital no encontrado" }, { status: 404 });
    }

    if (parsed.data.action === "generate_items") {
      if (batch.items.length > 0) {
        return NextResponse.json({ error: "El lote ya tiene unidades generadas" }, { status: 409 });
      }

      const quantity = batch.endNumber - batch.startNumber + 1;
      if (quantity <= 0) {
        return NextResponse.json({ error: "Rango invalido" }, { status: 400 });
      }

      await prisma.operationDigitalBatch.update({
        where: { id },
        data: {
          items: {
            createMany: {
              data: Array.from({ length: quantity }, (_, index) => {
                const sequenceNumber = batch.startNumber + index;
                const internalLabel = buildInternalLabel(batch.prefix, sequenceNumber);
                return {
                  internalLabel,
                  sequenceNumber,
                  qrUrl: buildInternalUrl("/digital-batches/qr", internalLabel),
                  nfcUrl: buildInternalUrl("/digital-batches/nfc", internalLabel),
                  activationUrl: buildInternalUrl("/activar", internalLabel),
                  status: "available",
                };
              }),
            },
          },
          status: "generated",
        },
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Accion no soportada" }, { status: 400 });
  } catch (error) {
    console.error("[operations/digital-batches/:id] POST action error:", error);
    return NextResponse.json({ error: "Error al ejecutar accion de lote digital" }, { status: 500 });
  }
}
