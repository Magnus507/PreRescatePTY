const SAFE_PATH_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9/_.,=-]{0,240}\.(?:jpg|jpeg|png|webp)$/i;
const LOCAL_BASE = "https://local.prerescue";

function hasUnsafePath(path: string) {
  return path.includes("..") || path.startsWith("/") || path.includes("\\");
}

/**
 * Normalizes and validates payment proof URLs.
 *
 * Allowed inputs:
 * - Relative proxy URL: /api/image-proxy?bucket=payment-proofs&path=...
 * - Absolute Supabase public storage URL under payment-proofs bucket.
 *
 * Returns:
 * - Normalized internal proxy URL OR normalized absolute Supabase URL
 * - null when invalid / unsafe / external.
 */
export function normalizePaymentProofUrl(value: string): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 500) return null;

  let url: URL;
  try {
    url = new URL(trimmed, LOCAL_BASE);
  } catch {
    return null;
  }

  // Internal proxy URL (preferred format)
  if (url.pathname === "/api/image-proxy") {
    const bucket = url.searchParams.get("bucket");
    const path = url.searchParams.get("path");
    if (bucket !== "payment-proofs" || !path) return null;
    if (hasUnsafePath(path) || !SAFE_PATH_PATTERN.test(path)) return null;

    const normalized = new URL("/api/image-proxy", LOCAL_BASE);
    normalized.searchParams.set("bucket", "payment-proofs");
    normalized.searchParams.set("path", path);
    return `${normalized.pathname}?${normalized.searchParams.toString()}`;
  }

  // Absolute Supabase storage URL for payment-proofs only.
  const supabaseBase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseBase) return null;

  let supabaseOrigin: string;
  try {
    supabaseOrigin = new URL(supabaseBase).origin;
  } catch {
    return null;
  }

  if (url.origin !== supabaseOrigin) return null;

  const marker = "/storage/v1/object/public/payment-proofs/";
  const idx = url.pathname.indexOf(marker);
  if (idx === -1) return null;

  const relativePath = decodeURIComponent(url.pathname.slice(idx + marker.length));
  if (hasUnsafePath(relativePath) || !SAFE_PATH_PATTERN.test(relativePath)) return null;

  return `${supabaseOrigin}${marker}${relativePath}`;
}
