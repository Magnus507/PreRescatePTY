import { readFileSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import { createIntegrationPrismaClient } from "./integration-db";

const db = createIntegrationPrismaClient();
const sql = readFileSync("prisma/migrations/20260910140000_block3_retire_orphan_auth_trigger/migration.sql", "utf8");

describe("Block 3 orphan Auth trigger migration", () => {
  afterAll(async () => db.$disconnect());

  it("retires the broken hook, preserves unrelated hooks and is idempotent", async () => {
    const rollback = new Error("rollback Auth fixture");
    try {
      await db.$transaction(async tx => {
        await tx.$executeRawUnsafe('CREATE SCHEMA auth');
        await tx.$executeRawUnsafe('CREATE SCHEMA IF NOT EXISTS private');
        await tx.$executeRawUnsafe('CREATE TABLE auth.users(id text primary key)');
        await tx.$executeRawUnsafe(`CREATE FUNCTION private.v2_handle_new_auth_user() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN INSERT INTO public.v2_users(id) VALUES(NEW.id); RETURN NEW; END $$`);
        await tx.$executeRawUnsafe('CREATE TRIGGER v2_on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION private.v2_handle_new_auth_user()');
        await tx.$executeRawUnsafe(`CREATE FUNCTION private.b3_valid_hook() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$`);
        await tx.$executeRawUnsafe('CREATE TRIGGER valid_hook BEFORE INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION private.b3_valid_hook()');
        await tx.$executeRawUnsafe(sql);
        await tx.$executeRawUnsafe(sql);
        await tx.$executeRawUnsafe("INSERT INTO auth.users VALUES ('synthetic-auth')");
        const hooks = await tx.$queryRaw<Array<{tgname: string}>>`SELECT tgname FROM pg_trigger WHERE tgrelid='auth.users'::regclass AND NOT tgisinternal`;
        expect(hooks).toEqual([{tgname: "valid_hook"}]);
        throw rollback;
      });
    } catch (error) { if (error !== rollback) throw error; }
  });

  it("refuses retirement when a v2 destination still exists", async () => {
    await expect(db.$transaction(async tx => {
      await tx.$executeRawUnsafe('CREATE SCHEMA auth');
      await tx.$executeRawUnsafe('CREATE SCHEMA IF NOT EXISTS private');
      await tx.$executeRawUnsafe('CREATE TABLE auth.users(id text primary key)');
      await tx.$executeRawUnsafe('CREATE TABLE public.v2_users(id text primary key)');
      await tx.$executeRawUnsafe(`CREATE FUNCTION private.v2_handle_new_auth_user() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$`);
      await tx.$executeRawUnsafe('CREATE TRIGGER v2_on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION private.v2_handle_new_auth_user()');
      await tx.$executeRawUnsafe(sql);
    })).rejects.toThrow(/refusing to retire/);
  });
});
