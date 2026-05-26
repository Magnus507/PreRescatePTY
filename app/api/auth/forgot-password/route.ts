import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { Resend } from "resend";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "El email es requerido" }, { status: 400 });
    }

    const emailLower = String(email).toLowerCase().trim();
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
    
    // Unified user lookup
    const user = await prisma.user.findUnique({ where: { email: emailLower } });

    if (!user) {
      // Return success anyway to prevent email enumeration
      return NextResponse.json({ success: true, message: "Si el correo existe, se ha enviado un enlace de recuperación." });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { email: emailLower } }),
      prisma.passwordResetToken.create({
        data: {
          email: emailLower,
          token,
          expiresAt,
        },
      }),
    ]);

    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}`;

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "PreRescatePTY <soporte@prerescatepty.com>",
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
    } else {
      if (process.env.NODE_ENV === "production") {
        console.error(`[ForgotPassword] CRITICAL: Email provider not configured. Could not send reset link to ${emailLower}`);
      } else {
        console.warn("Simulated Password Reset Email:");
        console.warn(`To: ${emailLower}`);
        console.warn(`Reset Link: ${resetLink}`);
      }
    }

    return NextResponse.json({ success: true, message: "Si el correo existe, se ha enviado un enlace de recuperación." });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud." },
      { status: 500 }
    );
  }
}
