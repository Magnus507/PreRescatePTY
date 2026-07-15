#!/usr/bin/env npx tsx
import crypto from "node:crypto";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

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

async function main() {
  const rawUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  const fingerprint = fingerprintUrl(rawUrl);
  const localMigrations = fs
    .readdirSync("prisma/migrations", { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const hasHistory = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
    ) AS exists`
  );

  const migrationTableExists = Boolean(hasHistory[0]?.exists);
  const appliedRows = migrationTableExists
    ? await prisma.$queryRawUnsafe<Array<{ migration_name: string; applied_steps_count: bigint; finished_at: Date | null; rolled_back_at: Date | null }>>(
        `SELECT migration_name, applied_steps_count, finished_at, rolled_back_at
         FROM "_prisma_migrations"
         ORDER BY started_at ASC, migration_name ASC`
      )
    : [];

  const diff = rawUrl
    ? spawnSync(
        "npx",
        [
          "prisma",
          "migrate",
          "diff",
          "--from-url",
          rawUrl,
          "--to-schema-datamodel",
          "prisma/schema.prisma",
          "--script",
        ],
        {
          encoding: "utf8",
          env: process.env,
        }
      )
    : { status: 1, stdout: "", stderr: "DATABASE_URL missing" };

  const diffOutput = (diff.stdout || "").trim();
  const hasDrift = diff.status !== 0 || (diffOutput && !diffOutput.includes("empty migration"));

  const report = {
    fingerprint,
    localMigrations: {
      total: localMigrations.length,
      latest: localMigrations.at(-1) ?? null,
    },
    migrationHistory: {
      tableExists: migrationTableExists,
      appliedCount: appliedRows.length,
      appliedNames: appliedRows.map((row) => row.migration_name),
    },
    drift: {
      blocking: hasDrift,
      output: diffOutput || "(empty)",
    },
  };

  console.log(JSON.stringify(report, null, 2));

  await prisma.$disconnect();

  if (!migrationTableExists) {
    process.exitCode = 2;
    return;
  }

  if (appliedRows.length !== localMigrations.length || hasDrift) {
    process.exitCode = 2;
    return;
  }
}

main().catch(async (error) => {
  console.error("BASELINE_AUDIT_FAILED", error);
  await prisma.$disconnect();
  process.exit(1);
});
