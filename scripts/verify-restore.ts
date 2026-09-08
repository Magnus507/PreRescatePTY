import { createHash } from "node:crypto";
import { Client } from "pg";

const SOURCE_URL = process.env.SOURCE_DATABASE_URL;
const RESTORE_URL = process.env.RESTORE_DATABASE_URL;

if (!SOURCE_URL || !RESTORE_URL) {
  console.error("SOURCE_DATABASE_URL and RESTORE_DATABASE_URL are required.");
  process.exit(2);
}

const TABLES = [
  "User",
  "Account",
  "Profile",
  "Contact",
  "Chip",
  "Order",
  "OrderItem",
  "PaymentAttempt",
  "Invoice",
  "OperationCommercialOrder",
  "OperationCommercialOrderItem",
  "OperationFinishedGoodUnit",
  "OperationDispatch",
  "OperationDispatchItem",
  "AuditLog",
] as const;

type Fingerprint = {
  table: string;
  count: number;
  idHash: string;
};

function quoteIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

async function connect(url: string) {
  const client = new Client({ connectionString: url, statement_timeout: 15_000 });
  await client.connect();
  await client.query("BEGIN READ ONLY");
  return client;
}

async function tableExists(client: Client, table: string) {
  const result = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) AS exists`,
    [table]
  );
  return Boolean(result.rows[0]?.exists);
}

async function fingerprintTable(client: Client, table: string): Promise<Fingerprint> {
  if (!(await tableExists(client, table))) {
    throw new Error(`Missing table: public.${table}`);
  }

  const quoted = quoteIdentifier(table);
  const countResult = await client.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ${quoted}`);
  const rows = await client.query<{ id: string }>(`SELECT id::text AS id FROM ${quoted} ORDER BY id::text`);
  const digest = createHash("sha256");
  for (const row of rows.rows) digest.update(row.id).update("\n");

  return {
    table,
    count: Number(countResult.rows[0]?.count || 0),
    idHash: digest.digest("hex"),
  };
}

async function invariantCounts(client: Client) {
  const result = await client.query<{
    orphan_order_users: string;
    orphan_order_items: string;
    orphan_commercial_items: string;
    orphan_dispatch_items: string;
    duplicate_dispatch_units: string;
    inconsistent_dispatched_units: string;
    inconsistent_delivered_units: string;
  }>(`
    SELECT
      (SELECT COUNT(*) FROM "Order" o LEFT JOIN "User" u ON u.id = o."userId" WHERE o."userId" IS NOT NULL AND u.id IS NULL)::text AS orphan_order_users,
      (SELECT COUNT(*) FROM "OrderItem" i LEFT JOIN "Order" o ON o.id = i."orderId" WHERE o.id IS NULL)::text AS orphan_order_items,
      (SELECT COUNT(*) FROM "OperationCommercialOrderItem" i LEFT JOIN "OperationCommercialOrder" o ON o.id = i."commercialOrderId" WHERE o.id IS NULL)::text AS orphan_commercial_items,
      (SELECT COUNT(*) FROM "OperationDispatchItem" i LEFT JOIN "OperationDispatch" d ON d.id = i."dispatchId" WHERE d.id IS NULL)::text AS orphan_dispatch_items,
      (SELECT COUNT(*) FROM (SELECT "unitId" FROM "OperationDispatchItem" WHERE "unitId" IS NOT NULL GROUP BY "unitId" HAVING COUNT(*) > 1) q)::text AS duplicate_dispatch_units,
      (SELECT COUNT(*) FROM "OperationFinishedGoodUnit" WHERE status = 'dispatched' AND "dispatchedAt" IS NULL)::text AS inconsistent_dispatched_units,
      (SELECT COUNT(*) FROM "OperationFinishedGoodUnit" WHERE status = 'delivered' AND "deliveredAt" IS NULL)::text AS inconsistent_delivered_units
  `);
  return Object.fromEntries(
    Object.entries(result.rows[0] || {}).map(([key, value]) => [key, Number(value)])
  );
}

async function schemaMigrationCount(client: Client) {
  const exists = await tableExists(client, "_prisma_migrations");
  if (!exists) return -1;
  const result = await client.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`
  );
  return Number(result.rows[0]?.count || 0);
}

async function main() {
  const source = await connect(SOURCE_URL);
  const restore = await connect(RESTORE_URL);

  try {
    const sourceFingerprints: Fingerprint[] = [];
    const restoreFingerprints: Fingerprint[] = [];
    for (const table of TABLES) {
      sourceFingerprints.push(await fingerprintTable(source, table));
      restoreFingerprints.push(await fingerprintTable(restore, table));
    }

    const failures: string[] = [];
    for (const expected of sourceFingerprints) {
      const actual = restoreFingerprints.find((row) => row.table === expected.table)!;
      if (expected.count !== actual.count) {
        failures.push(`${expected.table}: row count ${actual.count} != source ${expected.count}`);
      }
      if (expected.idHash !== actual.idHash) {
        failures.push(`${expected.table}: primary-id fingerprint differs`);
      }
    }

    const [sourceMigrations, restoreMigrations] = await Promise.all([
      schemaMigrationCount(source),
      schemaMigrationCount(restore),
    ]);
    if (sourceMigrations < 0 || restoreMigrations < 0) {
      failures.push("_prisma_migrations is missing from source or restore target");
    } else if (sourceMigrations !== restoreMigrations) {
      failures.push(`_prisma_migrations: ${restoreMigrations} != source ${sourceMigrations}`);
    }

    const [sourceInvariants, restoreInvariants] = await Promise.all([
      invariantCounts(source),
      invariantCounts(restore),
    ]);
    for (const [name, value] of Object.entries(restoreInvariants)) {
      if (value !== 0) failures.push(`restore invariant ${name} = ${value}`);
    }

    console.log(JSON.stringify({
      verifiedAt: new Date().toISOString(),
      tables: restoreFingerprints.map((row) => ({ table: row.table, rows: row.count })),
      sourceMigrations,
      restoreMigrations,
      sourceInvariants,
      restoreInvariants,
      result: failures.length === 0 ? "PASS" : "FAIL",
      failures,
    }, null, 2));

    if (failures.length > 0) process.exitCode = 1;
  } finally {
    await source.query("ROLLBACK").catch(() => undefined);
    await restore.query("ROLLBACK").catch(() => undefined);
    await source.end();
    await restore.end();
  }
}

main().catch((error) => {
  console.error("Restore verification failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
