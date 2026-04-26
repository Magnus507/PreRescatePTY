import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
    const pkg = await prisma.package.create({
      data: {
        name: data.name,
        slug: data.name.toLowerCase().replace(/ /g, '-'),
        maxChips: data.maxChips,
        maxProfiles: data.maxProfiles || 1,
        price: data.price,
        description: data.description,
        isActive: data.isActive ?? true,
        accountType: data.accountType || "personal",
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
    const pkg = await prisma.package.update({
      where: { id },
      data
    });
    return NextResponse.json({ pkg });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
