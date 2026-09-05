import { PrismaClient } from "@prisma/client";

// Out-of-band bootstrap only. The operator must first obtain explicit approval
// for the existing user ID. No passwords are created or printed; no data reset.
const db = new PrismaClient();
async function main() {
  const userId = process.env.BOOTSTRAP_ADMIN_USER_ID?.trim();
  if (!userId) throw new Error("BOOTSTRAP_ADMIN_USER_ID is required");
  const apply = process.argv.includes("--apply");
  await db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('prerescate-admin-bootstrap'))`;
    if (await tx.user.count({ where: { isAdmin: true, status: "active", deletedAt: null } })) {
      throw new Error("An active administrator already exists; use the normal admin workflow");
    }
    const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true, status: true, deletedAt: true, isAdmin: true } });
    if (!user || user.status !== "active" || user.deletedAt || user.isAdmin) {
      throw new Error("Target must be an existing active non-administrator");
    }
    if (!apply) {
      console.log("Dry run passed. No changes made. Apply only after the account owner approves the target user ID.");
      return;
    }
    await tx.user.update({ where: { id: userId, status: "active", deletedAt: null, isAdmin: false }, data: { isAdmin: true, adminRole: "superadmin", sessionVersion: { increment: 1 } } });
    await tx.auditLog.create({ data: { entityType: "User", entityId: userId, action: "INITIAL_ADMIN_BOOTSTRAP", newValuesJson: JSON.stringify({ method: "approved-existing-user", role: "superadmin" }) } });
    console.log("Administrator bootstrap committed. Existing sessions revoked; sign in again and enable MFA.");
  });
}
main().catch(() => { console.error("Administrator bootstrap failed; inspect prerequisites without exposing credentials."); process.exitCode = 1; }).finally(() => db.$disconnect());
