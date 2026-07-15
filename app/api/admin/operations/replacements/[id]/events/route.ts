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
            },
          },
        },
      });

      if (!replacement) {
        return null;
      }

      if (terminalStatuses.has(replacement.status)) {
        throw new Error("TERMINAL_REPLACEMENT");
      }

      if (data.eventType === "DISPATCH_CREATED") {
        if (!replacement.replacementFinishedGoodId || !replacement.replacementFinishedGood) {
          throw new Error("MISSING_REPLACEMENT_FINISHED_GOOD");
        }

        if (replacement.replacementDispatchId || replacement.replacementDispatch) {
          throw new Error("REPLACEMENT_DISPATCH_EXISTS");
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
        const dispatch = await tx.operationDispatch.create({
          data: {
            code: `${replacement.code}-DISPATCH`,
            destinationType: "customer",
            destinationName: replacement.customerName || null,
            destinationReference: replacement.code,
            notes: data.reason || `Despacho draft para reemplazo ${replacement.code}`,
            items: {
              create: {
                finishedGoodId: replacement.replacementFinishedGoodId as string,
                quantity: 1,
                unit: replacement.replacementFinishedGood?.unit || "unit",
                notes: `Item de reemplazo ${replacement.code}`,
              },
            },
            events: {
              create: {
                eventType: "CREATED",
                quantity: 1,
                reason: data.reason || `Despacho creado desde reemplazo ${replacement.code}`,
                referenceType: "replacement",
                referenceId: replacement.id,
                metadataJson: JSON.stringify({
                  replacementCode: replacement.code,
                  replacementEventId: event.id,
                  replacementFinishedGoodCode: replacement.replacementFinishedGood?.code || null,
                }),
                createdById,
              },
            },
          },
          select: {
            id: true,
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
      return NextResponse.json(
        { error: "Reemplazo no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "TERMINAL_REPLACEMENT") {
      return NextResponse.json(
        { error: "No se pueden registrar eventos sobre reemplazos completed, cancelled o rejected" },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "MISSING_REPLACEMENT_FINISHED_GOOD") {
      return NextResponse.json(
        { error: "replacementFinishedGoodId es requerido para crear despacho de reemplazo" },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "REPLACEMENT_DISPATCH_EXISTS") {
      return NextResponse.json(
        { error: "El reemplazo ya tiene replacementDispatchId" },
        { status: 400 }
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "No se pudo crear despacho de reemplazo porque el code ya existe" },
        { status: 409 }
      );
    }

    console.error("[operations/replacements/:id/events] POST error:", error);
    return NextResponse.json(
      { error: "Error al crear evento de reemplazo" },
      { status: 500 }
    );
  }
}
