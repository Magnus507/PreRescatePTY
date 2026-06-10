import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  TOKEN_AVAILABLE_WHERE,
  TOKEN_HISTORICAL_WHERE,
  TOKEN_RESERVED_WHERE,
} from "@/domains/chips/token-lifecycle.helpers";

export const dynamic = "force-dynamic";
import { SITE_URL } from "@/lib/constants";
import { 
  getBatchUniqueShortCodes, getBatchUniqueSerialPublics, getBatchUniqueActivationCodes 
} from "@/lib/identifiers";

async function isAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return false;
  const role = session.user.role;
  return role === "admin" || role === "superadmin" || role === "imprenta";
}

export async function GET(req: NextRequest) {
  const sessionAdmin = await isAdmin();
  
  if (!sessionAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const excludeStatus = searchParams.get("excludeStatus");
  const serviceStatus = searchParams.get("serviceStatus");
  const view = searchParams.get("view");
  const search = searchParams.get("search");
  const pointOfSaleId = searchParams.get("pointOfSaleId");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const now = new Date();

  const where: Prisma.ChipWhereInput = {};

  if (view === "available") {
    where.status = "inventory";
    where.ownerUserId = null;
    where.claimTokens = {
      none: TOKEN_RESERVED_WHERE(now),
    };
  } else if (view === "reserved") {
    where.AND = [
      { status: { not: "inventory" } },
      {
        OR: [
          { status: "sold" },
          {
            claimTokens: {
              some: TOKEN_RESERVED_WHERE(now),
            },
          },
        ],
      },
    ];
  } else if (view === "activated") {
    where.status = "activated";
  } else if (view === "returned") {
    where.status = "inventory";
    where.AND = [
      {
        OR: [
          {
            claimTokens: {
              some: TOKEN_HISTORICAL_WHERE(now),
            },
          },
        ],
      },
      {
        claimTokens: {
          none: TOKEN_AVAILABLE_WHERE(now),
        },
      },
    ];
  } else if (view === "damaged") {
    where.status = { in: ["damaged", "lost"] };
  } else if (view === "pointOfSale") {
    where.status = "consigned";
  }

  if (pointOfSaleId) {
    where.pointOfSaleId = pointOfSaleId;
  }

  if (status) {
    where.status = status;
  } else if (excludeStatus) {
    where.status = { not: excludeStatus };
  }
  
  if (serviceStatus) where.serviceStatus = serviceStatus;
  
  const accountId = searchParams.get("accountId");
  if (accountId) where.accountId = accountId;

  if (search) {
    const existingOr = where.OR ? (Array.isArray(where.OR) ? where.OR : [where.OR]) : [];
    where.OR = [
      ...existingOr,
      { serialPublic: { contains: search } },
      { shortCode: { contains: search } },
      { internalLabel: { contains: search } },
      { claimTokens: { some: { activationCode: { contains: search } } } },
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
          select: { id: true, email: true },
        },
        assignedProfile: {
          select: { id: true, firstName: true, lastName: true },
        },
        account: {
          include: {
            organizations: {
              select: { legalName: true },
              take: 1
            }
          }
        },
        pointOfSale: {
          select: { id: true, name: true },
        },
        claimTokens: {
          select: {
            id: true,
            activationCode: true,
            usedAt: true,
            expiresAt: true,
            createdAt: true,
            orderId: true,
            order: {
              select: {
                id: true,
                orderNumber: true,
                customerName: true,
                customerEmail: true,
                orderStatus: true,
                paymentStatus: true,
                user: {
                  select: {
                    id: true,
                    email: true,
                    profile: {
                      select: {
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: { scanEvents: true },
        },
      },
    }),
    prisma.chip.count({ where }),
  ]);

  const items = chips.map((chip) => {
    const latestToken = chip.claimTokens?.[0];
    const order = latestToken?.order;
    const orderCustomerName = order?.customerName ||
      (order?.user?.profile ? `${order.user.profile.firstName || ""} ${order.user.profile.lastName || ""}`.trim() : null);

    return {
      ...chip,
      activationCode: latestToken?.activationCode || null,
      pointOfSaleId: chip.pointOfSaleId,
      consignedAt: chip.consignedAt,
      pointOfSale: chip.pointOfSale
        ? {
            id: chip.pointOfSale.id,
            name: chip.pointOfSale.name,
          }
        : null,
      latestToken: latestToken
        ? {
            id: latestToken.id,
            orderId: latestToken.orderId,
            usedAt: latestToken.usedAt,
            expiresAt: latestToken.expiresAt,
            createdAt: latestToken.createdAt,
          }
        : null,
      order: order
        ? {
            id: order.id,
            orderNumber: order.orderNumber,
            orderStatus: order.orderStatus,
            paymentStatus: order.paymentStatus,
          }
        : null,
      customer: order
        ? {
            name: orderCustomerName || null,
            email: order.customerEmail || order.user?.email || null,
          }
        : null,
      profile: chip.assignedProfile
        ? {
            id: chip.assignedProfile.id,
            firstName: chip.assignedProfile.firstName,
            lastName: chip.assignedProfile.lastName,
          }
        : null,
    };
  });

  return NextResponse.json({ items, chips: items, total, page, limit, view: view || null });
}

export async function POST(req: NextRequest) {
  const sessionAdmin = await isAdmin();
  
  if (!sessionAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

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
