import { createHash } from "node:crypto";

export const PASSWORD_MIN_LENGTH = 15;
export const PASSWORD_MAX_LENGTH = 128;
const HIBP_TIMEOUT_MS = 2_500;

const COMMON_PASSWORDS = new Set([
  "123456789012345",
  "passwordpassword",
  "password123456",
  "qwertyqwerty123",
  "adminadminadmin",
  "administrator123",
  "letmeinletmein123",
  "welcomeWelcome1",
  "iloveyouiloveyou",
  "prerescatepty123",
]);

export type PasswordPolicyContext = {
  email?: string | null;
  extraBlockedTerms?: string[];
};

export type PasswordPolicyResult =
  | { ok: true; breachCount: 0 }
  | { ok: false; error: string; reason: "length" | "common" | "personal" | "breached" | "breach_check_unavailable"; retryable?: boolean };

function normalizedForComparison(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function contextTerms(context: PasswordPolicyContext): string[] {
  const terms = [...(context.extraBlockedTerms || [])];
  if (context.email) {
    const localPart = context.email.toLowerCase().split("@")[0];
    if (localPart) terms.push(localPart);
  }
  return terms
    .map(normalizedForComparison)
    .filter((term) => term.length >= 4);
}

export async function queryPwnedPasswordCount(
  password: string,
  fetchImpl: typeof fetch = fetch
): Promise<number | null> {
  const digest = createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  const prefix = digest.slice(0, 5);
  const suffix = digest.slice(5);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HIBP_TIMEOUT_MS);

  try {
    const response = await fetchImpl(`https://api.pwnedpasswords.com/range/${prefix}`, {
      method: "GET",
      headers: {
        "Add-Padding": "true",
        "User-Agent": "PreRescatePTY-password-policy",
      },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return null;

    const body = await response.text();
    for (const line of body.split(/\r?\n/)) {
      const [candidateSuffix, countText] = line.split(":");
      if (candidateSuffix === suffix) {
        const count = Number.parseInt(countText || "0", 10);
        return Number.isFinite(count) ? count : 0;
      }
    }
    return 0;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Single server-side password policy for registration, reset and admin
 * creation. It favors length and known-compromise blocking instead of forced
 * character-class composition rules.
 */
export async function validatePasswordPolicy(
  password: string,
  context: PasswordPolicyContext = {},
  fetchImpl: typeof fetch = fetch
): Promise<PasswordPolicyResult> {
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    return {
      ok: false,
      reason: "length",
      error: `La contraseña debe tener entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres.`,
    };
  }

  const normalized = normalizedForComparison(password);
  if (COMMON_PASSWORDS.has(normalized) || COMMON_PASSWORDS.has(password.toLowerCase())) {
    return {
      ok: false,
      reason: "common",
      error: "Elige una contraseña menos común.",
    };
  }

  if (contextTerms(context).some((term) => normalized.includes(term))) {
    return {
      ok: false,
      reason: "personal",
      error: "La contraseña no debe contener datos fáciles de asociar con tu cuenta.",
    };
  }

  const breachCount = await queryPwnedPasswordCount(password, fetchImpl);
  if (breachCount === null) {
    return {
      ok: false,
      reason: "breach_check_unavailable",
      retryable: true,
      error: "No se pudo comprobar de forma segura si la contraseña está comprometida. Intenta de nuevo.",
    };
  }
  if (breachCount > 0) {
    return {
      ok: false,
      reason: "breached",
      error: "Esta contraseña aparece en filtraciones conocidas. Elige una contraseña distinta.",
    };
  }

  return { ok: true, breachCount: 0 };
}
