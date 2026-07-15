import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createIntegrationPrismaClient, prepareIntegrationEnvironment, seedIntegrationUser, assertIntegrationDatabaseReady } from "./integration-db";

const mockGetServerSession = vi.hoisted(() => vi.fn());

vi.mock("next-auth", () => ({
  getServerSession: mockGetServerSession,
}));

const db = createIntegrationPrismaClient();
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

let requireFreshSession: typeof import("@/lib/rbac").requireFreshSession;
let bumpUserSessionVersion: typeof import("@/lib/rbac").bumpUserSessionVersion;

describe("PostgreSQL integration: session version revocation", () => {
  beforeAll(async () => {
    prepareIntegrationEnvironment();
    await assertIntegrationDatabaseReady(db);
    ({ requireFreshSession, bumpUserSessionVersion } = await import("@/lib/rbac"));
  });

  beforeEach(() => {
    mockGetServerSession.mockReset();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("increments sessionVersion atomically and rejects stale sessions", async () => {
    const user = await seedIntegrationUser(db, {
      email: `session-user-${RUN_ID}@test.local`,
      passwordHash: "$2a$10$ORIGINAL",
      sessionVersion: 0,
      accountId: null,
    });

    mockGetServerSession.mockResolvedValue({
      user: {
        id: user.id,
        email: user.email,
        role: "owner",
        adminRole: null,
        accountId: null,
        sessionVersion: 0,
      },
    });

    const [first, second] = await Promise.all([
      bumpUserSessionVersion(user.id),
      bumpUserSessionVersion(user.id),
    ]);

    const refreshedUser = await db.user.findUnique({
      where: { id: user.id },
      select: { sessionVersion: true },
    });

    const fresh = await requireFreshSession();

    expect([first.sessionVersion, second.sessionVersion].every((value) => [1, 2].includes(value))).toBe(true);
    expect(refreshedUser?.sessionVersion).toBe(2);
    expect(fresh.authorized).toBe(false);
    if (!fresh.authorized) {
      expect(fresh.response.status).toBe(401);
    }
  });
});
