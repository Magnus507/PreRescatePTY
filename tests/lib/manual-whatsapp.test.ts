import { describe, expect, it } from "vitest";
import {
  buildManualRescueWhatsAppMessage,
  buildManualRescueWhatsAppUrl,
  normalizeWhatsAppPhone,
} from "@/lib/public-access/manual-whatsapp";

describe("manual rescue WhatsApp", () => {
  it.each([
    ["6000-0000", "50760000000"],
    ["+507 6000-0000", "50760000000"],
    ["00507 6000 0000", "50760000000"],
    ["+1 (305) 555-0100", "13055550100"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeWhatsAppPhone(input)).toBe(expected);
  });

  it.each([null, undefined, "", "123", "+1234567890123456"])(
    "rejects invalid or unsafe phone %s",
    (input) => {
      expect(normalizeWhatsAppPhone(input)).toBeNull();
      expect(buildManualRescueWhatsAppUrl(input)).toBeNull();
    }
  );

  it("builds a prefilled link without medical details, location, or automatic-send semantics", () => {
    const url = buildManualRescueWhatsAppUrl("6000-0000", "Ana López");
    expect(url).not.toBeNull();

    const parsed = new URL(url as string);
    expect(parsed.hostname).toBe("wa.me");
    expect(parsed.pathname).toBe("/50760000000");

    const message = parsed.searchParams.get("text") || "";
    expect(message).toContain("Ana López");
    expect(message).toMatch(/perfil de emergencia/i);
    expect(message).not.toMatch(/alerg|medicamento|sangre|ubicaci|latitude|longitude/i);
    expect(message).not.toMatch(/enviado|notificado|automático/i);
  });

  it("sanitizes and bounds the public name used in the message", () => {
    const message = buildManualRescueWhatsAppMessage(`  Ana   López  ${"x".repeat(120)} `);
    expect(message.length).toBeLessThan(260);
    expect(message).not.toContain("  ");
  });

  it("uses a neutral fallback when no name is provided", () => {
    expect(buildManualRescueWhatsAppMessage()).toContain("una persona");
  });
});