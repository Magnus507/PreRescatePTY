import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import {
  calculateMaterialBalance,
  getFirstValidationMessage,
  UpdateMaterialSchema,
} from "../materials.helpers";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const material = await prisma.operationMaterial.findUnique({
      where: { id },
      include: {
        events: {
          orderBy: { createdAt: "desc" },
          include: {
            createdBy: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!material) {
      return NextResponse.json(
        { error: "Material no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      material: {
        ...material,
        balance: calculateMaterialBalance(material.events),
      },
    });
  } catch (error) {
    console.error("[operations/materials/:id] GET error:", error);
    return NextResponse.json(
      { error: "Error al cargar material" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = UpdateMaterialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: getFirstValidationMessage(parsed.error) },
      { status: 400 }
    );
  }

  const data = parsed.data;

  try {
    const material = await prisma.operationMaterial.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!material) {
      return NextResponse.json(
        { error: "Material no encontrado" },
        { status: 404 }
      );
    }

    const updatedMaterial = await prisma.operationMaterial.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.unit !== undefined ? { unit: data.unit } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
        ...(data.supplierName !== undefined ? { supplierName: data.supplierName || null } : {}),
        ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    });

    return NextResponse.json({ material: updatedMaterial });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya existe un material con esos datos" },
        { status: 409 }
      );
    }

    console.error("[operations/materials/:id] PATCH error:", error);
    return NextResponse.json(
      { error: "Error al actualizar material" },
      { status: 500 }
    );
  }
}
