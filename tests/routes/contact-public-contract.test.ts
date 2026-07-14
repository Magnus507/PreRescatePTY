import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Public contact form contract", () => {
  it("uses the live contact endpoint and no longer references the stale 404 route", () => {
    const contactContentPath = path.join(
      process.cwd(),
      "app",
      "(public)",
      "contacto",
      "ContactoContent.tsx"
    );
    const source = fs.readFileSync(contactContentPath, "utf8");

    expect(source).toContain('fetch("/api/contacts/public"');
    expect(source).not.toContain("/api/contacts/publics/public");
  });
});
