import { beforeEach, describe, expect, it } from "vitest";
import { mockPrisma, resetMockPrisma } from "../helpers/mock-prisma";
import {
  ANNUAL_ACCESS_MONTHS,
  getPhysicalUnitGrantEligibility,
  resolveAccountAccessMode,
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
    mockPrisma.operationCommercialOrder.findUnique.mockResolvedValue({
      paymentStatus: "paid",
    } as never);

    const result = await getPhysicalUnitGrantEligibility(mockPrisma as never, "unit-1");

    expect(result).toEqual({
      eligible: true,
      reason: "paid_physical_unit",
      months: ANNUAL_ACCESS_MONTHS,
    });
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
