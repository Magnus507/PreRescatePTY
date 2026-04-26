import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true, stock: { gt: 0 } },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json({ products });
  } catch (err) {
    console.error("Products GET error:", err);
    return NextResponse.json({ error: "Error al cargar productos" }, { status: 500 });
  }
}
