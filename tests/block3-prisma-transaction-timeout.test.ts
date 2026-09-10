import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Block 3 SafeDelete transaction runtime guard", () => {
  it("keeps a bounded Prisma interactive-transaction timeout above the 5s default", () => {
    const source = readFileSync(resolve(process.cwd(), "lib/prisma.ts"), "utf8");

    expect(source).toContain("transactionOptions");
    expect(source).toMatch(/timeout:\s*15_000/);
  });
});
