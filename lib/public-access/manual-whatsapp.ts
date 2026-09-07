const PANAMA_COUNTRY_CODE = "507";
const MIN_E164_DIGITS = 8;
const MAX_E164_DIGITS = 15;

export const MANUAL_RESCUE_WHATSAPP_FALLBACK_NAME = "una persona";

export function normalizeWhatsAppPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;

  const trimmed = phone.trim();
  if (!trimmed) return null;

  const withoutInternationalPrefix = trimmed.startsWith("00")
    ? trimmed.slice(2)
    : trimmed.startsWith("+")
      ? trimmed.slice(1)
      : trimmed;

  let digits = withoutInternationalPrefix.replace(/\D/g, "");
  if (digits.length === 8) {
    digits = `${PANAMA_COUNTRY_CODE}${digits}`;
  }

  if (digits.length < MIN_E164_DIGITS || digits.length > MAX_E164_DIGITS) {
    return null;
  }

  return digits;
}

export function buildManualRescueWhatsAppMessage(personName?: string | null): string {
  const normalizedName = (personName || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || MANUAL_RESCUE_WHATSAPP_FALLBACK_NAME;

  return `Hola. Estoy asistiendo a ${normalizedName} y encontré su perfil de emergencia de PreRescatePTY. Por favor comunícate conmigo lo antes posible.`;
}

export function buildManualRescueWhatsAppUrl(
  phone: string | null | undefined,
  personName?: string | null
): string | null {
  const normalizedPhone = normalizeWhatsAppPhone(phone);
  if (!normalizedPhone) return null;

  const message = buildManualRescueWhatsAppMessage(personName);
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}
