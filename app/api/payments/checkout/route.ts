import { NextRequest, NextResponse } from "next/server";
import { PaymentService } from "@/domains/shared/services/payment.service";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ACCOUNT_TYPES } from "@/domains/shared/constants";

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
    const pkg = await prisma.package.findUnique({ where: { id: packageId } });

    if (!pkg || !pkg.isActive) {
      return NextResponse.json({ error: "Plan no encontrado o inactivo" }, { status: 404 });
    }

    if (![ACCOUNT_TYPES.PERSONAL, ACCOUNT_TYPES.COMPANY].includes(pkg.accountType as "personal" | "company")) {
      return NextResponse.json({ error: "Plan con accountType inválido" }, { status: 400 });
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
      pkg.id,
      pkg.updatedAt?.toISOString()
    );

    return NextResponse.json({ url });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Checkout error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
