import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
import { SITE_URL } from "@/lib/constants";
import { 
  getBatchUniqueShortCodes, getBatchUniqueSerialPublics, getBatchUniqueActivationCodes 
} from "@/lib/identifiers";
import { requireRole, ORDER_ADMIN_ROLES } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const auth = await requireRole(ORDER_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const excludeStatus = searchParams.get("excludeStatus");
  const serviceStatus = searchParams.get("serviceStatus");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: Prisma.ChipWhereInput = {};
  if (status) {
    where.status = status;
  } else if (excludeStatus) {
    where.status = { not: excludeStatus };
  }
  
  if (serviceStatus) where.serviceStatus = serviceStatus;
  
  const accountId = searchParams.get("accountId");
  if (accountId) where.accountId = accountId;

  if (search) {
    where.OR = [
      { serialPublic: { contains: search } },
      { shortCode: { contains: search } },
      { owner: { email: { contains: search } } },
    ];
  }

  const [chips, total] = await Promise.all([
    prisma.chip.findMany({
      where,
      orderBy: [
        { owner: { email: 'asc' } },
        { createdAt: "desc" }
      ],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        owner: {
          select: { email: true },
        },
        assignedProfile: {
          select: { firstName: true, lastName: true },
        },
        account: {
          include: {
            organizations: {
              select: { legalName: true },
              take: 1
            }
          }
        },
        claimTokens: {
          select: { activationCode: true, usedAt: true },
        },
        _count: {
          select: { scanEvents: true },
        },
      },
    }),
    prisma.chip.count({ where }),
  ]);

  return NextResponse.json({ chips, total, page, limit });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(ORDER_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const body = await req.json();
  const { count = 1, batchId, productType = "sticker_nfc_qr", labelBase = "Caja", labelStart = 1 } = body;
  const chipCount = Number(count);

  if (!Number.isInteger(chipCount) || chipCount < 1 || chipCount > 100) {
    return NextResponse.json(
      { error: "Máximo 100 chips por lote" },
      { status: 400 }
    );
  }

  const batch = batchId || `BATCH-${Date.now().toString(36).toUpperCase()}`;

  // 1. Generate all unique codes in batches (3 DB roundtrips instead of 3 * count)
  const [shortCodes, serials, activationCodes] = await Promise.all([
    getBatchUniqueShortCodes(chipCount),
    getBatchUniqueSerialPublics(chipCount),
    getBatchUniqueActivationCodes(chipCount),
  ]);

  const nextSequence = Number(labelStart) || 1;

  // 3. Perform everything in a single transaction
  const createdChips = await prisma.$transaction(async (tx) => {
    const results = [];
    
    for (let i = 0; i < chipCount; i++) {
        const shortCode = shortCodes[i];
        const serialPublic = serials[i];
        const activationCode = activationCodes[i];
        const internalLabel = `${labelBase} ${String(nextSequence + i).padStart(5, '0')}`; // Pad with 5 zeros 00001

        const chip = await tx.chip.create({
            data: {
                serialPublic,
                shortCode,
                internalLabel,
                nfcUrl: `${SITE_URL}/e/${shortCode}?source=nfc`,
                qrUrl: `/api/public/qr?data=${encodeURIComponent(`${SITE_URL}/e/${shortCode}`)}`,
                batchId: batch,
                productType,
                status: "inventory",
            },
        });

        await tx.chipClaimToken.create({
            data: {
                chipId: chip.id,
                activationCode,
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            },
        });

        results.push({
            id: chip.id,
            serialPublic,
            shortCode,
            activationCode,
            nfcUrl: chip.nfcUrl,
            qrUrl: chip.qrUrl,
        });
    }
    return results;
  });

  return NextResponse.json(
    { message: `${chipCount} chips creados`, batch, chips: createdChips },
    { status: 201 }
  );
}
