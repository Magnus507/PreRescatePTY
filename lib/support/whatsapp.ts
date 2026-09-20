export function normalizeWhatsAppPhone(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  const digits = raw.replace(/\D/g, "");

  if (digits.length === 8) {
    return `507${digits}`;
  }

  if (digits.length >= 10 && digits.length <= 15) {
    return digits;
  }

  return null;
}

export function formatWhatsAppPhoneForDisplay(value: string): string {
  return value ? `+${value}` : "";
}

export function buildWhatsAppSupportUrl(phone: string, name?: string): string {
  const text = name
    ? `Hola ${name}, te contactamos de PreRescue ID por tu mensaje de soporte.`
    : "Hola, te contactamos de PreRescue ID por tu mensaje de soporte.";

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
