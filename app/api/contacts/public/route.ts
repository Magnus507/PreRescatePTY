import { NextResponse } from "next/server";
import { Resend } from "resend";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";

let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

function escapeHtml(value: unknown) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req, "contact-public");
    const limiter = await rateLimit("contact", ip, { limit: 5, windowMs: 60_000 * 15 });
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intenta de nuevo mas tarde." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const message = String(body.message || "").trim();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios" },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email invalido" }, { status: 400 });
    }

    const safeName = escapeHtml(name).slice(0, 200);
    const safeEmail = escapeHtml(email).slice(0, 320);
    const safeMessage = escapeHtml(message).slice(0, 5000);

    if (resend) {
      await resend.emails.send({
        from: "PreRescatePTY Contactos <contacto@prerescatepty.com>",
        to: "soporte@prerescatepty.com",
        replyTo: email,
        subject: `Nuevo mensaje de contacto de ${safeName}`,
        html: `
          <h3>Nuevo mensaje de contacto</h3>
          <p><strong>Nombre:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p><strong>Mensaje:</strong></p>
          <p>${safeMessage.replace(/\n/g, "<br />")}</p>
        `,
      });
    } else {
      console.warn("RESEND_API_KEY no esta configurada, correo simulado:", {
        name: safeName,
        email: safeEmail,
      });
    }

    return NextResponse.json({ success: true, message: "Mensaje enviado correctamente" });
  } catch (error) {
    console.error("Contact Form Error:", error);
    return NextResponse.json(
      { error: "Error al enviar el mensaje. Por favor intenta mas tarde." },
      { status: 500 }
    );
  }
}
