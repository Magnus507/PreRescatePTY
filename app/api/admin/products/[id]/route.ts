import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, GENERAL_ADMIN_ROLES } from "@/lib/rbac";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    const body = await req.json();
    const { name, description, price, category, stock, image, isActive } = body;

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        description,
        price: price !== undefined ? parseFloat(price) : undefined,
        category,
        stock: stock !== undefined ? parseInt(stock) : undefined,
        image,
        isActive
      }
    });

    return NextResponse.json({ product, message: "Producto actualizado" });
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar producto" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ message: "Producto eliminado" });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar producto" }, { status: 500 });
  }
}
