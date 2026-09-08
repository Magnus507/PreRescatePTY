import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as {
  scripts?: Record<string, string>;
  allowScripts?: Record<string, boolean>;
};

const expectedDeniedInstallScripts = {
  "@prisma/client": false,
  "@prisma/engines": false,
  "@sentry/cli": false,
  esbuild: false,
  prisma: false,
  "unrs-resolver": false,
};

describe("build security policy", () => {
  it("keeps the fail-fast typecheck in the Vercel production build", () => {
    expect(packageJson.scripts?.build).toBe(
      "npm run prisma:generate && npm run typecheck && next build",
    );
    expect(packageJson.scripts?.typecheck).toBe("tsc --noEmit");
  });

  it("explicitly denies dependency install scripts that are not required by the build", () => {
    expect(packageJson.allowScripts).toEqual(expectedDeniedInstallScripts);
  });

  it("fails closed when a new dependency introduces an unreviewed install script", () => {
    const npmrc = readFileSync(new URL("../.npmrc", import.meta.url), "utf8");
    expect(npmrc).toMatch(/^strict-allow-scripts=true\s*$/m);
    expect(npmrc).not.toContain("dangerously-allow-all-scripts=true");
    expect(npmrc).not.toContain("ignore-scripts=true");
  });
});
