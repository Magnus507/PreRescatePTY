import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function clean(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      phone: true,
      profile: {
        select: {
          firstName: true,
          lastName: true,
          phone: true,
          address: true,
          city: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const recipientName = [clean(user.profile?.firstName), clean(user.profile?.lastName)]
    .filter(Boolean)
    .join(" ");

  return NextResponse.json(
    {
      recipientName,
      phone: clean(user.phone) || clean(user.profile?.phone),
      address: clean(user.profile?.address),
      city: clean(user.profile?.city),
      email: clean(user.email),
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    }
  );
}
