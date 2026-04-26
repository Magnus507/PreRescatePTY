import { NextResponse } from "next/server";
import { Resend } from "resend";

let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios" },
        { status: 400 }
      );
    }

    if (resend) {
      await resend.emails.send({
        from: "PreRescatePTY Contactos <contacto@prerescatepty.com>",
        to: "soporte@prerescatepty.com", // Send to admin email
        replyTo: email,
        subject: `Nuevo mensaje de contacto de ${name}`,
        html: `
          <h3>Nuevo mensaje de contacto</h3>
          <p><strong>Nombre:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Mensaje:</strong></p>
          <p>${message.replace(/\n/g, '<br />')}</p>
        `,
      });
    } else {
      console.warn("RESEND_API_KEY no está configurada, imprimiendo correo simulado:", { name, email, message });
    }

    return NextResponse.json({ success: true, message: "Mensaje enviado correctamente" });
  } catch (error) {
    console.error("Contact Form Error:", error);
    return NextResponse.json(
      { error: "Error al enviar el mensaje. Por favor intenta más tarde." },
      { status: 500 }
    );
  }
}
