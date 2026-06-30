import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import {
  calculateMaterialBalance,
  CreateMaterialEventSchema,
  getFirstValidationMessage,
} from "../../materials.helpers";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = CreateMaterialEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: getFirstValidationMessage(parsed.error) },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const createdById = auth.session.user.id || null;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const material = await tx.operationMaterial.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!material) {
        return null;
      }

      const event = await tx.operationMaterialEvent.create({
        data: {
          materialId: id,
          eventType: data.eventType,
          quantity: data.quantity,
          unit: data.unit,
          reason: data.reason || null,
          referenceType: data.referenceType || null,
          referenceId: data.referenceId || null,
          metadataJson: data.metadataJson || null,
          createdById,
        },
      });

      const events = await tx.operationMaterialEvent.findMany({
        where: { materialId: id },
        select: {
          eventType: true,
          quantity: true,
        },
      });

      return {
        event,
        balance: calculateMaterialBalance(events),
      };
    });

    if (!result) {
      return NextResponse.json(
        { error: "Material no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("[operations/materials/:id/events] POST error:", error);
    return NextResponse.json(
      { error: "Error al crear evento de material" },
      { status: 500 }
    );
  }
}
