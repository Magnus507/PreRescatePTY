import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { mockPrisma } from "../helpers/mock-prisma";
import { resetAllMocks } from "../helpers/reset-mocks";
import { createMockSession } from "../helpers/mock-auth";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/domains/accounts/services/account-state.service", () => ({ AccountStateService: { invalidateCache: vi.fn() } }));
import { getServerSession } from "next-auth";
import { PATCH as legacyPatch, POST as legacyPost } from "@/app/api/contacts/profile-link/route";
import { PATCH, POST } from "@/app/api/users/perfiles-medicos/[profileId]/contacts/route";

const context = { params: Promise.resolve({ profileId: "profile-a" }) };
const request = (body: unknown, method = "PATCH") => new NextRequest("http://localhost/api/contact", { method, body: JSON.stringify(body), headers: { "content-type": "application/json" } });

describe("NEW-01: contact ownership is enforced before writes", () => {
  beforeEach(() => {
    resetAllMocks();
    vi.mocked(getServerSession).mockResolvedValue(createMockSession());
    mockPrisma.user.findUnique.mockResolvedValue({ id: "test-user-1", accountId: "account-a", status: "active", deletedAt: null, sessionVersion: 0 });
    mockPrisma.profile.findFirst.mockResolvedValue({ id: "profile-a", accountId: "account-a" });
    mockPrisma.contact.findFirst.mockResolvedValue(null);
    mockPrisma.contact.findUnique.mockResolvedValue({ id: "contact-b", userId: "user-b" });
  });

  it("rejects a foreign legacy link before mutating", async () => {
    mockPrisma.profile.findFirst.mockResolvedValue(null);
    const response = await legacyPatch(request({ profileId: "profile-b", contactId: "contact-b", active: false }));
    expect(response.status).toBe(404);
    expect(mockPrisma.profileContact.update).not.toHaveBeenCalled();
  });
  it("rejects legacy mass assignment", async () => {
    const response = await legacyPatch(request({ profileId: "profile-a", contactId: "contact-a", profile: { connect: { id: "profile-b" } } }));
    expect(response.status).toBe(400);
    expect(mockPrisma.profileContact.update).not.toHaveBeenCalled();
  });
  it("cannot link another account's Contact via the legacy endpoint", async () => {
    const response = await legacyPost(request({ profileId: "profile-a", contactId: "contact-b", action: "link" }, "POST"));
    expect(response.status).toBe(404);
    expect(mockPrisma.profileContact.upsert).not.toHaveBeenCalled();
  });
  it("cannot retrieve another account's Contact through a new link", async () => {
    const response = await POST(request({ contactId: "contact-b" }, "POST"), context);
    expect(response.status).toBe(404);
    expect(mockPrisma.profileContact.upsert).not.toHaveBeenCalled();
  });
  it("cannot alter another Contact even when the eventual link update would fail", async () => {
    const response = await PATCH(request({ id: "contact-b", fullName: "Changed name", phone: "60000000", relationship: "Familiar", email: "test@example.com" }), context);
    expect(response.status).toBe(404);
    expect(mockPrisma.contact.update).not.toHaveBeenCalled();
  });
});
