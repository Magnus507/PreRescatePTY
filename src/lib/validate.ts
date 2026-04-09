/**
 * Lightweight validation helpers — avoids adding zod to keep the bundle lean.
 * Returns { ok: true, data } or { ok: false, error: string }.
 */

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function validateRegister(body: unknown): ValidationResult<{
  email: string;
  password: string;
  phone?: string;
}> {
  if (!body || typeof body !== "object") return { ok: false, error: "Cuerpo inválido" };
  const { email, password, phone } = body as Record<string, unknown>;

  if (typeof email !== "string" || !email.includes("@")) {
    return { ok: false, error: "Email inválido" };
  }
  if (typeof password !== "string" || password.length < 8) {
    return { ok: false, error: "La contraseña debe tener al menos 8 caracteres" };
  }
  if (phone !== undefined && typeof phone !== "string") {
    return { ok: false, error: "Teléfono inválido" };
  }

  return { ok: true, data: { email: email.toLowerCase().trim(), password, phone: phone as string | undefined } };
}

const BLOOD_TYPES_SET = new Set(["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-", "Pendiente"]);

export function validateProfilePatch(body: unknown): ValidationResult<Record<string, string>> {
  if (!body || typeof body !== "object") return { ok: false, error: "Cuerpo inválido" };
  const b = body as Record<string, unknown>;

  if (b.bloodType !== undefined && !BLOOD_TYPES_SET.has(b.bloodType as string)) {
    return { ok: false, error: "Tipo de sangre inválido" };
  }
  if (b.firstName !== undefined && (typeof b.firstName !== "string" || b.firstName.trim() === "")) {
    return { ok: false, error: "Nombre inválido" };
  }
  if (b.lastName !== undefined && (typeof b.lastName !== "string" || b.lastName.trim() === "")) {
    return { ok: false, error: "Apellido inválido" };
  }

  return { ok: true, data: b as Record<string, string> };
}

export function validateContact(body: unknown): ValidationResult<{
  fullName: string;
  relationship: string;
  phone: string;
  email?: string;
  priorityOrder?: number;
  notifySms?: boolean;
  notifyEmail?: boolean;
  notifyWhatsapp?: boolean;
}> {
  if (!body || typeof body !== "object") return { ok: false, error: "Cuerpo inválido" };
  const b = body as Record<string, unknown>;

  if (typeof b.fullName !== "string" || b.fullName.trim().length < 2) {
    return { ok: false, error: "Nombre completo requerido (mín. 2 caracteres)" };
  }
  if (typeof b.relationship !== "string" || b.relationship.trim() === "") {
    return { ok: false, error: "Parentesco requerido" };
  }
  if (typeof b.phone !== "string" || b.phone.trim().length < 7) {
    return { ok: false, error: "Teléfono inválido (mín. 7 dígitos)" };
  }
  if (b.email !== undefined && b.email !== "" && (typeof b.email !== "string" || !b.email.includes("@"))) {
    return { ok: false, error: "Email inválido" };
  }

  return {
    ok: true,
    data: {
      fullName: (b.fullName as string).trim(),
      relationship: (b.relationship as string).trim(),
      phone: (b.phone as string).trim(),
      email: b.email as string | undefined,
      priorityOrder: typeof b.priorityOrder === "number" ? b.priorityOrder : undefined,
      notifySms: Boolean(b.notifySms),
      notifyEmail: b.notifyEmail !== false,
      notifyWhatsapp: Boolean(b.notifyWhatsapp),
    },
  };
}
