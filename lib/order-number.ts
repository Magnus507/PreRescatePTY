import { prisma } from "@/lib/prisma";

type ProviderType = "manual" | "legacy" | "stripe" | string;

function getPrefix(provider: ProviderType) {
  return provider === "stripe" ? "STRIPE" : "PR";
}

export async function generateOrderNumber(provider: ProviderType): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year + 1, 0, 1);
  const prefix = getPrefix(provider);

  const yearlyCount = await prisma.order.count({
    where: {
      createdAt: {
        gte: startOfYear,
        lt: endOfYear,
      },
    },
  });

  for (let attempt = 0; attempt < 7; attempt++) {
    const randomSuffix = Math.floor(Math.random() * 100);
    const numeric = String((yearlyCount + 1) * 100 + randomSuffix).padStart(6, "0").slice(-6);
    const candidate = `${prefix}-${year}-${numeric}`;

    const exists = await prisma.order.findFirst({
      where: { orderNumber: candidate },
      select: { id: true },
    });

    if (!exists) return candidate;
  }

  const fallback = `${String(Date.now()).slice(-6)}`;
  return `${prefix}-${year}-${fallback}`;
}
