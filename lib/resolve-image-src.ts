/**
 * Supported input formats:
 *
 * 1. `/api/image-proxy?bucket=X&path=...`    → return as-is
 * 2. `api/image-proxy?bucket=X&path=...`     → add leading slash
 * 3. `https://origin/api/image-proxy?...`     → convert to relative proxy URL
 * 4. `https://supabase.co/storage/v1/object/public/bucket/user/file.ext`  → build proxy URL
 * 5. Any other string that turns into a valid URL → build proxy URL
 * 6. Empty / null / undefined                 → return ""
 *
 * Defensive guard: if the extracted inner "path" contains "api/image-proxy",
 * it means a proxy URL was nested inside another proxy URL. In that case
 * the innermost proxy URL is extracted and normalized.
 *
 * @param value  The stored image URL (photoUrl, product.image, paymentProofUrl, etc.)
 * @param bucket The Supabase Storage bucket name (e.g. "profile-photos", "general", "payment-proofs").
 * @returns A URL string suitable for `<img>` or `<Image>`.
 */
export function resolveImageSrc(value?: string | null, bucket?: string): string {
  if (!value) return "";

  const trimmed = value.trim();

  // ── Already a well-formed relative proxy URL ────────────────────────────
  if (trimmed.startsWith("/api/image-proxy?")) {
    return trimmed;
  }

  // ── Missing leading slash but is otherwise a proxy URL ──────────────────
  if (trimmed.startsWith("api/image-proxy?")) {
    return `/${trimmed}`;
  }

  // ── Try to parse as a full URL ──────────────────────────────────────────
  try {
    const url = new URL(trimmed);

    // Normalize absolute proxy URLs back to a relative proxy URL
    if (url.pathname.endsWith("/api/image-proxy") || url.pathname === "/api/image-proxy") {
      const bucketParam = url.searchParams.get("bucket");
      const pathParam = url.searchParams.get("path");
      if (bucketParam && pathParam) {
        let normalizedPath = pathParam.startsWith("/") ? pathParam.slice(1) : pathParam;
        // Defensive: if the path itself is a proxy URL, extract the innermost path
        normalizedPath = extractInnermostPath(normalizedPath);
        return `/api/image-proxy?bucket=${bucketParam}&path=${encodeURIComponent(normalizedPath)}`;
      }
      // fall through to path-based extraction if we can't read params
    }

    // ── Direct Supabase storage URL or any other URL with a bucket prefix ──
    if (bucket) {
      const segments = url.pathname.split("/").filter(Boolean);
      // Try last 2 segments (userId/filename.webp)
      let path = segments.slice(-2).join("/");
      if (!path) path = segments.slice(-1).join("/"); // fallback to last segment
      if (path) {
        // Defensive guard against nested proxy URLs in the path
        path = extractInnermostPath(path);
        return `/api/image-proxy?bucket=${bucket}&path=${encodeURIComponent(path)}`;
      }
    }
  } catch {
    // Not a valid URL — fall through to return as-is
  }

  // ── Already a same-origin relative path (not proxy-related) — use as-is ─
  if (trimmed.startsWith("/")) return trimmed;

  return trimmed;
}

/**
 * Extracts the innermost meaningful image path when a proxy URL is
 * accidentally nested inside another proxy URL.
 *
 * Example input:
 *   "api/image-proxy?bucket=profile-photos&path=userId%2Ffile.webp"
 * Example output:
 *   "userId/file.webp"
 */
function extractInnermostPath(potentialPath: string): string {
  if (!potentialPath.includes("api/image-proxy")) return potentialPath;

  try {
    // The path may be URL-encoded; decode once to see the inner query
    const decoded = decodeURIComponent(potentialPath);
    const innerUrl = new URL(decoded, "https://local.prerescue");
    const innerPath = innerUrl.searchParams.get("path");
    if (innerPath) {
      return decodeURIComponent(innerPath);
    }
  } catch {
    // If parsing fails, attempt a simple regex extraction
    const match = potentialPath.match(/[?&]path=([^&]+)/i);
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }

  return potentialPath;
}