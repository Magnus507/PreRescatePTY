import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { calculateFinishedGoodBalance } from "../../../finished-goods/finished-goods.helpers";
import {
  CreateDispatchEventSchema,
  getFirstValidationMessage,
} from "../../dispatches.helpers";

export const dynamic = "force-dynamic";

const terminalStatuses = new Set(["delivered", "cancelled"]);

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

function getRequiredQuantities(
  items: Array<{ finishedGoodId: string | null; quantity: number }>
) {
  return items.reduce((acc, item) => {
    if (!item.finishedGoodId) return acc;
    acc.set(item.finishedGoodId, (acc.get(item.finishedGoodId) || 0) + item.quantity);
    return acc;
  }, new Map<string, number>());
}

function hasUnitItems(items: Array<{ unitId: string | null }>) {
  return items.some((item) => Boolean(item.unitId));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = CreateDispatchEventSchema.safeParse(body);
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
      const dispatch = await tx.operationDispatch.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              finishedGood: {
                select: finishedGoodSelect,
              },
            },
          },
        },
      });

      if (!dispatch) {
        return null;
      }

      if (terminalStatuses.has(dispatch.status)) {
        throw new Error("TERMINAL_DISPATCH");
      }

      if (data.eventType === "RESERVED" && dispatch.status !== "draft" && dispatch.status !== "released") {
        throw new Error("INVALID_STATUS_RESERVED");
      }

      if (data.eventType === "RELEASED" && dispatch.status !== "reserved") {
        throw new Error("INVALID_STATUS_RELEASED");
      }

      if (data.eventType === "PICKED" && !["pending_pick", "draft", "reserved"].includes(dispatch.status)) {
        throw new Error("INVALID_STATUS_PICKED");
      }

      if (
        data.eventType === "DISPATCHED" &&
        !["draft", "released", "reserved", "pending_pick", "picked", "packed"].includes(dispatch.status)
      ) {
        throw new Error("INVALID_STATUS_DISPATCHED");
      }

      if (data.eventType === "DELIVERED" && dispatch.status !== "dispatched") {
        throw new Error("INVALID_STATUS_DELIVERED");
      }

      const totalQuantity = dispatch.items.reduce((sum, item) => sum + item.quantity, 0);
      const event = await tx.operationDispatchEvent.create({
        data: {
          dispatchId: id,
          eventType: data.eventType,
          quantity: data.quantity || totalQuantity || null,
          reason: data.reason || null,
          referenceType: data.referenceType || null,
          referenceId: data.referenceId || null,
          metadataJson: data.metadataJson || null,
          createdById,
        },
      });

      const requiredQuantities = getRequiredQuantities(dispatch.items);
      const finishedGoodIds = [...requiredQuantities.keys()];

      const unitMode = hasUnitItems(dispatch.items);

      if (!unitMode && (data.eventType === "RESERVED" || data.eventType === "DISPATCHED")) {
        const existingEvents = await tx.operationFinishedGoodEvent.findMany({
          where: { finishedGoodId: { in: finishedGoodIds } },
          select: {
            finishedGoodId: true,
            eventType: true,
            quantity: true,
          },
        });

        for (const finishedGoodId of finishedGoodIds) {
          const balance = calculateFinishedGoodBalance(
            existingEvents.filter((item) => item.finishedGoodId === finishedGoodId)
          );
          const requiredQuantity = requiredQuantities.get(finishedGoodId) || 0;
          const effectiveBalance =
            data.eventType === "DISPATCHED" && dispatch.status === "reserved"
              ? balance + requiredQuantity
              : balance;

          if (effectiveBalance < requiredQuantity) {
            throw new Error("INSUFFICIENT_FINISHED_GOODS");
          }
        }
      }

      const finishedGoodEvents: Array<{
        finishedGoodId: string;
        eventType: string;
        quantity: number;
        unit: string;
        reason: string;
        referenceType: string;
        referenceId: string;
        metadataJson: string;
        createdById: string | null;
      }> = [];

      if (!unitMode && data.eventType === "RESERVED") {
        for (const item of dispatch.items) {
          if (!item.finishedGoodId) continue;
          finishedGoodEvents.push({
            finishedGoodId: item.finishedGoodId,
            eventType: "RESERVATION",
            quantity: item.quantity,
            unit: item.unit,
            reason: data.reason || `Reserva por despacho ${dispatch.code}`,
            referenceType: "dispatch",
            referenceId: dispatch.id,
            metadataJson: JSON.stringify({ dispatchCode: dispatch.code, dispatchEventId: event.id }),
            createdById,
          });
        }
      }

      if (!unitMode && (data.eventType === "RELEASED" || (data.eventType === "CANCELLED" && dispatch.status === "reserved"))) {
        for (const item of dispatch.items) {
          if (!item.finishedGoodId) continue;
          finishedGoodEvents.push({
            finishedGoodId: item.finishedGoodId,
            eventType: "RELEASE",
            quantity: item.quantity,
            unit: item.unit,
            reason: data.reason || `Liberacion por despacho ${dispatch.code}`,
            referenceType: "dispatch",
            referenceId: dispatch.id,
            metadataJson: JSON.stringify({ dispatchCode: dispatch.code, dispatchEventId: event.id }),
            createdById,
          });
        }
      }

      if (!unitMode && data.eventType === "DISPATCHED") {
        if (dispatch.status === "reserved") {
          for (const item of dispatch.items) {
            if (!item.finishedGoodId) continue;
            finishedGoodEvents.push({
              finishedGoodId: item.finishedGoodId,
              eventType: "RELEASE",
              quantity: item.quantity,
              unit: item.unit,
              reason: data.reason || `Liberacion previa a salida ${dispatch.code}`,
              referenceType: "dispatch",
              referenceId: dispatch.id,
              metadataJson: JSON.stringify({ dispatchCode: dispatch.code, dispatchEventId: event.id }),
              createdById,
            });
          }
        }

        for (const item of dispatch.items) {
          if (!item.finishedGoodId) continue;
          finishedGoodEvents.push({
            finishedGoodId: item.finishedGoodId,
            eventType: "ISSUE",
            quantity: item.quantity,
            unit: item.unit,
            reason: data.reason || `Salida por despacho ${dispatch.code}`,
            referenceType: "dispatch",
            referenceId: dispatch.id,
            metadataJson: JSON.stringify({ dispatchCode: dispatch.code, dispatchEventId: event.id }),
            createdById,
          });
          }
        }

      if (finishedGoodEvents.length > 0) {
        await tx.operationFinishedGoodEvent.createMany({
          data: finishedGoodEvents,
        });
      }

      if (unitMode) {
        if (data.eventType === "PICKED") {
          for (const item of dispatch.items) {
            if (!item.unitId) continue;
            await tx.operationFinishedGoodUnit.update({
              where: { id: item.unitId },
              data: {
                status: "reserved",
                events: {
                  create: {
                    eventType: "PICKED",
                    reason: data.reason || `Unidad separada para despacho ${dispatch.code}`,
                    referenceType: "dispatch",
                    referenceId: dispatch.id,
                    metadataJson: {
                      dispatchCode: dispatch.code,
                      dispatchEventId: event.id,
                      internalLabel: item.internalLabel,
                    },
                  },
                },
              },
            });
          }
        }

        if (data.eventType === "DISPATCHED" || data.eventType === "DELIVERED") {
          const nextStatus = data.eventType === "DISPATCHED" ? "dispatched" : "delivered";
          for (const item of dispatch.items) {
            if (!item.unitId) continue;
            await tx.operationFinishedGoodUnit.update({
              where: { id: item.unitId },
              data: {
                status: nextStatus,
                dispatchedAt: data.eventType === "DISPATCHED" ? new Date() : undefined,
                deliveredAt: data.eventType === "DELIVERED" ? new Date() : undefined,
                events: {
                  create: {
                    eventType: data.eventType,
                    reason:
                      data.reason ||
                      (data.eventType === "DISPATCHED"
                        ? `Unidad despachada fisicamente por ${dispatch.code}`
                        : `Unidad entregada por ${dispatch.code}`),
                    referenceType: "dispatch",
                    referenceId: dispatch.id,
                    metadataJson: {
                      dispatchCode: dispatch.code,
                      dispatchEventId: event.id,
                      internalLabel: item.internalLabel,
                      status: nextStatus,
                    },
                  },
                },
              },
            });
          }
        }
      }

      const updateData: {
        status?: string;
        sentAt?: Date;
        dispatchedAt?: Date;
        deliveredAt?: Date;
      } = {};

      if (data.eventType === "RESERVED") {
        updateData.status = "reserved";
      } else if (data.eventType === "PICKED") {
        updateData.status = "picked";
      } else if (data.eventType === "PACKED") {
        updateData.status = "packed";
      } else if (data.eventType === "RELEASED") {
        updateData.status = "released";
      } else if (data.eventType === "DISPATCHED") {
        updateData.status = "dispatched";
        updateData.sentAt = new Date();
        updateData.dispatchedAt = new Date();
      } else if (data.eventType === "DELIVERED") {
        updateData.status = "delivered";
        updateData.deliveredAt = new Date();
      } else if (data.eventType === "CANCELLED") {
        updateData.status = "cancelled";
      }

      const updatedDispatch =
        Object.keys(updateData).length > 0
          ? await tx.operationDispatch.update({
              where: { id },
              data: updateData,
              include: dispatchInclude,
            })
          : await tx.operationDispatch.findUnique({
              where: { id },
              include: dispatchInclude,
            });

      return {
        event,
        dispatch: updatedDispatch,
        finishedGoodEventsCreated: finishedGoodEvents.length,
      };
    });

    if (!result) {
      return NextResponse.json(
        { error: "Despacho no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "TERMINAL_DISPATCH") {
      return NextResponse.json(
        { error: "No se pueden registrar eventos sobre despachos delivered o cancelled" },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "INSUFFICIENT_FINISHED_GOODS") {
      return NextResponse.json(
        { error: "Inventario PT insuficiente para reservar o despachar" },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.startsWith("INVALID_STATUS_")) {
      return NextResponse.json(
        { error: "El estado actual del despacho no permite ese evento" },
        { status: 400 }
      );
    }

    console.error("[operations/dispatches/:id/events] POST error:", error);
    return NextResponse.json(
      { error: "Error al crear evento de despacho" },
      { status: 500 }
    );
  }
}
