import { prisma } from "@/lib/prisma";
import { redactPersistedJson } from "@/lib/privacy/persisted-json";

export interface CreateAuditLogData {
  actorUserId: string;
  accountId?: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValuesJson?: string;
  newValuesJson?: string;
}

export class AuditLogRepository {
  /**
   * Record an audit fact without turning AuditLog into a secondary PII store.
   * Payloads are always passed through the persisted-JSON redactor before
   * writing, even when a caller accidentally supplies identity/medical data.
   */
  static async record(data: CreateAuditLogData) {
    return prisma.auditLog.create({
      data: {
        actorUserId: data.actorUserId,
        accountId: data.accountId || null,
        entityType: data.entityType,
        entityId: data.entityId,
        action: data.action,
        oldValuesJson: redactPersistedJson(data.oldValuesJson),
        newValuesJson: redactPersistedJson(data.newValuesJson),
      },
    });
  }
}
