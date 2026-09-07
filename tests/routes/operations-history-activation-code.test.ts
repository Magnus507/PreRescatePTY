import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { mockPrisma, resetMockPrisma } from "../helpers/mock-prisma";

const role = vi.hoisted(() => vi.fn());
const originalEncryptionKey = process.env.ENCRYPTION_KEY;

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/rbac", () => ({
  SUPERADMIN_ROLES: ["superadmin"],
  requireRole: role,
}));

import { POST } from "@/app/api/admin/operations/history/[id]/activation-code/route";
import { encryptSensitiveValue } from "@/lib/encryption";

function request() {
  return new Request(
    "http://localhost/api/admin/operations/history/op-order-1/activation-code?unitId=unit-1",
    {
      method: "POST",
      headers: { "x-prerescate-reveal": "activation-code" },
    }
  );
}

function mockOrderWithCode(activationCode = "SECRET-ACTIVATION-CODE") {
  mockPrisma.operationCommercialOrder.findUnique.mockResolvedValue({
    id: "op-order-1",
    dispatch: {
      items: [
        {
          unitRecord: {
            id: "unit-1",
            internalLabel: "STK-PRI-001-TEST-0001",
            activationStatus: "not_activated",
            chip: {
              claimTokens: [
                {
                  id: "claim-1",
                  activationCode,
                  expiresAt: null,
                  status: "active",
                },
              ],
            },
          },
        },
      ],
    },
  } as never);
}

describe("operations history activation-code reveal", () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = "11".repeat(32);
    resetMockPrisma();
    role.mockReset();
    role.mockResolvedValue({ authorized: true, session: { user: { id: "superadmin-1" } } });
  });

  afterAll(() => {
    if (originalEncryptionKey === undefined) {
      delete process.env.ENCRYPTION_KEY;
    } else {
      process.env.ENCRYPTION_KEY = originalEncryptionKey;
    }
  });

  it("decrypts the encrypted-at-rest code before the explicit superadmin reveal and audits without the secret", async () => {
    const plaintext = "HUMAN-READABLE-ACTIVATION-CODE";
    const storedCiphertext = encryptSensitiveValue(plaintext);
    expect(storedCiphertext).toMatch(/^v2:gcm:/);
    mockOrderWithCode(storedCiphertext);

    const response = await POST(request(), {
      params: Promise.resolve({ id: "op-order-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.activationCode).toBe(plaintext);
    expect(body.activationCode).not.toContain("v2:gcm:");
    expect(response.headers.get("cache-control")).toContain("no-store");

    expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(1);
    const auditArgs = mockPrisma.auditLog.create.mock.calls[0]?.[0];
    expect(auditArgs.data.actorUserId).toBe("superadmin-1");
    expect(auditArgs.data.entityId).toBe("unit-1");
    expect(auditArgs.data.action).toBe("activation_code_revealed");
    expect(JSON.stringify(auditArgs)).not.toContain(plaintext);
    expect(JSON.stringify(auditArgs)).not.toContain(storedCiphertext);
  });

  it("keeps legacy plaintext activation codes readable during migration", async () => {
    mockOrderWithCode("LEGACY-PLAINTEXT-CODE");

    const response = await POST(request(), {
      params: Promise.resolve({ id: "op-order-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.activationCode).toBe("LEGACY-PLAINTEXT-CODE");
  });

  it("does not reveal anything without the explicit reveal header", async () => {
    const response = await POST(
      new Request(
        "http://localhost/api/admin/operations/history/op-order-1/activation-code?unitId=unit-1",
        { method: "POST" }
      ),
      { params: Promise.resolve({ id: "op-order-1" }) }
    );

    expect(response.status).toBe(400);
    expect(mockPrisma.operationCommercialOrder.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("denies non-superadmin users before reading activation credentials", async () => {
    role.mockResolvedValue({ authorized: false, response: new Response("", { status: 403 }) });

    const response = await POST(request(), {
      params: Promise.resolve({ id: "op-order-1" }),
    });

    expect(response.status).toBe(403);
    expect(mockPrisma.operationCommercialOrder.findUnique).not.toHaveBeenCalled();
  });

  it("prevents cross-order unit disclosure", async () => {
    mockPrisma.operationCommercialOrder.findUnique.mockResolvedValue({
      id: "op-order-1",
      dispatch: { items: [] },
    } as never);

    const response = await POST(request(), {
      params: Promise.resolve({ id: "op-order-1" }),
    });

    expect(response.status).toBe(404);
    expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("returns no secret when there is no active unused code", async () => {
    mockPrisma.operationCommercialOrder.findUnique.mockResolvedValue({
      id: "op-order-1",
      dispatch: {
        items: [
          {
            unitRecord: {
              id: "unit-1",
              internalLabel: "STK-PRI-001-TEST-0001",
              activationStatus: "not_activated",
              chip: { claimTokens: [] },
            },
          },
        ],
      },
    } as never);

    const response = await POST(request(), {
      params: Promise.resolve({ id: "op-order-1" }),
    });

    expect(response.status).toBe(404);
    expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
  });
});
