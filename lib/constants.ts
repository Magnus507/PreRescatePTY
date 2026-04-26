export const SITE_NAME = "PreRescue ID";
export const SITE_DESCRIPTION =
  "Sistema panameño de identificación de emergencia con NFC y QR. Tu información vital, siempre accesible en un sticker oficial.";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const BLOOD_TYPES = [
  "Pendiente", "O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"
] as const;


export const CHIP_STATUSES = [
  "inventory", "sold", "activated", "suspended", "retired", "replaced"
] as const;

export const RELATIONSHIPS = [
  "Esposo/a", "Padre", "Madre", "Hijo/a", "Hermano/a",
  "Abuelo/a", "Tío/a", "Primo/a", "Amigo/a", "Compañero/a de trabajo", "Otro"
] as const;

export const EMERGENCY_DISCLAIMER =
  "⚠️ Esta información es proporcionada por el usuario y no reemplaza la atención médica profesional ni al 911. En caso de emergencia, llame al 911 inmediatamente.";

export function generateShortCode(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    code += chars[array[i] % chars.length];
  }
  return code;
}

export function generateActivationCode(): string {
  const chars = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  for (let i = 0; i < 12; i++) {
    code += chars[array[i] % chars.length];
    if (i === 3 || i === 7) code += "-";
  }
  return code;
}

export function generateSerialPublic(): string {
  const prefix = "PRP";
  const ts = Date.now().toString(36).toUpperCase().slice(-4);
  const rand = generateShortCode(4);
  return `${prefix}-${ts}-${rand}`;
}
