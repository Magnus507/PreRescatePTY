import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

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

  const userId = session.user.id;
  const limiter = await rateLimit("organization-member-action", userId, { limit: 30, windowMs: 60_000 });
  if (!limiter.allowed) {
    return NextResponse.json(
      { error: "Demasiadas acciones sobre colaboradores. Intenta nuevamente en un momento." },
      { status: 429 }
    );
  }

  const { id } = await params;
  const { action } = await req.json();

  const member = await prisma.organizationMember.findUnique({
    where: { id },
    select: {
      id: true,
      organizationId: true,
      corporateStatus: true,
      corporateProfileId: true,
      profile: {
        select: {
          id: true,
          accountId: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
    },
  });
  if (!member || member.organizationId !== organization.id) {
    return NextResponse.json({ error: "Permiso denegado" }, { status: 403 });
  }

  let corporateStatus: string;

  // ── DELETE FOREVER (permanent removal of archived collaborator) ──
  if (action === "delete_forever") {
    if (member.corporateStatus !== "archived") {
      return NextResponse.json(
        { error: "Solo se puede eliminar definitivamente a colaboradores archivados." },
        { status: 400 }
      );
    }

    // Check for CorporateOrderEmployeeItems with assigned chips
    const activeItems = await prisma.corporateOrderEmployeeItem.findMany({
      where: { organizationMemberId: id },
      select: {
        id: true,
        chipId: true,
        fulfillmentStatus: true,
      },
    });

    if (activeItems.length > 0) {
      return NextResponse.json(
        { error: "Este colaborador tiene historial corporativo o chips asociados. Por seguridad permanece archivado. La reutilización/liberación de chips se hará en una fase posterior." },
        { status: 400 }
      );
    }

    // Proceed with safe deletion
    const corporateProfileId = member.corporateProfileId;

    await prisma.$transaction(async (tx) => {
      // 1. Null out corporateProfileId before deleting the Profile
      if (corporateProfileId) {
        await tx.organizationMember.update({
          where: { id },
          data: { corporateProfileId: null } as any,
        });

        // 2. Delete the corporate Profile (no other references after step 1)
        await tx.profile.delete({
          where: { id: corporateProfileId },
        });
      }

      // 3. Delete OrganizationMember (cascades to CorporateOrderEmployeeItems if any)
      await tx.organizationMember.delete({
        where: { id },
      });
    });

    return NextResponse.json({ message: "Colaborador eliminado definitivamente. La cuenta personal no fue afectada." });
  }

  // ── Existing switch for other actions ──
  switch (action) {
    case "approve":
      corporateStatus = "approved_unpaid";
      // If no corporateProfileId exists, create a corporate profile within this action
      if (!member.corporateProfileId && member.profile) {
        const corpProfile = await prisma.profile.create({
          data: {
            accountId: member.profile.accountId,
            firstName: member.profile.firstName || "Colaborador",
            lastName: member.profile.lastName || "Empresarial",
            bloodType: "Pendiente",
            profileType: "corporate",
            phone: member.profile.phone || null,
          },
        });
        // Associate the new corporate profile with the member
        await prisma.organizationMember.update({
          where: { id },
          data: { corporateProfileId: corpProfile.id },
        });
      }
      break;
    case "reject":
      corporateStatus = "rejected_by_company";
      break;
    case "suspend":
      corporateStatus = "suspended";
      break;
    case "unsuspend":
      // If member has paid items, go back to paid_active; otherwise approved_unpaid
      const hasPaidItems = await prisma.corporateOrderEmployeeItem.findFirst({
        where: {
          organizationMemberId: id,
          order: {
            organizationId: organization.id,
            paymentStatus: "paid",
          },
        },
        select: { id: true },
      });
      corporateStatus = hasPaidItems ? "paid_active" : "approved_unpaid";
      break;
    case "archive":
      corporateStatus = "archived";
      break;
    case "restore":
      if (member.corporateStatus !== "archived" && member.corporateStatus !== "rejected_by_company") {
        return NextResponse.json(
          { error: "Solo se puede restaurar desde Archivados o Rechazados." },
          { status: 400 }
        );
      }
      const hasAnyPaid = await prisma.corporateOrderEmployeeItem.findFirst({
        where: {
          organizationMemberId: id,
          order: {
            organizationId: organization.id,
            paymentStatus: "paid",
          },
        },
        select: { id: true },
      });
      corporateStatus = hasAnyPaid ? "paid_active" : "approved_unpaid";
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
