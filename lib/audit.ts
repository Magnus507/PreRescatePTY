import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { sanitizeTelemetry } from "@/lib/security/telemetry";

const MAX_SNAPSHOT_LENGTH = 16_000;

type AuditClient = {
  auditLog: {
    create(args: Prisma.AuditLogCreateArgs): Promise<unknown>;
  };
};

export type AuditResult = "success" | "failure" | "denied";

export type AuditEntry = {
  accountId?: string | null;
  actorUserId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  requestId: string;
  result?: AuditResult;
  before?: unknown;
  after?: unknown;
};

export function getAuditRequestId(request: Request): string {
  return (
    request.headers.get("x-vercel-id")?.trim() ||
    request.headers.get("x-request-id")?.trim() ||
    randomUUID()
  );
}

export function serializeAuditSnapshot(value: unknown): string | null {
  if (value === undefined) return null;
  const serialized = JSON.stringify(sanitizeTelemetry(value));
  if (serialized.length <= MAX_SNAPSHOT_LENGTH) return serialized;
  return JSON.stringify({ truncated: true, originalLength: serialized.length });
}

export async function writeAuditLog(client: AuditClient, entry: AuditEntry) {
  return client.auditLog.create({
    data: {
      accountId: entry.accountId ?? null,
      actorUserId: entry.actorUserId ?? null,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      requestId: entry.requestId,
      result: entry.result ?? "success",
      oldValuesJson: serializeAuditSnapshot(entry.before),
      newValuesJson: serializeAuditSnapshot(entry.after),
    },
  });
}
