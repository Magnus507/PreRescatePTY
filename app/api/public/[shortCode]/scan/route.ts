import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { getReverseGeocoding } from "@/lib/geocoding";
import { getClientIp } from "@/lib/request-ip";
import { publicScanSchema } from "@/lib/validations";
import { resolvePublicProfileByChipShortCode } from "@/lib/public-access/resolve-public-profile-by-chip";

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

    // Create scan event
    const scanEvent = await prisma.scanEvent.create({
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
        notificationStatus: "disabled",
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

      if (profile) {
        await prisma.profile.update({
          where: { id: profile.id },
          data: updateData
        });
      }
    });

    return NextResponse.json({
      message: "Escaneo registrado. Notificaciones automáticas deshabilitadas.",
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
