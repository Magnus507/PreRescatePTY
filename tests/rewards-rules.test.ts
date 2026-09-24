import { describe, expect, it } from "vitest";
import {
  communityProgressPercent,
  founderLabel,
  REWARD_MISSION_KINDS,
} from "@/lib/rewards/rules";

describe("Pre-Rescate Rewards rules", () => {
  it("limita el progreso comunitario entre 0 y 100", () => {
    expect(communityProgressPercent(0, 100)).toBe(0);
    expect(communityProgressPercent(63, 100)).toBe(63);
    expect(communityProgressPercent(120, 100)).toBe(100);
    expect(communityProgressPercent(5, 0)).toBe(0);
  });

  it("formatea el número de Founding Member sin modificarlo", () => {
    expect(founderLabel(1)).toBe("#0001");
    expect(founderLabel(27)).toBe("#0027");
    expect(founderLabel(1250)).toBe("#1250");
  });

  it("solo expone misiones verificables por servidor", () => {
    expect(REWARD_MISSION_KINDS).toEqual([
      "profile_complete",
      "first_device_activated",
      "first_paid_order",
    ]);
  });
});
