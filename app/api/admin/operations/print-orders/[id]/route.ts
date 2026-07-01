import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import {
  PrintOrderActionSchema,
  UpdatePrintOrderSchema,
  getFirstValidationMessage,
  getPrintOrderWithCounts,
  markItemsReceivedFromPrint,
  markItemsSentToPrint,
} from "../print-orders.helpers";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  try {
    const printOrder = await getPrintOrderWithCounts(id);
    if (!printOrder) {
      return NextResponse.json({ error: "Orden a imprenta no encontrada" }, { status: 404 });
    }
    return NextResponse.json({ printOrder });
  } catch (error) {
    console.error("[operations/print-orders/:id] GET error:", error);
    return NextResponse.json({ error: "Error al cargar orden a imprenta" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = UpdatePrintOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: getFirstValidationMessage(parsed.error) }, { status: 400 });
  }

  const data = parsed.data;

  try {
    const current = await prisma.operationPrintOrder.findUnique({ where: { id }, select: { id: true } });
    if (!current) {
      return NextResponse.json({ error: "Orden a imprenta no encontrada" }, { status: 404 });
    }

    const printOrder = await prisma.operationPrintOrder.update({
      where: { id },
      data: {
        ...(data.supplierName !== undefined ? { supplierName: data.supplierName } : {}),
        ...(data.supplierReference !== undefined ? { supplierReference: data.supplierReference || null } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
      },
    });

    return NextResponse.json({ printOrder });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe una orden a imprenta con esos datos" }, { status: 409 });
    }
    console.error("[operations/print-orders/:id] PATCH error:", error);
    return NextResponse.json({ error: "Error al actualizar orden a imprenta" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = PrintOrderActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: getFirstValidationMessage(parsed.error) }, { status: 400 });
  }

  try {
    const printOrder = await getPrintOrderWithCounts(id);
    if (!printOrder) {
      return NextResponse.json({ error: "Orden a imprenta no encontrada" }, { status: 404 });
    }

    if (parsed.data.action === "mark_sent") {
      const updated = await prisma.$transaction(async (tx) => {
        await tx.operationPrintOrderItem.updateMany({
          where: { printOrderId: id, status: "pending" },
          data: { ...markItemsSentToPrint() },
        });
        return tx.operationPrintOrder.update({
          where: { id },
          data: { status: "sent", sentAt: new Date() },
        });
      });
      return NextResponse.json({ printOrder: updated });
    }

    if (parsed.data.action === "mark_received") {
      const updated = await prisma.$transaction(async (tx) => {
        const pendingItems = await tx.operationPrintOrderItem.findMany({
          where: { printOrderId: id, status: { in: ["pending", "sent"] } },
          select: { id: true, digitalBatchItemId: true },
        });

        await tx.operationPrintOrderItem.updateMany({
          where: { id: { in: pendingItems.map((item) => item.id) } },
          data: { ...markItemsReceivedFromPrint() },
        });

        await tx.operationDigitalBatchItem.updateMany({
          where: { id: { in: pendingItems.map((item) => item.digitalBatchItemId) } },
          data: { status: "printed" },
        });

        return tx.operationPrintOrder.update({
          where: { id },
          data: { status: "received", receivedAt: new Date() },
        });
      });

      return NextResponse.json({ printOrder: updated });
    }

    return NextResponse.json({ error: "Accion no soportada" }, { status: 400 });
  } catch (error) {
    console.error("[operations/print-orders/:id] POST action error:", error);
    return NextResponse.json({ error: "Error al ejecutar accion de imprenta" }, { status: 500 });
  }
}
