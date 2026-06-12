/**
 * Supported input formats and their normalization:
 *
 * 1. `/api/image-proxy?bucket=X&path=...`
 *    → parse, extract innermost path, rebuild (`path` always encoded)
 *
 * 2. `api/image-proxy?bucket=X&path=...`  (missing leading `/`)
 *    → same as above, with leading `/` inserted
 *
 * 3. `https://origin/api/image-proxy?bucket=X&path=...`
 *    → same as above, converted to relative
 *
 * 4. `https://supabase.co/storage/v1/object/public/bucket/user/file.ext`
 *    → build proxy URL from last 2 path segments
 *
 * 5. Any other absolute URL (e.g. CDN, external)
 *    → build proxy URL if bucket is provided
 *
 * 6. Empty / null / undefined  → return ""
 *
 * IMPORTANT: even if the input already looks like a proxy URL, it is
 * *always* parsed and normalized. This ensures that accidentally
 * nested proxy URLs inside the `path` parameter are flattened to a
 * single level.
 *
 * @param value  The stored image URL (photoUrl, product.image, paymentProofUrl, etc.)
 * @param bucket The Supabase Storage bucket name ( e.g. "profile-photos", "general", "payment-proofs").
 * @returns A URL string suitable for `<img>` or `<Image>`.
 */
export function resolveImageSrc(value?: string | null, bucket?: string): string {
  if (!value) return "";

  const trimmed = value.trim();

  // ── Step 1: If it's already a proxy URL (any form), parse → clean → rebuild ──
  if (trimmed.startsWith("/api/image-proxy?") || trimmed.startsWith("api/image-proxy?")) {
    // Normalize: ensure leading slash for safe parsing
    const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    try {
      const url = new URL(normalized, "https://local.prerescue");
      const bucketParam = url.searchParams.get("bucket");
      const pathParam = url.searchParams.get("path");
      if (bucketParam && pathParam) {
        const cleanPath = extractInnermostPath(pathParam);
        return `/api/image-proxy?bucket=${bucketParam}&path=${encodeURIComponent(cleanPath)}`;
      }
    } catch {
      // If parsing fails, fall through
    }
  }

  // ── Step 2: If it's an absolute URL (starts with http:// or https://) ─────
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);

      // 2a. Already an absolute proxy URL — parse and normalize
      if (url.pathname.endsWith("/api/image-proxy") || url.pathname === "/api/image-proxy") {
        const bucketParam = url.searchParams.get("bucket");
        const pathParam = url.searchParams.get("path");
        if (bucketParam && pathParam) {
          const cleanPath = extractInnermostPath(pathParam);
          return `/api/image-proxy?bucket=${bucketParam}&path=${encodeURIComponent(cleanPath)}`;
        }
        // fall through to path-based extraction if we can't read params
      }

      // 2b. Any other absolute URL (Supabase, CDN, etc.) — extract last 2 segments
      if (bucket) {
        const segments = url.pathname.split("/").filter(Boolean);
        let path = segments.slice(-2).join("/");
        if (!path) path = segments.slice(-1).join("/");
        if (path) {
          const cleanPath = extractInnermostPath(path);
          return `/api/image-proxy?bucket=${bucket}&path=${encodeURIComponent(cleanPath)}`;
        }
      }
    } catch {
      // Not parseable as URL — fall through
    }
  }

  // ── Step 3: Already a same-origin relative path — use as-is ──────────────
  if (trimmed.startsWith("/")) return trimmed;

  return trimmed;
}

/**
 * Extracts the innermost meaningful image path from a value that may
 * itself be or contain a proxy URL.
 *
 * Handles three levels of nesting:
 * - Plain path:    "user/file.webp"          → "user/file.webp"
 * - Proxy URL path: "api/image-proxy?bucket=X&path=user/file.webp"
 *                                            → "user/file.webp"
 * - Double-encoded proxy path: "api%2Fimage-proxy%3Fbucket%3DX%26path%3Duser%252Ffile.webp"
 *                                            → "user/file.webp"
 *
 * The function keeps decoding and re-parsing until no "api/image-proxy"
 * substring remains or no further `path` parameter is found.
 */
function extractInnermostPath(potentialPath: string): string {
  let current = potentialPath;

  // Keep unwrapping while the path contains a proxy URL signature
  for (let i = 0; i < 5; i++) {
    if (!current.includes("api/image-proxy") && !current.includes("api%2Fimage-proxy")) {
      return current;
    }

    // Decode once (in case it's percent-encoded)
    const decoded = decodeURIComponent(current);

    try {
      // Try to parse as query string within a full URL
      const url = new URL(decoded, "https://local.prerescue");
      const innerPath = url.searchParams.get("path");
      if (innerPath) {
        current = innerPath;
        continue;
      }
    } catch {
      // Not parseable; try regex fallback
    }

    // Regex fallback: extract `path=` value
    const match = decoded.match(/[?&]path=([^&]+)/i);
    if (match) {
      current = decodeURIComponent(match[1]);
      continue;
    }

    // Nothing left to extract — stop
    break;
  }

  return current;
}