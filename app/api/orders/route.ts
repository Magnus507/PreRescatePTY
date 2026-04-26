import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { orderCreateSchema, validateOrThrow } from "@/lib/validations";

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

    // 2. Generate unique order number with random suffix to avoid race conditions
    const orderCount = await prisma.order.count();
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const nextNumber = `${(orderCount + 1).toString().padStart(5, '0')}-${randomSuffix}`;

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

      const totalPrice = validatedData.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

      return await tx.order.create({
        data: {
          userId,
          orderNumber: nextNumber,
          amount: totalPrice,
          orderStatus: "pending",
          paymentStatus: "pending",
          shippingAddress: validatedData.shippingAddress || null,
          shippingCity: validatedData.shippingCity || null,
          shippingNotes: validatedData.shippingNotes || null,
          customerName: validatedData.customerName,
          customerEmail: validatedData.customerEmail,
          customerPhone: validatedData.customerPhone || null,
          customerDocument: (validatedData as any).customerDocument || null,
          providerReference: (validatedData as any).providerReference || null,
          items: {
            create: validatedData.items.map(item => ({
              productType: item.productType.toUpperCase().replace(' ', '_'),
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.unitPrice * item.quantity
            }))
          }
        }
      });
    });

    return NextResponse.json({ order });
  } catch (error: any) {
    console.error("ORDER_CREATE_ERROR", error);
    return NextResponse.json({ error: error.message || "Error al procesar el pedido" }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userId = session.user.id;
  const orders = await prisma.order.findMany({
    where: { userId },
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
