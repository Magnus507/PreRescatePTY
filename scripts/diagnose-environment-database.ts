#!/usr/bin/env npx tsx
import fs from "node:fs";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

type ModelProbe = {
  name: string;
  table: string;
  criticalColumns: string[];
  query: () => Promise<number>;
};

function fingerprintUrl(rawUrl: string | undefined) {
  if (!rawUrl) {
    return {
      provider: "unknown",
      host: "unknown",
      port: "unknown",
      database: "unknown",
      schema: "public",
      hash: "unknown",
    };
  }

  const trimmed = rawUrl.trim().replace(/^["']|["']$/g, "");
  const hash = crypto.createHash("sha256").update(trimmed).digest("hex").slice(0, 12);

  try {
    const url = new URL(trimmed);
    const database = url.pathname.replace(/^\//, "");
    return {
      provider: url.protocol.replace(/:$/, ""),
      host: url.hostname,
      port: url.port || "(default)",
      database: database ? `${database.slice(0, 3)}***` : "(empty)",
      schema: new URLSearchParams(url.search).get("schema") || "public",
      hash,
    };
  } catch {
    return {
      provider: "invalid-url",
      host: "invalid-url",
      port: "invalid-url",
      database: "invalid-url",
      schema: "public",
      hash,
    };
  }
}

async function tableExists(table: string) {
  const rows = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
    `SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = '${table}'
    ) AS exists`
  );
  return Boolean(rows[0]?.exists);
}

async function columnsFor(table: string) {
  return prisma.$queryRawUnsafe<{ column_name: string }[]>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = '${table}'`
  );
}

async function countRows(table: string) {
  const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint AS count FROM "${table}"`
  );
  return Number(rows[0]?.count ?? 0);
}

async function main() {
  const fingerprint = fingerprintUrl(process.env.DIRECT_URL || process.env.DATABASE_URL);
  const localMigrations = fs
    .readdirSync("prisma/migrations", { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  console.log("DATABASE_FINGERPRINT", JSON.stringify(fingerprint));
  console.log("LOCAL_MIGRATIONS", JSON.stringify({ total: localMigrations.length, latest: localMigrations.at(-1) ?? null }));

  const migrationTableExists = await tableExists("_prisma_migrations");
  let migrationCount = 0;
  if (migrationTableExists) {
    migrationCount = await countRows("_prisma_migrations");
  }

  const probes: ModelProbe[] = [
    { name: "User", table: "User", criticalColumns: ["id", "email", "passwordHash", "role", "status", "sessionVersion"], query: () => prisma.user.count() },
    { name: "Account", table: "Account", criticalColumns: ["id", "accountType", "status"], query: () => prisma.account.count() },
    { name: "Profile", table: "Profile", criticalColumns: ["id", "accountId", "userId", "firstName", "lastName", "bloodType"], query: () => prisma.profile.count() },
    { name: "Contact", table: "Contact", criticalColumns: ["id", "userId", "fullName", "phone"], query: () => prisma.contact.count() },
    { name: "Organization", table: "Organization", criticalColumns: ["id", "accountId", "legalName", "status"], query: () => prisma.organization.count() },
    { name: "OrganizationMember", table: "OrganizationMember", criticalColumns: ["id", "organizationId", "profileId", "memberStatus", "corporateStatus"], query: () => prisma.organizationMember.count() },
    { name: "Product", table: "Product", criticalColumns: ["id", "name", "price", "productType", "isActive"], query: () => prisma.product.count() },
    { name: "ProductOperationalMapping", table: "ProductOperationalMapping", criticalColumns: ["id", "productId", "deviceType", "storeSection", "purchaseFlow", "activationFlow", "isPublished"], query: () => prisma.productOperationalMapping.count() },
    { name: "Package", table: "Package", criticalColumns: ["id", "name", "price", "accountType"], query: () => prisma.package.count() },
    { name: "OperationFinishedGood", table: "OperationFinishedGood", criticalColumns: ["id", "code", "name", "productType", "status"], query: () => prisma.operationFinishedGood.count() },
    { name: "OperationFinishedGoodUnit", table: "OperationFinishedGoodUnit", criticalColumns: ["id", "internalLabel", "productCode", "status", "qaStatus", "activationStatus"], query: () => prisma.operationFinishedGoodUnit.count() },
    { name: "OperationCommercialOrder", table: "OperationCommercialOrder", criticalColumns: ["id", "code", "status", "paymentStatus", "fulfillmentStatus"], query: () => prisma.operationCommercialOrder.count() },
    { name: "OperationCommercialOrderItem", table: "OperationCommercialOrderItem", criticalColumns: ["id", "commercialOrderId", "productName", "quantity"], query: () => prisma.operationCommercialOrderItem.count() },
    { name: "CommerceOrderSyncOutbox", table: "CommerceOrderSyncOutbox", criticalColumns: ["id", "sourceType", "sourceId", "deduplicationKey", "status"], query: () => prisma.commerceOrderSyncOutbox.count() },
    { name: "Order", table: "Order", criticalColumns: ["id", "userId", "amount", "orderStatus", "paymentStatus", "adminReviewStatus"], query: () => prisma.order.count() },
    { name: "OrderItem", table: "OrderItem", criticalColumns: ["id", "orderId", "productType", "unitPrice", "totalPrice"], query: () => prisma.orderItem.count() },
    { name: "Chip", table: "Chip", criticalColumns: ["id", "shortCode", "serialPublic", "status", "serviceStatus"], query: () => prisma.chip.count() },
    { name: "ScanEvent", table: "ScanEvent", criticalColumns: ["id", "chipId", "sourceType", "notificationStatus"], query: () => prisma.scanEvent.count() },
    { name: "Notification", table: "Notification", criticalColumns: ["id", "chipId", "eventId", "status"], query: () => prisma.notification.count() },
    { name: "Consent", table: "Consent", criticalColumns: ["id", "consentType", "textVersion", "grantedAt"], query: () => prisma.consent.count() },
  ];

  const rows: Array<Record<string, unknown>> = [];
  const issues: string[] = [];

  if (!migrationTableExists) {
    issues.push("migrations_history_missing");
  }

  for (const probe of probes) {
    const exists = await tableExists(probe.table);
    const columns = exists ? await columnsFor(probe.table) : [];
    const columnSet = new Set(columns.map((item) => item.column_name));
    const missingColumns = probe.criticalColumns.filter((column) => !columnSet.has(column));
    let count: number | null = null;
    let state: "missing" | "empty" | "populated" | "inconsistent" = "missing";

    if (exists) {
      count = await probe.query();
      state = missingColumns.length > 0 ? "inconsistent" : count > 0 ? "populated" : "empty";
      if (missingColumns.length > 0) {
        issues.push(`missing_columns:${probe.table}:${missingColumns.join(",")}`);
      }
    } else {
      issues.push(`missing_table:${probe.table}`);
    }

    rows.push({
      model: probe.name,
      table: probe.table,
      exists,
      count,
      criticalColumnsPresent: missingColumns.length === 0,
      missingColumns,
      state,
    });
  }

  console.log("MIGRATIONS", JSON.stringify({
    tableExists: migrationTableExists,
    appliedCount: migrationCount,
    localCount: localMigrations.length,
    pendingCount: migrationTableExists ? Math.max(localMigrations.length - migrationCount, 0) : localMigrations.length,
  }));
  console.log("MODELS", JSON.stringify(rows, null, 2));
  console.log("ISSUES", JSON.stringify(issues));

  await prisma.$disconnect();

  if (issues.length > 0) {
    process.exitCode = 2;
  }
}

main().catch(async (error) => {
  console.error("DIAGNOSIS_FAILED", error);
  await prisma.$disconnect();
  process.exit(1);
});
