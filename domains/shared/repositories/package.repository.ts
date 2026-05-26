import { prisma } from "@/lib/prisma";

const PUBLIC_ACCOUNT_TYPES = ["personal", "company"] as const;

export async function getPublicPackages() {
  return prisma.package.findMany({
    where: {
      isActive: true,
      accountType: { in: [...PUBLIC_ACCOUNT_TYPES] },
    },
    orderBy: [{ displayOrder: "asc" }, { price: "asc" }],
  });
}

