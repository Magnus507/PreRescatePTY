import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, GENERAL_ADMIN_ROLES } from "@/lib/rbac";
import { loadInventoryStockRows } from "@/lib/operations/inventory-stock";
import {
  getActivationFlowLabel,
  getDeviceTypeBadgeClass,
  getDeviceTypeLabel,
  getPurchaseFlowLabel,
  getStoreSectionLabel,
} from "@/lib/products/product-operational-mapping";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";

export async function GET() {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const [products, stockRows] = await Promise.all([
      prisma.product.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          operationalMapping: {
            include: {
              finishedGood: {
                select: { id: true, code: true, name: true, productType: true, status: true },
              },
            },
          },
        },
      }),
      loadInventoryStockRows(),
    ]);

    const stockByProductId = new Map(stockRows.map((row) => [row.storeProductId, row]));
    const stockByCode = new Map(stockRows.map((row) => [row.productCode, row]));

    const enrichedProducts = products.map((product) => {
      const mapping = product.operationalMapping || null;
      const stockRow =
        stockByProductId.get(product.id) ||
        (mapping?.productCode ? stockByCode.get(mapping.productCode) : null) ||
        stockRows.find((row) => row.productName === product.name) ||
        null;

      return {
        ...product,
        operationalMapping: mapping,
        operationalMappingMeta: mapping
          ? {
              deviceType: mapping.deviceType,
              deviceTypeLabel: getDeviceTypeLabel(mapping.deviceType),
              deviceTypeBadgeClass: getDeviceTypeBadgeClass(mapping.deviceType),
              storeSection: mapping.storeSection,
              storeSectionLabel: getStoreSectionLabel(mapping.storeSection),
              purchaseFlow: mapping.purchaseFlow,
              purchaseFlowLabel: getPurchaseFlowLabel(mapping.purchaseFlow),
              activationFlow: mapping.activationFlow,
              activationFlowLabel: getActivationFlowLabel(mapping.activationFlow),
              isPublished: mapping.isPublished,
              requiresCompanyContext: mapping.requiresCompanyContext,
              requiresApproval: mapping.requiresApproval,
              requiresPersonalization: mapping.requiresPersonalization,
              badgeLabel: mapping.badgeLabel,
              badgeColor: mapping.badgeColor,
              productCode: mapping.productCode,
              finishedGoodId: mapping.finishedGoodId,
              finishedGoodName: mapping.finishedGood?.name || null,
              finishedGoodCode: mapping.finishedGood?.code || null,
            }
          : null,
        operationalStock: stockRow
          ? {
              productCode: stockRow.productCode,
              productName: stockRow.productName,
              productType: stockRow.productType,
              storeVisible: stockRow.storeVisible,
              availableCount: stockRow.availableCount,
              reservedCount: stockRow.reservedCount,
              qaPendingCount: stockRow.qaPendingCount,
              qaFailedCount: stockRow.qaFailedCount,
              dispatchedCount: stockRow.dispatchedCount,
              deliveredCount: stockRow.deliveredCount,
              activatedCount: stockRow.activatedCount,
              totalUnits: stockRow.totalUnits,
              lastUpdatedAt: stockRow.lastUpdatedAt,
            }
          : null,
      };
    });

    return NextResponse.json({ products: enrichedProducts });
  } catch {
    return NextResponse.json({ error: "Error al cargar productos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const body = await req.json();
    const { name, description, price, category, stock, image, productType, estimatedProductionTime, requiresPersonalization } = body;

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
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
      await writeAuditLog(tx, {
        accountId: auth.session.user.accountId,
        actorUserId: auth.session.user.id,
        entityType: "Product",
        entityId: created.id,
        action: "product_created",
        requestId: getAuditRequestId(req),
        after: created,
      });
      return created;
    });

    return NextResponse.json({ product, message: "Producto creado exitosamente" });
  } catch {
    return NextResponse.json({ error: "Error al crear producto" }, { status: 500 });
  }
}
