import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { getReverseGeocoding } from "@/lib/geocoding";
import { getClientIp } from "@/lib/request-ip";
import { publicScanSchema } from "@/lib/validations";
import { resolvePublicProfileByChipShortCode } from "@/lib/public-access/resolve-public-profile-by-chip";
import { processPendingEmergencyNotifications, queueEmergencyNotificationsFromScan } from "@/lib/emergency-alerts";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  try {
    const { shortCode } = await params;
    const body = await req.json().catch(() => ({}));
    const parsedBody = publicScanSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.errors[0]?.message || "Datos de escaneo inválidos" },
        { status: 400 }
      );
    }

    const scanInput = parsedBody.data;

    // Rate limit: max 10 scans per IP per minute
    const ip = getClientIp(req, "public-scan");
    const rl = await rateLimit("scan", `${ip}:${shortCode}`, {
      limit: 20,
      windowMs: 60_000,
      productionFailureMode: "memory",
    });
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

    const resolution = await resolvePublicProfileByChipShortCode(shortCode);
    if (!resolution.ok) {
      const statusMap: Record<string, number> = {
        chip_not_found: 404,
        chip_not_active: 403,
        chip_unassigned: 409,
        profile_not_found: 404,
        profile_not_public: 403,
        unsupported_context: 400,
      };
      return NextResponse.json({ error: "Chip no disponible para escaneo", reason: resolution.reason }, { status: statusMap[resolution.reason] });
    }

    const { chip, profile } = resolution;

    const queueResult = await prisma.$transaction(async (tx) => {
      const scanEvent = await tx.scanEvent.create({
        data: {
          chipId: chip.id,
          profileId: profile.id,
          accountId: chip.accountId,
          sourceType: scanInput.sourceType,
          ipAddress: ip,
          userAgent: req.headers.get("user-agent") || "unknown",
          geoLat: scanInput.geoLat ?? null,
          geoLng: scanInput.geoLng ?? null,
          geoAccuracy: scanInput.geoAccuracy ?? null,
          country: scanInput.country || null,
          city: scanInput.city || null,
          address: null,
          emergencyMode: true,
          notificationStatus: "pending",
        },
      });

      await tx.chip.update({
        where: { id: chip.id },
        data: { lastScanAt: new Date() },
      });

      const notificationPlan = await queueEmergencyNotificationsFromScan(tx, {
        scanEventId: scanEvent.id,
        chipId: chip.id,
        shortCode: chip.shortCode,
        profileId: profile.id,
        profileName: profile.displayNamePublic || `${profile.firstName} ${profile.lastName}`,
        accountId: chip.accountId,
        publicUrl: `/e/${chip.shortCode}`,
        location: scanInput.geoLat != null && scanInput.geoLng != null
          ? { lat: scanInput.geoLat, lng: scanInput.geoLng }
          : null,
        trigger: "automatic",
      });

      return { scanEvent, notificationPlan };
    });
    const { scanEvent, notificationPlan } = queueResult;

    if (notificationPlan.queued > 0) {
      after(async () => {
        await processPendingEmergencyNotifications(prisma, { limit: 25 });
      });
    }

    // 0. Background Reverse Geocoding & Profile/Chip Sync
    after(async () => {
      let geoAddress = null;
      if (scanInput.geoLat != null && scanInput.geoLng != null) {
        const result = await getReverseGeocoding(scanInput.geoLat, scanInput.geoLng);
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
        lastScanLocation: geoAddress || scanInput.city || scanInput.country || "Ubicación detectada"
      };

      await prisma.chip.update({
        where: { id: chip.id },
        data: updateData
      });

      if (scanEvent.profileId) {
        await prisma.profile.update({
          where: { id: scanEvent.profileId },
          data: updateData
        });
      }
    });

    const notificationMessage =
      notificationPlan.status === "pending"
        ? "Escaneo registrado. Alertas en cola."
        : notificationPlan.status === "disabled"
          ? "Escaneo registrado. Las alertas siguen deshabilitadas para este perfil."
          : "Escaneo registrado. No hay alertas elegibles para enviar.";

    return NextResponse.json({
      message: notificationMessage,
      notificationStatus: notificationPlan.status,
      notificationSummary: {
        queued: notificationPlan.queued,
        skipped: notificationPlan.skipped,
        disabled: notificationPlan.disabled,
        reason: notificationPlan.reason,
      },
      scanId: scanEvent.id,
    }, { status: 201 });
  } catch (error) {
    console.error("Scan API Error:", error);
    return NextResponse.json(
      { error: "Error interno al registrar escaneo" },
      { status: 500 }
    );
  }
}
