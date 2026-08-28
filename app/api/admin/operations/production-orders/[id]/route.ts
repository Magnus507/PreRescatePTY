import { NextResponse } from "next/server";
import { revealActivationCode } from "@/domains/chips/activation-code.service";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const productionOrder = await prisma.operationProductionOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            material: true,
          },
        },
        digitalItems: {
          orderBy: [{ sequenceNumber: "asc" }, { internalLabel: "asc" }],
          include: {
            batch: true,
            finishedGoodUnits: true,
            printOrderItems: {
              include: {
                printOrder: true,
              },
            },
            chip: {
              select: {
                claimTokens: {
                  where: { status: "active", usedAt: null },
                  orderBy: { createdAt: "desc" },
                  take: 1,
                  select: {
                    activationCode: true,
                    activationCodeLast4: true,
                  },
                },
              },
            },
          },
        },
        events: {
          orderBy: { createdAt: "desc" },
          include: {
            createdBy: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!productionOrder) {
      return NextResponse.json(
        { error: "Orden de produccion no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      productionOrder: {
        ...productionOrder,
        digitalItems: productionOrder.digitalItems.map((item) => ({
          ...item,
          finishedGoodUnitId:
            item.finishedGoodUnits.find((unit) => unit.digitalBatchItemId === item.id)?.id ||
            item.finishedGoodUnits.find((unit) => unit.internalLabel === item.internalLabel)?.id ||
            item.finishedGoodUnits[0]?.id ||
            null,
          unitId:
            item.finishedGoodUnits.find((unit) => unit.digitalBatchItemId === item.id)?.id ||
            item.finishedGoodUnits.find((unit) => unit.internalLabel === item.internalLabel)?.id ||
            item.finishedGoodUnits[0]?.id ||
            null,
          qaStatus:
            item.finishedGoodUnits.find((unit) => unit.digitalBatchItemId === item.id)?.qaStatus ||
            item.finishedGoodUnits.find((unit) => unit.internalLabel === item.internalLabel)?.qaStatus ||
            item.finishedGoodUnits[0]?.qaStatus ||
            null,
          inventoryStatus:
            item.finishedGoodUnits.find((unit) => unit.digitalBatchItemId === item.id)?.status ||
            item.finishedGoodUnits.find((unit) => unit.internalLabel === item.internalLabel)?.status ||
            item.finishedGoodUnits[0]?.status ||
            null,
          activationStatus:
            item.finishedGoodUnits.find((unit) => unit.digitalBatchItemId === item.id)?.activationStatus ||
            item.finishedGoodUnits.find((unit) => unit.internalLabel === item.internalLabel)?.activationStatus ||
            item.finishedGoodUnits[0]?.activationStatus ||
            null,
          reservedOrderId:
            item.finishedGoodUnits.find((unit) => unit.digitalBatchItemId === item.id)?.reservedOrderId ||
            item.finishedGoodUnits.find((unit) => unit.internalLabel === item.internalLabel)?.reservedOrderId ||
            item.finishedGoodUnits[0]?.reservedOrderId ||
            null,
          activationCode: item.chip?.claimTokens[0]?.activationCode
            ? revealActivationCode(item.chip.claimTokens[0].activationCode)
            : null,
          activationCodeLast4: item.chip?.claimTokens[0]?.activationCodeLast4 || null,
        })),
      },
    });
  } catch (error) {
    console.error("[operations/production-orders/:id] GET error:", error);
    return NextResponse.json(
      { error: "Error al cargar orden de produccion" },
      { status: 500 }
    );
  }
}
