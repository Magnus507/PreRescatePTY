import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import {
  CreateReplacementEventSchema,
  getFirstValidationMessage,
} from "../../replacements.helpers";
import { replacementInclude } from "../../replacements.include";

export const dynamic = "force-dynamic";

const terminalStatuses = new Set(["completed", "cancelled", "rejected"]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = CreateReplacementEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: getFirstValidationMessage(parsed.error) },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const createdById = auth.session.user.id || null;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const replacement = await tx.operationReplacement.findUnique({
        where: { id },
        include: {
          replacementFinishedGood: {
            select: {
              id: true,
              code: true,
              name: true,
              unit: true,
            },
          },
          replacementDispatch: {
            select: {
              id: true,
              status: true,
            },
          },
          originalDispatch: {
            select: {
              id: true,
              destinationName: true,
              destinationReference: true,
              destinationAddress: true,
              notes: true,
            },
          },
          commercialOrder: {
            select: {
              id: true,
              code: true,
              sourceId: true,
            },
          },
          replacementUnit: {
            include: {
              dispatchItems: {
                select: { id: true, dispatchId: true },
              },
            },
          },
        },
      });

      if (!replacement) return null;
      if (terminalStatuses.has(replacement.status)) {
        throw new Error("TERMINAL_REPLACEMENT");
      }

      if (data.eventType === "DISPATCH_CREATED") {
        if (!replacement.replacementFinishedGoodId || !replacement.replacementFinishedGood) {
          throw new Error("MISSING_REPLACEMENT_FINISHED_GOOD");
        }
        if (!replacement.replacementUnitId || !replacement.replacementUnit) {
          throw new Error("MISSING_REPLACEMENT_UNIT");
        }
        if (replacement.replacementDispatchId || replacement.replacementDispatch) {
          throw new Error("REPLACEMENT_DISPATCH_EXISTS");
        }

        const unit = replacement.replacementUnit;
        if (unit.qaStatus !== "passed") throw new Error("REPLACEMENT_UNIT_QA_REQUIRED");
        if (unit.activationStatus !== "not_activated") throw new Error("REPLACEMENT_UNIT_ACTIVATED");
        if (!["available", "reserved"].includes(unit.status)) {
          throw new Error("REPLACEMENT_UNIT_NOT_AVAILABLE");
        }
        if (unit.dispatchItems.length > 0) throw new Error("REPLACEMENT_UNIT_ALREADY_DISPATCHED");
        if (unit.productCode !== replacement.replacementFinishedGood.code) {
          throw new Error("REPLACEMENT_PRODUCT_MISMATCH");
        }
      }

      if (data.eventType === "COMPLETED") {
        if (!replacement.replacementDispatch || replacement.replacementDispatch.status !== "delivered") {
          throw new Error("REPLACEMENT_NOT_DELIVERED");
        }
      }

      const event = await tx.operationReplacementEvent.create({
        data: {
          replacementId: id,
          eventType: data.eventType,
          reason: data.reason || null,
          referenceType: data.referenceType || null,
          referenceId: data.referenceId || null,
          metadataJson: data.metadataJson || null,
          createdById,
        },
      });

      const updateData: {
        status?: string;
        approvedAt?: Date;
        completedAt?: Date;
        cancelledAt?: Date;
        replacementDispatchId?: string;
      } = {};

      let dispatchCreatedId: string | null = null;

      if (data.eventType === "APPROVED") {
        updateData.status = "approved";
        updateData.approvedAt = new Date();
      } else if (data.eventType === "REJECTED") {
        updateData.status = "rejected";
      } else if (data.eventType === "REPLACEMENT_PREPARED") {
        updateData.status = "prepared";
      } else if (data.eventType === "DISPATCH_CREATED") {
        const unit = replacement.replacementUnit!;
        const customerOrderId = replacement.commercialOrder?.sourceId || null;
        const reservedAt = new Date();
        const dispatchCode = `${replacement.code}-DISPATCH`;

        const dispatch = await tx.operationDispatch.create({
          data: {
            code: dispatchCode,
            status: "pending_pick",
            destinationType: "customer",
            destinationName:
              replacement.customerName || replacement.originalDispatch?.destinationName || null,
            destinationReference:
              replacement.originalDispatch?.destinationReference || replacement.code,
            destinationAddress: replacement.originalDispatch?.destinationAddress || null,
            notes: data.reason || replacement.originalDispatch?.notes || `Reemplazo ${replacement.code}`,
            items: {
              create: {
                unitId: unit.id,
                internalLabel: unit.internalLabel,
                productCode: unit.productCode,
                productName: unit.productName,
                quantity: 1,
                unit: "unit",
                status: "pending_pick",
                notes: `Reemplazo ${replacement.code}`,
              },
            },
            events: {
              create: {
                eventType: "DISPATCH_CREATED",
                quantity: 1,
                reason: data.reason || `Despacho creado para reemplazo ${replacement.code}`,
                referenceType: "replacement",
                referenceId: replacement.id,
                metadataJson: JSON.stringify({
                  replacementId: replacement.id,
                  replacementCode: replacement.code,
                  replacementEventId: event.id,
                  replacementUnitId: unit.id,
                  internalLabel: unit.internalLabel,
                  customerOrderId,
                  commercialOrderId: replacement.commercialOrderId || null,
                }),
                createdById,
              },
            },
          },
          select: { id: true },
        });

        await tx.operationFinishedGoodUnit.update({
          where: { id: unit.id },
          data: {
            status: "reserved",
            reservedOrderId: customerOrderId,
            reservedAt,
          },
        });

        await tx.operationFinishedGoodUnitEvent.create({
          data: {
            unitId: unit.id,
            eventType: "UNIT_ASSIGNED_TO_REPLACEMENT_DISPATCH",
            reason: `Asignada a despacho ${dispatchCode}`,
            referenceType: "replacement",
            referenceId: replacement.id,
            metadataJson: {
              replacementId: replacement.id,
              dispatchId: dispatch.id,
              dispatchCode,
              customerOrderId,
            },
            createdById,
          },
        });

        updateData.status = "prepared";
        updateData.replacementDispatchId = dispatch.id;
        dispatchCreatedId = dispatch.id;
      } else if (data.eventType === "COMPLETED") {
        updateData.status = "completed";
        updateData.completedAt = new Date();
      } else if (data.eventType === "CANCELLED") {
        updateData.status = "cancelled";
        updateData.cancelledAt = new Date();
      }

      const updatedReplacement =
        Object.keys(updateData).length > 0
          ? await tx.operationReplacement.update({
              where: { id },
              data: updateData,
              include: replacementInclude,
            })
          : await tx.operationReplacement.findUnique({
              where: { id },
              include: replacementInclude,
            });

      return {
        event,
        replacement: updatedReplacement,
        dispatchCreatedId,
      };
    });

    if (!result) {
      return NextResponse.json({ error: "Reemplazo no encontrado" }, { status: 404 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const errors: Record<string, string> = {
      TERMINAL_REPLACEMENT: "El reemplazo ya está finalizado",
      MISSING_REPLACEMENT_FINISHED_GOOD: "Falta definir el producto de reemplazo",
      MISSING_REPLACEMENT_UNIT: "Selecciona una unidad física de reemplazo antes de crear el despacho",
      REPLACEMENT_DISPATCH_EXISTS: "El reemplazo ya tiene un despacho",
      REPLACEMENT_UNIT_QA_REQUIRED: "La unidad de reemplazo debe tener QA aprobado",
      REPLACEMENT_UNIT_ACTIVATED: "La unidad de reemplazo ya fue activada",
      REPLACEMENT_UNIT_NOT_AVAILABLE: "La unidad de reemplazo no está disponible",
      REPLACEMENT_UNIT_ALREADY_DISPATCHED: "La unidad de reemplazo ya pertenece a otro despacho",
      REPLACEMENT_PRODUCT_MISMATCH: "La unidad física no coincide con el producto de reemplazo",
      REPLACEMENT_NOT_DELIVERED: "El reemplazo solo puede completarse después de la entrega",
    };
    if (errors[message]) {
      return NextResponse.json({ error: errors[message] }, { status: 409 });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "No se pudo crear el despacho de reemplazo porque el código ya existe" },
        { status: 409 }
      );
    }

    console.error("[operations/replacements/:id/events] POST error:", error);
    return NextResponse.json(
      { error: "Error al actualizar reemplazo" },
      { status: 500 }
    );
  }
}
