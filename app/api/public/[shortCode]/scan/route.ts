import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { getReverseGeocoding } from "@/lib/geocoding";
import { processPendingEmergencyNotifications } from "@/lib/emergency-notification-queue";

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
    const rl = await rateLimit("scan", ip, { limit: 10, windowMs: 60_000 });
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

    if (chip.status !== "activated" || !chip.assignedProfileId) {
      return NextResponse.json({ error: "Chip no activo" }, { status: 409 });
    }

    const sourceType = body.sourceType === "nfc" ? "nfc" : "qr";

    // Create scan event
    const scanEvent = await prisma.scanEvent.create({
      data: {
        chipId: chip.id,
        profileId: chip.assignedProfileId,
        accountId: chip.accountId,
        sourceType,
        ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
        geoLat: Number.isFinite(Number(body.geoLat)) ? Number(body.geoLat) : null,
        geoLng: Number.isFinite(Number(body.geoLng)) ? Number(body.geoLng) : null,
        geoAccuracy: Number.isFinite(Number(body.geoAccuracy)) ? Number(body.geoAccuracy) : null,
        country: typeof body.country === "string" ? body.country.slice(0, 100) : null,
        city: typeof body.city === "string" ? body.city.slice(0, 100) : null,
        address: null, 
        emergencyMode: true,
        notificationStatus: "pending",
      },
    });

    // Update chip last scan
    await prisma.chip.update({
      where: { id: chip.id },
      data: { lastScanAt: new Date() },
    });

    // 0. Background Reverse Geocoding & Profile/Chip Sync
    after(async () => {
      let geoAddress = null;
      if (body.geoLat && body.geoLng) {
        const result = await getReverseGeocoding(body.geoLat, body.geoLng);
        geoAddress = result.address;
        
        await prisma.scanEvent.update({
          where: { id: scanEvent.id },
          data: { 
            address: geoAddress || null,
            city: result.city || scanEvent.city,
            country: result.country || scanEvent.country
          }
        });
      }

      // Sync Bidirectionally with Chip and Profile
      const updateData = {
        lastScanAt: new Date(),
        lastScanLocation: geoAddress || body.city || body.country || "Ubicación detectada"
      };

      await prisma.chip.update({
        where: { id: chip.id },
        data: updateData
      });

      if (chip.assignedProfileId) {
        await prisma.profile.update({
          where: { id: chip.assignedProfileId },
          data: updateData
        });
      }
    });

    // 1. Queue emergency notifications before responding, then process them in background.
    if (chip.ownerUserId || chip.assignedProfileId) {
      const profileContacts = await prisma.profileContact.findMany({
        where: {
          profileId: chip.assignedProfileId,
          active: true
        },
        include: { contact: true },
        orderBy: { priorityOrder: "asc" },
      });

      const notifications = profileContacts.flatMap((profileContact) => {
        const tasks: { channel: "email" | "sms" | "whatsapp"; recipient: string }[] = [];
        const { contact } = profileContact;
        if (profileContact.notifyEmail && contact.email) {
          tasks.push({ channel: "email", recipient: contact.email });
        }
        if (profileContact.notifySms && contact.phone) {
          tasks.push({ channel: "sms", recipient: contact.phone });
        }
        if (profileContact.notifyWhatsapp && contact.phone) {
          tasks.push({ channel: "whatsapp", recipient: contact.phone });
        }
        return tasks;
      });

      if (notifications.length === 0) {
        await prisma.scanEvent.update({
          where: { id: scanEvent.id },
          data: { notificationStatus: "skipped" }
        });
      } else {
        await prisma.notification.createMany({
          data: notifications.map((notification) => ({
            chipId: chip.id,
            eventId: scanEvent.id,
            channel: notification.channel,
            recipient: notification.recipient,
            status: "pending",
          })),
        });

        after(async () => {
          await processPendingEmergencyNotifications({
            eventId: scanEvent.id,
            take: notifications.length,
            includeStaleProcessing: true,
          });
        });
      }
      
      return NextResponse.json({
        message: notifications.length > 0
          ? "Escaneo registrado - Notificaciones en proceso"
          : "Escaneo registrado (sin contactos notificables)",
        scanId: scanEvent.id,
      }, { status: 201 });
    }


    return NextResponse.json({
      message: "Escaneo registrado (sin contactos)",
      scanId: scanEvent.id,
    });
  } catch (error) {
    console.error("Scan API Error:", error);
    return NextResponse.json(
      { error: "Error interno al registrar escaneo" },
      { status: 500 }
    );
  }
}
