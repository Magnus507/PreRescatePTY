import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import {
  buildPasswordResetUrl,
  createPasswordResetToken,
  hashPasswordResetToken,
} from "@/lib/password-reset";

const GENERIC_RESPONSE = {
  success: true,
  message: "Si el correo existe, recibirás un enlace de recuperación en unos minutos.",
};

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "El email es requerido" }, { status: 400 });
    }

    const emailLower = String(email).toLowerCase().trim();
    const maskedEmail = emailLower.replace(/(.{2}).+(@.+)/, "$1***$2");
    const ip = getClientIp(req, "forgot-password");
    const [ipLimit, emailLimit] = await Promise.all([
      rateLimit("forgot-password:ip", ip, { limit: 5, windowMs: 60_000 * 15 }),
      rateLimit("forgot-password:email", emailLower, { limit: 3, windowMs: 60_000 * 60 }),
    ]);

    if (!ipLimit.allowed || !emailLimit.allowed) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Intenta de nuevo mas tarde." },
        { status: 429 }
      );
    }

    if (
      process.env.NODE_ENV === "production" &&
      (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL)
    ) {
      console.error("[ForgotPassword] CRITICAL: Email provider is not fully configured.");
      return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
    }

    const user = await prisma.user.findUnique({ where: { email: emailLower } });

    if (!user) {
      return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
    }

    const token = createPasswordResetToken();
    const tokenHash = hashPasswordResetToken(token);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { email: emailLower } }),
      prisma.passwordResetToken.create({
        data: {
          email: emailLower,
          token: tokenHash,
          expiresAt,
        },
      }),
    ]);

    const resetLink = buildPasswordResetUrl(token, { requestUrl: req.url });

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error: sendError } = await resend.emails.send({
        from: `PreRescatePTY <${process.env.RESEND_FROM_EMAIL || "soporte@prerescatepty.com"}>`,
        to: emailLower,
        subject: "Recuperación de Contraseña - PreRescatePTY",
        html: `
          <h3>Recuperación de Contraseña</h3>
          <p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
          <p>Haz clic en el siguiente enlace para continuar. Este enlace expira en 1 hora.</p>
          <a href="${resetLink}" style="display:inline-block;padding:10px 20px;background:#0066cc;color:#fff;text-decoration:none;border-radius:5px;">Restablecer Contraseña</a>
          <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
        `,
      });

      if (sendError) {
        await prisma.passwordResetToken.deleteMany({
          where: { email: emailLower, token: tokenHash },
        });
        console.error(`[ForgotPassword] Email delivery rejected for ${maskedEmail}.`);
      }
    } else {
      console.warn("Simulated Password Reset Email:");
      console.warn(`To: ${maskedEmail}`);
      console.warn(`Reset Link: ${resetLink}`);
    }

    return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud." },
      { status: 500 }
    );
  }
}
