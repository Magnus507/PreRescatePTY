import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync(
  "prisma/migrations/20260924020000_pre_rescate_drops/migration.sql",
  "utf8"
);

describe("Pre-Rescate Drops isolation contract", () => {
  it("mantiene Drops separado de la columna vertebral", () => {
    for (const model of ["Drop", "DropPass", "DropBonusEntry", "DropDraw"]) {
      expect(schema).toContain(`model ${model}`);
    }

    expect(migration).not.toMatch(
      /ALTER TABLE (public\.)?"(Chip|Profile|Account|ChipClaimToken|OperationDigitalBatchItem)"/
    );
  });

  it("protege todas las tablas Drops con RLS y sin acceso Data API", () => {
    for (const table of ["Drop", "DropPass", "DropBonusEntry", "DropDraw"]) {
      expect(migration).toContain(
        `REVOKE ALL PRIVILEGES ON TABLE public."${table}" FROM anon, authenticated;`
      );
      expect(migration).toContain(
        `ALTER TABLE public."${table}" ENABLE ROW LEVEL SECURITY;`
      );
    }
  });

  it("hace inmutable el resultado del sorteo", () => {
    expect(migration).toContain('CREATE TRIGGER "DropDraw_immutable"');
    expect(migration).toContain(
      'BEFORE UPDATE OR DELETE ON public."DropDraw"'
    );
  });
});
