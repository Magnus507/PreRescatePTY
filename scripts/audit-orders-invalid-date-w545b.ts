import { prisma } from "@/lib/prisma";

type DateLike = unknown;

function describeDate(value: DateLike) {
  const isMissing = value === null || value === undefined || value === "";
  const rawType = value === null ? "null" : typeof value;
  const asDate = value instanceof Date ? value : typeof value === "string" || typeof value === "number" ? new Date(value) : null;
  const isValidDate = asDate instanceof Date && Number.isFinite(asDate.getTime());
  const wouldBreakDateFormat = !isMissing && !isValidDate;

  return {
    rawValue: value,
    type: rawType,
    isMissing,
    isValidDate,
    wouldBreakDateFormat,
  };
}

function collectDateFields(order: Record<string, unknown>) {
  const fields = [
    "createdAt",
    "updatedAt",
    "adminReviewedAt",
    "estimatedDeliveryDate",
  ];

  return fields.reduce<Record<string, ReturnType<typeof describeDate>>>((acc, field) => {
    acc[field] = describeDate(order[field]);
    return acc;
  }, {});
}

async function main() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      customerEmail: true,
      userId: true,
      provider: true,
      orderStatus: true,
      paymentStatus: true,
      createdAt: true,
      updatedAt: true,
      adminReviewedAt: true,
      estimatedDeliveryDate: true,
    },
  });

  console.log("=== W5.45B Orders Invalid Date Audit ===");
  console.log(`ordersScanned: ${orders.length}`);

  for (const order of orders) {
    const dates = collectDateFields(order as Record<string, unknown>);
    console.log(JSON.stringify({
      id: order.id,
      orderNumber: order.orderNumber,
      buyer: order.customerName || order.customerEmail || order.userId,
      provider: order.provider,
      status: order.orderStatus,
      paymentStatus: order.paymentStatus,
      dates,
    }, null, 2));
  }
}

main()
  .catch((error) => {
    console.error("W5.45B audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
