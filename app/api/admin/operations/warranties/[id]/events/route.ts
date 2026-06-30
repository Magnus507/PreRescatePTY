import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import {
  CreateWarrantyEventSchema,
  getFirstValidationMessage,
} from "../../warranties.helpers";

export const dynamic = "force-dynamic";

const terminalStatuses = new Set(["cancelled", "expired"]);

const commercialOrderSelect = {
  id: true,
  code: true,
  status: true,
  customerName: true,
  customerEmail: true,
  customerPhone: true,
} as const;

const finishedGoodSelect = {
  id: true,
  code: true,
  name: true,
  productType: true,
  status: true,
  unit: true,
} as const;

const dispatchSelect = {
  id: true,
  code: true,
  status: true,
  destinationType: true,
} as const;

const warrantyInclude = {
  commercialOrder: {
    select: commercialOrderSelect,
  },
  finishedGood: {
    select: finishedGoodSelect,
  },
  dispatch: {
    select: dispatchSelect,
  },
  events: {
    orderBy: { createdAt: "desc" },
    take: 10,
  },
} as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = CreateWarrantyEventSchema.safeParse(body);
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
      const warranty = await tx.operationWarranty.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          coverageStatus: true,
        },
      });

      if (!warranty) {
        return null;
      }

      if (
        terminalStatuses.has(warranty.status) &&
        !(data.eventType === "CLAIM_CLOSED" && warranty.coverageStatus === "claim_open")
      ) {
        throw new Error("TERMINAL_WARRANTY");
      }

      const event = await tx.operationWarrantyEvent.create({
        data: {
          warrantyId: id,
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
        coverageStatus?: string;
      } = {};

      if (data.eventType === "ACTIVATED") {
        updateData.status = "active";
        updateData.coverageStatus = "valid";
      } else if (data.eventType === "SUSPENDED") {
        updateData.status = "suspended";
      } else if (data.eventType === "EXPIRED") {
        updateData.status = "expired";
        updateData.coverageStatus = "expired";
      } else if (data.eventType === "CLAIM_OPENED") {
        updateData.coverageStatus = "claim_open";
      } else if (data.eventType === "CLAIM_CLOSED") {
        updateData.coverageStatus = "claim_closed";
      } else if (data.eventType === "CANCELLED") {
        updateData.status = "cancelled";
      }

      const updatedWarranty =
        Object.keys(updateData).length > 0
          ? await tx.operationWarranty.update({
              where: { id },
              data: updateData,
              include: warrantyInclude,
            })
          : await tx.operationWarranty.findUnique({
              where: { id },
              include: warrantyInclude,
            });

      return {
        event,
        warranty: updatedWarranty,
      };
    });

    if (!result) {
      return NextResponse.json(
        { error: "Garantia no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "TERMINAL_WARRANTY") {
      return NextResponse.json(
        { error: "No se pueden registrar eventos sobre garantias canceladas o expiradas" },
        { status: 400 }
      );
    }

    console.error("[operations/warranties/:id/events] POST error:", error);
    return NextResponse.json(
      { error: "Error al crear evento de garantia" },
      { status: 500 }
    );
  }
}
