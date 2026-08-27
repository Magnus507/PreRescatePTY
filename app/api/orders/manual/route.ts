import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/order-number";
import { syncRealOrderToOperations } from "@/lib/operations/sync-real-order-to-operations";
import { parseMoney, serializeMoney } from "@/lib/money";
import { rateLimit } from "@/lib/rateLimit";
import { z } from "zod";

const ManualOrderSchema = z.object({
  packageId: z.string().trim().min(1),
  customerName: z.string().trim().min(2, "Nombre de quien recibe requerido").max(200),
  customerPhone: z.string().trim().min(7, "Teléfono de contacto requerido").max(30),
  customerDocument: z.string().trim().max(100).optional(),
  shippingAddress: z.string().trim().min(5, "Dirección de entrega requerida").max(500),
  shippingCity: z.string().trim().min(2, "Ciudad o área de entrega requerida").max(100),
  shippingNotes: z.string().trim().max(500).optional().default(""),
  paymentMethod: z.enum(["yappy", "bank_transfer"]),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userId = session.user.id;
  const limiter = await rateLimit("manual-package-order", userId, {
    limit: 10,
    windowMs: 60_000 * 15,
  });
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Demasiados intentos. Intenta más tarde." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ManualOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, accountId: true, status: true, deletedAt: true },
  });
  if (!user || user.deletedAt || user.status !== "active" || !user.accountId) {
    return NextResponse.json({ error: "Cuenta no disponible" }, { status: 403 });
  }

  // The authenticated account owns the commercial identity. Never trust an email
  // sent by the browser for an order that will later change account entitlements.
  const customerEmail = user.email;

  const pkg = await prisma.package.findUnique({
    where: { id: data.packageId },
    select: {
      id: true,
      name: true,
      price: true,
      maxChips: true,
      isActive: true,
      accountType: true,
    },
  });
  if (!pkg || !pkg.isActive) {
    return NextResponse.json({ error: "Paquete no disponible" }, { status: 400 });
  }

  const account = await prisma.account.findUnique({
    where: { id: user.accountId },
    select: { accountType: true },
  });
  if (!account) {
    return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
  }

  if (pkg.accountType === "company" && account.accountType !== "company") {
    return NextResponse.json(
      { error: "Los paquetes empresariales se gestionan mediante el flujo corporativo." },
      { status: 400 }
    );
  }

  const orderNumber = await generateOrderNumber();
  const order = await prisma.$transaction(async (tx) => {
    return tx.order.create({
      data: {
        userId,
        orderNumber,
        amount: parseMoney(pkg.price),
        orderStatus: "pending",
        paymentStatus: "pending",
        paymentMethod: data.paymentMethod,
        customerName: data.customerName,
        customerEmail,
        customerPhone: data.customerPhone,
        customerDocument: data.customerDocument || null,
        shippingAddress: data.shippingAddress,
        shippingCity: data.shippingCity,
        shippingNotes: data.shippingNotes || null,
        provider: "manual",
        packageId: pkg.id,
        items: {
          create: [
            {
              productType: pkg.name,
              quantity: pkg.maxChips,
              unitPrice: parseMoney(pkg.price),
              totalPrice: parseMoney(pkg.price),
            },
          ],
        },
      },
      include: { items: true },
    });
  });

  let operationsSyncWarning: string | null = null;
  try {
    await syncRealOrderToOperations(prisma, {
      sourceType: "customer_request",
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
      notes: `Pedido de paquete ${pkg.name}. orderId:${order.id}`,
      totalAmount: order.amount,
      items: [
        {
          productCode: `PACKAGE:${pkg.id}`,
          productName: pkg.name,
          quantity: pkg.maxChips,
          unitPrice: pkg.maxChips > 0 ? Number(order.amount) / pkg.maxChips : Number(order.amount),
          unit: "unit",
        },
      ],
    });
  } catch (error) {
    console.error("[operations-sync] Failed to sync package order", {
      sourceType: "customer_request",
      sourceId: order.id,
      error,
    });
    operationsSyncWarning = "Pedido creado, pero no se pudo sincronizar automáticamente con Operaciones.";
  }

  return NextResponse.json({
    order: {
      ...order,
      amount: serializeMoney(order.amount),
      items: (order.items ?? []).map((item) => ({
        ...item,
        unitPrice: serializeMoney(item.unitPrice),
        totalPrice: serializeMoney(item.totalPrice),
      })),
    },
    operationsSyncWarning,
  });
}
