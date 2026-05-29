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

  switch (action) {
    case "approve":
      corporateStatus = "approved_unpaid";
      break;
    case "reject":
      corporateStatus = "rejected_by_company";
      break;
    case "suspend":
      corporateStatus = "suspended";
      break;
    case "unsuspend":
      corporateStatus = "approved_unpaid";
      break;
    case "archive":
      corporateStatus = "archived";
      break;
    default:
      return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  }

  // Validate: if member has a pending corporate order, block reject/archive
  if (action === "reject" || action === "archive") {
    if (member.corporateStatus === "approved_unpaid") {
      const pendingOrder = await prisma.corporateOrderEmployeeItem.findFirst({
        where: {
          organizationMemberId: id,
          order: {
            organizationId: organization.id,
            paymentStatus: "under_review",
            adminReviewStatus: "pending",
          },
        },
        select: { id: true },
      });
      if (pendingOrder) {
        return NextResponse.json(
          { error: "Este colaborador tiene una compra enviada pendiente. Cancela primero la compra en Pagos enviados." },
          { status: 400 }
        );
      }
    }
  }

  const updated = await prisma.organizationMember.update({
    where: { id },
    data: { corporateStatus },
  });

  return NextResponse.json({ member: updated, message: "Estado actualizado" });
}
