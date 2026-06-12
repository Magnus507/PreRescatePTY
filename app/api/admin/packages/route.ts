import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, GENERAL_ADMIN_ROLES } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const ACTIVE_PACKAGE_ACCOUNT_TYPES = ["personal", "company"] as const;

function isValidActivePackageAccountType(accountType: string) {
  return ACTIVE_PACKAGE_ACCOUNT_TYPES.includes(
    accountType as (typeof ACTIVE_PACKAGE_ACCOUNT_TYPES)[number]
  );
}

export async function GET() {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const packages = await prisma.package.findMany({
    orderBy: { displayOrder: "asc" },
  });

  return NextResponse.json({ packages });
}

export async function POST(req: Request) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const data = await req.json();
    const accountType = data.accountType || "personal";
    const isActive = data.isActive ?? true;

    if (isActive && !isValidActivePackageAccountType(accountType)) {
      return NextResponse.json(
        { error: 'Los paquetes activos solo pueden usar accountType "personal" o "company".' },
        { status: 400 }
      );
    }

    const pkg = await prisma.package.create({
      data: {
        name: data.name,
        slug: data.name.toLowerCase().replace(/ /g, '-'),
        maxChips: data.maxChips,
        maxProfiles: data.maxProfiles || 1,
        price: data.price,
        description: data.description,
        isActive,
        accountType,
        icon: data.icon,
        color: data.color || "standard",
        recommended: data.recommended ?? false,
        displayOrder: data.displayOrder ?? 0,
        allowsFamilyProfiles: data.allowsFamilyProfiles ?? false,
        allowsOrganizationModule: data.allowsOrganizationModule ?? false,
        allowsSchoolModule: data.allowsSchoolModule ?? false,
        serviceDurationMonths: data.serviceDurationMonths ?? 24,
      }
    });
    return NextResponse.json({ pkg });
  } catch (err: unknown) {
    const e = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const { id, ...data } = await req.json();
    const current = await prisma.package.findUnique({ where: { id } });

    if (!current) {
      return NextResponse.json({ error: "Paquete no encontrado" }, { status: 404 });
    }

    const nextAccountType = data.accountType ?? current.accountType;
    const nextIsActive = data.isActive ?? current.isActive;

    if (nextIsActive && !isValidActivePackageAccountType(nextAccountType)) {
      return NextResponse.json(
        { error: 'Los paquetes activos solo pueden usar accountType "personal" o "company".' },
        { status: 400 }
      );
    }

    const pkg = await prisma.package.update({
      where: { id },
      data
    });
    return NextResponse.json({ pkg });
  } catch (err: unknown) {
    const e = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
