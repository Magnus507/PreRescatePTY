import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: {
      findUnique: prismaMocks.findUnique,
    },
  },
}));

import { encrypt } from "@/lib/encryption";
import { ProfileRepository } from "@/domains/profiles/repositories/profile.repository";

const originalKey = process.env.ENCRYPTION_KEY;

function makeStoredProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: "profile-1",
    accountId: "account-1",
    userId: "user-1",
    firstName: "Test",
    lastName: "Profile",
    bloodType: encrypt("O+"),
    allergies: encrypt("Penicilina"),
    chronicConditions: "",
    medications: "",
    additionalNotes: "",
    nationalId: "",
    address: "",
    insuranceProvider: "",
    insurancePolicyNumber: "",
    preferredHospital: "",
    insuranceEmergencyPhone: "",
    primaryDoctorName: "",
    primaryDoctorPhone: "",
    communicationAssistance: "",
    safeReturnInstructions: "",
    safeReturnLocationName: "",
    safeReturnAddress: "",
    safeReturnContactName: "",
    safeReturnContactPhone: "",
    ...overrides,
  };
}

describe("ProfileRepository sensitive field reads", () => {
  beforeEach(() => {
    vi.stubEnv(
      "ENCRYPTION_KEY",
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    );
    prismaMocks.findUnique.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    if (originalKey === undefined) delete process.env.ENCRYPTION_KEY;
    else process.env.ENCRYPTION_KEY = originalKey;
  });

  it("decrypts encrypted medical values", async () => {
    prismaMocks.findUnique.mockResolvedValue(makeStoredProfile());

    const profile = await ProfileRepository.findById("profile-1");

    expect(profile?.bloodType).toBe("O+");
    expect(profile?.allergies).toBe("Penicilina");
  });

  it("allows only the exact historical blood-type placeholder in plaintext", async () => {
    prismaMocks.findUnique.mockResolvedValue(makeStoredProfile({ bloodType: "Pendiente" }));

    const profile = await ProfileRepository.findById("profile-1");

    expect(profile?.bloodType).toBe("Pendiente");
  });

  it("rejects a real blood type stored in plaintext", async () => {
    prismaMocks.findUnique.mockResolvedValue(makeStoredProfile({ bloodType: "O+" }));

    await expect(ProfileRepository.findById("profile-1")).rejects.toThrow("plaintext_not_allowed");
  });

  it("rejects other sensitive medical values stored in plaintext", async () => {
    prismaMocks.findUnique.mockResolvedValue(
      makeStoredProfile({ allergies: "Alergia severa a penicilina" })
    );

    await expect(ProfileRepository.findById("profile-1")).rejects.toThrow("plaintext_not_allowed");
  });
});
