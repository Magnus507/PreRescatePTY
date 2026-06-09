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
    
    const validatedData = validateOrThrow(orderCreateSchema, {
      ...body,
      customerName: body.customerName || (user.profile ? `${user.profile.firstName} ${user.profile.lastName}` : "Usuario"),
      customerEmail: user.email,
    });

    const nextNumber = await generateOrderNumber("legacy");

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

      const pricedItems = await Promise.all(validatedData.items.map(async (item) => {
        const productType = item.productType.toUpperCase().replace(/\s+/g, "_");

        if (productType === "CHIP_EXTRA") {
          return { ...item, productType, unitPrice: BUSINESS_RULES.EXTRA_CHIP_PRICE };
        }

        if (productType.startsWith("COMBO_") && validatedData.providerReference) {
          const pkg = await tx.package.findUnique({
            where: { id: validatedData.providerReference },
            select: { price: true },
          });
          if (pkg) {
            return { ...item, productType, unitPrice: pkg.price };
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
          select: { name: true, price: true, requiresPersonalization: true },
        });

        if (storeProduct) {
          const itemAny = item as Record<string, unknown>;
          
          if (storeProduct.requiresPersonalization) {
            const profileId = itemAny.profileId as string | undefined;
            if (!profileId) {
              throw new Error(`El producto "${storeProduct.name}" requiere seleccionar un perfil médico.`);
            }

            const profile = await tx.profile.findFirst({
              where: {
                id: profileId,
                accountId: user.accountId || undefined,
                profileType: { not: "corporate" },
              },
              include: {
                assignedChips: {
                  where: { status: { in: ["activated", "sold", "assigned_reserved"] } },
                  take: 1,
                  select: { id: true, shortCode: true },
                },
              },
            });

            if (!profile) {
              throw new Error(`El perfil seleccionado no es válido o es corporativo.`);
            }

            const chip = profile.assignedChips[0] || null;
            return {
              ...item,
              profileId,
              chipId: chip?.id || null,
              productType: storeProduct.name,
              unitPrice: storeProduct.price,
            } as typeof item & { profileId?: string; chipId?: string | null };
          }

          return { ...item, productType: storeProduct.name, unitPrice: storeProduct.price };
        }

        throw new Error("Producto invalido o no disponible");
      }));

      const totalPrice = pricedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

      return await tx.order.create({
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
          items: {
            create: pricedItems.map(item => ({
              productType: item.productType,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.unitPrice * item.quantity,
              profileId: (item as any).profileId || null,
              chipId: (item as any).chipId || null,
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