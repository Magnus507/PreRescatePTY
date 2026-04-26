import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BUSINESS_RULES } from "@/domains/shared/constants";
import { AccountStateService } from "@/domains/accounts/services/account-state.service";


/**
 * POST /api/account/add-chips
 * Body: { quantity: number }
 *
 * Adds individual chips to the current user's account (additive — never replaces plan chips).
 * This is the manual/admin-less path. For now it just records the intent and updates the DB;
 * payment integration (Stripe) can be wired later via the existing PaymentService.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const { quantity } = await req.json();
    const qty = parseInt(quantity);

    if (!qty || qty < 1 || qty > 50) {
      return NextResponse.json(
        { error: "Cantidad inválida. Mínimo 1, máximo 50 chips." },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    if (!userId) {
      return NextResponse.json({ error: "Usuario no identificado" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { account: true },
    });

    if (!user?.accountId) {
      return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    }

    const totalCost = qty * BUSINESS_RULES.EXTRA_CHIP_PRICE;

    // Create an order for the chips that requires manual payment verification
    const order = await prisma.order.create({
      data: {
        userId,
        amount: totalCost,
        currency: "USD",
        orderStatus: "pending",
        paymentStatus: "pending", 
        provider: "manual",
        providerReference: `chips-${qty}-manual-${Date.now()}`,
        items: {
          create: [{
            productType: "CHIP_EXTRA",
            quantity: qty,
            unitPrice: BUSINESS_RULES.EXTRA_CHIP_PRICE,
            totalPrice: totalCost,
          }]
        }
      },
    });

    return NextResponse.json({
      success: true,
      message: `Orden creada para ${qty} chip(s). Pendiente de pago.`,
      orderId: order.id,
      totalCost,
    });

  } catch (err: any) {
    console.error("[add-chips] Error:", err);
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}
