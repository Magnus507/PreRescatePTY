import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Legacy compatibility endpoint.
 *
 * Rescue contact is intentionally manual: the rescuer opens WhatsApp or places
 * a phone call from the public profile. Keeping this route as an explicit 410
 * prevents stale clients from silently re-enabling provider-side delivery.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ shortCode: string; scanId: string }> }
) {
  await params;

  return NextResponse.json(
    {
      error: "Los avisos automáticos están deshabilitados.",
      message: "Usa llamada o WhatsApp manual desde el perfil de rescate.",
      notificationStatus: "disabled",
      reason: "manual_contact_only",
    },
    { status: 410 }
  );
}
