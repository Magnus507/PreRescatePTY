import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/order-number";
import { syncRealOrderToOperations } from "@/lib/operations/sync-real-order-to-operations";
import { z } from "zod";

const ManualOrderSchema = z.object({
  packageId: z.string(),
  customerName: z.string().min(2),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  customerDocument: z.string().optional(),
  shippingAddress: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingNotes: z.string().optional(),
  paymentMethod: z.enum(["yappy", "bank_transfer"]),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userId = session.user.id;
  const body = await req.json();
  const parsed = ManualOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;


  // Validar que el paquete existe y está activo
  const pkg = await prisma.package.findUnique({
    where: { id: data.packageId },
    select: { id: true, name: true, price: true, maxChips: true, isActive: true }
  });
  if (!pkg || !pkg.isActive) {
    return NextResponse.json({ error: "Paquete no disponible" }, { status: 400 });
  }


  const orderNumber = await generateOrderNumber("manual");
  // Crear la orden manual
  const order = await prisma.$transaction(async (tx) => {
    const createdOrder = await tx.order.create({
      data: {
        userId,
        orderNumber,
        amount: pkg.price,
        orderStatus: "pending",
        paymentStatus: "pending",
        paymentMethod: data.paymentMethod,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone || null,
        customerDocument: data.customerDocument || null,
        shippingAddress: data.shippingAddress || null,
        shippingCity: data.shippingCity || null,
        shippingNotes: data.shippingNotes || null,
        provider: "manual",
        packageId: pkg.id,
        items: {
          create: [
            {
              productType: pkg.name,
              quantity: pkg.maxChips,
              unitPrice: pkg.price,
              totalPrice: pkg.price,
            },
          ],
        },
      }
    });

    return createdOrder;
  });

  let operationsSyncWarning: string | null = null;
  try {
    await syncRealOrderToOperations(prisma, {
      sourceType: "checkout",
      sourceId: order.id,
      sourceCode: order.orderNumber,
      orderType: "customer",
      customerName: order.customerName,
      contactEmail: order.customerEmail,
      contactPhone: order.customerPhone,
      customerReference: order.providerReference,
      paymentStatus: order.paymentStatus,
      paymentReference: order.manualPaymentReference || order.paymentProofUrl || null,
      currency: order.currency,
      notes: "Sincronizado desde pedido manual de paquete",
      totalAmount: order.amount,
      items: [
        {
          productCode: pkg.name,
          productName: pkg.name,
          quantity: 1,
          unitPrice: order.amount,
          unit: "unit",
        },
      ],
    });
  } catch (error) {
    console.error("[operations-sync] Failed to sync order", {
      sourceType: "checkout",
      sourceId: order.id,
      error,
    });
    operationsSyncWarning = "Pedido creado, pero no se pudo sincronizar automáticamente con Operaciones.";
  }

  return NextResponse.json({ order, operationsSyncWarning });
}
