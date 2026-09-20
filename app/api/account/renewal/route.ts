import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeMoney } from "@/lib/money";
import { getAnnualRenewalPrice } from "@/domains/accounts/services/renewal-pricing";
import { resolveAccountAccessMode } from "@/domains/accounts/services/service-entitlement.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      accountId: true,
      account: {
        select: {
          serviceEntitlement: true,
          renewalPayments: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              status: true,
              amount: true,
              confirmedAt: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  if (!user?.accountId || !user.account) {
    return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
  }

  const entitlement = user.account.serviceEntitlement;
  const latestPayment = user.account.renewalPayments[0] ?? null;

  return NextResponse.json({
    price: serializeMoney(getAnnualRenewalPrice()),
    currency: "USD",
    months: 12,
    accessMode: resolveAccountAccessMode(entitlement),
    serviceEndDate: entitlement?.endsAt ?? null,
    latestPayment: latestPayment
      ? {
          ...latestPayment,
          amount: serializeMoney(latestPayment.amount),
        }
      : null,
  });
}
