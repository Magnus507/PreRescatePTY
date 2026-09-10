import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listUsers: vi.fn(),
  deleteUser: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: { admin: { listUsers: mocks.listUsers, deleteUser: mocks.deleteUser } },
  })),
}));

import { eraseMatchingSupabaseAuthIdentity } from "@/lib/privacy/supabase-auth-erasure";

describe("eraseMatchingSupabaseAuthIdentity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role");
    mocks.listUsers.mockResolvedValue({ data: { users: [] }, error: null });
    mocks.deleteUser.mockResolvedValue({ data: {}, error: null });
  });

  afterEach(() => vi.unstubAllEnvs());

  it("deletes exactly one normalized email match", async () => {
    mocks.listUsers.mockResolvedValue({
      data: { users: [{ id: "auth-1", email: " USER@Example.COM " }] },
      error: null,
    });
    await expect(eraseMatchingSupabaseAuthIdentity("user@example.com")).resolves.toEqual({ matched: true, deleted: true });
    expect(mocks.deleteUser).toHaveBeenCalledWith("auth-1");
  });

  it("does nothing when no parallel identity exists", async () => {
    await expect(eraseMatchingSupabaseAuthIdentity("user@example.com")).resolves.toEqual({ matched: false, deleted: false });
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it("fails closed on ambiguous matches", async () => {
    mocks.listUsers.mockResolvedValue({
      data: { users: [{ id: "auth-1", email: "user@example.com" }, { id: "auth-2", email: "USER@example.com" }] },
      error: null,
    });
    await expect(eraseMatchingSupabaseAuthIdentity("user@example.com")).rejects.toThrow("supabase_auth_identity_ambiguous");
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it("fails closed when list or delete is unavailable", async () => {
    mocks.listUsers.mockResolvedValueOnce({ data: { users: [] }, error: new Error("offline") });
    await expect(eraseMatchingSupabaseAuthIdentity("user@example.com")).rejects.toThrow("supabase_auth_list_failed");

    mocks.listUsers.mockResolvedValueOnce({ data: { users: [{ id: "auth-1", email: "user@example.com" }] }, error: null });
    mocks.deleteUser.mockResolvedValueOnce({ data: null, error: new Error("offline") });
    await expect(eraseMatchingSupabaseAuthIdentity("user@example.com")).rejects.toThrow("supabase_auth_delete_failed");
  });
});
