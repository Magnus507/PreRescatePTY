import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ACTIVE_PACKAGE_ACCOUNT_TYPES = ["personal", "company"] as const;

function isValidActivePackageAccountType(accountType: string) {
  return ACTIVE_PACKAGE_ACCOUNT_TYPES.includes(
    accountType as (typeof ACTIVE_PACKAGE_ACCOUNT_TYPES)[number]
  );
}

async function isAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return false;
  const role = (session.user as { role?: string }).role;
  return role === "admin" || role === "superadmin";
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const packages = await prisma.package.findMany({
    orderBy: { displayOrder: "asc" },
  });

  return NextResponse.json({ packages });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

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
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

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
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
