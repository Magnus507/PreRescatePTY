import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/order-number";
import { z } from "zod";

const ManualOrderSchema = z.object({
  packageId: z.string(),
  quantity: z.number().int().min(1).max(99).default(1),
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
  const comboQuantity = data.quantity ?? 1;
  const totalAmount = pkg.price * comboQuantity;
  const totalChips = pkg.maxChips * comboQuantity;

  // Crear la orden manual
  const order = await prisma.order.create({
    data: {
      userId,
      orderNumber,
      amount: totalAmount,
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
            quantity: totalChips,
            unitPrice: pkg.price,
            totalPrice: totalAmount,
          },
        ],
      },
    }
  });

  return NextResponse.json({ order });
}
