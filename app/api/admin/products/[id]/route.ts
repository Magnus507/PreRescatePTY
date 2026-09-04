import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, GENERAL_ADMIN_ROLES } from "@/lib/rbac";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    const body = await req.json();
    const { name, description, price, category, stock, image, isActive, productType, estimatedProductionTime, requiresPersonalization } = body;

    const product = await prisma.$transaction(async (tx) => {
      const current = await tx.product.findUnique({ where: { id } });
      if (!current) throw Object.assign(new Error("PRODUCT_NOT_FOUND"), { code: "P2025" });

      const updated = await tx.product.update({
        where: { id },
        data: {
          name,
          description,
          price: price !== undefined ? parseFloat(price) : undefined,
          category,
          stock: stock !== undefined ? parseInt(stock) : undefined,
          image,
          isActive,
          productType: productType !== undefined ? productType : undefined,
          estimatedProductionTime: estimatedProductionTime !== undefined ? estimatedProductionTime : undefined,
          requiresPersonalization: requiresPersonalization !== undefined ? requiresPersonalization : undefined
        }
      });
      await writeAuditLog(tx, {
        accountId: auth.session.user.accountId,
        actorUserId: auth.session.user.id,
        entityType: "Product",
        entityId: id,
        action: "product_updated",
        requestId: getAuditRequestId(req),
        before: current,
        after: updated,
      });
      return updated;
    });

    return NextResponse.json({ product, message: "Producto actualizado" });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }
    console.error("Error updating product:", err);
    return NextResponse.json({ error: "Error al actualizar producto" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    await prisma.$transaction(async (tx) => {
      const current = await tx.product.findUnique({ where: { id } });
      if (!current) throw Object.assign(new Error("PRODUCT_NOT_FOUND"), { code: "P2025" });
      await tx.product.delete({ where: { id } });
      await writeAuditLog(tx, {
        accountId: auth.session.user.accountId,
        actorUserId: auth.session.user.id,
        entityType: "Product",
        entityId: id,
        action: "product_deleted",
        requestId: getAuditRequestId(req),
        before: current,
      });
    });
    return NextResponse.json({ message: "Producto eliminado" });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }
    console.error("Error deleting product:", err);
    return NextResponse.json({ error: "Error al eliminar producto" }, { status: 500 });
  }
}
