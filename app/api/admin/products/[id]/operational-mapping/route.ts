import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import {
  ACTIVATION_FLOWS,
  DEVICE_TYPES,
  PURCHASE_FLOWS,
  STORE_SECTIONS,
} from "@/lib/products/product-operational-mapping";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function isOneOf<T extends readonly string[]>(value: unknown, allowed: T): value is T[number] {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true, name: true },
  });

  if (!product) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  if (body.deviceType !== undefined && !isOneOf(body.deviceType, DEVICE_TYPES)) {
    return NextResponse.json({ error: "deviceType invalido" }, { status: 400 });
  }
  if (body.storeSection !== undefined && !isOneOf(body.storeSection, STORE_SECTIONS)) {
    return NextResponse.json({ error: "storeSection invalido" }, { status: 400 });
  }
  if (body.purchaseFlow !== undefined && !isOneOf(body.purchaseFlow, PURCHASE_FLOWS)) {
    return NextResponse.json({ error: "purchaseFlow invalido" }, { status: 400 });
  }
  if (body.activationFlow !== undefined && !isOneOf(body.activationFlow, ACTIVATION_FLOWS)) {
    return NextResponse.json({ error: "activationFlow invalido" }, { status: 400 });
  }

  try {
    const finishedGoodId = typeof body.finishedGoodId === "string" && body.finishedGoodId.trim() ? body.finishedGoodId.trim() : null;
    const productCode = typeof body.productCode === "string" && body.productCode.trim() ? body.productCode.trim() : null;

    if (finishedGoodId) {
      const finishedGood = await prisma.operationFinishedGood.findUnique({
        where: { id: finishedGoodId },
        select: { id: true },
      });
      if (!finishedGood) {
        return NextResponse.json({ error: "finishedGoodId no existe" }, { status: 400 });
      }
    }

    const mapping = await prisma.$transaction(async (tx) => {
      const current = await tx.productOperationalMapping.findUnique({ where: { productId: id } });
      const updated = await tx.productOperationalMapping.upsert({
        where: { productId: id },
        create: {
          productId: id,
          finishedGoodId,
          productCode,
          deviceType: body.deviceType || "future",
          storeSection: body.storeSection || "future",
          purchaseFlow: body.purchaseFlow || "coming_soon",
          activationFlow: body.activationFlow || "none",
          isPublished: Boolean(body.isPublished),
          requiresCompanyContext: Boolean(body.requiresCompanyContext),
          requiresApproval: Boolean(body.requiresApproval),
          requiresPersonalization: Boolean(body.requiresPersonalization),
          sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
          badgeLabel: typeof body.badgeLabel === "string" ? body.badgeLabel : null,
          badgeColor: typeof body.badgeColor === "string" ? body.badgeColor : null,
        },
        update: {
          finishedGoodId,
          productCode,
          deviceType: body.deviceType,
          storeSection: body.storeSection,
          purchaseFlow: body.purchaseFlow,
          activationFlow: body.activationFlow,
          isPublished: Boolean(body.isPublished),
          requiresCompanyContext: Boolean(body.requiresCompanyContext),
          requiresApproval: Boolean(body.requiresApproval),
          requiresPersonalization: Boolean(body.requiresPersonalization),
          sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : undefined,
          badgeLabel: typeof body.badgeLabel === "string" ? body.badgeLabel : null,
          badgeColor: typeof body.badgeColor === "string" ? body.badgeColor : null,
        },
      });
      await writeAuditLog(tx, {
        accountId: auth.session.user.accountId,
        actorUserId: auth.session.user.id,
        entityType: "ProductOperationalMapping",
        entityId: id,
        action: "product_operational_mapping_updated",
        requestId: getAuditRequestId(req),
        before: current,
        after: updated,
      });
      return updated;
    });

    return NextResponse.json({ mapping });
  } catch (error) {
    console.error("[admin/products/:id/operational-mapping] PATCH error:", error);
    return NextResponse.json({ error: "No se pudo actualizar el mapping" }, { status: 500 });
  }
}
