import crypto from "crypto";

const PASSWORD_RESET_TOKEN_BYTES = 32;

export function createPasswordResetToken() {
  return crypto.randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString("base64url");
}

export function hashPasswordResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

type PasswordResetUrlOptions = {
  siteUrl?: string;
  appUrl?: string;
  requestUrl?: string;
  nodeEnv?: string;
};

export function buildPasswordResetUrl(token: string, options: PasswordResetUrlOptions = {}) {
  const {
    siteUrl = process.env.NEXT_PUBLIC_SITE_URL,
    appUrl = process.env.NEXT_PUBLIC_APP_URL,
    requestUrl,
    nodeEnv = process.env.NODE_ENV,
  } = options;

  const requestOrigin = requestUrl ? new URL(requestUrl).origin : undefined;
  const baseUrl = siteUrl || appUrl || requestOrigin || (nodeEnv === "production" ? undefined : "http://localhost:3000");

  if (!baseUrl) {
    throw new Error("Password reset base URL is not configured");
  }

  const url = new URL("/reset-password", baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}
