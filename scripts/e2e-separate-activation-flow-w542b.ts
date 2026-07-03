import { prisma } from "../lib/prisma";

const CONFIRM_VALUE = "YES_ACTIVATE_W542B";
const TEST_ORDER_NUMBER = "PR-2026-001415";
const TEST_INTERNAL_LABEL = "PROD-INT-0013-0001";

function maskValue(value: string | null | undefined) {
  if (!value) return "—";
  if (value.length <= 8) return "***";
  return `${value.slice(0, 4)}***${value.slice(-4)}`;
}

function isRealRun() {
  return process.env.CONFIRM_E2E_ACTIVATION_W542B === CONFIRM_VALUE;
}

async function loadContext() {
  const order = await prisma.order.findUnique({
    where: { orderNumber: TEST_ORDER_NUMBER },
    include: {
      chipClaimTokens: {
        include: { chip: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const unit = await prisma.operationFinishedGoodUnit.findUnique({
    where: { internalLabel: TEST_INTERNAL_LABEL },
    include: { digitalBatchItem: true },
  });

  const chip = await prisma.chip.findFirst({
    where: { internalLabel: TEST_INTERNAL_LABEL },
    include: { claimTokens: true },
  });

  return { order, unit, chip, token: order?.chipClaimTokens[0] || null };
}

async function runDryRun() {
  const { order, unit, chip, token } = await loadContext();
  console.log("=== W5.42B Separate Activation Flow ===");
  console.log("mode: dry-run");
  console.log(`orderCode: ${order?.orderNumber || TEST_ORDER_NUMBER}`);
  console.log(`internalLabel: ${unit?.internalLabel || TEST_INTERNAL_LABEL}`);
  console.log(`activationCode masked: ${maskValue(token?.activationCode || null)}`);
  console.log(`activation endpoint: /api/chips/activate`);
  console.log(`public entry: /dashboard/chips?activate=true`);
  console.log(`landing: /activar/${TEST_INTERNAL_LABEL}`);
  console.log(`current unit status: ${unit?.status || "—"}`);
  console.log(`current activationStatus: ${unit?.activationStatus || "—"}`);
  console.log(`chip linked: ${chip ? "yes" : "no"}`);
  console.log(`customer account: ${order?.userId || "none"}`);
  console.log("expected changes:");
  console.log("- chip status => activated");
  console.log("- unit activationStatus => activated");
  console.log("- unit status => activated");
  console.log("- QR/NFC/shortCode remain intact");
  console.log("- no Operaciones assignment");

  const blockers: string[] = [];
  if (!order) blockers.push("pedido test no encontrado");
  if (!unit) blockers.push("unidad test no encontrada");
  if (!token) blockers.push("no existe claim token asociado al pedido test");
  if (!chip) blockers.push("no existe chip vinculado al internalLabel test");
  if (unit && unit.activationStatus !== "not_activated") blockers.push(`activationStatus actual = ${unit.activationStatus}`);
  if (order && order.orderStatus !== "completed") blockers.push(`orderStatus actual = ${order.orderStatus}`);

  console.log(`blockers: ${blockers.length > 0 ? blockers.join(" | ") : "none"}`);
  if (blockers.length > 0) {
    console.log("No se ejecuta activación real hasta resolver los bloqueos.");
  }
}

async function runReal() {
  const { order, unit, chip, token } = await loadContext();
  console.log("=== W5.42B Separate Activation Flow ===");
  console.log("mode: real");
  if (!order || !unit || !token || !chip) {
    console.log("No se puede ejecutar activación real: faltan datos test válidos.");
    return;
  }
  if (unit.activationStatus !== "not_activated" || order.orderStatus !== "completed" || !token.activationCode) {
    console.log("No se puede ejecutar activación real: el contexto no está listo.");
    return;
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/chips/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      activationCode: token.activationCode,
      profileId: null,
    }),
  });

  const payload = await res.json().catch(() => ({}));
  console.log(`responseStatus: ${res.status}`);
  console.log(`responseOk: ${res.ok ? "yes" : "no"}`);
  console.log(`responseError: ${payload.error || "—"}`);
  console.log(`activationCode used: ${maskValue(token.activationCode)}`);
}

async function main() {
  if (isRealRun()) {
    await runReal();
  } else {
    await runDryRun();
  }
}

main()
  .catch((error) => {
    console.error("W5.42B E2E activation failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
