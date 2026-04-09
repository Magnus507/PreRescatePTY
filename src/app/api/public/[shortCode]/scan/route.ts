import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmergencyNotification } from "@/lib/notifications";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  try {
    const { shortCode } = await params;
    const body = await req.json().catch(() => ({}));

    // Rate limit: max 10 scans per IP per minute
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "anonymous";
    const rl = rateLimit("scan", ip, { limit: 10, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Intenta más tarde." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    const chip = await prisma.chip.findUnique({
      where: { shortCode },
    });

    if (!chip) {
      return NextResponse.json({ error: "Chip no encontrado" }, { status: 404 });
    }

    // Create scan event
    const scanEvent = await prisma.scanEvent.create({
      data: {
        chipId: chip.id,
        sourceType: body.sourceType || "qr",
        ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
        geoLat: body.geoLat || null,
        geoLng: body.geoLng || null,
        geoAccuracy: body.geoAccuracy || null,
        country: body.country || null,
        city: body.city || null,
        emergencyMode: true,
        notificationStatus: "pending",
      },
    });

    // Update chip last scan
    await prisma.chip.update({
      where: { id: chip.id },
      data: { lastScanAt: new Date() },
    });

    // Queue + attempt immediate notification to emergency contacts
    if (chip.ownerUserId || chip.assignedProfileId) {
      const profileId = chip.assignedProfileId;
      const contacts = await prisma.emergencyContact.findMany({
        where: {
          active: true,
          OR: [
            ...(chip.ownerUserId ? [{ userId: chip.ownerUserId }] : []),
            ...(profileId ? [{ profileId }] : []),
          ],
        },
        orderBy: { priorityOrder: "asc" },
      });

      const profile = await prisma.profile.findUnique({
        where: { id: profileId ?? "" },
        select: { firstName: true, lastName: true, displayNamePublic: true },
      });
      const profileName = profile
        ? (profile.displayNamePublic || `${profile.firstName} ${profile.lastName}`.trim())
        : "Usuario PreRescate";

      const location =
        scanEvent.geoLat && scanEvent.geoLng
          ? { lat: scanEvent.geoLat, lng: scanEvent.geoLng }
          : undefined;

      for (const contact of contacts) {
        const channels: { channel: "email" | "sms"; recipient: string }[] = [];
        if (contact.notifyEmail && contact.email) channels.push({ channel: "email", recipient: contact.email });
        if (contact.notifySms && contact.phone) channels.push({ channel: "sms", recipient: contact.phone });

        for (const { channel, recipient } of channels) {
          // Create notification record first
          const notif = await prisma.notification.create({
            data: { chipId: chip.id, eventId: scanEvent.id, channel, recipient, status: "pending" },
          });

          // Attempt immediate delivery (best-effort — cron picks up failures)
          const result = await sendEmergencyNotification({
            recipient,
            type: channel,
            profileName,
            location,
            shortCode: chip.shortCode,
            notificationId: notif.id,
          });

          if (result.success || result.providerResponse) {
            await prisma.notification.update({
              where: { id: notif.id },
              data: {
                status: result.success ? "sent" : "pending",
                providerResponse: result.providerResponse ?? null,
                sentAt: result.success ? new Date() : null,
              },
            });
          }
        }
      }

      await prisma.scanEvent.update({
        where: { id: scanEvent.id },
        data: { notificationStatus: contacts.length > 0 ? "queued" : "skipped" },
      });
    }

    return NextResponse.json({
      message: "Escaneo registrado",
      scanId: scanEvent.id,
    });
  } catch (error) {
    console.error("Scan event error:", error);
    return NextResponse.json(
      { error: "Error al registrar escaneo" },
      { status: 500 }
    );
  }
}
