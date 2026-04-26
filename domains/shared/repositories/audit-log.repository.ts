import { prisma } from "@/lib/prisma";

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
   * Record a new audit log entry.
   */
  static async record(data: CreateAuditLogData) {
    return prisma.auditLog.create({
      data: {
        actorUserId: data.actorUserId,
        accountId: data.accountId || null,
        entityType: data.entityType,
        entityId: data.entityId,
        action: data.action,
        oldValuesJson: data.oldValuesJson || null,
        newValuesJson: data.newValuesJson || null,
      },
    });
  }
}
