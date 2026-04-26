/**
 * DATABASE INTEGRITY AUDIT SCRIPT
 * ================================
 * Performs a deep audit of the PreRescatePTY database to detect:
 * 1. Orphaned records (data without parents)
 * 2. Inconsistencies (broken references)
 * 3. Garbage data (expired tokens, stale entries)
 * 4. Index coverage analysis
 * 5. Data distribution overview
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL
    }
  }
});

interface AuditResult {
  category: string;
  check: string;
  status: "✅ OK" | "⚠️ WARNING" | "🔴 CRITICAL";
  count: number;
  details: string;
}

async function runAudit() {
  const results: AuditResult[] = [];
  console.log("\n🔍 ═══════════════════════════════════════════════════════");
  console.log("   AUDITORÍA PROFUNDA DE BASE DE DATOS — PreRescatePTY");
  console.log("═══════════════════════════════════════════════════════\n");

  // ── 1. GENERAL OVERVIEW ──────────────────────────────────────────
  console.log("📊 CONTEO GENERAL DE TABLAS:");
  const counts = {
    users: await prisma.user.count(),
    adminUsers: await prisma.user.count({ where: { isAdmin: true } }),
    accounts: await prisma.account.count(),
    profiles: await prisma.profile.count(),
    contacts: await prisma.contact.count(),
    profileContacts: await prisma.profileContact.count(),
    chips: await prisma.chip.count(),
    organizations: await prisma.organization.count(),
    orgMembers: await prisma.organizationMember.count(),
    orders: await prisma.order.count(),
    orderItems: await prisma.orderItem.count(),
    scanEvents: await prisma.scanEvent.count(),
    notifications: await prisma.notification.count(),
    appNotifications: await prisma.appNotification.count(),
    consents: await prisma.consent.count(),
    auditLogs: await prisma.auditLog.count(),
    chipClaimTokens: await prisma.chipClaimToken.count(),
    passwordResetTokens: await prisma.passwordResetToken.count(),
    packages: await prisma.package.count(),
    products: await prisma.product.count(),
  };

  for (const [table, count] of Object.entries(counts)) {
    console.log(`   ${table.padEnd(22)} → ${count}`);
  }

  // ── 2. ORPHAN DETECTION ──────────────────────────────────────────
  console.log("\n🔗 DETECCIÓN DE HUÉRFANOS (registros sin padre):\n");

  // Users without accounts
  const usersNoAccount = await prisma.user.count({ where: { accountId: null } });
  results.push({
    category: "ORPHANS",
    check: "Usuarios sin Account vinculada",
    status: usersNoAccount > 0 ? "⚠️ WARNING" : "✅ OK",
    count: usersNoAccount,
    details: usersNoAccount > 0 ? "Usuarios registrados que nunca se les creó cuenta" : "Todos los usuarios tienen cuenta"
  });

  // Accounts without any users
  const accountsNoUsers = await prisma.account.count({
    where: { users: { none: {} } }
  });
  results.push({
    category: "ORPHANS",
    check: "Accounts sin ningún usuario",
    status: accountsNoUsers > 0 ? "🔴 CRITICAL" : "✅ OK",
    count: accountsNoUsers,
    details: accountsNoUsers > 0 ? "BASURA: cuentas vacías que nadie usa" : "Todas las cuentas tienen al menos un usuario"
  });

  // Profiles without account
  const profilesNoAccount = await prisma.profile.count({ where: { accountId: null } });
  results.push({
    category: "ORPHANS",
    check: "Profiles sin Account",
    status: profilesNoAccount > 0 ? "⚠️ WARNING" : "✅ OK",
    count: profilesNoAccount,
    details: profilesNoAccount > 0 ? "Fichas médicas flotantes sin cuenta padre" : "Todas las fichas pertenecen a una cuenta"
  });

  // Profiles without user (dependents are OK, but orphaned ones are not)
  const profilesNoUser = await prisma.profile.count({ where: { userId: null } });
  results.push({
    category: "ORPHANS",
    check: "Profiles sin User (dependientes potenciales)",
    status: profilesNoUser > 0 ? "⚠️ WARNING" : "✅ OK",
    count: profilesNoUser,
    details: profilesNoUser > 0 ? "Puede ser normal para perfiles dependientes (hijos, mascota)" : "Todos los perfiles tienen usuario"
  });

  // Chips assigned to non-existent accounts
  const chipsOrphanAccount = await prisma.$queryRawUnsafe<{count: bigint}[]>(
    `SELECT COUNT(*) as count FROM "Chip" c WHERE c."accountId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Account" a WHERE a.id = c."accountId")`
  );
  const chipsOrphanCount = Number(chipsOrphanAccount[0]?.count || 0);
  results.push({
    category: "ORPHANS",
    check: "Chips apuntando a Account inexistente",
    status: chipsOrphanCount > 0 ? "🔴 CRITICAL" : "✅ OK",
    count: chipsOrphanCount,
    details: chipsOrphanCount > 0 ? "BASURA CRÍTICA: chips con referencia a cuentas borradas" : "Todas las referencias de chips son válidas"
  });

  // Contacts without user
  const contactsNoUser = await prisma.contact.count({ where: { userId: null } });
  results.push({
    category: "ORPHANS",
    check: "Contacts sin User",
    status: contactsNoUser > 0 ? "⚠️ WARNING" : "✅ OK",
    count: contactsNoUser,
    details: contactsNoUser > 0 ? "Contactos de emergencia sin dueño" : "Todos los contactos están vinculados"
  });

  // Orders without user
  const ordersNoUser = await prisma.order.count({ where: { userId: null } });
  results.push({
    category: "ORPHANS",
    check: "Orders sin User vinculado",
    status: ordersNoUser > 0 ? "⚠️ WARNING" : "✅ OK",
    count: ordersNoUser,
    details: ordersNoUser > 0 ? "Pedidos sin usuario (pueden ser de invitados)" : "Todos los pedidos tienen usuario"
  });

  // ── 3. GARBAGE DETECTION ─────────────────────────────────────────
  console.log("🗑️  DETECCIÓN DE BASURA:\n");

  // Expired password reset tokens
  const expiredTokens = await prisma.passwordResetToken.count({
    where: { expiresAt: { lt: new Date() } }
  });
  results.push({
    category: "GARBAGE",
    check: "Tokens de reset expirados",
    status: expiredTokens > 0 ? "⚠️ WARNING" : "✅ OK",
    count: expiredTokens,
    details: expiredTokens > 0 ? "Pueden eliminarse de forma segura" : "Sin tokens expirados"
  });

  // Used claim tokens (already redeemed)
  const usedClaimTokens = await prisma.chipClaimToken.count({
    where: { usedAt: { not: null } }
  });
  results.push({
    category: "GARBAGE",
    check: "ChipClaimTokens ya usados",
    status: usedClaimTokens > 3 ? "⚠️ WARNING" : "✅ OK",
    count: usedClaimTokens,
    details: usedClaimTokens > 0 ? "Tokens de activación ya redimidos (pueden eliminarse)" : "Sin tokens usados"
  });

  // Expired claim tokens
  const expiredClaims = await prisma.chipClaimToken.count({
    where: { expiresAt: { lt: new Date() }, usedAt: null }
  });
  results.push({
    category: "GARBAGE",
    check: "ChipClaimTokens expirados sin usar",
    status: expiredClaims > 0 ? "⚠️ WARNING" : "✅ OK",
    count: expiredClaims,
    details: expiredClaims > 0 ? "Tokens que nunca se redimieron y ya expiraron" : "Sin tokens expirados"
  });

  // Old read notifications (> 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const oldNotifications = await prisma.appNotification.count({
    where: { read: true, createdAt: { lt: thirtyDaysAgo } }
  });
  results.push({
    category: "GARBAGE",
    check: "Notificaciones leídas >30 días",
    status: oldNotifications > 10 ? "⚠️ WARNING" : "✅ OK",
    count: oldNotifications,
    details: oldNotifications > 0 ? "Notificaciones antiguas que pueden purgarse" : "Sin notificaciones antiguas"
  });

  // ── 4. DATA CONSISTENCY ──────────────────────────────────────────
  console.log("🔒 CONSISTENCIA DE DATOS:\n");

  // Chips marked as "activated" but without account
  const activatedNoAccount = await prisma.chip.count({
    where: { status: "activated", accountId: null }
  });
  results.push({
    category: "CONSISTENCY",
    check: "Chips 'activated' sin Account",
    status: activatedNoAccount > 0 ? "🔴 CRITICAL" : "✅ OK",
    count: activatedNoAccount,
    details: activatedNoAccount > 0 ? "INCONSISTENCIA: chips activados sin cuenta dueña" : "Todos los chips activados tienen cuenta"
  });

  // Chips marked as "activated" but without profile
  const activatedNoProfile = await prisma.chip.count({
    where: { status: "activated", assignedProfileId: null }
  });
  results.push({
    category: "CONSISTENCY",
    check: "Chips 'activated' sin Profile asignado",
    status: activatedNoProfile > 0 ? "⚠️ WARNING" : "✅ OK",
    count: activatedNoProfile,
    details: activatedNoProfile > 0 ? "Chips activos que aún no tienen perfil vinculado" : "Todos los chips activos tienen perfil"
  });

  // Accounts where allocated chips exceed maxChips
  const overAllocated = await prisma.$queryRawUnsafe<{count: bigint}[]>(
    `SELECT COUNT(*) as count FROM "Account" a WHERE (SELECT COUNT(*) FROM "Chip" c WHERE c."accountId" = a.id) > a."maxChipsAllocated"`
  );
  const overCount = Number(overAllocated[0]?.count || 0);
  results.push({
    category: "CONSISTENCY",
    check: "Accounts con más chips que su capacidad máxima",
    status: overCount > 0 ? "🔴 CRITICAL" : "✅ OK",
    count: overCount,
    details: overCount > 0 ? "Cuentas que exceden su límite de plan (posible bug)" : "Todas las cuentas dentro de su capacidad"
  });

  // Duplicate profiles for same user
  const dupProfiles = await prisma.$queryRawUnsafe<{count: bigint}[]>(
    `SELECT COUNT(*) as count FROM (SELECT "userId", COUNT(*) as c FROM "Profile" WHERE "userId" IS NOT NULL GROUP BY "userId" HAVING COUNT(*) > 1) sub`
  );
  const dupCount = Number(dupProfiles[0]?.count || 0);
  results.push({
    category: "CONSISTENCY",
    check: "Usuarios con múltiples perfiles (debería ser 1:1)",
    status: dupCount > 0 ? "🔴 CRITICAL" : "✅ OK",
    count: dupCount,
    details: dupCount > 0 ? "BASURA: usuarios con más de un perfil personal" : "Relación User→Profile íntegra"
  });

  // ── 5. CHIP STATUS DISTRIBUTION ──────────────────────────────────
  console.log("📦 DISTRIBUCIÓN DE CHIPS:\n");
  const chipsByStatus = await prisma.chip.groupBy({
    by: ["status"],
    _count: { id: true }
  });
  for (const group of chipsByStatus) {
    console.log(`   ${group.status.padEnd(15)} → ${group._count.id}`);
  }

  // ── 6. ORDER STATUS DISTRIBUTION ─────────────────────────────────
  console.log("\n💰 DISTRIBUCIÓN DE PEDIDOS:\n");
  const ordersByStatus = await prisma.order.groupBy({
    by: ["orderStatus"],
    _count: { id: true }
  });
  for (const group of ordersByStatus) {
    console.log(`   ${group.orderStatus.padEnd(15)} → ${group._count.id}`);
  }

  // ── FINAL REPORT ─────────────────────────────────────────────────
  console.log("\n\n═══════════════════════════════════════════════════════");
  console.log("             REPORTE FINAL DE AUDITORÍA");
  console.log("═══════════════════════════════════════════════════════\n");

  const critical = results.filter(r => r.status === "🔴 CRITICAL");
  const warnings = results.filter(r => r.status === "⚠️ WARNING");
  const ok = results.filter(r => r.status === "✅ OK");

  for (const r of results) {
    console.log(`${r.status} [${r.category}] ${r.check}: ${r.count}`);
    if (r.status !== "✅ OK") console.log(`   → ${r.details}`);
  }

  console.log(`\n─────────────────────────────────────────────────────`);
  console.log(`✅ Checks OK:       ${ok.length}`);
  console.log(`⚠️  Advertencias:    ${warnings.length}`);
  console.log(`🔴 Críticos:        ${critical.length}`);
  console.log(`─────────────────────────────────────────────────────`);

  if (critical.length === 0 && warnings.length === 0) {
    console.log("\n🏆 BASE DE DATOS EN ÓPTIMAS CONDICIONES. Sin basura detectada.\n");
  } else if (critical.length > 0) {
    console.log("\n🛑 SE REQUIERE INTERVENCIÓN INMEDIATA. Hay datos inconsistentes.\n");
  } else {
    console.log("\n⚠️  Hay advertencias menores. Nada urgente, pero se recomienda limpieza.\n");
  }

  await prisma.$disconnect();
}

runAudit().catch(async (e) => {
  console.error("Error en auditoría:", e);
  await prisma.$disconnect();
  process.exit(1);
});
