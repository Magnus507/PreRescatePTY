import { NextRequest, NextResponse } from "next/server";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const productCode = req.nextUrl.searchParams.get("productCode")?.trim();
  if (!productCode) {
    return NextResponse.json({ error: "productCode es requerido" }, { status: 400 });
  }

  try {
    const units = await prisma.operationFinishedGoodUnit.findMany({
      where: {
        productCode,
        qaStatus: "passed",
        status: "available",
        activationStatus: "not_activated",
        reservedOrderId: null,
        internalLabel: { not: "" },
      },
      select: {
        id: true,
        internalLabel: true,
        productCode: true,
        productName: true,
        qaStatus: true,
        activationStatus: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: "asc" }, { internalLabel: "asc" }],
    });

    return NextResponse.json({
      success: true,
      units: units.map((unit) => ({
        id: unit.id,
        internalLabel: unit.internalLabel,
        shortCode: null,
        productCode: unit.productCode,
        productName: unit.productName,
        qaStatus: unit.qaStatus,
        inventoryStatus: "available",
        activationStatus: unit.activationStatus,
        createdAt: unit.createdAt,
      })),
    });
  } catch (error) {
    console.error("[operations/inventory/available-units] GET error:", error);
    return NextResponse.json({ error: "Error al cargar unidades disponibles" }, { status: 500 });
  }
}
