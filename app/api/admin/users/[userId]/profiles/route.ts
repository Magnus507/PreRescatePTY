import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, GENERAL_ADMIN_ROLES } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ userId: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { userId } = await context.params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, accountId: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  if (!user.accountId) {
    return NextResponse.json([], { status: 200 });
  }

  const profiles = await prisma.profile.findMany({
    where: { accountId: user.accountId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      displayNamePublic: true,
      userId: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(
    profiles.map((profile) => ({
      id: profile.id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      displayName: profile.displayNamePublic || `${profile.firstName} ${profile.lastName}`,
      isOwnerProfile: profile.userId === user.id,
    }))
  );
}
