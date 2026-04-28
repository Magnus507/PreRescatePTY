import { generateSecret, verifySync } from "otplib";

export function verifyMfaToken(token: string, secret: string): boolean {
  if (!token || !secret) return false;

  return verifySync({ token: token.replace(/\s/g, ""), secret }).valid;
}

export function generateMfaSecret(): string {
  return generateSecret();
}
