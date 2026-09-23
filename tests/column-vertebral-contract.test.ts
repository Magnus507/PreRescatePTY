import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("column vertebral release contracts", () => {
  it("never exposes internal production labels from the public emergency API", () => {
    const route = source("app/api/public/[shortCode]/route.ts");
    const client = source("app/(public)/e/[shortCode]/client.tsx");

    expect(route).not.toContain("internalLabel: resolution.chip.internalLabel");
    expect(route).toContain('"Cache-Control", "no-store, max-age=0"');
    expect(client).not.toContain("Identificador de producción");
    expect(client).not.toContain("setProductionLabel");
    expect(client).toContain("Código público");
  });

  it("keeps QR failures generic and logs server details only", () => {
    const route = source("app/api/public/qr/route.ts");

    expect(route).toContain('logger.error("[QR_GENERATOR] Critical failure", e.message)');
    expect(route).toContain('new NextResponse("Internal Server Error", { status: 500 })');
    expect(route).not.toContain("Internal Server Error: ${e.message}");
  });

  it("ships database-enforced immutable identity, tenancy and one-open-token guards", () => {
    const migration = source(
      "prisma/migrations/20260923042950_column_vertebral_hardening/migration.sql"
    );

    expect(migration).toContain("enforce_critical_identity_immutability");
    expect(migration).toContain("enforce_chip_tenant_coherence");
    expect(migration).toContain("ChipClaimToken_one_open_active_per_chip");
    expect(migration).toContain("OperationFinishedGoodUnit_activation_check");
    expect(migration).toContain("ALTER DEFAULT PRIVILEGES");
  });

  it("keeps production preparation replays side-effect free", () => {
    const route = source(
      "app/api/admin/operations/production-orders/[id]/prepare-digital-items/route.ts"
    );

    expect(route).toContain("const hadCoreMutation");
    expect(route).toContain("if (hadCoreMutation)");
    expect(route).toContain("idempotent: !hadCoreMutation");
    expect(route).toContain("result.idempotent ? 200 : 201");
  });
});
