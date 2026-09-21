import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { mockPrisma } from "../helpers/mock-prisma";
import { resetAllMocks } from "../helpers/reset-mocks";
import { createMockSession } from "../helpers/mock-auth";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

const mockOptimizeAndUploadImage = vi.hoisted(() => vi.fn());
const mockRateLimit = vi.hoisted(() => vi.fn());
const mockGetClientIp = vi.hoisted(() => vi.fn());
const mockCleanupUploadedObject = vi.hoisted(() => vi.fn());

vi.mock("@/lib/storage-utils", () => ({
  optimizeAndUploadImage: mockOptimizeAndUploadImage,
}));

vi.mock("@/lib/rateLimit", () => ({
  rateLimit: mockRateLimit,
}));

vi.mock("@/lib/request-ip", () => ({
  getClientIp: mockGetClientIp,
}));

vi.mock("@/lib/storage-cleanup-outbox", () => ({
  cleanupUploadedObjectOrRecordOrphan: mockCleanupUploadedObject,
}));

import { POST } from "@/app/api/users/profile/photo/route";
import { getServerSession } from "next-auth";

const USER_ID = "test-user-1";
const ACCOUNT_ID = "account-1";
const PROFILE_ID = "profile-1";

function jpegBytes() {
  return new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10,
    0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]);
}

function request(body: Uint8Array, profileId?: string) {
  const url = new URL("http://localhost/api/users/profile/photo");
  if (profileId) url.searchParams.set("profileId", profileId);
  return new NextRequest(url, {
    method: "POST",
    headers: { "content-type": "image/jpeg" },
    body,
  });
}

function setupDefaults() {
  vi.mocked(getServerSession).mockResolvedValue(
    createMockSession({ id: USER_ID, role: "owner" }) as never
  );
  mockGetClientIp.mockReturnValue("127.0.0.1");
  mockRateLimit.mockResolvedValue({
    allowed: true,
    remaining: 19,
    resetAt: Date.now() + 900000,
  });
  mockOptimizeAndUploadImage.mockResolvedValue(
    "/api/image-proxy?bucket=profile-photos&path=test.webp"
  );
  mockCleanupUploadedObject.mockResolvedValue({ cleaned: true, recorded: false });
}

describe("POST /api/users/profile/photo", () => {
  beforeEach(() => {
    resetAllMocks();
    mockOptimizeAndUploadImage.mockReset();
    mockRateLimit.mockReset();
    mockGetClientIp.mockReset();
    mockCleanupUploadedObject.mockReset();
  });

  it("returns 401 without a session", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await POST(request(jpegBytes()));
    expect(res.status).toBe(401);
  });

  it("returns 400 for an empty body", async () => {
    setupDefaults();
    const res = await POST(request(new Uint8Array()));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/vacía|foto/i);
  });

  it("returns 400 for unsupported image contents", async () => {
    setupDefaults();
    const bytes = new Uint8Array(12);
    const res = await POST(request(bytes));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/jpg|png|webp/i);
  });

  it("uploads bytes and updates an owned medical profile", async () => {
    setupDefaults();
    mockPrisma.user.findUnique.mockResolvedValue({ accountId: ACCOUNT_ID } as never);
    mockPrisma.profile.findUnique.mockResolvedValue({
      id: PROFILE_ID,
      accountId: ACCOUNT_ID,
      photoUrl: null,
    } as never);
    mockPrisma.profile.update.mockResolvedValue({ id: PROFILE_ID } as never);

    const res = await POST(request(jpegBytes(), PROFILE_ID));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.url).toMatch(/profile-photos/);
    expect(mockOptimizeAndUploadImage).toHaveBeenCalledWith(
      expect.any(Buffer),
      "profile-photos",
      expect.stringContaining("profile_"),
      { width: 400, height: 400, quality: 80 }
    );
    expect(mockPrisma.profile.update).toHaveBeenCalledWith({
      where: { id: PROFILE_ID },
      data: { photoUrl: expect.stringContaining("profile-photos") },
    });
  });
});
