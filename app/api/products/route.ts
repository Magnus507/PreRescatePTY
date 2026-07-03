import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractOperationsProductCode } from "@/lib/operations/sync-operations-product-to-store";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true, stock: { gt: 0 } },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json({
      products: products.filter((product) => Boolean(extractOperationsProductCode(product))),
    });
  } catch (err) {
    console.error("Products GET error:", err);
    return NextResponse.json({ error: "Error al cargar productos" }, { status: 500 });
  }
}
