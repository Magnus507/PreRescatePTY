import { beforeEach, describe, expect, it, vi } from "vitest";
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

const mockFindByUserId = vi.hoisted(() => vi.fn());

vi.mock("@/domains/profiles/repositories/profile.repository", () => ({
  ProfileRepository: {
    findByUserId: mockFindByUserId,
  },
}));

import { GET } from "@/app/api/orders/checkout-context/route";
import { getServerSession } from "next-auth";

describe("GET /api/orders/checkout-context", () => {
  beforeEach(() => {
    resetAllMocks();
    mockFindByUserId.mockReset();
  });

  it("returns the decrypted profile address instead of raw encrypted storage", async () => {
    vi.mocked(getServerSession).mockResolvedValue(
      createMockSession({ id: "user-1", role: "owner" }) as never
    );

    mockPrisma.user.findUnique.mockResolvedValue({
      email: "gean@example.com",
      phone: "67516171",
    } as never);

    mockPrisma.consent.findFirst.mockResolvedValue({ id: "consent-1" } as never);

    mockFindByUserId.mockResolvedValue({
      firstName: "Gean",
      lastName: "Cusatti",
      phone: "67516171",
      address: "Villa Luisa, Sabanitas",
      city: "Panamá",
    } as never);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.address).toBe("Villa Luisa, Sabanitas");
    expect(json.address).not.toMatch(/^v\d+:gcm:/);
    expect(json.recipientName).toBe("Gean Cusatti");
  });
});
