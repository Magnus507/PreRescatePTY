import { prisma } from "@/lib/prisma";

type Args = {
  recent: number;
};

function parseArgs(argv: string[]): Args {
  let recent = 50;
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--recent" && argv[i + 1]) {
      const parsed = Number(argv[i + 1]);
      if (Number.isFinite(parsed) && parsed > 0) recent = parsed;
      i += 1;
    }
  }
  return { recent };
}

function toSafeDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
  }
  return null;
}

function classifyText(value: unknown, fallbackUsed = false) {
  const missing = value === null || value === undefined || value === "";
  return missing ? "MISSING" : fallbackUsed ? "FALLBACK_USED" : "OK";
}

function classifyAmount(amount: number, expected: number) {
  if (Number.isNaN(amount)) return "MISSING";
  if (amount === 0 && expected > 0) return expected > 0 ? "ZERO_WITH_COMMERCIAL_TOTAL" : "ZERO_WITH_ITEMS";
  if (amount === expected) return "OK";
  return "MISMATCH";
}

function normalizeTotal(amount: number, commercialTotal: number, expected: number) {
  const normalized = amount || commercialTotal || expected || 0;
  if (normalized === 0) return "ZERO";
  if (normalized !== expected) return "MISMATCH";
  return "OK";
}

async function main() {
  const args = parseArgs(process.argv);
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: args.recent,
    include: {
      user: { include: { profile: true } },
      items: true,
    },
  });

  const summary = {
    total: orders.length,
    ok: 0,
    warning: 0,
    needsMappingReview: 0,
    needsDataBackfill: 0,
  };

  const rows = orders.map((order) => {
    const expectedTotalFromItems = order.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    const commercialTotal = expectedTotalFromItems;
    const total = order.amount || commercialTotal;
    const createdAtValid = toSafeDate(order.createdAt) !== null;
    const updatedAtValid = toSafeDate(order.updatedAt) !== null;

    const customerNameFallback = [order.user?.profile?.firstName, order.user?.profile?.lastName].filter(Boolean).join(" ").trim();
    const customerEmailFallback = order.user?.email || null;
    const customerPhoneFallback = order.user?.phone || null;

    const customerNameStatus = classifyText(order.customerName, Boolean(customerNameFallback && !order.customerName));
    const customerEmailStatus = classifyText(order.customerEmail, Boolean(customerEmailFallback && !order.customerEmail));
    const customerPhoneStatus = classifyText(order.customerPhone, Boolean(customerPhoneFallback && !order.customerPhone));
    const shippingAddressStatus = order.shippingAddress ? "OK" : "MISSING";
    const shippingCityStatus = order.shippingCity ? "OK" : "MISSING";
    const shippingNotesStatus = order.shippingNotes ? "OK" : "MISSING_OPTIONAL";

    const amountStatus = classifyAmount(order.amount || 0, expectedTotalFromItems);
    const commercialTotalStatus = commercialTotal > 0 ? "OK" : "MISSING";
    const normalizedTotalStatus = normalizeTotal(order.amount || 0, commercialTotal, expectedTotalFromItems);

    const itemCount = order.items.length;
    const itemsHaveProductCode = order.items.every((item) => Boolean(item.productType));
    const itemsHaveQuantity = order.items.every((item) => Number.isFinite(item.quantity) && item.quantity > 0);
    const itemsHaveUnitPrice = order.items.every((item) => Number.isFinite(item.unitPrice) && item.unitPrice >= 0);
    const itemsHaveTotalPrice = order.items.every((item) => Number.isFinite(item.totalPrice) && item.totalPrice >= 0);

    const risk =
      !createdAtValid || !updatedAtValid || amountStatus !== "OK" || customerNameStatus !== "OK" || customerEmailStatus !== "OK" || customerPhoneStatus !== "OK"
        ? amountStatus === "ZERO_WITH_COMMERCIAL_TOTAL" || amountStatus === "ZERO_WITH_ITEMS"
          ? "NEEDS_MAPPING_REVIEW"
          : "WARNING"
        : "OK";

    if (risk === "OK") summary.ok += 1;
    else if (risk === "WARNING") summary.warning += 1;
    else if (risk === "NEEDS_MAPPING_REVIEW") summary.needsMappingReview += 1;
    else summary.needsDataBackfill += 1;

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.orderStatus,
      paymentStatus: order.paymentStatus,
      userId: order.userId,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      shippingAddress: order.shippingAddress,
      shippingCity: order.shippingCity,
      shippingNotes: order.shippingNotes,
      paymentMethod: order.paymentMethod,
      amount: order.amount,
      commercialTotal,
      total,
      expectedTotalFromItems,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      customerNameStatus,
      customerEmailStatus,
      customerPhoneStatus,
      shippingAddressStatus,
      shippingCityStatus,
      shippingNotesStatus,
      amountStatus,
      commercialTotalStatus,
      normalizedTotalStatus,
      createdAtValid,
      updatedAtValid,
      itemCount,
      itemsHaveProductCode,
      itemsHaveQuantity,
      itemsHaveUnitPrice,
      itemsHaveTotalPrice,
      risk,
      fallbackSources: {
        customerNameFallback: customerNameFallback || null,
        customerEmailFallback,
        customerPhoneFallback,
      },
    };
  });

  console.log("=== W5.45D Orders Customer Data General Audit ===");
  console.log(JSON.stringify({ summary, rows }, null, 2));
}

main()
  .catch((error) => {
    console.error("W5.45D audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
