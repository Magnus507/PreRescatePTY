import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { mockPrisma, resetMockPrisma } from "../helpers/mock-prisma";

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

const mockRequireRole = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({
  GENERAL_ADMIN_ROLES: ["admin"],
  requireRole: mockRequireRole,
}));

const mockEnsureTraceableIdentity = vi.hoisted(() => vi.fn());
vi.mock("@/lib/operations/traceable-digital-identity", () => ({
  ensureTraceableDigitalIdentity: mockEnsureTraceableIdentity,
}));

import { POST as prepareDigitalItems } from "@/app/api/admin/operations/production-orders/[id]/prepare-digital-items/route";
import { POST as assembleUnits } from "@/app/api/admin/operations/production-orders/[id]/assemble-units/route";

const routeParams = { params: Promise.resolve({ id: "production-1" }) };

function identityResult(item: Record<string, unknown>) {
  return {
    item: { ...item, chipId: "chip-1", shortCode: "PUBLIC7NM42" },
    chip: { id: "chip-1", shortCode: "PUBLIC7NM42" },
    token: { id: "token-1", activationCode: "ABCD-EFGH-JKLM" },
    activationCode: "ABCD-EFGH-JKLM",
    chipCreated: true,
    activationCodeCreated: true,
  };
}

describe("production traceable identities", () => {
  beforeEach(() => {
    resetMockPrisma();
    mockRequireRole.mockReset();
    mockRequireRole.mockResolvedValue({
      authorized: true,
      session: { user: { id: "admin-1", role: "admin" } },
    });
    mockEnsureTraceableIdentity.mockReset();
    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
      callback(mockPrisma)
    );
  });

  it("prepares a digital item only through the atomic Chip and token bundle", async () => {
    const createdItem = {
      id: "digital-1",
      batchId: "batch-1",
      productionOrderId: "production-1",
      internalLabel: "PROD-00001",
      sequenceNumber: 1,
      shortCode: null,
      chipId: null,
    };
    mockPrisma.operationProductionOrder.findUnique
      .mockResolvedValueOnce({
        id: "production-1",
        code: "PO-001",
        outputType: "sticker_nfc_qr",
        status: "draft",
        plannedQuantity: 1,
        digitalItems: [],
      } as never)
      .mockResolvedValueOnce({ id: "production-1", digitalItems: [{ ...createdItem, chipId: "chip-1" }] } as never);
    mockPrisma.operationDigitalBatch.create.mockResolvedValue({
      id: "batch-1",
      prefix: "PO-001",
      startNumber: 1,
      endNumber: 1,
      status: "generated",
    } as never);
    mockPrisma.operationDigitalBatchItem.create.mockResolvedValue(createdItem as never);
    mockEnsureTraceableIdentity.mockResolvedValue(identityResult(createdItem));
    mockPrisma.operationProductionEvent.create.mockResolvedValue({ id: "event-1" } as never);
    mockPrisma.operationProductionOrder.update.mockResolvedValue({ id: "production-1" } as never);

    const request = new NextRequest("https://prerescatepty.com/api/admin/operations/production-orders/production-1/prepare-digital-items", {
      method: "POST",
      body: JSON.stringify({ quantity: 1 }),
    });
    const response = await prepareDigitalItems(request, routeParams);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(mockPrisma.operationDigitalBatchItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ qrUrl: "", shortCode: null }),
      })
    );
    expect(mockEnsureTraceableIdentity).toHaveBeenCalledWith(
      mockPrisma,
      expect.objectContaining({ item: createdItem, productType: "sticker_nfc_qr" })
    );
    expect(json.preparation.identities[0]).toEqual(
      expect.objectContaining({ chipId: "chip-1", shortCode: "PUBLIC7NM42" })
    );
  });

  it("keeps the production code suffix in generated unit labels", async () => {
    const createdItem = {
      id: "digital-1",
      batchId: "batch-1",
      productionOrderId: "production-1",
      internalLabel: "STK-PRP-FG-STICKER-561F02D8-0001",
      sequenceNumber: 1,
      shortCode: null,
      chipId: null,
    };
    mockPrisma.operationProductionOrder.findUnique
      .mockResolvedValueOnce({
        id: "production-1",
        code: "STK-PRP-FG-STICKER-561F02D8",
        outputType: "sticker_prerescatepty",
        status: "draft",
        plannedQuantity: 1,
        digitalItems: [],
        events: [],
      } as never)
      .mockResolvedValueOnce({ id: "production-1", digitalItems: [{ ...createdItem, chipId: "chip-1" }] } as never);
    mockPrisma.operationDigitalBatch.create.mockResolvedValue({
      id: "batch-1",
      prefix: "STK-PRP-FG-STICKER-561F02D8",
      startNumber: 1,
      endNumber: 1,
      status: "generated",
    } as never);
    mockPrisma.operationDigitalBatchItem.create.mockResolvedValue(createdItem as never);
    mockEnsureTraceableIdentity.mockResolvedValue(identityResult(createdItem));

    const response = await prepareDigitalItems(
      new NextRequest("https://prerescatepty.com/api/admin/operations/production-orders/production-1/prepare-digital-items", {
        method: "POST",
        body: JSON.stringify({ quantity: 1 }),
      }),
      routeParams
    );

    expect(response.status).toBe(201);
    expect(mockPrisma.operationDigitalBatch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ prefix: "STK-PRP-FG-STICKER-561F02D8" }),
      })
    );
    expect(mockPrisma.operationDigitalBatchItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ internalLabel: "STK-PRP-FG-STICKER-561F02D8-0001" }),
      })
    );
  });

  it("does not publish a prepared result when identity creation fails", async () => {
    const createdItem = {
      id: "digital-1",
      batchId: "batch-1",
      productionOrderId: "production-1",
      internalLabel: "PROD-00001",
      sequenceNumber: 1,
      shortCode: null,
      chipId: null,
    };
    mockPrisma.operationProductionOrder.findUnique.mockResolvedValue({
      id: "production-1",
      code: "PO-001",
      outputType: "sticker_nfc_qr",
      status: "draft",
      plannedQuantity: 1,
      digitalItems: [],
    } as never);
    mockPrisma.operationDigitalBatch.create.mockResolvedValue({
      id: "batch-1",
      prefix: "PO-001",
      startNumber: 1,
      endNumber: 1,
      status: "generated",
    } as never);
    mockPrisma.operationDigitalBatchItem.create.mockResolvedValue(createdItem as never);
    mockEnsureTraceableIdentity.mockRejectedValue(new Error("TRACEABLE_IDENTITY_NOT_PRINTABLE"));

    const response = await prepareDigitalItems(
      new NextRequest("https://prerescatepty.com/api/admin/operations/production-orders/production-1/prepare-digital-items", {
        method: "POST",
        body: JSON.stringify({ quantity: 1 }),
      }),
      routeParams
    );

    expect(response.status).toBe(500);
    expect(mockPrisma.operationProductionEvent.create).not.toHaveBeenCalled();
  });

  it("keeps the exact Chip identity attached to the printed preparation through assembly", async () => {
    const printedItem = {
      id: "digital-1",
      batchId: "batch-1",
      internalLabel: "PROD-00001",
      sequenceNumber: 1,
      shortCode: "PUBLIC7NM42",
      chipId: "chip-1",
      status: "printed",
      batch: { id: "batch-1", productType: "sticker_nfc_qr" },
      printOrderItems: [{ printOrder: { id: "print-1", status: "received" } }],
      finishedGoodUnits: [],
    };
    mockPrisma.operationProductionOrder.findUnique.mockResolvedValue({
      id: "production-1",
      outputType: "sticker_nfc_qr",
      status: "print_received",
    } as never);
    mockPrisma.operationDigitalBatchItem.findMany.mockResolvedValue([printedItem] as never);
    mockPrisma.operationDigitalBatchItem.updateMany.mockResolvedValue({ count: 1 } as never);
    mockPrisma.operationDigitalBatchItem.findMany
      .mockResolvedValueOnce([printedItem] as never)
      .mockResolvedValueOnce([{ ...printedItem, status: "assembled" }] as never);
    mockPrisma.operationProductionEvent.create.mockResolvedValue({ id: "event-1" } as never);
    mockPrisma.operationProductionOrder.update.mockResolvedValue({ id: "production-1" } as never);

    const response = await assembleUnits(
      new NextRequest("https://prerescatepty.com/api/admin/operations/production-orders/production-1/assemble-units", {
        method: "POST",
        body: JSON.stringify({ digitalBatchItemIds: ["digital-1"] }),
      }),
      routeParams
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(mockPrisma.operationFinishedGoodUnit.create).not.toHaveBeenCalled();
    expect(mockPrisma.operationDigitalBatchItem.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: ["digital-1"] }, status: "printed" }),
        data: { status: "assembled" },
      })
    );
    expect(json.assembledItems[0]).toEqual(
      expect.objectContaining({ chipId: "chip-1", shortCode: "PUBLIC7NM42", status: "assembled" })
    );
    expect(json.message).toMatch(/empaque/i);
  });
});
