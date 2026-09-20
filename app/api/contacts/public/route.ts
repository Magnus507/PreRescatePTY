import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { normalizeWhatsAppPhone } from "@/lib/support/whatsapp";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req, "contact-public");
    const limiter = await rateLimit("contact", ip, { limit: 5, windowMs: 60_000 * 15 });
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intenta de nuevo más tarde." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const whatsappPhone = normalizeWhatsAppPhone(body.whatsappPhone);
    const message = String(body.message || "").trim();

    if (!name || !email || !whatsappPhone || !message) {
      return NextResponse.json(
        { error: "Nombre, correo, WhatsApp y mensaje son obligatorios." },
        { status: 400 }
      );
    }

    if (name.length > 200 || email.length > 320 || message.length > 5000) {
      return NextResponse.json(
        { error: "Uno de los campos supera el tamaño permitido." },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email inválido." }, { status: 400 });
    }

    const created = await prisma.supportMessage.create({
      data: {
        name,
        email,
        whatsappPhone,
        message,
      },
      select: { id: true },
    });

    return NextResponse.json({
      success: true,
      id: created.id,
      message: "Mensaje recibido. El equipo de soporte podrá contactarte por WhatsApp.",
    });
  } catch {
    console.error("CONTACT_PERSISTENCE_FAILED");
    return NextResponse.json(
      { error: "No pudimos guardar tu mensaje. Intenta de nuevo más tarde." },
      { status: 500 }
    );
  }
}
