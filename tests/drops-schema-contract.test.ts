import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const baseMigration = readFileSync(
  "prisma/migrations/20260924020000_pre_rescate_drops/migration.sql",
  "utf8"
);
const extensionMigration = readFileSync(
  "prisma/migrations/20260924040000_drops_admin_controls_bonus_credits/migration.sql",
  "utf8"
);
const walletMigration = readFileSync(
  "prisma/migrations/20260924060000_drops_wallet_ordering/migration.sql",
  "utf8"
);

describe("Pre-Rescate Drops isolation contract", () => {
  it("mantiene Drops separado de la columna vertebral", () => {
    for (const model of [
      "Drop",
      "DropPass",
      "DropPassGrantCode",
      "DropBonusCredit",
      "DropBonusEntry",
      "DropDraw",
    ]) {
      expect(schema).toContain(`model ${model}`);
    }

    const combined = `${baseMigration}\n${extensionMigration}\n${walletMigration}`;
    expect(combined).not.toMatch(
      /ALTER TABLE (public\.)?"(Chip|Profile|Account|ChipClaimToken|OperationDigitalBatchItem)"/
    );
  });

  it("protege todas las tablas Drops con RLS y sin acceso Data API", () => {
    for (const table of ["Drop", "DropPass", "DropBonusEntry", "DropDraw"]) {
      expect(baseMigration).toContain(
        `REVOKE ALL PRIVILEGES ON TABLE public."${table}" FROM anon, authenticated;`
      );
      expect(baseMigration).toContain(
        `ALTER TABLE public."${table}" ENABLE ROW LEVEL SECURITY;`
      );
    }

    expect(extensionMigration).toContain(
      'REVOKE ALL PRIVILEGES ON TABLE public."DropBonusCredit" FROM anon, authenticated;'
    );
    expect(extensionMigration).toContain(
      'ALTER TABLE public."DropBonusCredit" ENABLE ROW LEVEL SECURITY;'
    );
    expect(walletMigration).toContain(
      'REVOKE ALL PRIVILEGES ON TABLE public."DropPassGrantCode" FROM anon, authenticated;'
    );
    expect(walletMigration).toContain(
      'ALTER TABLE public."DropPassGrantCode" ENABLE ROW LEVEL SECURITY;'
    );
  });

  it("persiste el orden de Drops y protege el canje único de códigos especiales", () => {
    expect(schema).toContain("displayOrder  Int");
    expect(walletMigration).toContain(
      'CREATE INDEX "Drop_displayOrder_createdAt_idx"'
    );
    expect(walletMigration).toContain(
      'CONSTRAINT "DropPassGrantCode_claim_state_consistency" CHECK'
    );
    expect(walletMigration).toContain(
      'CREATE UNIQUE INDEX "DropPassGrantCode_redeemedPassId_key"'
    );
  });

  it("hace inmutable el resultado del sorteo", () => {
    expect(baseMigration).toContain('CREATE TRIGGER "DropDraw_immutable"');
    expect(baseMigration).toContain(
      'BEFORE UPDATE OR DELETE ON public."DropDraw"'
    );
  });

  it("garantiza que un Bonus Credit no pueda quedar reclamado y revocado a la vez", () => {
    expect(extensionMigration).toContain(
      'CONSTRAINT "DropBonusCredit_claim_state_consistency" CHECK'
    );
    expect(extensionMigration).toContain(
      'CREATE UNIQUE INDEX "DropBonusEntry_sourceBonusCreditId_key"'
    );
  });
});
