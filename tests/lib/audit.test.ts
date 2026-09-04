import { describe, expect, it, vi } from "vitest";
import { getAuditRequestId, serializeAuditSnapshot, writeAuditLog } from "@/lib/audit";

describe("audit contract", () => {
  it("uses a trusted request correlation header when present", () => {
    const request = new Request("https://example.test", {
      headers: { "x-request-id": "request-123", "x-vercel-id": "iad1::fallback" },
    });
    expect(getAuditRequestId(request)).toBe("iad1::fallback");
  });

  it("redacts credentials, PII and medical values from snapshots", () => {
    const snapshot = serializeAuditSnapshot({
      status: "active",
      password: "unsafe",
      email: "person@example.com",
      bloodType: "O+",
    });
    expect(snapshot).toContain('"status":"active"');
    expect(snapshot).not.toContain("unsafe");
    expect(snapshot).not.toContain("person@example.com");
    expect(snapshot).not.toContain("O+");
  });

  it("writes the uniform actor, entity, request, result and snapshot fields", async () => {
    const create = vi.fn().mockResolvedValue({ id: "audit-1" });
    await writeAuditLog({ auditLog: { create } }, {
      accountId: "account-1",
      actorUserId: "admin-1",
      entityType: "SystemConfig",
      entityId: "payment",
      action: "config_updated",
      requestId: "request-1",
      before: { enabled: false },
      after: { enabled: true },
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        accountId: "account-1",
        actorUserId: "admin-1",
        entityType: "SystemConfig",
        entityId: "payment",
        action: "config_updated",
        requestId: "request-1",
        result: "success",
        oldValuesJson: '{"enabled":false}',
        newValuesJson: '{"enabled":true}',
      }),
    });
  });
});
