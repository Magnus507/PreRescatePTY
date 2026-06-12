/**
 * Resolves an image source URL for use with the /api/image-proxy endpoint.
 *
 * Supports both formats:
 * - Old: Direct Supabase storage URL (e.g. https://*.supabase.co/storage/v1/object/public/bucket/...)
 * - New: Already-proxied relative URL (e.g. /api/image-proxy?bucket=...&path=...)
 *
 * @param value - The stored image URL (photoUrl, product.image, paymentProofUrl).
 * @param bucket - The Supabase bucket name (e.g. "profile-photos", "general", "payment-proofs").
 * @returns A URL suitable for use as an <img> or <Image> src.
 */
export function resolveImageSrc(value?: string | null, bucket?: string): string {
  if (!value) return "";

  // Already a proxy URL — use as-is
  if (value.startsWith("/api/image-proxy?")) return value;

  // Already same-origin/public path — use as-is
  if (value.startsWith("/")) return value;

  // Direct Supabase/public URL — extract the last 2 path segments to build a proxy URL
  if (bucket) {
    try {
      const url = new URL(value);
      const parts = url.pathname.split("/").filter(Boolean);
      const path = parts.slice(-2).join("/");
      if (path) {
        return `/api/image-proxy?bucket=${bucket}&path=${encodeURIComponent(path)}`;
      }
    } catch {
      // Not a valid URL — fall through to return as-is
    }
  }

  return value;
}