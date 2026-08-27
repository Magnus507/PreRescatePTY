import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import {
  FinishedGoodUnitActionSchema,
  getFirstValidationMessage,
  hasCompleteQaChecklist,
  normalizeQaChecklist,
} from "../../finished-good-units.helpers";
import { resolveCommercialOrderItemKey } from "@/app/api/admin/operations/commercial-orders/commercial-orders.helpers";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = FinishedGoodUnitActionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: getFirstValidationMessage(parsed.error) }, { status: 400 });

  const unit = await prisma.operationFinishedGoodUnit.findUnique({
    where: { id },
    select: {
      id: true,
      internalLabel: true,
      productCode: true,
      productType: true,
      status: true,
      qaStatus: true,
      activationStatus: true,
      reservedOrderId: true,
    },
  });
  if (!unit) return NextResponse.json({ error: "Unidad no encontrada" }, { status: 404 });

  try {
    const qaMetadata = (metadataJson: Record<string, unknown> | null) =>
      ({
        previousStatus: unit.status,
        checklist: metadataJson as Prisma.InputJsonValue | null,
      }) as Prisma.InputJsonValue;

    if (parsed.data.action === "qa_pass") {
      if (!["assembled", "qa_pending"].includes(unit.status)) {
        return NextResponse.json({ error: "La unidad no puede aprobarse desde este estado" }, { status: 400 });
      }
      if (unit.qaStatus && unit.qaStatus !== "pending") {
        return NextResponse.json({ error: "La unidad ya fue evaluada por QA" }, { status: 400 });
      }
      if (unit.activationStatus !== "not_activated") {
        return NextResponse.json({ error: "La unidad no puede aprobarse desde este estado de activacion" }, { status: 400 });
      }
      if (["reserved", "dispatched", "delivered", "activated", "cancelled", "discarded"].includes(unit.status)) {
        return NextResponse.json({ error: "La unidad no puede aprobarse desde este estado" }, { status: 400 });
      }

      const metadataJson = normalizeQaChecklist(parsed.data.metadataJson);
      if (!hasCompleteQaChecklist(metadataJson)) {
        return NextResponse.json(
          { error: "No se puede aprobar QA si todos los controles obligatorios no están completos." },
          { status: 400 }
        );
      }

      await prisma.operationFinishedGoodUnit.update({
        where: { id },
        data: {
          status: "available",
          qaStatus: "passed",
          events: {
            create: {
              eventType: "QA_PASSED",
              reason: parsed.data.reason || null,
              metadataJson: qaMetadata(metadataJson),
            },
          },
        },
      });
      return NextResponse.json({ ok: true });
    }

    if (parsed.data.action === "qa_fail") {
      if (!["assembled", "qa_pending"].includes(unit.status)) {
        return NextResponse.json({ error: "La unidad no puede rechazarse desde este estado" }, { status: 400 });
      }
      if (["reserved", "dispatched", "delivered", "activated", "cancelled", "discarded"].includes(unit.status)) {
        return NextResponse.json({ error: "La unidad no puede rechazarse desde este estado" }, { status: 400 });
      }
      const metadataJson = normalizeQaChecklist(parsed.data.metadataJson);
      if (!parsed.data.reason && !metadataJson) {
        return NextResponse.json({ error: "qa_fail requiere reason o metadataJson" }, { status: 400 });
      }
      await prisma.operationFinishedGoodUnit.update({
        where: { id },
        data: {
          status: "qa_failed",
          qaStatus: "failed",
          events: {
            create: {
              eventType: "QA_FAILED",
              reason: parsed.data.reason || null,
              metadataJson: qaMetadata(metadataJson),
            },
          },
        },
      });
      return NextResponse.json({ ok: true });
    }

    if (parsed.data.action === "send_to_rework") {
      if (unit.status !== "qa_failed") {
        return NextResponse.json({ error: "Solo se puede enviar a reproceso desde qa_failed" }, { status: 400 });
      }
      if (!parsed.data.reason) {
        return NextResponse.json({ error: "reason es requerido para enviar a reproceso" }, { status: 400 });
      }
      await prisma.operationFinishedGoodUnit.update({
        where: { id },
        data: {
          status: "qa_pending",
          qaStatus: "pending",
          events: {
            create: {
              eventType: "SEND_TO_REWORK",
              reason: parsed.data.reason,
              metadataJson: { previousStatus: unit.status },
            },
          },
        },
      });
      return NextResponse.json({ ok: true });
    }

    if (parsed.data.action === "reserve") {
      const referenceType = parsed.data.referenceType?.trim() || null;
      const referenceId = parsed.data.referenceId?.trim() || null;

      if (!referenceType) return NextResponse.json({ error: "referenceType es requerido para reservar" }, { status: 400 });
      if (!["commercial_order", "manual_reservation"].includes(referenceType)) {
        return NextResponse.json({ error: "referenceType invalido" }, { status: 400 });
      }
      if (referenceType === "commercial_order" && !referenceId) {
        return NextResponse.json({ error: "referenceId es requerido para commercial_order" }, { status: 400 });
      }

      if (referenceType === "commercial_order" && referenceId) {
        const commercialOrder = await prisma.operationCommercialOrder.findFirst({
          where: {
            OR: [
              { id: referenceId },
              { sourceId: referenceId },
            ],
          },
          include: {
            items: {
              include: {
                finishedGood: {
                  select: { code: true, productType: true },
                },
              },
            },
          },
        });

        if (!commercialOrder) {
          return NextResponse.json({ error: "Pedido comercial no encontrado para esta reserva" }, { status: 404 });
        }
        if (commercialOrder.customerType === "internal") {
          return NextResponse.json({ error: "La reposición interna no reserva unidades para un cliente" }, { status: 400 });
        }
        if (commercialOrder.dispatchId || commercialOrder.status === "cancelled" || commercialOrder.status === "rejected") {
          return NextResponse.json({ error: "El pedido ya no admite nuevas reservas" }, { status: 409 });
        }

        if (commercialOrder.sourceId) {
          const sourceOrder = await prisma.order.findUnique({
            where: { id: commercialOrder.sourceId },
            select: { paymentStatus: true, adminReviewStatus: true, orderStatus: true },
          });
          const paymentApproved = sourceOrder?.paymentStatus === "paid" || sourceOrder?.adminReviewStatus === "approved";
          if (!sourceOrder || !paymentApproved || ["cancelled", "completed"].includes(sourceOrder.orderStatus)) {
            return NextResponse.json({ error: "El pedido cliente no está listo para reservar inventario" }, { status: 409 });
          }
        } else if (commercialOrder.paymentStatus !== "paid") {
          return NextResponse.json({ error: "El pedido comercial no tiene pago aprobado" }, { status: 409 });
        }

        const matchingItems = commercialOrder.items.filter(
          (item) => resolveCommercialOrderItemKey(item) === unit.productCode
        );
        const requiredQuantity = matchingItems.reduce((sum, item) => sum + item.quantity, 0);
        if (requiredQuantity <= 0) {
          return NextResponse.json(
            { error: `La unidad ${unit.internalLabel} no corresponde a un producto solicitado en este pedido` },
            { status: 409 }
          );
        }

        const reservationOrderId = commercialOrder.sourceId || commercialOrder.id;
        const existingReserved = await prisma.operationFinishedGoodUnit.count({
          where: {
            reservedOrderId: reservationOrderId,
            productCode: unit.productCode,
            status: "reserved",
            dispatchItems: { none: {} },
          },
        });
        if (existingReserved >= requiredQuantity) {
          return NextResponse.json(
            { error: `El pedido ya tiene las ${requiredQuantity} unidades requeridas de ${unit.productCode}` },
            { status: 409 }
          );
        }

        const reserved = await prisma.$transaction(async (tx) => {
          const changed = await tx.operationFinishedGoodUnit.updateMany({
            where: {
              id: unit.id,
              productCode: unit.productCode,
              status: "available",
              qaStatus: "passed",
              activationStatus: "not_activated",
              reservedOrderId: null,
              dispatchItems: { none: {} },
            },
            data: {
              status: "reserved",
              reservedOrderId: reservationOrderId,
              reservedAt: new Date(),
            },
          });
          if (changed.count !== 1) throw new Error("UNIT_RESERVATION_CONFLICT");

          await tx.operationFinishedGoodUnitEvent.create({
            data: {
              unitId: unit.id,
              eventType: "RESERVED",
              reason: parsed.data.reason || null,
              referenceType: "commercial_order",
              referenceId: commercialOrder.id,
              metadataJson: {
                previousStatus: unit.status,
                commercialOrderId: commercialOrder.id,
                customerOrderId: commercialOrder.sourceId || null,
                reservationOrderId,
                productCode: unit.productCode,
                internalLabel: unit.internalLabel,
              },
            },
          });

          const nowReserved = existingReserved + 1;
          await tx.operationCommercialOrder.update({
            where: { id: commercialOrder.id },
            data: {
              status: nowReserved >= requiredQuantity ? "stock_reserved" : "pending_stock",
              fulfillmentStatus: "reserved",
            },
          });

          return true;
        });

        return NextResponse.json({
          ok: reserved,
          reservationOrderId,
          commercialOrderId: commercialOrder.id,
          customerOrderId: commercialOrder.sourceId || null,
          internalLabel: unit.internalLabel,
        });
      }

      if (unit.status !== "available" || unit.qaStatus !== "passed") {
        return NextResponse.json({ error: "Solo se puede reservar una unidad available con QA aprobado" }, { status: 400 });
      }
      if (unit.activationStatus !== "not_activated") {
        return NextResponse.json({ error: "La unidad ya fue activada" }, { status: 409 });
      }
      if (unit.reservedOrderId) {
        return NextResponse.json({ error: "La unidad ya tiene una reserva activa" }, { status: 409 });
      }

      await prisma.operationFinishedGoodUnit.update({
        where: { id },
        data: {
          status: "reserved",
          reservedOrderId: referenceId,
          reservedAt: new Date(),
          events: {
            create: {
              eventType: "RESERVED",
              reason: parsed.data.reason || null,
              referenceType,
              referenceId,
              metadataJson: { previousStatus: unit.status },
            },
          },
        },
      });
      return NextResponse.json({ ok: true });
    }

    if (parsed.data.action === "release") {
      if (unit.status !== "reserved") {
        return NextResponse.json({ error: "Solo se puede liberar una unidad reservada" }, { status: 400 });
      }
      await prisma.operationFinishedGoodUnit.update({
        where: { id },
        data: {
          status: "available",
          reservedOrderId: null,
          reservedAt: null,
          events: { create: { eventType: "RELEASED", reason: parsed.data.reason || null, metadataJson: { previousStatus: unit.status } } },
        },
      });
      return NextResponse.json({ ok: true });
    }

    if (parsed.data.action === "discard") {
      if (!["qa_failed", "qa_pending", "assembled"].includes(unit.status)) {
        return NextResponse.json({ error: "La unidad no puede descartarse desde este estado" }, { status: 400 });
      }
      if (!parsed.data.reason) {
        return NextResponse.json({ error: "reason es requerido para descartar" }, { status: 400 });
      }
      await prisma.operationFinishedGoodUnit.update({
        where: { id },
        data: {
          status: "discarded",
          events: { create: { eventType: "DISCARDED", reason: parsed.data.reason, metadataJson: { previousStatus: unit.status } } },
        },
      });
      return NextResponse.json({ ok: true });
    }

    if (parsed.data.action === "cancel") {
      if (["reserved", "dispatched", "delivered", "activated"].includes(unit.status)) {
        return NextResponse.json({ error: "No se puede cancelar una unidad comprometida" }, { status: 400 });
      }
      await prisma.operationFinishedGoodUnit.update({
        where: { id },
        data: {
          status: "cancelled",
          events: { create: { eventType: "CANCELLED", reason: parsed.data.reason || null, metadataJson: { previousStatus: unit.status } } },
        },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Accion no soportada" }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNIT_RESERVATION_CONFLICT") {
      return NextResponse.json({ error: "La unidad cambió de estado mientras se intentaba reservar. Actualiza e intenta de nuevo." }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({ error: "Error al actualizar unidad" }, { status: 500 });
    }
    console.error("[operations/finished-good-units/:id/events] POST error:", error);
    return NextResponse.json({ error: "Error al ejecutar evento de unidad" }, { status: 500 });
  }
}
