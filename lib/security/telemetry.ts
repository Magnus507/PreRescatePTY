export const TELEMETRY_REDACTED = "[REDACTED]";

const MAX_REDACTION_DEPTH = 8;

const SENSITIVE_KEY_FRAGMENTS = [
  // Authentication and secrets
  "password",
  "passcode",
  "token",
  "authorization",
  "cookie",
  "secret",
  "apikey",
  "encryptionkey",
  "clientsecret",
  "session",
  // Direct identifiers / PII
  "email",
  "phone",
  "telephone",
  "whatsapp",
  "address",
  "birthdate",
  "dateofbirth",
  "ipaddress",
  "latitude",
  "longitude",
  "location",
  "coordinate",
  "cedula",
  "documentnumber",
  // Medical / PHI
  "medical",
  "allerg",
  "medication",
  "medicamento",
  "condition",
  "condicion",
  "diagnos",
  "bloodtype",
  "bloodgroup",
  "tipodesangre",
  "treatment",
  "disability",
  "emergencycontact",
  // Payment evidence
  "receipt",
  "comprobante",
  "voucher",
  "paymentproof",
  "bankaccount",
  "cardnumber",
  "cvv",
] as const;

const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/g;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PANAMA_PHONE_PATTERN = /(?<!\d)(?:\+?507[\s.-]*)?(?:6\d{3}[\s.-]*\d{4}|[2-9]\d{2}[\s.-]*\d{4})(?!\d)/g;
const CONNECTION_STRING_PATTERN = /\b(?:postgres(?:ql)?|redis|rediss|mysql):\/\/[^\s]+/gi;
const SENSITIVE_ASSIGNMENT_PATTERN = /\b(?:token|access[_-]?token|refresh[_-]?token|secret|password|passcode|api[_-]?key|authorization|cookie)\s*[:=]\s*[^\s,;]+/gi;
const MEDICAL_ASSIGNMENT_PATTERN = /\b(?:allerg(?:y|ies|ia|ias)|medication(?:s)?|medicamento(?:s)?|condition(?:s)?|condici[oó]n(?:es)?|blood\s*type|tipo\s+de\s+sangre|diagnos(?:is|tics?)|medical\s*notes?|notas?\s+m[eé]dicas?)\s*[:=]\s*[^,;\n]+/gi;
const RECEIPT_ASSIGNMENT_PATTERN = /\b(?:receipt|comprobante|voucher|payment\s*proof)\s*[:=]\s*[^\s,;]+/gi;
const SENSITIVE_QUERY_PATTERN = /([?&](?:token|secret|password|passcode|api[_-]?key|authorization)=)[^&#\s]+/gi;

function normalizeKey(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isSensitiveTelemetryKey(key: string) {
  const normalized = normalizeKey(key);
  return SENSITIVE_KEY_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}

export function redactTelemetryString(value: string) {
  return value
    .replace(CONNECTION_STRING_PATTERN, TELEMETRY_REDACTED)
    .replace(BEARER_PATTERN, TELEMETRY_REDACTED)
    .replace(JWT_PATTERN, TELEMETRY_REDACTED)
    .replace(EMAIL_PATTERN, TELEMETRY_REDACTED)
    .replace(PANAMA_PHONE_PATTERN, TELEMETRY_REDACTED)
    .replace(SENSITIVE_ASSIGNMENT_PATTERN, TELEMETRY_REDACTED)
    .replace(MEDICAL_ASSIGNMENT_PATTERN, TELEMETRY_REDACTED)
    .replace(RECEIPT_ASSIGNMENT_PATTERN, TELEMETRY_REDACTED)
    .replace(SENSITIVE_QUERY_PATTERN, "$1[REDACTED]");
}

function redactValue(
  value: unknown,
  key: string | undefined,
  seen: WeakSet<object>,
  depth: number,
): unknown {
  if (key && isSensitiveTelemetryKey(key)) {
    return TELEMETRY_REDACTED;
  }

  if (value == null || typeof value === "boolean" || typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return redactTelemetryString(value);
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "function" || typeof value === "symbol") {
    return TELEMETRY_REDACTED;
  }

  if (depth >= MAX_REDACTION_DEPTH) {
    return "[TRUNCATED]";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactTelemetryString(value.message),
      stack: value.stack ? redactTelemetryString(value.stack) : undefined,
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, undefined, seen, depth + 1));
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[CIRCULAR]";
    }

    seen.add(value);
    const redacted: Record<string, unknown> = {};

    for (const [entryKey, entryValue] of Object.entries(value)) {
      redacted[entryKey] = redactValue(
        entryValue,
        entryKey,
        seen,
        depth + 1,
      );
    }

    seen.delete(value);
    return redacted;
  }

  return TELEMETRY_REDACTED;
}

export function sanitizeTelemetry<T>(value: T): T {
  return redactValue(value, undefined, new WeakSet<object>(), 0) as T;
}

function stripUrlQueryAndHash(url: string) {
  const queryIndex = url.indexOf("?");
  const hashIndex = url.indexOf("#");
  const cutoff = [queryIndex, hashIndex]
    .filter((index) => index >= 0)
    .reduce((smallest, index) => Math.min(smallest, index), url.length);

  return redactTelemetryString(url.slice(0, cutoff));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function sanitizeSentryEvent<T>(event: T): T {
  const sanitized = sanitizeTelemetry(event);

  if (!isRecord(sanitized)) {
    return sanitized;
  }

  const result: Record<string, unknown> = { ...sanitized };

  if (isRecord(result.request)) {
    const request = { ...result.request };

    if (typeof request.url === "string") {
      request.url = stripUrlQueryAndHash(request.url);
    }

    if ("query_string" in request) {
      request.query_string = TELEMETRY_REDACTED;
    }

    if ("data" in request) {
      request.data = TELEMETRY_REDACTED;
    }

    if ("cookies" in request) {
      request.cookies = TELEMETRY_REDACTED;
    }

    result.request = request;
  }

  if (isRecord(result.user)) {
    const userId = result.user.id;
    result.user = userId == null
      ? undefined
      : { id: redactTelemetryString(String(userId)) };
  }

  return result as T;
}

export type TelemetryEnvironment =
  | "production"
  | "preview"
  | "development"
  | "test";

export function resolveTelemetryEnvironment(options: {
  nodeEnv?: string;
  vercelEnv?: string;
  hostname?: string;
} = {}): TelemetryEnvironment {
  const vercelEnv = options.vercelEnv?.toLowerCase();

  if (vercelEnv === "production" || vercelEnv === "preview" || vercelEnv === "development") {
    return vercelEnv;
  }

  if (options.nodeEnv === "test") {
    return "test";
  }

  if (options.nodeEnv === "production") {
    if (options.hostname?.endsWith(".vercel.app")) {
      return "preview";
    }
    return "production";
  }

  return "development";
}

export function getTelemetrySampling(environment: TelemetryEnvironment) {
  switch (environment) {
    case "production":
      return { tracesSampleRate: 0.1, replaySessionSampleRate: 0, replayErrorSampleRate: 0 };
    case "preview":
      return { tracesSampleRate: 0.25, replaySessionSampleRate: 0, replayErrorSampleRate: 0 };
    case "development":
    case "test":
      return { tracesSampleRate: 0, replaySessionSampleRate: 0, replayErrorSampleRate: 0 };
  }
}

export function getSentryPrivacyConfig(options: {
  nodeEnv?: string;
  vercelEnv?: string;
  hostname?: string;
} = {}) {
  const environment = resolveTelemetryEnvironment(options);
  const sampling = getTelemetrySampling(environment);

  return {
    environment,
    sendDefaultPii: false,
    tracesSampleRate: sampling.tracesSampleRate,
    maxBreadcrumbs: 30,
    beforeSend: sanitizeSentryEvent,
    beforeSendTransaction: sanitizeSentryEvent,
    beforeBreadcrumb: sanitizeTelemetry,
  };
}
