import { beforeEach, describe, expect, it } from "vitest";
import { mockPrisma, resetMockPrisma } from "../helpers/mock-prisma";
import {
  ANNUAL_ACCESS_MONTHS,
  getPhysicalUnitGrantEligibility,
  resolveAccountAccessMode,
  reversePhysicalUnitGrant,
} from "@/domains/accounts/services/service-entitlement.service";

describe("service entitlement access modes", () => {
  it("keeps new accounts pending before first eligible activation", () => {
    expect(resolveAccountAccessMode({ status: "pending", endsAt: null, graceEndsAt: null }))
      .toBe("PENDING_ACTIVATION");
  });

  it("keeps grandfathered accounts in FULL mode", () => {
    expect(resolveAccountAccessMode({ status: "exempt", endsAt: null, graceEndsAt: null }))
      .toBe("FULL");
  });

  it("returns FULL while annual access is current", () => {
    const now = new Date("2026-09-20T12:00:00.000Z");
    expect(resolveAccountAccessMode({
      status: "active",
      endsAt: new Date("2027-09-20T12:00:00.000Z"),
      graceEndsAt: null,
    }, now)).toBe("FULL");
  });

  it("returns ESSENTIAL after annual administration access expires", () => {
    const now = new Date("2027-09-21T12:00:00.000Z");
    expect(resolveAccountAccessMode({
      status: "active",
      endsAt: new Date("2027-09-20T12:00:00.000Z"),
      graceEndsAt: null,
    }, now)).toBe("ESSENTIAL");
  });
});

describe("physical unit annual-access eligibility", () => {
  beforeEach(() => {
    resetMockPrisma();
  });

  it("grants 12 months for an eligible paid physical unit", async () => {
    mockPrisma.operationFinishedGoodUnit.findUnique.mockResolvedValue({
      id: "unit-1",
      productCode: "TAG-STD",
      reservedOrderId: "order-1",
    } as never);
    mockPrisma.operationReplacement.findFirst.mockResolvedValue(null);
    mockPrisma.productOperationalMapping.findFirst.mockResolvedValue({
      grantsAnnualAccess: true,
      requiresPaidOrderForAnnualAccess: true,
    } as never);
    mockPrisma.order.findUnique.mockResolvedValue({
      paymentStatus: "paid",
    } as never);

    const result = await getPhysicalUnitGrantEligibility(mockPrisma as never, "unit-1");

    expect(result).toEqual({
      eligible: true,
      reason: "paid_physical_unit",
      months: ANNUAL_ACCESS_MONTHS,
    });
  });

  it("recognizes a paid operational order when no source Order row owns the reservation", async () => {
    mockPrisma.operationFinishedGoodUnit.findUnique.mockResolvedValue({
      id: "unit-ops",
      productCode: "TAG-STD",
      reservedOrderId: "operations-order-1",
    } as never);
    mockPrisma.operationReplacement.findFirst.mockResolvedValue(null);
    mockPrisma.productOperationalMapping.findFirst.mockResolvedValue({
      grantsAnnualAccess: true,
      requiresPaidOrderForAnnualAccess: true,
    } as never);
    mockPrisma.operationCommercialOrder.findFirst.mockResolvedValue({
      paymentStatus: "paid",
    } as never);

    const result = await getPhysicalUnitGrantEligibility(mockPrisma as never, "unit-ops");

    expect(result).toEqual({
      eligible: true,
      reason: "paid_physical_unit",
      months: ANNUAL_ACCESS_MONTHS,
    });
    expect(mockPrisma.operationCommercialOrder.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { id: "operations-order-1" },
          { sourceId: "operations-order-1" },
        ],
      },
      select: { paymentStatus: true },
    });
  });

  it("does not grant after Operations records a refund even if the source Order still says paid", async () => {
    mockPrisma.operationFinishedGoodUnit.findUnique.mockResolvedValue({
      id: "unit-refunded",
      productCode: "TAG-STD",
      reservedOrderId: "source-order-1",
    } as never);
    mockPrisma.operationReplacement.findFirst.mockResolvedValue(null);
    mockPrisma.productOperationalMapping.findFirst.mockResolvedValue({
      grantsAnnualAccess: true,
      requiresPaidOrderForAnnualAccess: true,
    } as never);
    mockPrisma.operationCommercialOrder.findFirst.mockResolvedValue({
      paymentStatus: "refunded",
    } as never);
    mockPrisma.order.findUnique.mockResolvedValue({
      paymentStatus: "paid",
    } as never);

    const result = await getPhysicalUnitGrantEligibility(mockPrisma as never, "unit-refunded");

    expect(result).toEqual({
      eligible: false,
      reason: "paid_order_required",
      months: 0,
    });
    expect(mockPrisma.order.findUnique).not.toHaveBeenCalled();
  });

  it("never grants another year for a warranty replacement", async () => {
    mockPrisma.operationFinishedGoodUnit.findUnique.mockResolvedValue({
      id: "replacement-unit",
      productCode: "TAG-STD",
      reservedOrderId: "order-2",
    } as never);
    mockPrisma.operationReplacement.findFirst.mockResolvedValue({
      id: "replacement-1",
    } as never);

    const result = await getPhysicalUnitGrantEligibility(mockPrisma as never, "replacement-unit");

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("warranty_replacement");
    expect(result.months).toBe(0);
  });

  it("can grant a promotional unit only when the product mapping explicitly allows it", async () => {
    mockPrisma.operationFinishedGoodUnit.findUnique.mockResolvedValue({
      id: "promo-unit",
      productCode: "PROMO-TAG",
      reservedOrderId: null,
    } as never);
    mockPrisma.operationReplacement.findFirst.mockResolvedValue(null);
    mockPrisma.productOperationalMapping.findFirst.mockResolvedValue({
      grantsAnnualAccess: true,
      requiresPaidOrderForAnnualAccess: false,
    } as never);

    const result = await getPhysicalUnitGrantEligibility(mockPrisma as never, "promo-unit");

    expect(result).toEqual({
      eligible: true,
      reason: "configured_promotional_grant",
      months: ANNUAL_ACCESS_MONTHS,
    });
  });

  it("does not grant an unpaid standard unit", async () => {
    mockPrisma.operationFinishedGoodUnit.findUnique.mockResolvedValue({
      id: "unpaid-unit",
      productCode: "TAG-STD",
      reservedOrderId: null,
    } as never);
    mockPrisma.operationReplacement.findFirst.mockResolvedValue(null);
    mockPrisma.productOperationalMapping.findFirst.mockResolvedValue({
      grantsAnnualAccess: true,
      requiresPaidOrderForAnnualAccess: true,
    } as never);

    const result = await getPhysicalUnitGrantEligibility(mockPrisma as never, "unpaid-unit");

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("paid_order_required");
  });

  it("does not grant when the product mapping explicitly disables annual access", async () => {
    mockPrisma.operationFinishedGoodUnit.findUnique.mockResolvedValue({
      id: "no-grant-unit",
      productCode: "NO-GRANT",
      reservedOrderId: "order-3",
    } as never);
    mockPrisma.operationReplacement.findFirst.mockResolvedValue(null);
    mockPrisma.productOperationalMapping.findFirst.mockResolvedValue({
      grantsAnnualAccess: false,
      requiresPaidOrderForAnnualAccess: true,
    } as never);

    const result = await getPhysicalUnitGrantEligibility(mockPrisma as never, "no-grant-unit");

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("product_configured_no_grant");
  });
});


describe("physical unit annual-access reversals", () => {
  beforeEach(() => {
    resetMockPrisma();
  });

  it("reverses the original 12-month activation grant after a full refund", async () => {
    const now = new Date("2026-09-20T12:00:00.000Z");
    mockPrisma.account.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.entitlementEvent.findUnique.mockResolvedValue(null);
    mockPrisma.entitlementEvent.findFirst.mockResolvedValue({
      id: "grant-1",
      accountId: "account-1",
      unitId: "unit-1",
      chipId: "chip-1",
      type: "activation",
      deltaMonths: 12,
    } as never);
    mockPrisma.serviceEntitlement.findUnique.mockResolvedValue({
      id: "entitlement-1",
      accountId: "account-1",
      status: "active",
      endsAt: new Date("2028-09-20T12:00:00.000Z"),
    } as never);
    mockPrisma.serviceEntitlement.update.mockResolvedValue({
      id: "entitlement-1",
      status: "active",
      endsAt: new Date("2027-09-20T12:00:00.000Z"),
    } as never);
    mockPrisma.entitlementEvent.create.mockResolvedValue({ id: "reversal-1" } as never);

    const result = await reversePhysicalUnitGrant(mockPrisma as never, {
      accountId: "account-1",
      unitId: "unit-1",
      reversalType: "refund",
      reason: "full_refund",
      now,
    });

    expect(result.applied).toBe(true);
    expect(mockPrisma.serviceEntitlement.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "entitlement-1" },
      data: expect.objectContaining({
        endsAt: new Date("2027-09-20T12:00:00.000Z"),
        status: "active",
      }),
    }));
    expect(mockPrisma.entitlementEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        type: "refund",
        deltaMonths: -12,
        unitId: "unit-1",
        chipId: "chip-1",
        idempotencyKey: "reversal:physical-unit:unit-1:annual-access",
      }),
    }));
  });

  it("does not reverse the same physical grant twice across refund and chargeback", async () => {
    mockPrisma.account.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.entitlementEvent.findUnique.mockResolvedValue({
      id: "existing-refund-reversal",
      type: "refund",
      idempotencyKey: "reversal:physical-unit:unit-1:annual-access",
    } as never);

    const result = await reversePhysicalUnitGrant(mockPrisma as never, {
      accountId: "account-1",
      unitId: "unit-1",
      reversalType: "chargeback",
      reason: "provider_chargeback_after_refund",
    });

    expect(result.applied).toBe(false);
    expect(mockPrisma.entitlementEvent.findUnique).toHaveBeenCalledWith({
      where: { idempotencyKey: "reversal:physical-unit:unit-1:annual-access" },
    });
    expect(mockPrisma.entitlementEvent.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.serviceEntitlement.update).not.toHaveBeenCalled();
    expect(mockPrisma.entitlementEvent.create).not.toHaveBeenCalled();
  });

  it("never removes access when the physical unit did not grant annual time", async () => {
    mockPrisma.account.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.entitlementEvent.findUnique.mockResolvedValue(null);
    mockPrisma.entitlementEvent.findFirst.mockResolvedValue(null);

    const result = await reversePhysicalUnitGrant(mockPrisma as never, {
      accountId: "account-1",
      unitId: "warranty-replacement-unit",
      reversalType: "refund",
      reason: "returned_replacement",
    });

    expect(result).toEqual({ applied: false, reason: "no_grant_to_reverse" });
    expect(mockPrisma.serviceEntitlement.update).not.toHaveBeenCalled();
  });
});
