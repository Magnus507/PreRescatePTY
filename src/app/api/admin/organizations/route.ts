import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin" && (session.user as any).role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const orgs = await prisma.organization.findMany({
      include: {
        account: true,
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
    const { legalName, displayName, contactEmail, maxChips } = data;

    // Default corporate package or active package logic
    let pkg = await prisma.package.findFirst({ where: { name: 'Corporativo' }});
    if (!pkg) {
      pkg = await prisma.package.create({
        data: { name: 'Corporativo', maxChips: maxChips || 30, price: 450, isActive: true }
      });
    }

    // Transaction for Account and Organization
    const newOrg = await prisma.$transaction(async (tx) => {
      const account = await tx.account.create({
        data: {
          accountType: "organization",
          accountName: legalName,
          status: "active",
          packageId: pkg.id,
          maxChipsAllocated: maxChips || 30,
        }
      });
      return tx.organization.create({
        data: {
          accountId: account.id,
          legalName,
          displayName: displayName || legalName,
          contactEmail,
          organizationType: "company",
          status: "active"
        }
      });
    });

    return NextResponse.json({ organization: newOrg }, { status: 201 });
  } catch (error) {
    console.error("Error creating org", error);
    return NextResponse.json({ error: "Error creating organization" }, { status: 500 });
  }
}
