import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  assertIntegrationDatabaseReady,
  createIntegrationPrismaClient,
  prepareIntegrationEnvironment,
  seedIntegrationUser,
} from "./integration-db";
import { isStoredSessionValid } from "@/lib/auth";

const db = createIntegrationPrismaClient();
const run = `block2-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const createdIds: string[] = [];

async function makeUser(label: string, sessionVersion = 7) {
  const user = await seedIntegrationUser(db, {
    id: `${run}-${label}`,
    email: `${run}-${label}@test.local`,
    sessionVersion,
  });
  createdIds.push(user.id);
  return user;
}

async function state(id: string) {
  return db.user.findUnique({
    where: { id },
    select: { status: true, deletedAt: true, sessionVersion: true },
  });
}

describe("Block 2 session revocation matrix", () => {
  beforeAll(async () => {
    prepareIntegrationEnvironment();
    await assertIntegrationDatabaseReady(db);
  });

  afterAll(async () => {
    await db.user.deleteMany({ where: { id: { in: createdIds } } });
    await db.$disconnect();
  });

  it("accepts the exact live session version", async () => {
    const user = await makeUser("baseline");
    expect(isStoredSessionValid(await state(user.id), 7)).toBe(true);
  });

  it.each([
    "password-reset",
    "password-change",
    "mfa-enable",
    "mfa-disable",
    "manual-revoke",
    "admin-role-change",
    "sensitive-role-change",
  ])("rejects a previous session after %s increments sessionVersion", async (label) => {
    const user = await makeUser(label);
    const oldVersion = user.sessionVersion;
    await db.user.update({
      where: { id: user.id },
      data: { sessionVersion: { increment: 1 } },
    });
    expect(isStoredSessionValid(await state(user.id), oldVersion)).toBe(false);
  });

  it("rejects a session immediately when the account is disabled", async () => {
    const user = await makeUser("disabled");
    await db.user.update({ where: { id: user.id }, data: { status: "suspended" } });
    expect(isStoredSessionValid(await state(user.id), user.sessionVersion)).toBe(false);
  });

  it("rejects a session immediately when the account is soft-deleted", async () => {
    const user = await makeUser("soft-delete");
    await db.user.update({
      where: { id: user.id },
      data: { status: "deleted", deletedAt: new Date() },
    });
    expect(isStoredSessionValid(await state(user.id), user.sessionVersion)).toBe(false);
  });

  it("rejects a session immediately when the user no longer exists", async () => {
    const user = await makeUser("hard-delete");
    await db.user.delete({ where: { id: user.id } });
    createdIds.splice(createdIds.indexOf(user.id), 1);
    expect(isStoredSessionValid(await state(user.id), user.sessionVersion)).toBe(false);
  });

  it("rejects legacy/malformed tokens that do not carry a numeric sessionVersion", async () => {
    const user = await makeUser("malformed");
    const current = await state(user.id);
    expect(isStoredSessionValid(current, undefined)).toBe(false);
    expect(isStoredSessionValid(current, "7")).toBe(false);
  });
});
