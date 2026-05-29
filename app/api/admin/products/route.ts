import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, GENERAL_ADMIN_ROLES } from "@/lib/rbac";

export async function GET() {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json({ error: "Error al cargar productos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const body = await req.json();
    const { name, description, price, category, stock, image, productType, estimatedProductionTime, requiresPersonalization } = body;

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        category: category || "general",
        stock: parseInt(stock) || 0,
        image,
        productType: productType || "otro",
        estimatedProductionTime: estimatedProductionTime || null,
        requiresPersonalization: requiresPersonalization === true,
        isActive: true
      }
    });

    return NextResponse.json({ product, message: "Producto creado exitosamente" });
  } catch (error) {
    return NextResponse.json({ error: "Error al crear producto" }, { status: 500 });
  }
}
