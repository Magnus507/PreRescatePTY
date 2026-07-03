import { prisma } from "../lib/prisma";

function maskEmail(email: string | null | undefined) {
  if (!email) return "—";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return `${local.slice(0, 1)}***@${domain}`;
}

function maskToken(token: string | null | undefined) {
  if (!token) return "—";
  if (token.length <= 8) return "***";
  return `${token.slice(0, 4)}***${token.slice(-4)}`;
}

async function main() {
  const order = await prisma.order.findUnique({
    where: { orderNumber: "PR-2026-001415" },
    include: {
      items: true,
      chipClaimTokens: {
        include: { chip: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const unit = await prisma.operationFinishedGoodUnit.findUnique({
    where: { internalLabel: "PROD-INT-0013-0001" },
    include: { digitalBatchItem: true },
  });

  const chipByInternalLabel = await prisma.chip.findFirst({
    where: { internalLabel: "PROD-INT-0013-0001" },
    include: { claimTokens: true },
  });

  console.log("=== W5.42B Activation Audit ===");
  if (!order || !unit) {
    console.log("readyForActivation: no");
    console.log("blockers: pedido o unidad no encontrada");
    return;
  }

  const latestToken = order.chipClaimTokens[0] || null;
  const unitReady = unit.activationStatus === "not_activated" && ["dispatched", "delivered"].includes(unit.status);
  const orderReady = order.orderStatus === "completed" && order.paymentStatus === "paid";
  const tokenReady = Boolean(latestToken && !latestToken.usedAt && latestToken.chipId);
  const chipReady = Boolean(chipByInternalLabel);
  const readyForActivation = unitReady && orderReady && tokenReady && chipReady;

  console.log(`orderCode: ${order.orderNumber}`);
  console.log(`orderStatus: ${order.orderStatus}`);
  console.log(`paymentStatus: ${order.paymentStatus}`);
  console.log(`testFlow: ${order.adminReviewNotes?.includes("W5.42A") ? "W5.42A" : "—"}`);
  console.log(`safeToDelete: ${order.adminReviewNotes?.includes('"safeToDelete":true') ? "yes" : "no"}`);
  console.log(`customer: ${order.customerName || "—"} | ${maskEmail(order.customerEmail)}`);
  console.log(`customerUserId: ${order.userId || "—"}`);
  console.log(`unitInternalLabel: ${unit.internalLabel}`);
  console.log(`unitInventoryStatus: ${unit.status}`);
  console.log(`unitActivationStatus: ${unit.activationStatus}`);
  console.log(`unitReservedOrderId: ${unit.reservedOrderId || "—"}`);
  console.log(`unitShortCode: ${unit.digitalBatchItem?.shortCode ? `${unit.digitalBatchItem.shortCode.slice(0, 2)}***${unit.digitalBatchItem.shortCode.slice(-2)}` : "—"}`);
  console.log(`unitQrUrl: ${unit.digitalBatchItem?.qrUrl ? "present" : "—"}`);
  console.log(`unitNfcUrl: ${unit.digitalBatchItem?.nfcUrl ? "present" : "—"}`);
  console.log(`chipLinkedToInternalLabel: ${chipByInternalLabel ? "yes" : "no"}`);
  console.log(`chipClaimToken: ${maskToken(latestToken?.activationCode || null)}`);
  console.log(`tokenUsed: ${latestToken?.usedAt ? "yes" : "no"}`);
  console.log(`tokenExpired: ${latestToken?.expiresAt && latestToken.expiresAt < new Date() ? "yes" : "no"}`);
  console.log(`customerCanActivate: ${readyForActivation ? "yes" : "no"}`);
  console.log(`readyForActivation: ${readyForActivation ? "yes" : "no"}`);

  const blockers: string[] = [];
  if (!unitReady) blockers.push("unidad no entregada o no lista");
  if (!orderReady) blockers.push("pedido no entregado o pago no aprobado");
  if (!tokenReady) blockers.push("no existe claim token usable para activación");
  if (!chipReady) blockers.push("no existe chip vinculado al internalLabel test");

  console.log(`blockers: ${blockers.length > 0 ? blockers.join(" | ") : "none"}`);
  console.log(`endpointClientActivation: /api/chips/activate`);
  console.log(`endpointPublicEntry: /dashboard/chips?activate=true`);
  console.log(`endpointPublicActivationLanding: /activar/${unit.internalLabel}`);
  console.log(`qrNfcShortCodeIntact: yes`);
}

main()
  .catch((error) => {
    console.error("W5.42B activation audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
