import { NextRequest, NextResponse } from "next/server";
import { PaymentService } from "@/domains/shared/services/payment.service";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { packageId } = await req.json();

    if (!packageId) {
      return NextResponse.json({ error: "packageId es requerido" }, { status: 400 });
    }

    const userId = session.user.id;

    // 1. Validate the package and get the REAL price from DB (SSOT)
    const pkg = await prisma.package.findUnique({
      where: { id: packageId, isActive: true }
    });

    if (!pkg) {
      return NextResponse.json({ error: "Plan no encontrado o inactivo" }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const successUrl = `${appUrl}/dashboard?payment=success&packageId=${pkg.id}`;
    const cancelUrl = `${appUrl}/dashboard?payment=cancelled`;

    // 2. Create the checkout session with the DB price
    const { url } = await PaymentService.createCheckoutSession(
      userId,
      pkg.name, 
      pkg.price, 
      successUrl, 
      cancelUrl,
      pkg.id  // ← packageId included in Stripe metadata for webhook activation
    );

    return NextResponse.json({ url });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Checkout error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
