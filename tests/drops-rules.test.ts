import { describe, expect, it } from "vitest";
import {
  BONUS_CREDIT_PATTERN,
  calculateEarnedDropPasses,
  makeBonusCreditCode,
  normalizeBonusCreditCode,
  pickWinnerIndex,
} from "@/lib/drops/rules";

describe("Pre-Rescate Drops rules", () => {
  it("genera un Drop Pass por cada $25 pagados", () => {
    expect(calculateEarnedDropPasses(24.99)).toBe(0);
    expect(calculateEarnedDropPasses(25)).toBe(1);
    expect(calculateEarnedDropPasses(50)).toBe(2);
    expect(calculateEarnedDropPasses("75.00")).toBe(3);
  });

  it("rechaza montos inválidos y limita lotes anómalos", () => {
    expect(calculateEarnedDropPasses(-25)).toBe(0);
    expect(calculateEarnedDropPasses("nope")).toBe(0);
    expect(calculateEarnedDropPasses(999999)).toBe(1000);
  });

  it("selecciona el índice de forma determinista a partir del valor aleatorio", () => {
    expect(pickWinnerIndex("00", 3)).toBe(0);
    expect(pickWinnerIndex("04", 3)).toBe(1);
    expect(pickWinnerIndex("ff", 10)).toBe(5);
  });

  it("no permite sortear sin entradas", () => {
    expect(() => pickWinnerIndex("ab", 0)).toThrow(
      "DROP_DRAW_REQUIRES_ENTRIES"
    );
  });

  it("genera Bonus Credits legibles y normaliza el código del cliente", () => {
    const code = makeBonusCreditCode();
    expect(code).toMatch(BONUS_CREDIT_PATTERN);
    expect(normalizeBonusCreditCode(`  ${code.toLowerCase()}  `)).toBe(code);
  });

  it("evita caracteres ambiguos en Bonus Credits", () => {
    for (let index = 0; index < 50; index += 1) {
      const code = makeBonusCreditCode();
      expect(code).not.toMatch(/[01IO]/);
    }
  });
});
