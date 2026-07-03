import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { syncOperationsProductToStore } from "@/lib/operations/sync-operations-product-to-store";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const finishedGood = await prisma.operationFinishedGood.findUnique({
      where: { id },
      select: { id: true, code: true, name: true, productType: true },
    });

    if (!finishedGood) {
      return NextResponse.json({ error: "Producto operativo no encontrado" }, { status: 404 });
    }

    if (!finishedGood.code) {
      return NextResponse.json({ error: "Producto sin código operativo" }, { status: 400 });
    }

    const result = await syncOperationsProductToStore({
      operationsProductCode: finishedGood.code,
      operationsProductName: finishedGood.name,
      productType: finishedGood.code,
      defaultPrice: typeof body.price === "number" ? body.price : typeof body.price === "string" ? Number(body.price) : null,
      category: typeof body.category === "string" ? body.category : null,
      visible: typeof body.visible === "boolean" ? body.visible : true,
    });

    return NextResponse.json({
      success: true,
      ...result,
      message: result.created ? "Producto publicado en catálogo comercial" : "Producto actualizado en catálogo comercial",
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "No se pudo crear o vincular el producto comercial" }, { status: 409 });
    }
    console.error("[operations/finished-goods/:id/publish-to-store] POST error:", error);
    return NextResponse.json({ error: "No se pudo publicar en Tienda" }, { status: 500 });
  }
}
