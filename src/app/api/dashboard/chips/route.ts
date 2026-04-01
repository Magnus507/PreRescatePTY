import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { accountId: true } });
  if (!user || !user.accountId) {
    return NextResponse.json({ chips: [] });
  }

  const chips = await prisma.chip.findMany({
    where: { accountId: user.accountId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { scanEvents: true },
      },
    },
  });

  return NextResponse.json({ chips });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const body = await req.json();
  const { chipId, action } = body;

  if (!chipId || !action) {
    return NextResponse.json({ error: "chipId y action requeridos" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { accountId: true } });
  
  if (!user || !user.accountId) {
    return NextResponse.json({ error: "Cuenta no configurada" }, { status: 400 });
  }

  const chip = await prisma.chip.findFirst({
    where: { id: chipId, accountId: user.accountId },
  });

  if (!chip) {
    return NextResponse.json({ error: "Chip no encontrado" }, { status: 404 });
  }

  let newStatus = chip.status;
  if (action === "suspend" && chip.status === "activated") {
    newStatus = "suspended";
  } else if (action === "reactivate" && chip.status === "suspended") {
    newStatus = "activated";
  } else {
    return NextResponse.json({ error: "Acción no permitida" }, { status: 400 });
  }

  await prisma.chip.update({
    where: { id: chipId },
    data: { status: newStatus },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      entityType: "chip",
      entityId: chipId,
      action,
      oldValuesJson: JSON.stringify({ status: chip.status }),
      newValuesJson: JSON.stringify({ status: newStatus }),
    },
  });

  return NextResponse.json({ message: "Chip actualizado", status: newStatus });
}
