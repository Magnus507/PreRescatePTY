import { NextResponse } from "next/server";
import { ACCOUNT_TYPES } from "@/domains/shared/constants";
import { prisma } from "@/lib/prisma";
// SITE_URL removed — no longer needed for chip creation during org setup
// getUniqueShortCode/getUniqueSerialPublic/getUniqueActivationCode removed — chips are assigned post-creation
import bcrypt from "bcryptjs";
import { requireRole, GENERAL_ADMIN_ROLES } from "@/lib/rbac";

const CORPORATE_PACKAGE_SLUG = "combo-corporativo";

function normalizeCompanyCode(input?: string | null) {
  if (!input) return null;
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 16) || null;
}

async function generateUniqueCompanyCode(base: string) {
  const now = new Date();
  const year = now.getFullYear().toString();
  const seed = base
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 5) || "EMP";

  for (let i = 0; i < 10; i++) {
    const suffix = i === 0 ? "" : Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 2);
    const candidate = `${seed}${year}${suffix}`.slice(0, 16);
    const exists = await prisma.organization.findUnique({ where: { companyCode: candidate } });
    if (!exists) return candidate;
  }

  return `EMP${Date.now().toString(36).toUpperCase()}`.slice(0, 16);
}

export async function GET() {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

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
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const data = await req.json();
    const { legalName, displayName, contactEmail, maxChips, ownerPassword, organizationType, contactPhone, companyCode } = data;
    const ownerEmail = (data.ownerEmail as string || "").toLowerCase().trim();
    const chipCount = Number(maxChips) || 30;

    if (!ownerEmail || !ownerPassword) {
      return NextResponse.json(
        { error: "Email y contraseña del administrador son requeridos" },
        { status: 400 }
      );
    }
    if (ownerPassword.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres" },
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

    // Determine the corporate package by explicit packageId or the canonical seed slug.
    let pkg = null;
    if (data.packageId) {
      pkg = await prisma.package.findUnique({ where: { id: data.packageId } });
    } else {
      pkg = await prisma.package.findUnique({ where: { slug: CORPORATE_PACKAGE_SLUG } });
    }

    if (!pkg || !pkg.isActive || pkg.accountType !== ACCOUNT_TYPES.COMPANY) {
      return NextResponse.json(
        { error: 'Paquete corporativo no encontrado, inactivo o no válido. Debe tener accountType "company".' },
        { status: 400 }
      );
    }

    const normalizedCode = normalizeCompanyCode(companyCode);
    if (normalizedCode) {
      const exists = await prisma.organization.findUnique({ where: { companyCode: normalizedCode } });
      if (exists) {
        return NextResponse.json({ error: "El código empresarial ya existe" }, { status: 409 });
      }
    }
    const resolvedCompanyCode = normalizedCode || await generateUniqueCompanyCode(displayName || legalName);

    // Transaction for Account and Organization (no chips created — assigned post-creation)
    const newOrg = await prisma.$transaction(async (tx) => {
      const account = await tx.account.create({
        data: {
          accountType: ACCOUNT_TYPES.COMPANY,
          accountName: legalName,
          status: "active",
          packageId: pkg.id,
          maxChipsAllocated: chipCount,
          maxProfilesAllocated: chipCount,
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
          companyCode: resolvedCompanyCode,
          contactEmail,
          contactPhone: contactPhone || null,
          organizationType: organizationType || "industrial",
          status: "active"
        }
      });

      // NOTE: Chips are no longer created automatically when a company is set up.
      // Chips are assigned later via inventory/assign-bulk/assign-chip endpoints.

      return org;
    }, { timeout: 10000 }); // 10s timeout — no batch chip creation needed

    // Chips are NOT created during org setup — they are assigned later.
    // maxChipsAllocated remains as the capacity cap for future chip assignments.
    return NextResponse.json({ organization: newOrg, ownerEmail, maxChipsAllocated: chipCount }, { status: 201 });
  } catch (err: unknown) {
    console.error("Error creating org", err);
    const e = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ 
      error: "Error creating organization", 
      details: e.message || String(err)
    }, { status: 500 });
  }
}
