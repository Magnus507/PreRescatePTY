type ProductionDigitalIdentityInput = {
  internalLabel: string;
  shortCode?: string | null;
  requestOrigin?: string | null;
  envBaseUrl?: string | null;
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
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.APP_URL ||
    process.env.VERCEL_URL ||
    "";

  const normalizedEnv = normalizeBaseUrl(envBaseUrl);
  if (normalizedEnv) return normalizedEnv;

  const normalizedOrigin = normalizeBaseUrl(requestOrigin);
  if (normalizedOrigin) return normalizedOrigin;

  return "";
}

export function buildProductionDigitalIdentity({
  internalLabel,
  shortCode,
  requestOrigin,
  envBaseUrl,
}: ProductionDigitalIdentityInput) {
  const baseUrl = normalizeBaseUrl(envBaseUrl) || getAppBaseUrl(requestOrigin);
  const activationPath = `/activar/${encodeURIComponent(internalLabel)}`;
  const activationUrl = baseUrl ? `${baseUrl}${activationPath}` : activationPath;
  const qrPayload = activationUrl;
  const qrImageUrl = `/api/public/qr?data=${encodeURIComponent(qrPayload)}`;
  const nfcUrl = activationUrl;
  const publicUrl = shortCode ? `${baseUrl || ""}/e/${encodeURIComponent(shortCode)}` : null;

  return {
    internalLabel,
    shortCode: shortCode?.trim() || null,
    activationUrl,
    qrPayload,
    qrImageUrl,
    nfcUrl,
    publicUrl,
  };
}

export function isProductionDigitalShortCodeValid(shortCode: string | null | undefined, internalLabel: string) {
  const trimmed = shortCode?.trim() || "";
  if (!trimmed) return false;
  return trimmed !== internalLabel;
}
