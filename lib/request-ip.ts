import { NextRequest } from "next/server";
import { isIP } from "node:net";

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
  // Vercel removes client-supplied forwarding headers at its edge. Prefer its
  // provider-specific header so a proxy placed in front cannot replace XFF.
  // Outside Vercel we deliberately do not trust forwarding headers without a
  // separately defined proxy contract.
  const candidates = process.env.VERCEL
    ? [
        readHeader(req, "x-vercel-forwarded-for"),
        readHeader(req, "x-forwarded-for"),
        readHeader(req, "x-real-ip"),
      ]
    : [];

  const ip = candidates
    .flatMap((value) => value?.split(",") ?? [])
    .map((value) => value.trim())
    .find((value) => isIP(value) !== 0);

  // If Vercel/CDN headers are absent, use a route-specific key so missing IPs
  // do not collapse every endpoint into one shared "unknown" bucket.
  return ip || `missing-ip:${fallbackIdentifier}`;
}
