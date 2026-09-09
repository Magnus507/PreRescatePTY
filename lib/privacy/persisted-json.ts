import { redactTelemetryString, sanitizeTelemetry } from "@/lib/security/telemetry";

/**
 * Redacts PII/secrets from historical JSON snapshots while preserving the
 * operational shape needed for audit and traceability. Invalid legacy JSON is
 * treated as an opaque string and redacted conservatively.
 */
export function redactPersistedJson(value: string | null | undefined): string | null {
  if (!value) return null;

  try {
    return JSON.stringify(sanitizeTelemetry(JSON.parse(value)));
  } catch {
    return redactTelemetryString(value);
  }
}
