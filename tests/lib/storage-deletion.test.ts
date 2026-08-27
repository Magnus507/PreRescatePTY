import { afterEach, describe, expect, it, vi } from "vitest";
import { parseStorageObjectRef } from "@/lib/storage-deletion";

describe("parseStorageObjectRef", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("parses protected proxy URLs", () => {
    expect(parseStorageObjectRef("/api/image-proxy?bucket=payment-proofs&path=payments%2Fuser-1%2Fproof.webp"))
      .toEqual({ bucket: "payment-proofs", path: "payments/user-1/proof.webp" });
  });

  it("parses legacy public Supabase URLs", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");

    expect(parseStorageObjectRef("https://project.supabase.co/storage/v1/object/public/profile-photos/user-1/photo.webp"))
      .toEqual({ bucket: "profile-photos", path: "user-1/photo.webp" });
  });

  it("rejects other buckets, origins and path traversal", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");

    expect(parseStorageObjectRef("/api/image-proxy?bucket=general&path=user/file.webp")).toBeNull();
    expect(parseStorageObjectRef("/api/image-proxy?bucket=payment-proofs&path=../secret.webp")).toBeNull();
    expect(parseStorageObjectRef("https://evil.example/api/image-proxy?bucket=payment-proofs&path=payments/user-1/proof.webp")).toBeNull();
    expect(parseStorageObjectRef("https://other.supabase.co/storage/v1/object/public/payment-proofs/payments/user-1/proof.webp")).toBeNull();
  });
});
