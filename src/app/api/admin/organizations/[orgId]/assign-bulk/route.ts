import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function isAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return false;
  const role = (session.user as { role?: string }).role;
  return role === "admin" || role === "superadmin";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { orgId } = await params;
  const body = await req.json();
  const { count } = body;

  if (!count || isNaN(count) || count <= 0) {
    return NextResponse.json({ error: "Cantidad inválida" }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
  });

  if (!org) {
    return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
  }

  // Find 'count' available chips from inventory
  const availableChips = await prisma.chip.findMany({
    where: {
      status: "inventory",
      ownerUserId: null,
      accountId: null,
    },
    take: count,
  });

  if (availableChips.length < count) {
    return NextResponse.json(
      { error: `Solo hay ${availableChips.length} chips disponibles en el inventario global. No se puede transferir ${count}.` },
      { status: 400 }
    );
  }

  // Bulk update those chips to belong to the org account
  const chipIds = availableChips.map(c => c.id);

  await prisma.chip.updateMany({
    where: { id: { in: chipIds } },
    data: {
      accountId: org.accountId,
    },
  });

  return NextResponse.json({ 
    message: `${count} chips asignados exitosamente a la empresa.`,
    assignedCount: count
  });
}
