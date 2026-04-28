import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmergencyNotification } from "@/lib/notifications";
import { rateLimit } from "@/lib/rateLimit";
import { getReverseGeocoding } from "@/lib/geocoding";

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

    // Create scan event
    const scanEvent = await prisma.scanEvent.create({
      data: {
        chipId: chip.id,
        profileId: chip.assignedProfileId,
        accountId: chip.accountId,
        sourceType: body.sourceType || "qr",
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

    // 1. Queue Background Notifications if owner exists
    if (chip.ownerUserId || chip.assignedProfileId) {
      // backgroundNotifications will be executed AFTER responding to the user
      const backgroundNotifications = async () => {
        try {
          if (!chip.assignedProfileId) return;

          const profileContacts = await prisma.profileContact.findMany({
            where: {
              profileId: chip.assignedProfileId,
              active: true
            },
            include: { contact: true },
            orderBy: { priorityOrder: "asc" },
          });

          // Map ProfileContact + Contact into the shape expected by the task list creator
          const contacts = profileContacts.map(pc => ({
             ...pc.contact,
             relationship: pc.relationship,
             notifyEmail: pc.notifyEmail,
             notifySms: pc.notifySms,
             notifyWhatsapp: pc.notifyWhatsapp,
          }));

          if (contacts.length === 0) {
            await prisma.scanEvent.update({
              where: { id: scanEvent.id },
              data: { notificationStatus: "skipped" }
            });
            return;
          }

          const profile = await prisma.profile.findUnique({
            where: { id: chip.assignedProfileId },
            select: { firstName: true, lastName: true, displayNamePublic: true },
          });
          const profileName = profile
            ? (profile.displayNamePublic || `${profile.firstName} ${profile.lastName}`.trim())
            : "Usuario PreRescate";

          const location =
            scanEvent.geoLat && scanEvent.geoLng
              ? { lat: scanEvent.geoLat, lng: scanEvent.geoLng }
              : undefined;

          // Process each contact concurrently
          const tasks = contacts.flatMap(contact => {
            const list = [];
            if (contact.notifyEmail && contact.email) list.push({ channel: "email", recipient: contact.email });
            if (contact.notifySms && contact.phone) list.push({ channel: "sms", recipient: contact.phone });
            if (contact.notifyWhatsapp && contact.phone) list.push({ channel: "whatsapp", recipient: contact.phone });
            return list;
          }) as { channel: "email"| "sms" | "whatsapp", recipient: string }[];

          const results = await Promise.allSettled(tasks.map(async (task) => {
            const { channel, recipient } = task;
            
            // Create record
            const notif = await prisma.notification.create({
              data: { 
                chipId: chip.id, 
                eventId: scanEvent.id, 
                channel, 
                recipient, 
                status: "processing" 
              },
            });

            try {
              const res = await sendEmergencyNotification({
                recipient,
                type: channel,
                profileName,
                location,
                shortCode: chip.shortCode,
                notificationId: notif.id,
              });

              await prisma.notification.update({
                where: { id: notif.id },
                data: {
                  status: res.success ? "sent" : "failed",
                  providerResponse: res.providerResponse ?? null,
                  sentAt: res.success ? new Date() : null,
                },
              });
              return res.success;
            } catch (err: unknown) {
              const error = err as Error;
              await prisma.notification.update({
                where: { id: notif.id },
                data: { status: "failed", providerResponse: error.message || "Unknown error" },
              });
              return false;
            }
          }));

          const successes = results.filter(r => r.status === 'fulfilled' && r.value).length;
          await prisma.scanEvent.update({
            where: { id: scanEvent.id },
            data: { 
              notificationStatus: successes === tasks.length ? "sent" : (successes > 0 ? "partial_failure" : "failed") 
            },
          });
        } catch (bgError) {
          console.error("[BG Scan Notifications] Error:", bgError);
        }
      };

      // Tigger as background task (Next.js 15+ after)
      after(backgroundNotifications);
      
      return NextResponse.json({
        message: "Escaneo registrado - Notificaciones en proceso",
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
