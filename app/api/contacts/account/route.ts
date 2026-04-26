import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  // Get all unique contacts created by this user
  const contacts = await prisma.contact.findMany({
    where: { userId },
    orderBy: { fullName: "asc" },
  });

  return NextResponse.json({ contacts });
}
