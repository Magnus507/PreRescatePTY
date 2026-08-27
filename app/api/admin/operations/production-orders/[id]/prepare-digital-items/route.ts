import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { buildInternalLabel } from "../../../digital-batches/digital-batches.helpers";
import { ensureTraceableDigitalIdentity } from "@/lib/operations/traceable-digital-identity";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id: productionOrderId } = await params;
  const body = await req.json().catch(() => ({}));
  const requestedQuantity = Number(body?.quantity);

  try {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const productionOrder = await tx.operationProductionOrder.findUnique({
        where: { id: productionOrderId },
        include: {
          digitalItems: {
            orderBy: [{ createdAt: "asc" }, { internalLabel: "asc" }],
            include: {
              batch: true,
            },
          },
        },
      });

      if (!productionOrder) return null;

      const targetQuantity = Number.isFinite(requestedQuantity) && requestedQuantity > 0
        ? Math.floor(requestedQuantity)
        : Math.max(0, Math.floor(productionOrder.plannedQuantity));

      const existingCount = productionOrder.digitalItems.length;
      const missingCount = Math.max(targetQuantity - existingCount, 0);

      if (targetQuantity === 0 && existingCount === 0) {
        return {
          productionOrder,
          createdItems: [],
          identities: [],
          existingCount,
          targetQuantity,
          inconsistent: false,
        };
      }

      const existingBatch = productionOrder.digitalItems[0]?.batch || null;
      const batch =
        existingBatch ||
        (await tx.operationDigitalBatch.create({
          data: {
            code: `PROD-${productionOrder.code}-${productionOrder.id.slice(0, 8)}`,
            name: `Lote digital ${productionOrder.code}`,
            productType: productionOrder.outputType,
            finishedGoodCode: null,
            prefix: productionOrder.code.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 16) || "PROD",
            startNumber: 1,
            endNumber: Math.max(targetQuantity, 1),
            quantity: Math.max(targetQuantity, 1),
            status: "generated",
            notes: JSON.stringify({
              productionOrderId,
              source: "production-order-prepare-digital-items",
            }),
          },
        }));

      const nextSequenceNumber = productionOrder.digitalItems.reduce(
        (max, item) => Math.max(max, item.sequenceNumber),
        0
      );
      const preparedAt = new Date();
      const createdById = auth.session.user.id || null;
      const createdItems = [];
      const createdIdentities = [];
      const requestOrigin = req.headers.get("origin");

      for (const item of productionOrder.digitalItems) {
        const identity = await ensureTraceableDigitalIdentity(tx, {
          item,
          productType: productionOrder.outputType,
          requestOrigin,
          createdAt: preparedAt,
        });
        createdIdentities.push({
          digitalBatchItemId: item.id,
          chipId: identity.chip.id,
          shortCode: identity.chip.shortCode,
          activationCode: identity.activationCode,
          chipCreated: identity.chipCreated,
          activationCodeCreated: identity.activationCodeCreated,
        });
      }

      for (let index = 0; index < missingCount; index += 1) {
        const sequenceNumber = nextSequenceNumber + index + 1;
        const internalLabel = buildInternalLabel(batch.prefix, sequenceNumber);
        const created = await tx.operationDigitalBatchItem.create({
          data: {
            batchId: batch.id,
            productionOrderId,
            internalLabel,
            sequenceNumber,
            qrUrl: "",
            nfcUrl: null,
            activationUrl: null,
            shortCode: null,
            nfcProgrammed: false,
            qrPrepared: false,
            preparedAt,
            preparedBy: createdById,
            status: "generated",
          },
        });
        const identity = await ensureTraceableDigitalIdentity(tx, {
          item: created,
          productType: productionOrder.outputType,
          requestOrigin,
          createdAt: preparedAt,
        });
        createdItems.push(identity.item);
        createdIdentities.push({
          digitalBatchItemId: created.id,
          chipId: identity.chip.id,
          shortCode: identity.chip.shortCode,
          activationCode: identity.activationCode,
          chipCreated: identity.chipCreated,
          activationCodeCreated: identity.activationCodeCreated,
        });
      }

      if (existingBatch) {
        await tx.operationDigitalBatch.update({
          where: { id: existingBatch.id },
          data: {
            quantity: existingCount + missingCount,
            endNumber: Math.max(existingBatch.endNumber, existingBatch.startNumber + existingCount + missingCount - 1),
            status: existingBatch.status === "draft" ? "generated" : existingBatch.status,
          },
        });
      }

      await tx.operationProductionEvent.create({
        data: {
          productionOrderId,
          eventType: "DIGITAL_PREPARATION_CREATED",
          quantity: missingCount,
          reason: "Preparacion digital creada",
          metadataJson: JSON.stringify({
            productionOrderId,
            createdItemIds: createdItems.map((item) => item.id),
            createdChipIds: createdIdentities
              .filter((identity) => identity.chipCreated)
              .map((identity) => identity.chipId),
            batchId: batch.id,
          }),
          createdById,
        },
      });

      await tx.operationProductionOrder.update({
        where: { id: productionOrderId },
        data: {
          status: productionOrder.status === "draft" ? "planned" : productionOrder.status,
        },
      });

      const refreshed = await tx.operationProductionOrder.findUnique({
        where: { id: productionOrderId },
        include: {
          digitalItems: {
            orderBy: [{ createdAt: "asc" }, { internalLabel: "asc" }],
          },
        },
      });

      return {
        productionOrder: refreshed,
        createdItems,
        identities: createdIdentities,
        existingCount,
        targetQuantity,
        inconsistent: existingCount > targetQuantity,
      };
    });

    if (!result) {
      return NextResponse.json({ error: "Orden de produccion no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ preparation: result }, { status: 201 });
  } catch (error) {
    console.error("[operations/production-orders/:id/prepare-digital-items] POST error:", error);
    return NextResponse.json({ error: "Error al preparar recursos digitales" }, { status: 500 });
  }
}
