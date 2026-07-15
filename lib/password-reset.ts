import crypto from "crypto";

const PASSWORD_RESET_TOKEN_BYTES = 32;

export function createPasswordResetToken() {
  return crypto.randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString("base64url");
}

export function hashPasswordResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
