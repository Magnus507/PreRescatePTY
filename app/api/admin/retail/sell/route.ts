import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { generateOrderNumber } from "@/lib/order-number";
import { InvoiceService } from "@/domains/invoices/services/invoice.service";
import { TOKEN_AVAILABLE_WHERE } from "@/domains/chips/token-lifecycle.helpers";
import { z } from "zod";
import { getUniqueActivationCode } from "@/lib/identifiers";
import { protectActivationCode } from "@/domains/chips/activation-code.service";

const RetailSellSchema = z.object({
  chipIds: z.array(z.string().min(1)).min(1, "chipIds debe contener al menos un chip"),
  productType: z.string().optional().default("retail_chip"),
  unitPrice: z.number().positive("unitPrice debe ser mayor a 0"),
  customerName: z.string().optional(),
  customerEmail: z.string().email("customerEmail inválido").optional(),
  customerPhone: z.string().optional(),
});

export async function POST(req: NextRequest) {
  // ── Auth: solo admin y superadmin (excluye imprenta) ──
  const session = await getServerSession(authOptions);
  if (
    !session?.user ||
    !["admin", "superadmin"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const adminId = session.user.id;

  // ── Rate limit ──
  const limiter = await rateLimit("admin-retail-sell", adminId, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!limiter.allowed) {
    return NextResponse.json(
      { error: "Demasiadas ventas en poco tiempo. Intenta nuevamente en un minuto." },
      { status: 429 }
    );
  }

  // ── Validar body ──
  const body = await req.json().catch(() => ({}));
  const parsed = RetailSellSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return NextResponse.json(
      { error: firstError?.message || "Datos inválidos" },
      { status: 400 }
    );
  }

  const { chipIds, productType, unitPrice, customerName, customerEmail, customerPhone } = parsed.data;
  const uniqueChipIds = [...new Set(chipIds)];

  // ── Verificar duplicados ──
  if (uniqueChipIds.length !== chipIds.length) {
    return NextResponse.json(
      { error: "chipIds contiene valores duplicados" },
      { status: 400 }
    );
  }

  const now = new Date();

  // ── Validar chips ──
  const chips = await prisma.chip.findMany({
    where: { id: { in: uniqueChipIds } },
    include: {
      claimTokens: {
        where: TOKEN_AVAILABLE_WHERE(now),
        select: { id: true },
      },
    },
  });

  if (chips.length !== uniqueChipIds.length) {
    return NextResponse.json(
      { error: "Uno o más chips no existen" },
      { status: 400 }
    );
  }

  const invalidChips: { id: string; reason: string }[] = [];

  for (const chip of chips) {
    if (chip.status !== "inventory") {
      invalidChips.push({ id: chip.id, reason: `status es "${chip.status}", debe ser "inventory"` });
    } else if (!chip.isPhysical) {
      invalidChips.push({ id: chip.id, reason: "chip digital, solo físicos pueden venderse en tienda" });
    } else if (chip.ownerUserId !== null) {
      invalidChips.push({ id: chip.id, reason: "chip ya tiene propietario asignado" });
    } else if (chip.assignedProfileId !== null) {
      invalidChips.push({ id: chip.id, reason: "chip ya tiene perfil asignado" });
    } else if (chip.claimTokens.length > 0) {
      invalidChips.push({ id: chip.id, reason: "chip tiene un token de activación activo no usado" });
    }
  }

  if (invalidChips.length > 0) {
    return NextResponse.json(
      {
        error: "Uno o más chips no están disponibles para venta retail",
        details: invalidChips,
      },
      { status: 400 }
    );
  }

  const amount = uniqueChipIds.length * unitPrice;

  // ── Transacción ──
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear orden retail
      const orderNumber = await generateOrderNumber();

      const order = await tx.order.create({
        data: {
          userId: null, // Cliente anónimo — se vincula al activar el chip
          orderNumber,
          amount,
          provider: "retail",
          orderType: "retail",
          orderStatus: "completed",
          paymentStatus: "paid",
          adminReviewStatus: "approved",
          adminReviewedAt: now,
          adminReviewedById: adminId,
          customerName: customerName || null,
          customerEmail: customerEmail || null,
          customerPhone: customerPhone || null,
          items: {
            create: chips.map((chip) => ({
              productType,
              quantity: 1,
              unitPrice,
              totalPrice: unitPrice,
              chipId: chip.id,
            })),
          },
        },
      });
      await InvoiceService.ensurePendingForPaidOrder(tx, { orderId: order.id });

      // 2. Marcar chips como sold
      await tx.chip.updateMany({
        where: { id: { in: uniqueChipIds } },
        data: { status: "sold" },
      });

      // 3. Generar ChipClaimToken por chip
      const activationCodes: { chipId: string; shortCode: string; serialPublic: string; activationCode: string }[] = [];

      for (const chip of chips) {
        const activationCode = await getUniqueActivationCode();
        const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000 * 10); // 10 años para chips físicos

        await tx.chipClaimToken.create({
          data: {
            chipId: chip.id,
            orderId: order.id,
            ...protectActivationCode(activationCode),
            expiresAt,
            usedAt: null,
          },
        });

        activationCodes.push({
          chipId: chip.id,
          shortCode: chip.shortCode,
          serialPublic: chip.serialPublic,
          activationCode,
        });
      }

      // 4. AuditLog
      await tx.auditLog.create({
        data: {
          accountId: null,
          actorUserId: adminId,
          entityType: "Order",
          entityId: order.id,
          action: "retail_sale_created",
          oldValuesJson: null,
          newValuesJson: JSON.stringify({
            chipIds: uniqueChipIds,
            amount,
            customerName: customerName || null,
            customerEmail: customerEmail || null,
            customerPhone: customerPhone || null,
          }),
        },
      });

      return { order, activationCodes };
    });

    return NextResponse.json({
      ok: true,
      orderId: result.order.id,
      orderNumber: result.order.orderNumber,
      amount: result.order.amount,
      activationCodes: result.activationCodes,
    });
  } catch (error) {
    console.error("[admin/retail/sell] Transaction error:", error);
    return NextResponse.json(
      { error: "Error al procesar la venta retail" },
      { status: 500 }
    );
  }
}
