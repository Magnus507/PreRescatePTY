import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const CreateInternalProductionSchema = z.object({
  finishedGoodId: z.string().trim().min(1, "Producto base requerido"),
  plannedQuantity: z.coerce.number().int().positive("La cantidad debe ser mayor que 0").max(10000, "La cantidad es demasiado alta"),
});

function buildProductionCode(productCode: string) {
  const safeCode = productCode.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 28) || "PRODUCTO";
  const suffix = randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return `STK-${safeCode}-${suffix}`;
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const body = await req.json().catch(() => ({}));
  const parsed = CreateInternalProductionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message || "Datos inválidos" }, { status: 400 });
  }

  const createdById = auth.session.user.id || null;

  try {
    const finishedGood = await prisma.operationFinishedGood.findUnique({
      where: { id: parsed.data.finishedGoodId },
      select: { id: true, code: true, name: true, productType: true, status: true },
    });

    if (!finishedGood) throw new Error("PRODUCT_NOT_FOUND");
    if (finishedGood.status !== "active") throw new Error("PRODUCT_INACTIVE");

    const code = buildProductionCode(finishedGood.code);
    const productionOrder = await prisma.operationProductionOrder.create({
      data: {
        code,
        title: `Producción para stock · ${finishedGood.name}`,
        status: "draft",
        plannedQuantity: parsed.data.plannedQuantity,
        producedQuantity: 0,
        outputType: finishedGood.productType,
        notes: null,
        events: {
          create: {
            eventType: "CREATED",
            quantity: parsed.data.plannedQuantity,
            reason: "Producción interna para stock",
            metadataJson: JSON.stringify({
              source: "internal_stock",
              finishedGoodId: finishedGood.id,
              productCode: finishedGood.code,
              productName: finishedGood.name,
              productType: finishedGood.productType,
            }),
            createdById,
          },
        },
      },
      include: {
        digitalItems: true,
        events: { orderBy: { createdAt: "desc" } },
      },
    });

    return NextResponse.json({ productionOrder }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return NextResponse.json({ error: "Producto base no encontrado" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "PRODUCT_INACTIVE") {
      return NextResponse.json({ error: "El producto base está inactivo" }, { status: 400 });
    }
    console.error("[operations/production-orders/internal] POST error:", error);
    return NextResponse.json({ error: "No se pudo crear la producción interna" }, { status: 500 });
  }
}
