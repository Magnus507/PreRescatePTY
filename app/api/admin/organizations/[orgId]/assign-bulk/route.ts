import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/constants";
import { getUniqueShortCode, getUniqueSerialPublic, getUniqueActivationCode } from "@/lib/identifiers";
import { requireRole, GENERAL_ADMIN_ROLES } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { orgId } = await params;
  const body = await req.json();
  const { count } = body;

  if (!count || isNaN(count) || count <= 0) {
    return NextResponse.json({ error: "Cantidad inválida" }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: { account: { select: { id: true, maxChipsAllocated: true } } },
  });

  if (!org) {
    return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
  }

  // Check how many chips the org already has
  const existingCount = await prisma.chip.count({
    where: { accountId: org.account.id },
  });

  const available = org.account.maxChipsAllocated - existingCount;
  if (count > available) {
    return NextResponse.json(
      { error: `El paquete solo admite ${org.account.maxChipsAllocated} chips. Ya tiene ${existingCount}. Máximo a transferir: ${available}.` },
      { status: 400 }
    );
  }

  // Try to pull from global inventory pool first (accountId: null)
  const globalChips = await prisma.chip.findMany({
    where: { status: "inventory", accountId: null, ownerUserId: null },
    take: count,
    select: { id: true },
  });

  let assigned = 0;

  if (globalChips.length > 0) {
    // Move existing global chips to this org
    const chipIds = globalChips.map((c) => c.id);
    await prisma.chip.updateMany({
      where: { id: { in: chipIds } },
      data: { accountId: org.account.id },
    });

    // Create missing activation tokens for chips that don't have one
    for (const chip of globalChips) {
      const existing = await prisma.chipClaimToken.findFirst({ where: { chipId: chip.id, usedAt: null } });
      if (!existing) {
        await prisma.chipClaimToken.create({
          data: {
            chipId: chip.id,
            activationCode: await getUniqueActivationCode(),
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        });
      }
    }
    assigned += globalChips.length;
  }

  // If global pool was short, create new chips to fill the rest
  const toCreate = count - assigned;
  if (toCreate > 0) {
    const batchId = `ORG-ADD-${Date.now().toString(36).toUpperCase()}`;

    // Pre-generate safe codes
    const chipDataBatch: { shortCode: string; serialPublic: string; activationCode: string }[] = [];
    for (let i = 0; i < toCreate; i++) {
      chipDataBatch.push({
        shortCode: await getUniqueShortCode(),
        serialPublic: await getUniqueSerialPublic(),
        activationCode: await getUniqueActivationCode(),
      });
    }

    for (const codes of chipDataBatch) {
      const { shortCode, serialPublic, activationCode } = codes;

      const chip = await prisma.chip.create({
        data: {
          serialPublic,
          shortCode,
          nfcUrl: `${SITE_URL}/e/${shortCode}?source=nfc`,
          qrUrl: `${SITE_URL}/e/${shortCode}`,
          batchId,
          productType: "sticker_nfc_qr",
          status: "inventory",
          accountId: org.account.id,
        },
      });

      await prisma.chipClaimToken.create({
        data: {
          chipId: chip.id,
          activationCode,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });
    }
    assigned += toCreate;
  }

  return NextResponse.json({
    message: `${assigned} chip(s) transferidos exitosamente a la empresa.`,
    assignedCount: assigned,
    fromGlobalPool: globalChips.length,
    newlyCreated: toCreate,
  });
}
