import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { generateOrderNumber } from "@/lib/order-number";
import { syncRealOrderToOperations } from "@/lib/operations/sync-real-order-to-operations";
import {
  buildStoreOrderInternalNote,
  calculateStoreOrderFulfillment,
  resolveStoreProductForOrder,
} from "@/lib/orders/store-order-fulfillment";
import { orderCreateSchema, validateOrThrow } from "@/lib/validations";
import { BUSINESS_RULES } from "@/domains/shared/constants";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userId = session.user.id;

  // Rate limit: 10 order creations per minute per user
  const limiter = await rateLimit("order-create", userId, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!limiter.allowed) {
    return NextResponse.json(
      { error: "Demasiados pedidos en poco tiempo. Intenta nuevamente en un minuto." },
      { status: 429 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
  
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 400 });

  try {
    const body = await req.json();
    let operationsSyncWarning: string | null = null;
    
    const validatedData = validateOrThrow(orderCreateSchema, {
      ...body,
      customerName: body.customerName || (user.profile ? `${user.profile.firstName} ${user.profile.lastName}` : "Usuario"),
      customerEmail: user.email,
    });

    type OrderItemWithOptionalRefs = {
      profileId?: string | null;
      chipId?: string | null;
      resolvedProductId?: string;
      resolvedProductCode?: string | null;
      resolvedProductName?: string;
      resolvedMappingId?: string;
      resolvedFinishedGoodId?: string;
    };

    const nextNumber = await generateOrderNumber("legacy");
    const pricedItems = await Promise.all(validatedData.items.map(async (item) => {
      const productType = item.productType.toUpperCase().replace(/\s+/g, "_");

      if (productType === "CHIP_EXTRA") {
        return { ...item, productType, unitPrice: BUSINESS_RULES.EXTRA_CHIP_PRICE };
      }

      if (productType.startsWith("COMBO_") && validatedData.providerReference) {
        const pkg = await prisma.package.findUnique({
          where: { id: validatedData.providerReference },
          select: { price: true },
        });
        if (pkg) {
          return { ...item, productType, unitPrice: pkg.price };
        }
      }

      const storeProduct = await resolveStoreProductForOrder(prisma, item.productType);

      if (storeProduct) {
        const itemAny = item as Record<string, unknown>;

        if (storeProduct.operationalMapping.deviceType === "custom_personal") {
          const profileId = itemAny.profileId as string | undefined;
          if (!profileId) {
            throw new Error(`El producto "${storeProduct.name}" requiere seleccionar un perfil médico.`);
          }

          const profile = await prisma.profile.findFirst({
            where: {
              id: profileId,
              accountId: user.accountId || undefined,
              profileType: { not: "corporate" },
            },
              include: {
                assignedChips: {
                  where: { status: "activated" },
                  take: 1,
                  select: { id: true, shortCode: true },
                },
              },
          });

          if (!profile) {
            throw new Error(`El perfil seleccionado no es válido o es corporativo.`);
          }

          const chip = profile.assignedChips[0];
          if (!chip) {
            throw new Error(
              `Este perfil no tiene un chip activo asociado. Debes activar un chip antes de comprar accesorios personalizados.`
            );
          }
          return {
            ...item,
            profileId,
            chipId: chip.id,
            productType: storeProduct.name,
            unitPrice: storeProduct.price,
            resolvedProductId: storeProduct.id,
            resolvedProductCode: storeProduct.operationalMapping.productCode,
            resolvedProductName: storeProduct.name,
            resolvedMappingId: storeProduct.operationalMapping.id,
            resolvedFinishedGoodId: storeProduct.operationalMapping.finishedGoodId,
          } as typeof item & { profileId?: string; chipId?: string | null };
        }

        return {
          ...item,
          productType: storeProduct.name,
          unitPrice: storeProduct.price,
          resolvedProductId: storeProduct.id,
          resolvedProductCode: storeProduct.operationalMapping.productCode,
          resolvedProductName: storeProduct.name,
          resolvedMappingId: storeProduct.operationalMapping.id,
          resolvedFinishedGoodId: storeProduct.operationalMapping.finishedGoodId,
        };
      }

      throw new Error("Producto invalido o no disponible");
    }));

    const fulfillmentInput = pricedItems
      .filter((item) => Boolean((item as OrderItemWithOptionalRefs).resolvedProductId))
      .map((item) => {
        const itemWithRefs = item as OrderItemWithOptionalRefs;
        return {
          productId: itemWithRefs.resolvedProductId as string,
          productName: itemWithRefs.resolvedProductName || item.productType,
          productCode: itemWithRefs.resolvedProductCode || item.productType,
          productType: item.productType,
          operationalMappingId: itemWithRefs.resolvedMappingId as string,
          finishedGoodId: itemWithRefs.resolvedFinishedGoodId as string,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        };
      });

    const { resolvedItems, summary: fulfillmentSummary } = await calculateStoreOrderFulfillment(fulfillmentInput);

    const order = await prisma.$transaction(async (tx) => {
      if (user.profile && (validatedData.shippingAddress || validatedData.shippingCity)) {
        await tx.profile.update({
          where: { id: user.profile.id },
          data: {
            address: validatedData.shippingAddress || user.profile.address,
            city: validatedData.shippingCity || user.profile.city,
          }
        });
      }

      const totalPrice = pricedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

      const createdOrder = await tx.order.create({
        data: {
          userId,
          orderNumber: nextNumber,
          amount: totalPrice,
          provider: "manual",
          orderStatus: "pending",
          paymentStatus: "pending",
          paymentMethod: (validatedData.paymentMethod as "manual" | "yappy" | "bank_transfer" | undefined) || "manual",
          shippingAddress: validatedData.shippingAddress || null,
          shippingCity: validatedData.shippingCity || null,
          shippingNotes: validatedData.shippingNotes || null,
          customerName: validatedData.customerName,
          customerEmail: validatedData.customerEmail,
          customerPhone: validatedData.customerPhone || null,
          customerDocument: validatedData.customerDocument || null,
          providerReference: validatedData.providerReference || null,
          adminReviewNotes: buildStoreOrderInternalNote(fulfillmentSummary),
          items: {
            create: pricedItems.map(item => {
              const itemWithRefs = item as OrderItemWithOptionalRefs;
              return {
                productType: item.productType,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.unitPrice * item.quantity,
                profileId: itemWithRefs.profileId ?? null,
                chipId: itemWithRefs.chipId ?? null,
              };
            })
          }
        }
      });

      return createdOrder;
    });

    try {
      await syncRealOrderToOperations(prisma, {
        sourceType: "legacy_order",
        sourceId: order.id,
        sourceCode: order.orderNumber,
        orderType: "customer",
        customerName: order.customerName || `${user.profile?.firstName || ""} ${user.profile?.lastName || ""}`.trim(),
        contactEmail: order.customerEmail,
        contactPhone: order.customerPhone,
        customerReference: order.providerReference,
        paymentStatus: order.paymentStatus,
        paymentReference: order.manualPaymentReference || order.paymentProofUrl || null,
        currency: order.currency,
        notes: `${buildStoreOrderInternalNote(fulfillmentSummary)}\nSincronizado desde pedido legacy ${order.orderNumber}`,
        totalAmount: order.amount,
        items: resolvedItems.map((item) => ({
          productCode: item.productCode,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unit: "unit",
          finishedGoodId: item.finishedGoodId,
        })),
      });
    } catch (error) {
      console.error("[operations-sync] Failed to sync order", {
        sourceType: "legacy_order",
        sourceId: order.id,
        error,
      });
      operationsSyncWarning = "Pedido creado, pero no se pudo sincronizar automáticamente con Operaciones.";
    }

    return NextResponse.json({ order, fulfillmentSummary, operationsSyncWarning });
  } catch (error: unknown) {
    console.error("ORDER_CREATE_ERROR", error);
    const message = error instanceof Error ? error.message : "Error al procesar el pedido";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userId = session.user.id;
  const providerFilter = new URL(req.url).searchParams.get("provider");
  const safeProvider = ["manual", "stripe", "admin"].includes(String(providerFilter))
    ? String(providerFilter)
    : null;

  const orders = await prisma.order.findMany({
    where: {
      userId,
      ...(safeProvider ? { provider: safeProvider } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { 
      items: {
        include: {
          profile: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayNamePublic: true,
              profileType: true,
            },
          },
          chip: {
            select: {
              id: true,
              shortCode: true,
              serialPublic: true,
              status: true,
            },
          },
        },
      },
      chipClaimTokens: {
        include: {
          chip: {
            select: {
              serialPublic: true,
              shortCode: true,
            },
          },
        },
      },
    }
  });

  return NextResponse.json({ orders });
}
