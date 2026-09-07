import { describe, expect, it } from "vitest";
import { initialServiceEndDate, renewedServiceEndDate } from "@/domains/chips/service-term";

describe("commercial service term", () => {
  it("starts a 24-month term on activation", () => {
    expect(initialServiceEndDate(new Date("2026-09-07T12:34:56.000Z")))
      .toEqual(new Date("2028-09-07T12:34:56.000Z"));
  });

  it("clamps month-end dates safely", () => {
    expect(initialServiceEndDate(new Date("2024-02-29T10:00:00.000Z"), 12))
      .toEqual(new Date("2025-02-28T10:00:00.000Z"));
  });

  it("renews active service from the current expiry so early renewal loses no time", () => {
    expect(renewedServiceEndDate(
      new Date("2027-12-15T00:00:00.000Z"),
      new Date("2027-06-01T00:00:00.000Z")
    )).toEqual(new Date("2029-12-15T00:00:00.000Z"));
  });

  it("renews expired service from now", () => {
    expect(renewedServiceEndDate(
      new Date("2026-01-01T00:00:00.000Z"),
      new Date("2027-06-01T00:00:00.000Z")
    )).toEqual(new Date("2029-06-01T00:00:00.000Z"));
  });

  it("uses now when no prior service term exists", () => {
    expect(renewedServiceEndDate(null, new Date("2027-06-01T00:00:00.000Z")))
      .toEqual(new Date("2029-06-01T00:00:00.000Z"));
  });
});
