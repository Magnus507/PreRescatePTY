ALTER TABLE "AuditLog"
  ADD COLUMN "requestId" TEXT,
  ADD COLUMN "result" TEXT NOT NULL DEFAULT 'success';

CREATE INDEX "AuditLog_requestId_idx" ON "AuditLog"("requestId");
