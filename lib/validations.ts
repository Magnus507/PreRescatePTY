import { z } from "zod";

// ──────────────────────────────────────────────
// ENUMS & CONSTANTS
// ──────────────────────────────────────────────

export const VALID_BLOOD_TYPES = [
  "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Pendiente"
] as const;

export const VALID_ADMIN_ROLES = ["admin", "superadmin", "imprenta"] as const;
export const VALID_USER_ROLES = ["owner", "member"] as const;
export const VALID_CHIP_STATUSES = ["inventory", "sold", "activated", "suspended", "deactivated", "lost"] as const;
export const VALID_SEX_OPTIONS = ["M", "F", "Otro"] as const;

export const VALID_ACCOUNT_TYPES = ["personal", "company"] as const;

// ──────────────────────────────────────────────
// AUTH SCHEMAS
// ──────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Email inválido").transform(v => v.toLowerCase().trim()),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export const registerSchema = z.object({
  email: z.string().email("Email inválido").transform(v => v.toLowerCase().trim()),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  phone: z.string().optional(),
  accountType: z.preprocess((v) => (typeof v === 'string' ? v.toLowerCase() : v), z.enum(VALID_ACCOUNT_TYPES)).default("personal"),
});

// ──────────────────────────────────────────────
// CONTACT SCHEMAS
// ──────────────────────────────────────────────

export const contactSchema = z.object({
  fullName: z.string().min(2, "Nombre completado requerido (mín. 2 caracteres)").transform(s => s.trim()),
  relationship: z.string().min(1, "Parentesco requerido").transform(s => s.trim()),
  phone: z.string().min(7, "Teléfono inválido (mín. 7 dígitos)").transform(s => s.trim()),
  email: z.string().email("Email inválido").optional().or(z.literal('')),
  priorityOrder: z.number().int().optional().default(1),
  notifySms: z.boolean().default(false).optional(),
  notifyEmail: z.boolean().default(true).optional(),
  notifyWhatsapp: z.boolean().default(false).optional(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token requerido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

// ──────────────────────────────────────────────
// PROFILE SCHEMAS
// ──────────────────────────────────────────────

export const profileUpdateSchema = z.object({
  firstName: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  lastName: z.string().min(2, "El apellido debe tener al menos 2 caracteres").max(100),
  displayNamePublic: z.string().max(100).optional().nullable(),
  birthDate: z.string().optional().nullable().transform(v => {
    if (!v) return null;
    const date = new Date(v);
    if (isNaN(date.getTime())) return null;
    return date;
  }),
  sex: z.enum(VALID_SEX_OPTIONS).optional().nullable(),
  bloodType: z.enum(VALID_BLOOD_TYPES, { message: "Tipo de sangre inválido" }),
  allergies: z.string().max(1000).optional().default(""),
  chronicConditions: z.string().max(1000).optional().default(""),
  medications: z.string().max(1000).optional().default(""),
  additionalNotes: z.string().max(2000).optional().default(""),
  isInsured: z.boolean().optional(),
  insuranceProvider: z.string().max(100).optional().nullable(),
  insurancePolicyNumber: z.string().max(100).optional().nullable(),
  preferredHospital: z.string().max(150).optional().nullable(),
  insuranceEmergencyPhone: z.string().max(30).optional().nullable(),
  primaryDoctorName: z.string().max(120).optional().nullable(),
  primaryDoctorPhone: z.string().max(30).optional().nullable(),
  showInsuranceProviderPublic: z.boolean().optional(),
  showPreferredHospitalPublic: z.boolean().optional(),
  showPrimaryDoctorPublic: z.boolean().optional(),
  showPrimaryDoctorPhonePublic: z.boolean().optional(),
  showAdditionalNotesPublic: z.boolean().optional(),

  // v2 — Asistencia especial
  hasCognitiveImpairment: z.boolean().optional(),
  hasWanderingRisk: z.boolean().optional(),
  isNonVerbal: z.boolean().optional(),
  communicationAssistance: z.string().max(500).optional().nullable(),
  safeReturnInstructions: z.string().max(1000).optional().nullable(),
  showVulnerabilityStatusPublic: z.boolean().optional(),
  showCommunicationStatusPublic: z.boolean().optional(),
  showSafeReturnPublic: z.boolean().optional(),
  safeReturnLocationName: z.string().max(150).optional().nullable(),
  safeReturnAddress: z.string().max(500).optional().nullable(),
  safeReturnLat: z.coerce.number()
    .finite()
    .min(-90, "Latitud debe estar entre -90 y 90")
    .max(90)
    .optional()
    .nullable(),
  safeReturnLng: z.coerce.number()
    .finite()
    .min(-180, "Longitud debe estar entre -180 y 180")
    .max(180)
    .optional()
    .nullable(),
  safeReturnContactName: z.string().max(120).optional().nullable(),
  safeReturnContactPhone: z.string().max(30).optional().nullable(),
  showSafeReturnLocationPublic: z.boolean().optional(),

  phone: z.string().max(20).optional().nullable(),
  nationalId: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
});

export const familyProfileCreateSchema = profileUpdateSchema.extend({
  accountId: z.string().cuid("ID de cuenta inválido"),
});

// ──────────────────────────────────────────────
// CHIP SCHEMAS
// ──────────────────────────────────────────────

export const chipActivationSchema = z.object({
  activationCode: z.string().min(1, "Código de activación requerido").transform(v => v.toUpperCase().trim()),
  profileId: z.string().min(1, "Perfil requerido").optional(),
});

export const publicScanSchema = z.object({
  sourceType: z.enum(["qr", "nfc"]).default("qr"),
  geoLat: z.coerce.number().finite().min(-90).max(90).optional().nullable(),
  geoLng: z.coerce.number().finite().min(-180).max(180).optional().nullable(),
  geoAccuracy: z.coerce.number().finite().nonnegative().optional().nullable(),
  country: z.string().trim().max(100).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
});

// ──────────────────────────────────────────────
// ADMIN USER SCHEMAS
// ──────────────────────────────────────────────

export const adminCreateSchema = z.object({
  email: z.string().email("Email inválido").transform(v => v.toLowerCase().trim()),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  role: z.preprocess((v) => (typeof v === 'string' ? v.toLowerCase() : v), z.enum(VALID_ADMIN_ROLES)).default("admin"),
});

export const adminUpdateSchema = z.object({
  id: z.string().cuid("ID inválido"),
  status: z.preprocess((v) => (typeof v === 'string' ? v.toLowerCase() : v), z.enum(["active", "suspended"])).optional(),
  role: z.preprocess((v) => (typeof v === 'string' ? v.toLowerCase() : v), z.enum(VALID_ADMIN_ROLES)).optional(),
});

// ──────────────────────────────────────────────
// ORDER SCHEMAS
// ──────────────────────────────────────────────

/**
 * Store checkout contract.
 *
 * The customer/delivery fields are an immutable snapshot of the person and
 * destination selected at checkout. They must not be silently inferred to a
 * generic value such as "Cliente", because fulfillment needs an identifiable
 * recipient even when the account profile is incomplete or the order is sent
 * to a different person/address.
 */
export const orderCreateSchema = z.object({
  customerName: z.string().trim().min(2, "Nombre de quien recibe requerido").max(200),
  customerEmail: z.string().trim().email("Email inválido"),
  customerPhone: z.string().trim().min(7, "Teléfono de contacto requerido").max(30),
  shippingAddress: z.string().trim().min(5, "Dirección de entrega requerida").max(500),
  shippingCity: z.string().trim().min(2, "Ciudad o área de entrega requerida").max(100),
  shippingNotes: z.string().trim().max(500, "Las notas no pueden superar 500 caracteres").optional().default(""),
  providerReference: z.string().optional().nullable(),
  paymentMethod: z.preprocess((v) => (typeof v === 'string' ? v.toLowerCase() : v), z.enum(["manual", "yappy", "bank_transfer"])).optional().default("manual"),
  customerDocument: z.string().optional().nullable(),
  items: z.array(z.object({
    productType: z.string(),
    quantity: z.coerce.number().finite().int().positive(),
    unitPrice: z.coerce.number().finite().positive(),
    profileId: z.string().optional(),
  })).min(1, "Debe incluir al menos un producto"),
});

// ──────────────────────────────────────────────
// HELPER: Safe parse with formatted error messages
// ──────────────────────────────────────────────

export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const firstError = result.error.errors[0];
    throw new Error(firstError.message);
  }
  return result.data;
}

export function validateOrNull<T>(schema: z.ZodSchema<T>, data: unknown): { data: T | null; error: string | null } {
  const result = schema.safeParse(data);
  if (!result.success) {
    return { data: null, error: result.error.errors[0].message };
  }
  return { data: result.data, error: null };
}
