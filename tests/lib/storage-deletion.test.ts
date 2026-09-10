import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isDeleteOnErasureStorageRef,
  parseStorageObjectRef,
} from "@/lib/storage-deletion";

describe("storage deletion classification", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("parses protected proxy URLs without confusing retention with erasure", () => {
    const paymentProof = parseStorageObjectRef(
      "/api/image-proxy?bucket=payment-proofs&path=payments%2Fuser-1%2Fproof.webp",
    );
    expect(paymentProof).toEqual({
      bucket: "payment-proofs",
      path: "payments/user-1/proof.webp",
    });
    expect(isDeleteOnErasureStorageRef(paymentProof!)).toBe(false);
  });

  it("classifies user profile/general assets as delete-on-erasure", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");

    const profilePhoto = parseStorageObjectRef(
      "https://project.supabase.co/storage/v1/object/public/profile-photos/user-1/photo.webp",
    );
    const generalAsset = parseStorageObjectRef(
      "/api/image-proxy?bucket=general&path=user-1%2Ffile.webp",
    );
    expect(profilePhoto).toEqual({ bucket: "profile-photos", path: "user-1/photo.webp" });
    expect(generalAsset).toEqual({ bucket: "general", path: "user-1/file.webp" });
    expect(isDeleteOnErasureStorageRef(profilePhoto!)).toBe(true);
    expect(isDeleteOnErasureStorageRef(generalAsset!)).toBe(true);
  });

  it("rejects unknown buckets, foreign origins and path traversal", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");

    expect(parseStorageObjectRef("/api/image-proxy?bucket=unknown&path=user/file.webp")).toBeNull();
    expect(parseStorageObjectRef("/api/image-proxy?bucket=payment-proofs&path=../secret.webp")).toBeNull();
    expect(parseStorageObjectRef("https://evil.example/api/image-proxy?bucket=payment-proofs&path=payments/user-1/proof.webp")).toBeNull();
    expect(parseStorageObjectRef("https://other.supabase.co/storage/v1/object/public/payment-proofs/payments/user-1/proof.webp")).toBeNull();
  });
});
