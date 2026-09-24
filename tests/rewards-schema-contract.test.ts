import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync(
  "prisma/migrations/20260924050000_rewards_missions_founders_community/migration.sql",
  "utf8"
);

describe("Pre-Rescate Rewards isolation contract", () => {
  it("crea las tres capacidades sin alterar la columna vertebral", () => {
    for (const model of [
      "RewardMission",
      "RewardMissionCompletion",
      "RewardCreditLedger",
      "FoundingMember",
      "CommunityUnlock",
    ]) {
      expect(schema).toContain(`model ${model}`);
    }

    expect(migration).not.toMatch(
      /ALTER TABLE (public\.)?"(Chip|Profile|Account|ChipClaimToken|OperationDigitalBatchItem)"/
    );
  });

  it("mantiene Rewards fuera del Data API y bajo RLS", () => {
    for (const table of [
      "RewardMission",
      "RewardMissionCompletion",
      "RewardCreditLedger",
      "FoundingMember",
      "CommunityUnlock",
    ]) {
      expect(migration).toContain(
        `REVOKE ALL PRIVILEGES ON TABLE public."${table}" FROM anon, authenticated;`
      );
      expect(migration).toContain(
        `ALTER TABLE public."${table}" ENABLE ROW LEVEL SECURITY;`
      );
    }
  });

  it("hace inmutables el usuario y número de Founding Member", () => {
    expect(migration).toContain(
      'CREATE TRIGGER "FoundingMember_identity_immutable"'
    );
    expect(migration).toContain(
      "Founding Member identity is immutable once assigned"
    );
    expect(migration).toContain(
      "Founding Member identity is permanent once assigned"
    );
    expect(migration).toContain(
      'BEFORE UPDATE OR DELETE ON public."FoundingMember"'
    );
  });

  it("separa saldo de Bonus Credits de la meta pagada del Drop", () => {
    expect(schema).toContain("model RewardCreditLedger");
    expect(schema).toContain("dropBonusEntryId String?");
    expect(migration).not.toContain('ALTER TABLE "Drop" ADD COLUMN');
  });
});
