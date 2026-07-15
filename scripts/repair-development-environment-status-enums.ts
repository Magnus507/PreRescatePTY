#!/usr/bin/env npx tsx
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

const REQUIRED = [
  "OrderPaymentStatus",
  "OrderStatus",
  "OrderAdminReviewStatus",
  "CommerceOrderSyncOutboxStatus",
  "OperationFinishedGoodUnitStatus",
  "OperationFinishedGoodUnitQaStatus",
  "OperationFinishedGoodUnitActivationStatus",
] as const;

async function ensureType(typeName: string, values: readonly string[]) {
  const rows = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
    `SELECT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typname = '${typeName}'
    ) AS exists`
  );

  if (rows[0]?.exists) return;

  const valuesSql = values.map((value) => `'${value}'`).join(", ");
  await prisma.$executeRawUnsafe(
    `CREATE TYPE "public"."${typeName}" AS ENUM (${valuesSql})`
  );
}

async function columnType(table: string, column: string) {
  const rows = await prisma.$queryRawUnsafe<{ udt_name: string | null; data_type: string | null }[]>(
    `SELECT udt_name, data_type
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = '${table}' AND column_name = '${column}'
     LIMIT 1`
  );
  return rows[0] || null;
}

async function alterColumn(table: string, column: string, typeName: string, defaultValue: string) {
  const current = await columnType(table, column);
  if (!current) {
    throw new Error(`Missing column ${table}.${column}`);
  }

  if (current.udt_name === typeName) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "public"."${table}" ALTER COLUMN "${column}" SET DEFAULT '${defaultValue}'::"public"."${typeName}"`
    );
    return;
  }

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "public"."${table}"
     ALTER COLUMN "${column}" DROP DEFAULT,
     ALTER COLUMN "${column}" TYPE "public"."${typeName}"
     USING "${column}"::text::"public"."${typeName}",
     ALTER COLUMN "${column}" SET DEFAULT '${defaultValue}'::"public"."${typeName}"`
  );
}

async function main() {
  await ensureType("OrderPaymentStatus", ["pending", "under_review", "paid", "rejected", "cancelled"]);
  await ensureType("OrderStatus", ["pending", "processing", "shipped", "completed", "cancelled"]);
  await ensureType("OrderAdminReviewStatus", ["pending", "approved", "rejected"]);
  await ensureType("CommerceOrderSyncOutboxStatus", ["pending", "processing", "processed", "retrying", "failed"]);
  await ensureType("OperationFinishedGoodUnitStatus", ["assembled", "available", "reserved", "qa_pending", "qa_failed", "dispatched", "delivered", "activated", "discarded", "cancelled"]);
  await ensureType("OperationFinishedGoodUnitQaStatus", ["pending", "passed", "failed"]);
  await ensureType("OperationFinishedGoodUnitActivationStatus", ["not_activated", "activated"]);

  await alterColumn("Order", "paymentStatus", "OrderPaymentStatus", "pending");
  await alterColumn("Order", "orderStatus", "OrderStatus", "pending");
  await alterColumn("Order", "adminReviewStatus", "OrderAdminReviewStatus", "pending");
  await alterColumn("CommerceOrderSyncOutbox", "status", "CommerceOrderSyncOutboxStatus", "pending");
  await alterColumn("OperationFinishedGoodUnit", "status", "OperationFinishedGoodUnitStatus", "qa_pending");
  await alterColumn("OperationFinishedGoodUnit", "qaStatus", "OperationFinishedGoodUnitQaStatus", "pending");
  await alterColumn("OperationFinishedGoodUnit", "activationStatus", "OperationFinishedGoodUnitActivationStatus", "not_activated");

  console.log(
    JSON.stringify({
      status: "aligned",
      enums: REQUIRED.length,
      columns: 7,
    })
  );
}

main()
  .catch((error) => {
    console.error("REPAIR_FAILED", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
