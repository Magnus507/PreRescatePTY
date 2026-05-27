import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
    select: { id: true, name: true, price: true, isActive: true }
  });
  if (!pkg || !pkg.isActive) {
    return NextResponse.json({ error: "Paquete no disponible" }, { status: 400 });
  }


  // Generar un orderNumber único (ejemplo: timestamp + random)
  const orderNumber = `M-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  // Crear la orden manual
  try {
    const order = await prisma.order.create({
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
          create: [{
            productType: pkg.name,
            quantity: 1,
            unitPrice: pkg.price,
            totalPrice: pkg.price
          }]
        }
      }
    });

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Manual order create failed", error);
    return NextResponse.json(
      {
        error: "No se pudo crear el pedido",
        details: error instanceof Error ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
