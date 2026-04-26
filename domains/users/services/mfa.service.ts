import { authenticator } from "otplib";
import QRCode from "qrcode";

/**
 * Generates a new TOTP secret for a user.
 */
export function generateMfaSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Generates an OTP Auth URL for scanning in apps like Google Authenticator.
 */
export function generateOtpAuthUrl(email: string, secret: string): string {
  return authenticator.keyuri(email, "PreRescate PTY", secret);
}

/**
 * Generates a Data URL QR Code image for the OTP Auth URL.
 */
export async function generateQrCodeDataUrl(otpAuthUrl: string): Promise<string> {
  return await QRCode.toDataURL(otpAuthUrl);
}

/**
 * Verifies a TOTP token against a secret.
 */
export function verifyMfaToken(token: string, secret: string): boolean {
  return authenticator.verify({ token, secret });
}
