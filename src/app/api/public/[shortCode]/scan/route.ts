import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  try {
    const { shortCode } = await params;
    const body = await req.json().catch(() => ({}));

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

    // Queue notifications to emergency contacts
    if (chip.ownerUserId) {
      const contacts = await prisma.emergencyContact.findMany({
        where: { userId: chip.ownerUserId, active: true },
        orderBy: { priorityOrder: "asc" },
      });

      for (const contact of contacts) {
        if (contact.notifyEmail && contact.email) {
          await prisma.notification.create({
            data: {
              chipId: chip.id,
              eventId: scanEvent.id,
              channel: "email",
              recipient: contact.email,
              status: "pending",
            },
          });
        }
        if (contact.notifySms && contact.phone) {
          await prisma.notification.create({
            data: {
              chipId: chip.id,
              eventId: scanEvent.id,
              channel: "sms",
              recipient: contact.phone,
              status: "pending",
            },
          });
        }
      }

      // Update scan event notification status
      await prisma.scanEvent.update({
        where: { id: scanEvent.id },
        data: { notificationStatus: contacts.length > 0 ? "sent" : "skipped" },
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
