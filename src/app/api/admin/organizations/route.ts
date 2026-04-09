import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { generateShortCode, generateActivationCode, generateSerialPublic, SITE_URL } from "@/lib/constants";
import bcrypt from "bcryptjs";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin" && (session.user as any).role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const orgs = await prisma.organization.findMany({
      include: {
        account: {
          include: {
            chips: true // Include chips to see them in the UI
          }
        },
        _count: {
          select: { members: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ organizations: orgs });
  } catch (error) {
    console.error("Error fetching organizations", error);
    return NextResponse.json({ error: "Error fetch" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin" && (session.user as any).role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await req.json();
    const { legalName, displayName, contactEmail, maxChips, ownerEmail, ownerPassword } = data;
    const chipCount = maxChips || 30;

    if (!ownerEmail || !ownerPassword) {
      return NextResponse.json(
        { error: "Email y contraseña del administrador son requeridos" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email: ownerEmail } });
    if (existingUser) {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese email" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(ownerPassword, 10);

    // Default corporate package or active package logic
    let pkg = await prisma.package.findFirst({ where: { name: 'Corporativo' }});
    if (!pkg) {
      pkg = await prisma.package.create({
        data: { name: 'Corporativo', maxChips: chipCount, price: 450, isActive: true }
      });
    }

    const batchId = `ORG-${Date.now().toString(36).toUpperCase()}`;

    // Transaction for Account and Organization
    const newOrg = await prisma.$transaction(async (tx) => {
      const account = await tx.account.create({
        data: {
          accountType: "organization",
          accountName: legalName,
          status: "active",
          packageId: pkg.id,
          maxChipsAllocated: chipCount,
        }
      });

      // Create the organization owner user
      const ownerUser = await tx.user.create({
        data: {
          email: ownerEmail,
          passwordHash: hashedPassword,
          accountId: account.id,
          role: "owner",
          status: "active",
        }
      });

      // Link account owner
      await tx.account.update({
        where: { id: account.id },
        data: { ownerUserId: ownerUser.id },
      });

      // Create a blank profile for the owner
      await tx.profile.create({
        data: {
          userId: ownerUser.id,
          accountId: account.id,
          firstName: displayName || legalName,
          lastName: "",
          bloodType: "Pendiente",
        }
      });

      const org = await tx.organization.create({
        data: {
          accountId: account.id,
          legalName,
          displayName: displayName || legalName,
          contactEmail,
          organizationType: "company",
          status: "active"
        }
      });

      // Automatically generate chips for the new organization
      for (let i = 0; i < chipCount; i++) {
        const shortCode = generateShortCode();
        const serialPublic = generateSerialPublic();
        const activationCode = generateActivationCode();
    
        const chip = await tx.chip.create({
          data: {
            serialPublic,
            shortCode,
            nfcUrl: `${SITE_URL}/e/${shortCode}?source=nfc`,
            qrUrl: `${SITE_URL}/e/${shortCode}`,
            batchId: batchId,
            productType: "sticker_nfc_qr",
            status: "inventory",
            accountId: account.id // Assigned to this organization's account
          },
        });
    
        // Create activation token
        await tx.chipClaimToken.create({
          data: {
            chipId: chip.id,
            activationCode,
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Valid for 1 year to activate
          },
        });
      }

      return org;
    });

    return NextResponse.json({ organization: newOrg, batchId, chipCount, ownerEmail }, { status: 201 });
  } catch (error) {
    console.error("Error creating org", error);
    return NextResponse.json({ error: "Error creating organization" }, { status: 500 });
  }
}
