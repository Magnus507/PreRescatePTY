import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ACCOUNT_TYPES } from "@/domains/shared/constants";
import { requireRole, GENERAL_ADMIN_ROLES } from "@/lib/rbac";
import { revealActivationCode } from "@/domains/chips/activation-code.service";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET organization detail with chips, members, account
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { orgId } = await params;

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      account: {
        include: {
          package: true,
          chips: {
            orderBy: { createdAt: "desc" },
            include: {
              owner: { select: { email: true } },
              assignedProfile: { select: { firstName: true, lastName: true } },
              claimTokens: { select: { activationCode: true, usedAt: true } },
              _count: { select: { scanEvents: true } },
            },
          },
          users: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              email: true,
              phone: true,
              role: true,
              status: true,
              createdAt: true,
              lastLoginAt: true,
              profile: {
                select: { firstName: true, lastName: true, bloodType: true },
              },
              _count: { select: { chips: true } },
            },
          },
        },
      },
      members: {
        include: {
          profile: {
            select: { firstName: true, lastName: true, bloodType: true },
          },
        },
      },
    },
  });

  if (!org) {
    return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
  }

  return NextResponse.json({
    organization: {
      ...org,
      account: org.account
        ? {
            ...org.account,
            chips: org.account.chips.map((chip) => ({
              ...chip,
              claimTokens: chip.claimTokens.map((token) => ({
                ...token,
                activationCode: revealActivationCode(token.activationCode),
              })),
            })),
          }
        : null,
    },
  });
}

// PATCH - update organization fields
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { orgId } = await params;
  const requestId = getAuditRequestId(req);
  const body = await req.json();
  const { legalName, displayName, contactEmail, contactPhone, taxId, address, status, packageId, maxChips, companyCode } = body;

  const updateData: Partial<{ legalName: string; displayName: string; contactEmail: string; contactPhone: string; taxId: string; address: string; status: string; companyCode: string | null }> = {};
  if (legalName !== undefined) updateData.legalName = legalName;
  if (displayName !== undefined) updateData.displayName = displayName;
  if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
  if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
  if (taxId !== undefined) updateData.taxId = taxId;
  if (address !== undefined) updateData.address = address;
  if (status === "active" || status === "suspended" || status === "archived") updateData.status = status;
  if (companyCode !== undefined) {
    const normalized = String(companyCode || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 16) || null;

    if (normalized) {
      const existing = await prisma.organization.findUnique({ where: { companyCode: normalized } });
      if (existing && existing.id !== orgId) {
        return NextResponse.json({ error: "El código empresarial ya existe" }, { status: 409 });
      }
    }

    updateData.companyCode = normalized;
  }

  // Validate all cross-entity input before changing either Organization or Account.
  const pkg = packageId
    ? await prisma.package.findUnique({ where: { id: packageId } })
    : null;
  if (packageId && (!pkg || !pkg.isActive || pkg.accountType !== ACCOUNT_TYPES.COMPANY)) {
    return NextResponse.json(
      { error: 'Package inválido, inactivo o no corporativo. Debe tener accountType "company".' },
      { status: 400 }
    );
  }

  try {
    const org = await prisma.$transaction(async (tx) => {
      const current = await tx.organization.findUnique({
        where: { id: orgId },
        select: {
          id: true,
          accountId: true,
          legalName: true,
          displayName: true,
          status: true,
          companyCode: true,
          account: { select: { packageId: true, maxChipsAllocated: true } },
        },
      });
      if (!current) throw new Error("ORGANIZATION_NOT_FOUND");

      const updated = await tx.organization.update({ where: { id: orgId }, data: updateData });
      if (packageId !== undefined || maxChips !== undefined) {
        await tx.account.update({
          where: { id: current.accountId },
          data: {
            packageId: pkg?.id,
            accountType: pkg?.accountType,
            maxChipsAllocated: maxChips !== undefined ? Number(maxChips) : undefined,
          },
        });
      }

      await writeAuditLog(tx, {
        accountId: current.accountId,
        actorUserId: auth.session.user.id || null,
        entityType: "organization",
        entityId: current.id,
        action: "organization.updated",
        requestId,
        before: {
          legalName: current.legalName,
          displayName: current.displayName,
          status: current.status,
          companyCode: current.companyCode,
          packageId: current.account?.packageId || null,
          maxChipsAllocated: current.account?.maxChipsAllocated || null,
        },
        after: {
          legalName: updated.legalName,
          displayName: updated.displayName,
          status: updated.status,
          companyCode: updated.companyCode,
          packageId: packageId !== undefined ? pkg?.id || null : undefined,
          maxChipsAllocated: maxChips !== undefined ? Number(maxChips) : undefined,
        },
      });
      return updated;
    });

    return NextResponse.json({ organization: org });
  } catch (error) {
    if (error instanceof Error && error.message === "ORGANIZATION_NOT_FOUND") {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    }
    throw error;
  }
}

// DELETE - remove organization and its account
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { orgId } = await params;
  const requestId = getAuditRequestId(req);

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: { account: { include: { users: true } } },
  });

  if (!org) {
    return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
  }

  const accountId = org.accountId;
  await prisma.$transaction(async (tx) => {
    await tx.organizationMember.deleteMany({ where: { organizationId: orgId } });
    await tx.organization.delete({ where: { id: orgId } });
    await tx.chip.updateMany({
      where: { accountId },
      data: { accountId: null, ownerUserId: null, assignedProfileId: null, status: "inventory", serviceStatus: "active" },
    });

    for (const user of org.account.users) {
      const profile = await tx.profile.findUnique({ where: { userId: user.id } });
      if (profile) {
        await tx.organizationMember.deleteMany({ where: { profileId: profile.id } });
        await tx.scanEvent.deleteMany({ where: { profileId: profile.id } });
        await tx.profileContact.deleteMany({ where: { profileId: profile.id } });
        await tx.profile.delete({ where: { id: profile.id } });
      }
      await tx.contact.deleteMany({ where: { userId: user.id } });
      await tx.auditLog.deleteMany({ where: { actorUserId: user.id } });
      await tx.notification.deleteMany({ where: { recipient: user.email } });
      await tx.user.delete({ where: { id: user.id } });
    }

    await tx.profile.deleteMany({ where: { accountId } });
    await tx.account.delete({ where: { id: accountId } });
    await writeAuditLog(tx, {
      accountId,
      actorUserId: auth.session.user.id || null,
      entityType: "organization",
      entityId: orgId,
      action: "organization.deleted",
      requestId,
      before: { legalName: org.legalName, displayName: org.displayName, accountId, userCount: org.account.users.length },
      after: { chipsReturnedToInventory: true },
    });
  });

  return NextResponse.json({ message: "Empresa eliminada correctamente" });
}
