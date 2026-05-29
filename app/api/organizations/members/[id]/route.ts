import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.accountId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const organization = await prisma.organization.findFirst({
    where: { accountId: session.user.accountId },
    select: { id: true },
  });
  if (!organization) {
    return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
  }

  const { id } = await params;
  const { action } = await req.json();

  const member = await prisma.organizationMember.findUnique({ where: { id } });
  if (!member || member.organizationId !== organization.id) {
    return NextResponse.json({ error: "Permiso denegado" }, { status: 403 });
  }

  let corporateStatus: string;
  if (action === "approve") corporateStatus = "approved_unpaid";
  else if (action === "reject") corporateStatus = "rejected_by_company";
  else return NextResponse.json({ error: "Acción no válida" }, { status: 400 });

  const updated = await prisma.organizationMember.update({
    where: { id },
    data: { corporateStatus },
  });

  return NextResponse.json({ member: updated, message: "Estado actualizado" });
}
