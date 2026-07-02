import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { buildInternalLabel } from "../../../digital-batches/digital-batches.helpers";
import { buildProductionDigitalIdentity } from "@/lib/operations/digital-identity";
import { generateUniqueDigitalShortCode } from "@/lib/operations/generate-digital-short-code";

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

      if (missingCount === 0) {
        return {
          productionOrder,
          createdItems: [],
          existingCount,
          targetQuantity,
          inconsistent: existingCount > targetQuantity,
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
      const requestOrigin = req.headers.get("origin");

      for (const item of productionOrder.digitalItems) {
        if (item.shortCode || item.status === "printed" || item.status === "assembled" || item.status === "packaged") {
          continue;
        }

        const shortCode = await generateUniqueDigitalShortCode();
        const identity = buildProductionDigitalIdentity({
          internalLabel: item.internalLabel,
          shortCode,
          requestOrigin,
        });

        await tx.operationDigitalBatchItem.update({
          where: { id: item.id },
          data: {
            shortCode,
            activationUrl: item.activationUrl || identity.activationFallbackUrl,
            qrUrl: identity.qrImageUrl || item.qrUrl || "",
            nfcUrl: identity.nfcUrl || item.nfcUrl,
          },
        });
      }

      for (let index = 0; index < missingCount; index += 1) {
        const sequenceNumber = nextSequenceNumber + index + 1;
        const internalLabel = buildInternalLabel(batch.prefix, sequenceNumber);
        const shortCode = await generateUniqueDigitalShortCode();
        const identity = buildProductionDigitalIdentity({
          internalLabel,
          shortCode,
          requestOrigin,
        });
        const created = await tx.operationDigitalBatchItem.create({
          data: {
            batchId: batch.id,
            productionOrderId,
            internalLabel,
            sequenceNumber,
            qrUrl: identity.qrImageUrl || "",
            nfcUrl: identity.nfcUrl,
            activationUrl: identity.activationFallbackUrl,
            shortCode,
            nfcProgrammed: false,
            qrPrepared: false,
            preparedAt,
            preparedBy: createdById,
            status: "generated",
          },
        });
        createdItems.push(created);
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
        existingCount,
        targetQuantity,
        inconsistent: false,
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
