import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountStateService } from "@/domains/accounts/services/account-state.service";
import { canAdminApproveManual } from "@/lib/order-status";
import { z } from "zod";

const ApproveSchema = z.object({
  adminReviewNotes: z.string().optional(),
  assignedChipIds: z.array(z.string()).optional(),
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
  const assignedChipIds = Array.from(new Set((parsed.data.assignedChipIds || []).filter(Boolean)));

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

  if (assignedChipIds.length > purchasedChips) {
    return NextResponse.json({ error: "No puedes asignar más chips que los incluidos en la orden." }, { status: 400 });
  }

  // Actualizar orden y cuenta en transacción
  let result: { updatedOrder: { id: string }; account: { id: string } };
  try {
    result = await prisma.$transaction(async (tx) => {
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
        select: { id: true, maxChipsAllocated: true, maxProfilesAllocated: true }
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

      if (assignedChipIds.length > 0) {
        for (const chipId of assignedChipIds) {
          const chip = await tx.chip.findUnique({
            where: { id: chipId },
            include: {
              claimTokens: {
                where: { usedAt: null },
                select: { id: true, orderId: true }
              }
            }
          });

          if (!chip) {
            throw Object.assign(new Error("El chip ya no está disponible en inventario."), { status: 409 });
          }

          const conflictingToken = chip.claimTokens.find((t) => t.orderId && t.orderId !== id);
          if (conflictingToken) {
            throw Object.assign(new Error("Este chip ya está asignado a otra orden."), { status: 409 });
          }

          const tokenForThisOrder = chip.claimTokens.find((t) => t.orderId === id);

          if (chip.status === "inventory") {
            const reserved = await tx.chip.updateMany({
              where: { id: chip.id, status: "inventory" },
              data: { status: "sold" }
            });

            if (reserved.count !== 1) {
              throw Object.assign(new Error("El chip ya no está disponible en inventario."), { status: 409 });
            }
          } else if (chip.status === "sold") {
            if (!tokenForThisOrder) {
              throw Object.assign(new Error("Este chip ya está asignado a otra orden."), { status: 409 });
            }
          } else {
            throw Object.assign(new Error("El chip ya no está disponible en inventario."), { status: 409 });
          }

          if (tokenForThisOrder) {
            await tx.chipClaimToken.update({
              where: { id: tokenForThisOrder.id },
              data: { expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) }
            });
          } else {
            const reusableToken = chip.claimTokens.find((t) => t.orderId === null);
            if (reusableToken) {
              await tx.chipClaimToken.update({
                where: { id: reusableToken.id },
                data: {
                  orderId: id,
                  expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
                }
              });
            } else {
              await tx.chipClaimToken.create({
                data: {
                  chipId: chip.id,
                  orderId: id,
                  activationCode: `ACT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                  expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
                }
              });
            }
          }
        }
      }

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
      return { updatedOrder: { id: updatedOrder.id }, account: { id: account.id } };
    });
  } catch (error: unknown) {
    const status = typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: unknown }).status) || 500
      : 500;
    const message = error instanceof Error ? error.message : "Error al aprobar orden";
    return NextResponse.json({ error: message }, { status });
  }

  // Invalidar caché de AccountStateService para el usuario afectado
  if (order.userId) {
    await AccountStateService.invalidateCache(order.userId);
  }

  return NextResponse.json({ orderId: result.updatedOrder.id });
}
