import { prisma } from "../lib/prisma";

async function main() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      items: true,
    },
  });

  const findings = orders.map((order) => {
    const displayOrderCode = order.providerReference?.startsWith("PR-")
      ? order.providerReference
      : order.orderNumber.startsWith("OP-")
        ? order.orderNumber.replace(/^OP-(CLI|EMP)-/, "")
        : order.orderNumber;
    const operationsOrderCode = order.orderNumber.startsWith("OP-")
      ? order.orderNumber
      : `OP-CLI-${displayOrderCode}`;
    const paymentProofAvailable = Boolean(order.paymentProofUrl || order.manualPaymentReference);

    return {
      id: order.id,
      displayOrderCode,
      operationsOrderCode,
      paymentStatus: order.paymentStatus,
      paymentProofUrl: order.paymentProofUrl,
      paymentProofAvailable,
      hasCommercialItem: order.items.some((item) => item.productType.toUpperCase().includes("COMBO")),
      hasOperationalItem: order.items.some((item) => item.productType.toUpperCase().includes("STICKER")),
      missingDisplayCode: !displayOrderCode,
      missingOperationsCode: !operationsOrderCode,
      needsProofReview: paymentProofAvailable && order.paymentStatus === "pending",
    };
  });

  const summary = {
    totalOrders: findings.length,
    missingDisplayCode: findings.filter((item) => item.missingDisplayCode).length,
    missingOperationsCode: findings.filter((item) => item.missingOperationsCode).length,
    proofPendingReview: findings.filter((item) => item.needsProofReview).length,
    missingProofUrlWithProofFlag: findings.filter((item) => item.paymentProofAvailable && !item.paymentProofUrl).length,
    missingCommercialItem: findings.filter((item) => !item.hasCommercialItem).length,
    missingOperationalItem: findings.filter((item) => !item.hasOperationalItem).length,
  };

  console.log(JSON.stringify({ summary, findings: findings.slice(0, 50) }, null, 2));
}

main().catch((error) => {
  console.error("[audit-orders-payment-proof-w540v2]", error);
  process.exitCode = 1;
});
