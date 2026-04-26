import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { USER_ROLES } from "@/domains/shared/constants";

async function isAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === "admin" || session?.user?.role === "superadmin";
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json({ error: "Error al cargar productos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, description, price, category, stock, image } = body;

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        category: category || "general",
        stock: parseInt(stock) || 0,
        image,
        isActive: true
      }
    });

    return NextResponse.json({ product, message: "Producto creado exitosamente" });
  } catch (error) {
    return NextResponse.json({ error: "Error al crear producto" }, { status: 500 });
  }
}
