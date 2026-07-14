import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { resetAllMocks } from "../helpers/reset-mocks";

vi.hoisted(() => {
  process.env.RESEND_API_KEY = "test-resend-key";
});

const mockSend = vi.hoisted(() => vi.fn());
const mockRateLimit = vi.hoisted(() => vi.fn());
const mockGetClientIp = vi.hoisted(() => vi.fn());

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: mockSend,
    },
  })),
}));

vi.mock("@/lib/rateLimit", () => ({
  rateLimit: mockRateLimit,
}));

vi.mock("@/lib/request-ip", () => ({
  getClientIp: mockGetClientIp,
}));

import { POST } from "@/app/api/contacts/public/route";

function contactRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/contacts/public", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/contacts/public", () => {
  beforeEach(() => {
    resetAllMocks();
    mockSend.mockReset();
    mockRateLimit.mockReset();
    mockGetClientIp.mockReset();
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 4, resetAt: Date.now() + 60_000 } as never);
  });

  it("accepts a valid submission and sends a sanitized email", async () => {
    mockSend.mockResolvedValue({ data: { id: "email-1" }, error: null } as never);

    const res = await POST(
      contactRequest({
        name: "Juan Pérez",
        email: "juan@example.com",
        message: "Hola\nNecesito ayuda <script>alert(1)</script>",
      })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toMatch(/enviado/i);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "soporte@prerescatepty.com",
        replyTo: "juan@example.com",
        subject: expect.stringContaining("Juan Pérez"),
        html: expect.stringContaining("&lt;script&gt;alert(1)&lt;/script&gt;"),
      })
    );
  });

  it("rejects missing required fields", async () => {
    const res = await POST(contactRequest({ name: "", email: "juan@example.com", message: "" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/obligatorios/i);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("rejects invalid email addresses", async () => {
    const res = await POST(
      contactRequest({
        name: "Juan Pérez",
        email: "juan-at-example.com",
        message: "Hola",
      })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/email invalido/i);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns a generic error when the provider fails", async () => {
    mockSend.mockRejectedValue(new Error("provider exploded"));

    const res = await POST(
      contactRequest({
        name: "Juan Pérez",
        email: "juan@example.com",
        message: "Necesito ayuda",
      })
    );
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toMatch(/error al enviar el mensaje/i);
    expect(JSON.stringify(json)).not.toContain("provider exploded");
  });

  it("returns 429 when rate limit denies the request", async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60_000 } as never);

    const res = await POST(
      contactRequest({
        name: "Juan Pérez",
        email: "juan@example.com",
        message: "Necesito ayuda",
      })
    );
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.error).toMatch(/demasiados intentos/i);
    expect(mockSend).not.toHaveBeenCalled();
  });
});
