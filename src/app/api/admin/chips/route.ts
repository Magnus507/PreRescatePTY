import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
import { generateShortCode, generateActivationCode, generateSerialPublic, SITE_URL } from "@/lib/constants";

async function isAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return false;
  const role = (session.user as { role?: string }).role;
  return role === "admin" || role === "superadmin";
}

// Legacy support: also allow header-based auth for backward compatibility
function isAdminRequest(req: NextRequest): boolean {
  const adminKey = req.headers.get("x-admin-key");
  return adminKey === (process.env.ADMIN_API_KEY || "admin-dev-key-2024");
}

export async function GET(req: NextRequest) {
  const sessionAdmin = await isAdmin();
  const headerAdmin = isAdminRequest(req);
  
  if (!sessionAdmin && !headerAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const serviceStatus = searchParams.get("serviceStatus");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
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
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        owner: {
          select: { email: true },
        },
        assignedProfile: {
          select: { firstName: true, lastName: true },
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
  const sessionAdmin = await isAdmin();
  const headerAdmin = isAdminRequest(req);
  
  if (!sessionAdmin && !headerAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { count = 1, batchId, productType = "sticker_nfc_qr" } = body;

  if (count > 100) {
    return NextResponse.json(
      { error: "Máximo 100 chips por lote" },
      { status: 400 }
    );
  }

  const batch = batchId || `BATCH-${Date.now().toString(36).toUpperCase()}`;
  const createdChips = [];

  for (let i = 0; i < count; i++) {
    const shortCode = generateShortCode();
    const serialPublic = generateSerialPublic();
    const activationCode = generateActivationCode();

    const chip = await prisma.chip.create({
      data: {
        serialPublic,
        shortCode,
        nfcUrl: `${SITE_URL}/e/${shortCode}?source=nfc`,
        qrUrl: `${SITE_URL}/e/${shortCode}`,
        batchId: batch,
        productType,
        status: "inventory",
      },
    });

    // Create activation token (valid for 1 year)
    await prisma.chipClaimToken.create({
      data: {
        chipId: chip.id,
        activationCode,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });

    createdChips.push({
      id: chip.id,
      serialPublic,
      shortCode,
      activationCode,
      nfcUrl: chip.nfcUrl,
      qrUrl: chip.qrUrl,
    });
  }

  return NextResponse.json(
    { message: `${count} chips creados`, batch, chips: createdChips },
    { status: 201 }
  );
}
