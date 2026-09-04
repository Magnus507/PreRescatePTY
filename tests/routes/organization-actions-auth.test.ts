import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireActiveAccountSession: vi.fn() }));

vi.mock("@/lib/rbac", () => ({
  requireActiveAccountSession: mocks.requireActiveAccountSession,
}));

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/domains/accounts/services/account-state.service", () => ({ AccountStateService: {} }));
vi.mock("bcryptjs", () => ({ default: { hash: vi.fn() } }));

import { POST } from "@/app/api/organizations/actions/route";

function request() {
  return new Request("https://example.test/api/organizations/actions", {
    method: "POST",
    body: JSON.stringify({ action: "unknown", data: {} }),
  });
}

describe("POST /api/organizations/actions authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the fresh-session rejection before processing any action", async () => {
    const rejection = new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
    mocks.requireActiveAccountSession.mockResolvedValue({ authorized: false, response: rejection });

    const response = await POST(request());
    expect(response.status).toBe(401);
  });

  it("rejects organization members from privileged account actions", async () => {
    mocks.requireActiveAccountSession.mockResolvedValue({
      authorized: true,
      session: { user: { id: "member-1", accountId: "account-1" } },
      current: { accountId: "account-1", role: "member" },
    });

    const response = await POST(request());
    expect(response.status).toBe(403);
  });

  it("allows the account owner to reach action validation", async () => {
    mocks.requireActiveAccountSession.mockResolvedValue({
      authorized: true,
      session: { user: { id: "owner-1", accountId: "account-1" } },
      current: { accountId: "account-1", role: "owner" },
    });

    const response = await POST(request());
    expect(response.status).toBe(400);
  });
});
