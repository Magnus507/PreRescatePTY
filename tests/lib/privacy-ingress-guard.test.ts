import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("Block 3 privacy ingress guards", () => {
  it("does not persist registration IP/user-agent or email audit snapshots", () => {
    const register = source("app/api/auth/register/route.ts");

    expect(register).toMatch(/ipAddress:\s*null/);
    expect(register).toMatch(/userAgent:\s*null/);
    expect(register).not.toMatch(/newValuesJson:\s*JSON\.stringify\(\{\s*email\s*:/s);
  });

  it("forces repository audit snapshots through persisted JSON redaction", () => {
    const auditRepository = source("domains/shared/repositories/audit-log.repository.ts");

    expect(auditRepository).toContain("redactPersistedJson(data.oldValuesJson)");
    expect(auditRepository).toContain("redactPersistedJson(data.newValuesJson)");
  });

  it("routes administrative account deletion through SafeDelete", () => {
    const adminActions = source("app/api/admin/users/[id]/actions/route.ts");

    expect(adminActions).toContain("SafeDeleteService.deleteUserAccount(userId, adminId)");
    expect(adminActions).not.toContain('action: "definitive_deletion"');
    expect(adminActions).not.toMatch(/newValuesJson:\s*JSON\.stringify\(\{\s*email\s*:/s);
  });

  it("cleans a family profile photo before destroying the DB reference", () => {
    const profileRoute = source("app/api/users/perfiles-medicos/[profileId]/route.ts");

    expect(profileRoute).toContain("cleanupUploadedObjectOrRecordOrphan(existing.photoUrl");
    expect(profileRoute.indexOf("cleanupUploadedObjectOrRecordOrphan(existing.photoUrl"))
      .toBeLessThan(profileRoute.indexOf("await prisma.profile.delete"));
  });
});
