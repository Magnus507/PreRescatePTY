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
      if (unit.status !== "available" || unit.qaStatus !== "passed") {
        return NextResponse.json({ error: "Solo se puede reservar una unidad available" }, { status: 400 });
      }
      if (!referenceType) return NextResponse.json({ error: "referenceType es requerido para reservar" }, { status: 400 });
      if (!["commercial_order", "manual_reservation"].includes(referenceType)) {
        return NextResponse.json({ error: "referenceType invalido" }, { status: 400 });
      }
      if (referenceType === "commercial_order" && !referenceId) {
        return NextResponse.json({ error: "referenceId es requerido para commercial_order" }, { status: 400 });
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
          events: { create: { eventType: "RESERVED", reason: parsed.data.reason || null, referenceType, referenceId, metadataJson: { previousStatus: unit.status } } },
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
          events: { create: { eventType: "DISCARDED", reason: parsed.data.reason || null, metadataJson: { previousStatus: unit.status } } },
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
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({ error: "Error al actualizar unidad" }, { status: 500 });
    }
    console.error("[operations/finished-good-units/:id/events] POST error:", error);
    return NextResponse.json({ error: "Error al ejecutar evento de unidad" }, { status: 500 });
  }
}
