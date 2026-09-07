import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  const userId = session?.user ? (session.user as { id?: string }).id : undefined;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, accountId: true },
  });

  return user?.accountId ? user : null;
}

/**
 * Compatibility read endpoint.
 *
 * Automatic emergency delivery is no longer a product capability. Historical
 * consent rows remain untouched for audit history, but they have no operational
 * effect and are intentionally not surfaced as an enabled preference.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  return NextResponse.json({
    automaticAlertsEnabled: false,
    automaticAlertsAvailable: false,
    deliveryMode: "manual_whatsapp",
    grantedAt: null,
  });
}

/**
 * Retired write endpoint kept as an explicit 410 for stale dashboard clients.
 * No consent is created, revoked or modified here.
 */
export async function PATCH(req: NextRequest) {
  // Keep the request in the compatibility signature without parsing its body.
  // Stale clients may send any previous payload; no value can re-enable delivery.
  void req;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  return NextResponse.json(
    {
      error: "Las alertas automáticas ya no están disponibles.",
      message: "El contacto de rescate se inicia manualmente por llamada o WhatsApp desde el perfil público.",
      automaticAlertsEnabled: false,
      automaticAlertsAvailable: false,
      deliveryMode: "manual_whatsapp",
      reason: "manual_contact_only",
    },
    { status: 410 }
  );
}
