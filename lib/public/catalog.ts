import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { serializeMoney } from "@/lib/money";
import { isStoreSection } from "@/lib/products/product-operational-mapping";

export type LitePublicProduct = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  productType: string | null;
  productCode: string;
  badgeLabel: string | null;
};

function stripOperationsMarker(description: string | null | undefined) {
  if (!description) return null;
  return description.replace(/\n?\[operationsProductCode:[^\]]+\]/g, "").trim() || null;
}

const loadCatalog = async (): Promise<LitePublicProduct[]> => {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    include: {
      operationalMapping: {
        include: {
          finishedGood: {
            select: {
              status: true,
            },
          },
        },
      },
    },
  });

  return products
    .filter((product) => {
      const mapping = product.operationalMapping;
      if (!mapping?.isPublished) return false;
      if (!mapping.finishedGoodId || !mapping.productCode || !mapping.finishedGood) return false;
      if (mapping.finishedGood.status === "inactive") return false;
      if (!mapping.storeSection || !isStoreSection(mapping.storeSection)) return false;
      return true;
    })
    .sort((a, b) => {
      const left = a.operationalMapping?.sortOrder ?? 999;
      const right = b.operationalMapping?.sortOrder ?? 999;
      return left - right || a.name.localeCompare(b.name);
    })
    .map((product) => ({
      id: product.id,
      name: product.name,
      description: stripOperationsMarker(product.description),
      price: serializeMoney(product.price),
      imageUrl: product.image,
      productType: product.productType,
      productCode: product.operationalMapping!.productCode!,
      badgeLabel: product.operationalMapping?.badgeLabel ?? null,
    }));
};

export const getLitePublicCatalog = unstable_cache(
  loadCatalog,
  ["public-catalog-lite-v1"],
  { revalidate: 60 },
);
