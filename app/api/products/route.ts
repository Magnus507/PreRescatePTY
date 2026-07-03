import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractOperationsProductCode } from "@/lib/operations/sync-operations-product-to-store";
import { loadInventoryStockRows } from "@/lib/operations/inventory-stock";

export async function GET() {
  try {
    const [products, stockRows] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      }),
      loadInventoryStockRows(),
    ]);

    const stockByCode = new Map(stockRows.map((row) => [row.productCode, row]));

    const catalog = products
      .map((product) => {
        const operationsProductCode = extractOperationsProductCode(product);
        if (!operationsProductCode) return null;

        const stock = stockByCode.get(operationsProductCode);
        const availableStock = stock?.availableCount ?? 0;
        const reservedStock = stock?.reservedCount ?? 0;

        return {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          currency: "USD",
          category: product.category,
          imageUrl: product.image,
          operationsProductCode,
          availableStock,
          reservedStock,
          isPublished: true,
          isVisible: product.isActive,
          stockSource: stock ? "operations_inventory" : "operations_inventory",
          stock: availableStock,
          productType: product.productType,
          estimatedProductionTime: product.estimatedProductionTime,
          requiresPersonalization: product.requiresPersonalization,
        };
      })
      .filter((item) => Boolean(item));

    return NextResponse.json({ products: catalog });
  } catch (err) {
    console.error("Products GET error:", err);
    return NextResponse.json({ error: "Error al cargar productos" }, { status: 500 });
  }
}
