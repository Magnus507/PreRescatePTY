import { Prisma, PrismaClient } from "@prisma/client";

const testDatabaseUrl = process.env.DATABASE_URL_TEST;

if (!testDatabaseUrl) {
  throw new Error("DATABASE_URL_TEST is required for PostgreSQL integration tests");
}

export function prepareIntegrationEnvironment() {
  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.DIRECT_URL = testDatabaseUrl;
}

export function createIntegrationPrismaClient() {
  return new PrismaClient({
    datasources: {
      db: {
        url: testDatabaseUrl,
      },
    },
  });
}

export async function assertIntegrationDatabaseReady(db: PrismaClient) {
  const rows = await db.$queryRaw<Array<{ exists: boolean }>>(Prisma.sql`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'User'
    ) AS "exists"
  `);

  if (!rows[0]?.exists) {
    throw new Error("Integration database schema is not ready. Rebuild the local PostgreSQL test schema before running integration tests.");
  }
}

export async function truncateIntegrationDatabase(db: PrismaClient) {
  const tables = await db.$queryRaw<Array<{ tablename: string }>>(Prisma.sql`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
    ORDER BY tablename
  `);

  if (tables.length === 0) {
    return;
  }

  const quotedTables = tables
    .map(({ tablename }) => `"public"."${tablename.replaceAll('"', '""')}"`)
    .join(', ');

  await db.$executeRawUnsafe(`TRUNCATE TABLE ${quotedTables} RESTART IDENTITY CASCADE;`);
}

export async function seedIntegrationUser(db: PrismaClient, overrides: Partial<{
  id: string;
  email: string;
  passwordHash: string;
  role: string;
  status: string;
  accountId: string | null;
  isAdmin: boolean;
  adminRole: string | null;
  sessionVersion: number;
}> = {}) {
  return db.user.create({
    data: {
      id: overrides.id ?? `user-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      email: overrides.email ?? `user-${Date.now()}@test.local`,
      passwordHash: overrides.passwordHash ?? "$2a$10$integration-test",
      role: overrides.role ?? "owner",
      status: overrides.status ?? "active",
      accountId: overrides.accountId ?? null,
      isAdmin: overrides.isAdmin ?? false,
      adminRole: overrides.adminRole ?? null,
      sessionVersion: overrides.sessionVersion ?? 0,
    },
  });
}
