import { describe, expect, it, vi } from "vitest";
import { mockPrisma } from "../helpers/mock-prisma";
import { markFinishedGoodUnitActivatedWithClient } from "@/lib/operations/activate-finished-good-unit";

describe("NEW-14 physical activation ownership", () => {
  const input = { internalLabel: "unit-1", activationReferenceType: "chip", activationReferenceId: "chip-a" };
  it.each(["available", "reserved", "qa_failed"])("rejects a unit in %s state", async (status) => {
    mockPrisma.operationFinishedGoodUnit.findUnique.mockResolvedValue({ id: "unit-1", status, activationStatus: "not_activated" });
    mockPrisma.operationFinishedGoodUnit.updateMany.mockClear();
    expect(await markFinishedGoodUnitActivatedWithClient(mockPrisma, input)).toEqual({ ok: false, reason: "UNIT_NOT_ELIGIBLE" });
    expect(mockPrisma.operationFinishedGoodUnit.updateMany).not.toHaveBeenCalled();
  });
  it("does not replace a previous activation reference", async () => {
    mockPrisma.operationFinishedGoodUnit.findUnique.mockResolvedValue({ id: "unit-1", status: "activated", activationStatus: "activated", activationReferenceType: "chip", activationReferenceId: "chip-b" });
    mockPrisma.operationFinishedGoodUnit.updateMany.mockClear();
    expect(await markFinishedGoodUnitActivatedWithClient(mockPrisma, input)).toEqual({ ok: false, reason: "UNIT_NOT_ELIGIBLE" });
    expect(mockPrisma.operationFinishedGoodUnit.updateMany).not.toHaveBeenCalled();
  });
  it("replays the same reference without another activation event", async () => {
    mockPrisma.operationFinishedGoodUnit.findUnique.mockResolvedValue({ id: "unit-1", status: "activated", activationStatus: "activated", activationReferenceType: "chip", activationReferenceId: "chip-a" });
    mockPrisma.operationFinishedGoodUnitEvent.create.mockClear();
    expect(await markFinishedGoodUnitActivatedWithClient(mockPrisma, input)).toEqual({ ok: true, unitId: "unit-1", createdEvent: false });
    expect(mockPrisma.operationFinishedGoodUnitEvent.create).not.toHaveBeenCalled();
  });
  it("propagates an event failure so its enclosing transaction rolls back", async () => {
    mockPrisma.operationFinishedGoodUnit.findUnique.mockResolvedValue({ id: "unit-1", status: "delivered", activationStatus: "not_activated" });
    mockPrisma.operationFinishedGoodUnit.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.operationFinishedGoodUnitEvent.create.mockImplementationOnce(vi.fn().mockRejectedValue(new Error("injected event failure")));
    await expect(markFinishedGoodUnitActivatedWithClient(mockPrisma, input)).rejects.toThrow("injected event failure");
  });
});
