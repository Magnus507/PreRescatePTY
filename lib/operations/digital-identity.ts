type DigitalIdentityInput = {
  internalLabel: string;
  shortCode?: string | null;
  requestOrigin?: string | null;
  envBaseUrl?: string | null;
};

type DigitalIdentity = {
  internalLabel: string;
  shortCode: string | null;
  canonicalPublicUrl: string | null;
  activationFallbackUrl: string;
  nfcUrl: string | null;
  qrPayload: string | null;
  qrImageUrl: string | null;
  canPrint: boolean;
  missingReasons: string[];
  isLocalUrl: boolean;
};

function normalizeBaseUrl(value: string | null | undefined) {
  const raw = (value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw.replace(/\/+$/, "");
  return `https://${raw.replace(/\/+$/, "")}`;
}

export function getAppBaseUrl(requestOrigin?: string | null) {
  const envBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL ||
    "";

  const normalizedEnv = normalizeBaseUrl(envBaseUrl);
  if (normalizedEnv) return normalizedEnv;

  const normalizedOrigin = normalizeBaseUrl(requestOrigin);
  if (normalizedOrigin) return normalizedOrigin;

  return "";
}

function isRealShortCode(shortCode?: string | null) {
  const trimmed = shortCode?.trim() || "";
  if (!trimmed) return false;
  return trimmed.length >= 6 && trimmed !== "";
}

export function buildProductionDigitalIdentity({
  internalLabel,
  shortCode,
  requestOrigin,
  envBaseUrl,
}: DigitalIdentityInput): DigitalIdentity {
  const baseUrl = normalizeBaseUrl(envBaseUrl) || getAppBaseUrl(requestOrigin);
  const normalizedShortCode = shortCode?.trim() || null;
  const canonicalPath = normalizedShortCode ? `/e/${encodeURIComponent(normalizedShortCode)}` : null;
  const canonicalPublicUrl = canonicalPath ? `${baseUrl || ""}${canonicalPath}` : null;
  const activationFallbackUrl = `${baseUrl || ""}/activar/${encodeURIComponent(internalLabel)}`;
  const qrPayload = canonicalPublicUrl;
  const qrImageUrl = canonicalPublicUrl ? `/api/public/qr?data=${encodeURIComponent(canonicalPublicUrl)}` : null;
  const nfcUrl = canonicalPublicUrl;
  const missingReasons = [];

  if (!isRealShortCode(normalizedShortCode)) {
    missingReasons.push("Falta shortCode real");
  }

  return {
    internalLabel,
    shortCode: isRealShortCode(normalizedShortCode) ? normalizedShortCode : null,
    canonicalPublicUrl,
    activationFallbackUrl,
    nfcUrl,
    qrPayload,
    qrImageUrl,
    canPrint: Boolean(canonicalPublicUrl),
    missingReasons,
    isLocalUrl: !baseUrl,
  };
}

export function isProductionDigitalShortCodeValid(shortCode: string | null | undefined, internalLabel: string) {
  const trimmed = shortCode?.trim() || "";
  if (!trimmed) return false;
  return trimmed !== internalLabel;
}
