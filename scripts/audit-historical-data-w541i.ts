import { prisma } from "../lib/prisma";

type Classification =
  | "SAFE_TEST_DATA"
  | "LEGACY_REAL_DATA"
  | "NEEDS_HUMAN_REVIEW"
  | "BLOCKED_DO_NOT_TOUCH"
  | "CANDIDATE_FOR_PROTECTED_REPAIR";

function maskEmail(email: string | null | undefined) {
  if (!email) return "—";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return `${local.slice(0, 1)}***@${domain}`;
}

function hasTestSignals(...values: Array<string | null | undefined>) {
  const haystack = values.filter(Boolean).join(" ").toLowerCase();
  return /test|demo|mock|seed|sandbox|prueba|fake/.test(haystack);
}

function classify(order: {
  orderStatus: string;
  paymentStatus: string;
  adminReviewStatus: string | null;
  provider: string;
  orderNumber: string;
  userId: string | null;
  paymentProofUrl: string | null;
  manualPaymentReference: string | null;
  customerName: string | null;
  customerEmail: string | null;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingNotes: string | null;
}) {
  const testSignals = hasTestSignals(
    order.orderNumber,
    order.customerName,
    order.customerEmail,
    order.paymentProofUrl,
    order.manualPaymentReference,
    order.shippingAddress,
    order.shippingCity,
    order.shippingNotes
  );
  if (testSignals) return "SAFE_TEST_DATA";
  if (order.orderStatus === "completed" || order.paymentStatus === "paid") return "LEGACY_REAL_DATA";
  if (order.userId) return "NEEDS_HUMAN_REVIEW";
  return "BLOCKED_DO_NOT_TOUCH";
}

function shortOrderCode(orderNumber: string) {
  return orderNumber.startsWith("OP-") ? orderNumber : `OP-CLI-${orderNumber}`;
}

type AuditOrder = {
  id: string;
  orderNumber: string;
  createdAt: Date;
  updatedAt: Date;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  paymentStatus: string;
  orderStatus: string;
  adminReviewStatus: string | null;
  paymentProofUrl: string | null;
  manualPaymentReference: string | null;
  provider: string;
  userId: string | null;
  amount: number;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingNotes: string | null;
  items: Array<{
    productType: string;
    quantity: number;
    totalPrice: number;
    unitPrice: number;
  }>;
};

async function main() {
  const orders: AuditOrder[] = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      updatedAt: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      paymentStatus: true,
      orderStatus: true,
      adminReviewStatus: true,
      paymentProofUrl: true,
      manualPaymentReference: true,
      provider: true,
      userId: true,
      amount: true,
      shippingAddress: true,
      shippingCity: true,
      shippingNotes: true,
      items: {
        select: {
          productType: true,
          quantity: true,
          totalPrice: true,
          unitPrice: true,
        },
      },
    },
  });

  const units = await prisma.operationFinishedGoodUnit.findMany({
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      internalLabel: true,
      productCode: true,
      productName: true,
      status: true,
      qaStatus: true,
      activationStatus: true,
      reservedOrderId: true,
      dispatchedAt: true,
      deliveredAt: true,
      activatedAt: true,
    },
  });

  const dispatches = await prisma.operationDispatch.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      status: true,
      destinationName: true,
      destinationAddress: true,
      destinationReference: true,
      createdAt: true,
      updatedAt: true,
      items: { select: { unitId: true } },
      events: {
        orderBy: { createdAt: "asc" },
        select: { referenceType: true, referenceId: true, metadataJson: true },
      },
    },
  });

  const dispatchByOrderId = new Map<string, { id: string; code: string; status: string }>();
  for (const dispatch of dispatches) {
    for (const event of dispatch.events) {
      let orderId: string | null = null;
      if (event.referenceType === "order" && event.referenceId) orderId = event.referenceId;
      if (event.metadataJson) {
        try {
          const meta = JSON.parse(event.metadataJson) as { orderId?: string };
          orderId = meta.orderId || orderId;
        } catch {
          // ignore malformed metadata
        }
      }
      if (orderId && !dispatchByOrderId.has(orderId)) {
        dispatchByOrderId.set(orderId, { id: dispatch.id, code: dispatch.code, status: dispatch.status });
      }
    }
  }

  const reservedUnitsByOrder = new Map<string, typeof units>();
  for (const unit of units) {
    if (!unit.reservedOrderId) continue;
    const current = reservedUnitsByOrder.get(unit.reservedOrderId) || [];
    current.push(unit);
    reservedUnitsByOrder.set(unit.reservedOrderId, current);
  }

  const dispatchedUnitsByOrder = new Map<string, typeof units>();
  for (const dispatch of dispatches) {
    const orderId = dispatch.events
      .map((event) => {
        if (!event.metadataJson) return null;
        try {
          const meta = JSON.parse(event.metadataJson) as { orderId?: string };
          return meta.orderId || null;
        } catch {
          return null;
        }
      })
      .find(Boolean);
    if (!orderId) continue;
    const related = units.filter((unit) => dispatch.items.some((item) => item.unitId === unit.id));
    const current = dispatchedUnitsByOrder.get(String(orderId)) || [];
    current.push(...related);
    dispatchedUnitsByOrder.set(String(orderId), current);
  }

  const paidApprovedWithoutReservation = orders.filter(
    (order) =>
      (order.paymentStatus === "paid" || order.adminReviewStatus === "approved") &&
      !reservedUnitsByOrder.has(order.id)
  );
  const deliveredWithoutDispatch = orders.filter(
    (order) => order.orderStatus === "completed" && !dispatchByOrderId.has(order.id)
  );
  const userIdBeforeActivation = orders.filter(
    (order) =>
      Boolean(order.userId) &&
      reservedUnitsByOrder.has(order.id) &&
      (reservedUnitsByOrder.get(order.id) || []).some((unit) => unit.activationStatus !== "activated")
  );

  console.log("=== W5.41I Historical Data Audit ===");
  console.log("");

  console.log("1. Paid approved orders without reservation");
  console.log(`- count: ${paidApprovedWithoutReservation.length}`);
  for (const order of paidApprovedWithoutReservation) {
    const reserved = reservedUnitsByOrder.get(order.id) || [];
    const dispatch = dispatchByOrderId.get(order.id) || null;
    const testSignals = hasTestSignals(
      order.orderNumber,
      order.customerName,
      order.customerEmail,
      order.paymentProofUrl,
      order.manualPaymentReference
    );
    const classification: Classification = classify(order);
    const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const opCode = shortOrderCode(order.orderNumber);
    console.log(`- orderCode: ${opCode}`);
    console.log(`  orderId: ${order.id}`);
    console.log(`  createdAt: ${order.createdAt.toISOString()}`);
    console.log(`  updatedAt: ${order.updatedAt.toISOString()}`);
    console.log(`  customer: ${order.customerName || "—"} | ${maskEmail(order.customerEmail)}`);
    console.log(`  shipping: ${(order.shippingAddress || "—")}, ${(order.shippingCity || "—")}`);
    console.log(`  paymentStatus: ${order.paymentStatus}`);
    console.log(`  orderStatus: ${order.orderStatus}`);
    console.log(`  total: ${order.amount.toFixed(2)}`);
    console.log(`  product/combo: ${(order.items[0]?.productType || "—")}`);
    console.log(`  operationalQuantity: ${quantity}`);
    console.log(`  reservedUnits: ${reserved.length}`);
    console.log(`  dispatch: ${dispatch ? `${dispatch.code} (${dispatch.status})` : "—"}`);
    console.log(`  activationLinked: ${reserved.some((unit) => unit.activationStatus === "activated") ? "yes" : "no"}`);
    console.log(`  userIdPresent: ${Boolean(order.userId)}`);
    console.log(`  testSignals: ${testSignals ? "yes" : "no"}`);
    console.log(`  classification: ${classification}`);
    console.log(`  recommendation: ${testSignals ? "posible archivo protegido" : "revisar humano"}`);
  }
  console.log("");

  console.log("2. Delivered orders without dispatch");
  console.log(`- count: ${deliveredWithoutDispatch.length}`);
  for (const order of deliveredWithoutDispatch) {
    const reserved = reservedUnitsByOrder.get(order.id) || [];
    const dispatch = dispatchByOrderId.get(order.id) || null;
    const testSignals = hasTestSignals(
      order.orderNumber,
      order.customerName,
      order.customerEmail,
      order.paymentProofUrl,
      order.manualPaymentReference,
      order.shippingAddress,
      order.shippingCity
    );
    const classification: Classification = testSignals ? "SAFE_TEST_DATA" : "LEGACY_REAL_DATA";
    const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
    console.log(`- orderCode: ${shortOrderCode(order.orderNumber)}`);
    console.log(`  orderId: ${order.id}`);
    console.log(`  status: ${order.orderStatus}`);
    console.log(`  paymentStatus: ${order.paymentStatus}`);
    console.log(`  deliveredAt: ${order.updatedAt.toISOString()}`);
    console.log(`  dispatch linked: ${dispatch ? `${dispatch.code} (${dispatch.status})` : "—"}`);
    console.log(`  reservedUnits: ${reserved.length}`);
    console.log(`  units dispatched/delivered: ${(dispatchedUnitsByOrder.get(order.id) || []).length}`);
    console.log(`  customer: ${order.customerName || "—"} | ${maskEmail(order.customerEmail)}`);
    console.log(`  testSignals: ${testSignals ? "yes" : "no"}`);
    console.log(`  appears legacy: ${order.orderStatus === "completed" && !dispatch}`);
    console.log(`  classification: ${classification}`);
    console.log(`  recommendation: ${testSignals ? "archivar como prueba" : "no tocar / revisar histórico"}`);
    console.log(`  operationalQuantity: ${quantity}`);
  }
  console.log("");

  console.log("3. Orders with userId before activation");
  console.log(`- count: ${userIdBeforeActivation.length}`);
  for (const order of userIdBeforeActivation) {
    const reserved = reservedUnitsByOrder.get(order.id) || [];
    const activated = reserved.filter((unit) => unit.activationStatus === "activated").length;
    const dispatch = dispatchByOrderId.get(order.id) || null;
    const classification: Classification = "NEEDS_HUMAN_REVIEW";
    console.log(`- orderCode: ${shortOrderCode(order.orderNumber)}`);
    console.log(`  orderId: ${order.id}`);
    console.log(`  userId: ${order.userId || "—"}`);
    console.log(`  buyer/customer: ${order.customerName || "—"} | ${maskEmail(order.customerEmail)}`);
    console.log(`  activationStatus(units): ${reserved.map((unit) => unit.activationStatus).join(", ") || "—"}`);
    console.log(`  activatedUnits: ${activated}`);
    console.log(`  dispatch: ${dispatch ? `${dispatch.code} (${dispatch.status})` : "—"}`);
    console.log(`  userIdMeaning: likely buyer/owner of order, not chip assignment`);
    console.log(`  classification: ${classification}`);
    console.log(`  recommendation: confirmar significado de userId con revisión humana`);
  }
  console.log("");

  console.log("4. Inventory/unit inconsistencies");
  const problematicUnits = units.filter(
    (unit) =>
      (unit.status === "reserved" && !unit.reservedOrderId) ||
      (unit.status === "dispatched" && !unit.dispatchedAt) ||
      (unit.status === "delivered" && !unit.deliveredAt) ||
      (unit.activationStatus === "activated" && !unit.activatedAt)
  );
  console.log(`- count: ${problematicUnits.length}`);
  for (const unit of problematicUnits) {
    console.log(`- unit: ${unit.internalLabel}`);
    console.log(`  product: ${unit.productCode} | ${unit.productName}`);
    console.log(`  inventoryStatus: ${unit.status}`);
    console.log(`  qaStatus: ${unit.qaStatus || "—"}`);
    console.log(`  activationStatus: ${unit.activationStatus}`);
    console.log(`  reservedOrderId: ${unit.reservedOrderId || "—"}`);
    console.log(`  dispatchedAt: ${unit.dispatchedAt?.toISOString() || "—"}`);
    console.log(`  deliveredAt: ${unit.deliveredAt?.toISOString() || "—"}`);
    console.log(`  classification: ${unit.activationStatus === "activated" ? "BLOCKED_DO_NOT_TOUCH" : "NEEDS_HUMAN_REVIEW"}`);
  }
  console.log("");

  const byClassification = {
    SAFE_TEST_DATA: 0,
    LEGACY_REAL_DATA: 0,
    NEEDS_HUMAN_REVIEW: 0,
    BLOCKED_DO_NOT_TOUCH: 0,
    CANDIDATE_FOR_PROTECTED_REPAIR: 0,
  };

  for (const order of [...paidApprovedWithoutReservation, ...deliveredWithoutDispatch, ...userIdBeforeActivation]) {
    const classification = classify(order);
    byClassification[classification] += 1;
  }
  byClassification.NEEDS_HUMAN_REVIEW += problematicUnits.length;

  console.log("5. Recommendations");
  console.log("- Do not auto repair: yes");
  console.log("- Human review: pedidos entregados sin despacho y userId antes de activación");
  console.log("- Candidate safe repairs for later: solo metadata o labels, nunca activación/userId/shortCode");
  console.log("- Test data candidates: cualquier fila con señales test/demo/mock/seed/sandbox/prueba");
  console.log("");
  console.log("6. Totals by classification");
  for (const [key, value] of Object.entries(byClassification)) {
    console.log(`- ${key}: ${value}`);
  }
}

main()
  .catch((error) => {
    console.error("W5.41I audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
