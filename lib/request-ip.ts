import { NextRequest } from "next/server";

type RequestLike = Request | NextRequest | { headers?: Record<string, string | string[] | undefined> };

function readHeader(req: RequestLike, name: string) {
  const headers = req.headers;
  if (!headers) return null;

  if (typeof (headers as Headers).get === "function") {
    return (headers as Headers).get(name);
  }

  const value = (headers as Record<string, string | string[] | undefined>)[name];
  return Array.isArray(value) ? value[0] : value ?? null;
}

export function getClientIp(req: RequestLike, fallbackIdentifier: string) {
  const forwardedFor = readHeader(req, "x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim()
    || readHeader(req, "x-real-ip")?.trim()
    || readHeader(req, "cf-connecting-ip")?.trim();

  // If Vercel/CDN headers are absent, use a route-specific key so missing IPs
  // do not collapse every endpoint into one shared "unknown" bucket.
  return ip || `missing-ip:${fallbackIdentifier}`;
}

