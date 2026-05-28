import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountStateService } from "@/domains/accounts/services/account-state.service";
import { canAdminApproveManual } from "@/lib/order-status";
import { z } from "zod";

const ApproveSchema = z.object({
  adminReviewNotes: z.string().optional(),
});

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user ||
    !["admin", "superadmin", "imprenta"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const adminId = session.user.id;
  const { id } = await context.params;
  const body = await req.json();
  const parsed = ApproveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }
  const notes = parsed.data.adminReviewNotes || null;

  // Buscar orden manual pendiente de revisión
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order || order.provider !== "manual") {
    return NextResponse.json({ error: "Orden manual no encontrada" }, { status: 404 });
  }
  if (!canAdminApproveManual(order)) {
    return NextResponse.json({ error: "La orden manual no puede aprobarse en su estado actual" }, { status: 400 });
  }

  // Buscar usuario y accountId
  const user = await prisma.user.findUnique({ where: { id: order.userId ?? undefined } });
  if (!user?.accountId) {
    return NextResponse.json({ error: "Usuario sin cuenta asociada" }, { status: 400 });
  }


  // Validar paquete por order.packageId
  if (!order.packageId) {
    return NextResponse.json({ error: "Orden sin packageId" }, { status: 400 });
  }
  const pkg = await prisma.package.findUnique({ where: { id: order.packageId } });
  if (!pkg || !pkg.isActive) {
    return NextResponse.json({ error: "Paquete no válido" }, { status: 400 });
  }

  const purchasedChips = order.items.reduce((sum, item) => sum + Math.max(0, item.quantity || 0), 0);
  const purchasedProfiles = Math.max(0, pkg.maxProfiles || 0);
  const wasAlreadyApproved =
    order.paymentStatus === "paid" ||
    order.adminReviewStatus === "approved";

  // Actualizar orden y cuenta en transacción
  const result = await prisma.$transaction(async (tx) => {
    // Actualizar orden
    const updatedOrder = await tx.order.update({
      where: { id },
      data: {
        paymentStatus: "paid",
        orderStatus: "completed",
        adminReviewStatus: "approved",
        adminReviewedAt: new Date(),
        adminReviewedById: adminId,
        adminReviewNotes: notes,
      }
    });
    // Actualizar cuenta
    const currentAccount = await tx.account.findUnique({
      where: { id: user.accountId! },
      select: { maxChipsAllocated: true, maxProfilesAllocated: true }
    });

    if (!currentAccount) {
      throw new Error("Cuenta no encontrada");
    }

    const accountUpdateData: {
      packageId: string;
      accountType: string;
      status: string;
      maxChipsAllocated?: number;
      maxProfilesAllocated?: number;
    } = {
      packageId: pkg.id,
      accountType: pkg.accountType,
      status: "active",
    };

    if (!wasAlreadyApproved) {
      accountUpdateData.maxChipsAllocated = currentAccount.maxChipsAllocated + purchasedChips;
      accountUpdateData.maxProfilesAllocated = currentAccount.maxProfilesAllocated + purchasedProfiles;
    }

    const account = await tx.account.update({
      where: { id: user.accountId! },
      data: accountUpdateData
    });
    // Crear AuditLog SOLO con campos válidos
    await tx.auditLog.create({
      data: {
        accountId: account.id,
        actorUserId: adminId,
        entityType: "Order",
        entityId: order.id,
        action: "order_approved",
        newValuesJson: null,
        oldValuesJson: null,
      }
    });
    return { updatedOrder, account };
  });

  // Invalidar caché de AccountStateService para el usuario afectado
  if (order.userId) {
    await AccountStateService.invalidateCache(order.userId);
  }

  return NextResponse.json({ order: result.updatedOrder });
}
