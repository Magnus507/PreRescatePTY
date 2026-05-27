import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/order-number";
import { orderCreateSchema, validateOrThrow } from "@/lib/validations";
import { BUSINESS_RULES } from "@/domains/shared/constants";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userId = session.user.id;
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
  
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 400 });

  try {
    const body = await req.json();
    
    // 1. Validation
    const validatedData = validateOrThrow(orderCreateSchema, {
      ...body,
      // Ensure prices and totals come from server-side logic in a real app,
      // but here we validate types and structures from the body.
      customerName: body.customerName || (user.profile ? `${user.profile.firstName} ${user.profile.lastName}` : "Usuario"),
      customerEmail: user.email,
    });

    const nextNumber = await generateOrderNumber("legacy");

    // 3. Atomicity: Update profile and create order in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Update user profile with latest shipping info
      if (user.profile && (validatedData.shippingAddress || validatedData.shippingCity)) {
        await tx.profile.update({
          where: { id: user.profile.id },
          data: {
            address: validatedData.shippingAddress || user.profile.address,
            city: validatedData.shippingCity || user.profile.city,
          }
        });
      }

      const pricedItems = await Promise.all(validatedData.items.map(async (item) => {
        const productType = item.productType.toUpperCase().replace(/\s+/g, "_");

        if (productType === "CHIP_EXTRA") {
          return {
            ...item,
            productType,
            unitPrice: BUSINESS_RULES.EXTRA_CHIP_PRICE,
          };
        }

        if (productType.startsWith("COMBO_") && validatedData.providerReference) {
          const pkg = await tx.package.findUnique({
            where: { id: validatedData.providerReference },
            select: { price: true },
          });

          if (pkg) {
            return {
              ...item,
              productType,
              unitPrice: pkg.price,
            };
          }
        }

        const storeProduct = await tx.product.findFirst({
          where: {
            isActive: true,
            OR: [
              { id: item.productType },
              { name: item.productType },
            ],
          },
          select: { name: true, price: true },
        });

        if (storeProduct) {
          return {
            ...item,
            productType: storeProduct.name,
            unitPrice: storeProduct.price,
          };
        }

        throw new Error("Producto invalido o no disponible");
      }));

      const totalPrice = pricedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

      return await tx.order.create({
        data: {
          userId,
          orderNumber: nextNumber,
          amount: totalPrice,
          // MANUAL FLOW P1 DOMAIN CONSISTENCY
          // Legacy /api/orders must not look like manual-payment workflow orders.
          provider: "legacy",
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
          items: {
            create: pricedItems.map(item => ({
              productType: item.productType,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.unitPrice * item.quantity
            }))
          }
        }
      });
    });

    return NextResponse.json({ order });
  } catch (error: unknown) {
    console.error("ORDER_CREATE_ERROR", error);
    const message = error instanceof Error ? error.message : "Error al procesar el pedido";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // MANUAL FLOW P0 HARDENING
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
      items: true, 
      chipClaimTokens: {
        include: {
          chip: {
            select: {
              serialPublic: true,
              shortCode: true
            }
          }
        }
      } 
    }
  });

  return NextResponse.json({ orders });
}
