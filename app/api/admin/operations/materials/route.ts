import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import {
  calculateMaterialBalance,
  CreateMaterialSchema,
  getFirstValidationMessage,
} from "./materials.helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const materials = await prisma.operationMaterial.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        events: {
          select: {
            eventType: true,
            quantity: true,
          },
        },
      },
    });

    const items = materials.map((material) => ({
      ...material,
      balance: calculateMaterialBalance(material.events),
    }));

    return NextResponse.json({ materials: items });
  } catch (error) {
    console.error("[operations/materials] GET error:", error);
    return NextResponse.json(
      { error: "Error al listar materiales" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const body = await req.json().catch(() => ({}));
  const parsed = CreateMaterialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: getFirstValidationMessage(parsed.error) },
      { status: 400 }
    );
  }

  const data = parsed.data;

  try {
    const material = await prisma.operationMaterial.create({
      data: {
        code: data.code,
        name: data.name,
        category: data.category,
        unit: data.unit,
        description: data.description || null,
        supplierName: data.supplierName || null,
        notes: data.notes || null,
        status: data.status || "active",
      },
    });

    return NextResponse.json({ material }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya existe un material con ese code" },
        { status: 409 }
      );
    }

    console.error("[operations/materials] POST error:", error);
    return NextResponse.json(
      { error: "Error al crear material" },
      { status: 500 }
    );
  }
}
