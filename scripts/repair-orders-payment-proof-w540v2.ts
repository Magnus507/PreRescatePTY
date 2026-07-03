import { prisma } from "../lib/prisma";

const CONFIRM = "YES_REPAIR_ORDER_PAYMENT_PROOF";

async function main() {
  const confirm = process.env.CONFIRM_REPAIR_ORDER_PAYMENT_PROOF;
  const dryRun = confirm !== CONFIRM;

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { items: true },
  });

  const targets = orders.filter((order) => {
    const displayOrderCode = order.providerReference?.startsWith("PR-")
      ? order.providerReference
      : order.orderNumber.startsWith("OP-")
        ? order.orderNumber.replace(/^OP-(CLI|EMP)-/, "")
        : order.orderNumber;
    return Boolean(order.paymentProofUrl || order.manualPaymentReference) &&
      (order.paymentStatus === "pending" || !order.providerReference || order.orderNumber.startsWith("OP-"));
  });

  console.log(JSON.stringify({ dryRun, targetCount: targets.length }, null, 2));

  if (dryRun) return;

  for (const order of targets) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: order.paymentProofUrl || order.manualPaymentReference ? "under_review" : order.paymentStatus,
      },
    });
  }

  console.log(JSON.stringify({ updated: targets.length }, null, 2));
}

main().catch((error) => {
  console.error("[repair-orders-payment-proof-w540v2]", error);
  process.exitCode = 1;
});
