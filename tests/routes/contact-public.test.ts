import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { mockPrisma } from "../helpers/mock-prisma";
import { resetAllMocks } from "../helpers/reset-mocks";

const mockRateLimit = vi.hoisted(() => vi.fn());
const mockGetClientIp = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
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
    mockRateLimit.mockReset();
    mockGetClientIp.mockReset();
    mockPrisma.supportMessage.create.mockReset();
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 4, resetAt: Date.now() + 60_000 } as never);
    mockPrisma.supportMessage.create.mockResolvedValue({ id: "support-1" } as never);
  });

  it("persists a valid support message with normalized Panama WhatsApp", async () => {
    const res = await POST(
      contactRequest({
        name: "Juan Pérez",
        email: "JUAN@example.com",
        whatsappPhone: "6000-0000",
        message: "Necesito ayuda con mi pedido.",
      })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.id).toBe("support-1");
    expect(mockPrisma.supportMessage.create).toHaveBeenCalledWith({
      data: {
        name: "Juan Pérez",
        email: "juan@example.com",
        whatsappPhone: "50760000000",
        message: "Necesito ayuda con mi pedido.",
      },
      select: { id: true },
    });
  });

  it("rejects missing WhatsApp", async () => {
    const res = await POST(
      contactRequest({
        name: "Juan Pérez",
        email: "juan@example.com",
        message: "Hola",
      })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/WhatsApp/i);
    expect(mockPrisma.supportMessage.create).not.toHaveBeenCalled();
  });

  it("rejects invalid email", async () => {
    const res = await POST(
      contactRequest({
        name: "Juan Pérez",
        email: "juan-at-example.com",
        whatsappPhone: "+507 6000-0000",
        message: "Hola",
      })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/Email inválido/i);
    expect(mockPrisma.supportMessage.create).not.toHaveBeenCalled();
  });

  it("rejects invalid WhatsApp numbers", async () => {
    const res = await POST(
      contactRequest({
        name: "Juan Pérez",
        email: "juan@example.com",
        whatsappPhone: "123",
        message: "Hola",
      })
    );
    expect(res.status).toBe(400);
    expect(mockPrisma.supportMessage.create).not.toHaveBeenCalled();
  });

  it("fails closed if persistence fails", async () => {
    mockPrisma.supportMessage.create.mockRejectedValue(new Error("database unavailable"));

    const res = await POST(
      contactRequest({
        name: "Juan Pérez",
        email: "juan@example.com",
        whatsappPhone: "+507 6000-0000",
        message: "Necesito ayuda",
      })
    );
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toMatch(/guardar tu mensaje/i);
    expect(JSON.stringify(json)).not.toContain("database unavailable");
  });

  it("returns 429 when rate limit denies the request", async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60_000 } as never);

    const res = await POST(
      contactRequest({
        name: "Juan Pérez",
        email: "juan@example.com",
        whatsappPhone: "+507 6000-0000",
        message: "Necesito ayuda",
      })
    );

    expect(res.status).toBe(429);
    expect(mockPrisma.supportMessage.create).not.toHaveBeenCalled();
  });
});
