import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import {
  CreateDigitalBatchSchema,
  buildInternalLabel,
  getFirstValidationMessage,
} from "./digital-batches.helpers";
import { buildProductionDigitalIdentity } from "@/lib/operations/digital-identity";

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

export async function GET() {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const batches = await prisma.operationDigitalBatch.findMany({
      orderBy: { createdAt: "desc" },
      include: { items: { select: itemSelect, orderBy: { sequenceNumber: "asc" } } },
    });

    return NextResponse.json({
      batches: batches.map((batch) => ({
        ...batch,
        consumedItems: batch.items.filter((item) => item.status === "consumed").length,
      })),
    });
  } catch (error) {
    console.error("[operations/digital-batches] GET error:", error);
    return NextResponse.json({ error: "Error al listar lotes digitales" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const body = await req.json().catch(() => ({}));
  const parsed = CreateDigitalBatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: getFirstValidationMessage(parsed.error) }, { status: 400 });
  }

  const data = parsed.data;
  if (data.endNumber < data.startNumber) {
    return NextResponse.json({ error: "endNumber debe ser mayor o igual a startNumber" }, { status: 400 });
  }

  try {
    const quantity = data.endNumber - data.startNumber + 1;
    const batch = await prisma.operationDigitalBatch.create({
      data: {
        code: data.code,
        name: data.name || null,
        productType: data.productType,
        finishedGoodCode: data.finishedGoodCode,
        prefix: data.prefix,
        startNumber: data.startNumber,
        endNumber: data.endNumber,
        quantity,
        status: "draft",
        notes: data.notes || null,
        items: {
          createMany: {
            data: Array.from({ length: quantity }, (_, index) => {
              const sequenceNumber = data.startNumber + index;
              const internalLabel = buildInternalLabel(data.prefix, sequenceNumber);
              const identity = buildProductionDigitalIdentity({ internalLabel });
              return {
                internalLabel,
                sequenceNumber,
                qrUrl: identity.qrImageUrl,
                nfcUrl: identity.nfcUrl,
                activationUrl: identity.activationUrl,
                shortCode: null,
                status: "available",
              };
            }),
          },
        },
      },
      include: { items: { select: itemSelect, orderBy: { sequenceNumber: "asc" } } },
    });

    await prisma.operationDigitalBatch.update({
      where: { id: batch.id },
      data: { status: "generated" },
    });

    return NextResponse.json({ batch: { ...batch, status: "generated" } }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un lote digital con ese code o label" }, { status: 409 });
    }

    console.error("[operations/digital-batches] POST error:", error);
    return NextResponse.json({ error: "Error al crear lote digital" }, { status: 500 });
  }
}
