import { prisma } from "../lib/prisma";

type Recommendation =
  | "KEEP_AS_LEGACY"
  | "CREATE_HISTORICAL_DISPATCH_LATER"
  | "RESERVE_HISTORICAL_UNITS_LATER"
  | "MANUAL_REVIEW_REQUIRED"
  | "DO_NOT_TOUCH";

type Classification =
  | "LEGACY_REAL_DATA"
  | "NEEDS_HUMAN_REVIEW"
  | "CANDIDATE_FOR_PROTECTED_REPAIR"
  | "BLOCKED_DO_NOT_TOUCH";

function maskEmail(email: string | null | undefined) {
  if (!email) return "—";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return `${local.slice(0, 1)}***@${domain}`;
}

function maskPhone(phone: string | null | undefined) {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return "***";
  return `${digits.slice(0, 2)}***${digits.slice(-2)}`;
}

function hasTestSignals(...values: Array<string | null | undefined>) {
  const haystack = values.filter(Boolean).join(" ").toLowerCase();
  return /test|demo|mock|seed|sandbox|prueba|fake|sample|dummy/.test(haystack);
}

function recommend(input: {
  testSignals: boolean;
  hasDispatch: boolean;
  hasReservation: boolean;
  hasActivation: boolean;
}) {
  if (input.testSignals) {
    return {
      classification: "BLOCKED_DO_NOT_TOUCH" as const,
      recommendation: "DO_NOT_TOUCH" as const,
      risk: "HIGH" as const,
      reason: "la fila parece de prueba o demo y no debe usarse para reparación",
    };
  }

  if (input.hasActivation) {
    return {
      classification: "BLOCKED_DO_NOT_TOUCH" as const,
      recommendation: "DO_NOT_TOUCH" as const,
      risk: "HIGH" as const,
      reason: "ya existe activación asociada; tocarla podría romper trazabilidad o shortCode",
    };
  }

  if (input.hasDispatch && input.hasReservation) {
    return {
      classification: "CANDIDATE_FOR_PROTECTED_REPAIR" as const,
      recommendation: "KEEP_AS_LEGACY" as const,
      risk: "LOW" as const,
      reason: "ya tiene trazabilidad operativa mínima; mantener histórico es la opción más segura",
    };
  }

  if (input.hasDispatch && !input.hasReservation) {
    return {
      classification: "NEEDS_HUMAN_REVIEW" as const,
      recommendation: "MANUAL_REVIEW_REQUIRED" as const,
      risk: "MEDIUM" as const,
      reason: "existe despacho histórico sin reserva vinculada; requiere confirmación humana antes de cualquier reparación",
    };
  }

  if (input.hasReservation && !input.hasDispatch) {
    return {
      classification: "CANDIDATE_FOR_PROTECTED_REPAIR" as const,
      recommendation: "CREATE_HISTORICAL_DISPATCH_LATER" as const,
      risk: "MEDIUM" as const,
      reason: "la reserva existe pero falta despacho formal; podría resolverse en un bloque futuro y protegido",
    };
  }

  return {
    classification: "LEGACY_REAL_DATA" as const,
    recommendation: "KEEP_AS_LEGACY" as const,
    risk: "MEDIUM" as const,
    reason: "es data real histórica sin trazabilidad operativa completa; dejar como histórico es lo más seguro por ahora",
  };
}

async function main() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "asc" },
    where: {
      OR: [
        {
          AND: [
            { paymentStatus: { in: ["paid", "approved"] } },
            { OR: [{ adminReviewStatus: "approved" }, { orderStatus: "completed" }] },
          ],
        },
        { orderStatus: "completed" },
      ],
    },
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      updatedAt: true,
      amount: true,
      currency: true,
      paymentStatus: true,
      orderStatus: true,
      adminReviewStatus: true,
      userId: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      paymentProofUrl: true,
      manualPaymentReference: true,
      shippingAddress: true,
      shippingCity: true,
      shippingNotes: true,
      items: {
        select: {
          productType: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
        },
      },
    },
  });

  const units = await prisma.operationFinishedGoodUnit.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      internalLabel: true,
      productCode: true,
      productName: true,
      productType: true,
      status: true,
      qaStatus: true,
      activationStatus: true,
      reservedOrderId: true,
      reservedAt: true,
      dispatchedAt: true,
      deliveredAt: true,
      activatedAt: true,
      activationReferenceType: true,
      activationReferenceId: true,
    },
  });

  const dispatches = await prisma.operationDispatch.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      code: true,
      status: true,
      destinationType: true,
      destinationName: true,
      destinationReference: true,
      destinationAddress: true,
      sentAt: true,
      dispatchedAt: true,
      deliveredAt: true,
      items: { select: { unitId: true, internalLabel: true } },
      events: {
        orderBy: { createdAt: "asc" },
        select: { eventType: true, referenceType: true, referenceId: true, metadataJson: true, createdAt: true },
      },
    },
  });

  const dispatchedOrderIds = new Map<
    string,
    { code: string; status: string; id: string; destinationName: string | null; destinationReference: string | null }
  >();
  for (const dispatch of dispatches) {
    for (const event of dispatch.events) {
      if (event.referenceType === "order" && event.referenceId) {
        if (!dispatchedOrderIds.has(event.referenceId)) {
          dispatchedOrderIds.set(event.referenceId, {
            code: dispatch.code,
            status: dispatch.status,
            id: dispatch.id,
            destinationName: dispatch.destinationName,
            destinationReference: dispatch.destinationReference,
          });
        }
      }
      if (!event.metadataJson) continue;
      try {
        const meta = JSON.parse(event.metadataJson) as { orderId?: string; sourceOrderId?: string };
        const orderId = meta.orderId || meta.sourceOrderId;
        if (orderId && !dispatchedOrderIds.has(orderId)) {
          dispatchedOrderIds.set(orderId, {
            code: dispatch.code,
            status: dispatch.status,
            id: dispatch.id,
            destinationName: dispatch.destinationName,
            destinationReference: dispatch.destinationReference,
          });
        }
      } catch {
        // solo lectura; ignorar metadata inválida
      }
    }
  }

  const reservedByOrder = new Map<string, typeof units>();
  for (const unit of units) {
    if (!unit.reservedOrderId) continue;
    const current = reservedByOrder.get(unit.reservedOrderId) || [];
    current.push(unit);
    reservedByOrder.set(unit.reservedOrderId, current);
  }

  const unitsByDispatchId = new Map<string, typeof units>();
  for (const dispatch of dispatches) {
    const linkedUnits = units.filter((unit) => dispatch.items.some((item) => item.unitId === unit.id));
    unitsByDispatchId.set(dispatch.id, linkedUnits);
  }

  const targetOrders = orders
    .filter((order) => {
      const reserved = reservedByOrder.get(order.id)?.length || 0;
      const dispatch = dispatchedOrderIds.has(order.id);
      return (
        (order.paymentStatus === "paid" || order.adminReviewStatus === "approved" || order.orderStatus === "completed") &&
        (!reserved || !dispatch)
      );
    })
    .slice(0, 3);

  const rows: Array<{
    orderCode: string;
    status: string;
    payment: string;
    qty: number;
    reserved: number;
    dispatch: string;
    activation: string;
    classification: Classification;
    recommendation: Recommendation;
    risk: string;
  }> = [];

  console.log("=== W5.41I.1 Legacy Real Orders Review ===");
  console.log("");
  console.log("Regla de seguridad: solo lectura, no reparación, no reserva, no despacho, no activación.");
  console.log("");

  for (const order of targetOrders) {
    const reservedUnits = reservedByOrder.get(order.id) || [];
    const dispatch = dispatchedOrderIds.get(order.id) || null;
    const dispatchedUnits = dispatch ? unitsByDispatchId.get(dispatch.id) || [] : [];
    const activatedUnits = [...reservedUnits, ...dispatchedUnits].filter((unit) => unit.activationStatus === "activated");
    const operationalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const availableSameProduct = units.filter(
      (unit) =>
        unit.productType === order.items[0]?.productType &&
        unit.status === "available" &&
        unit.qaStatus === "passed" &&
        unit.activationStatus === "not_activated" &&
        !unit.reservedOrderId
    );
    const testSignals = hasTestSignals(
      order.orderNumber,
      order.customerName,
      order.customerEmail,
      order.customerPhone,
      order.paymentProofUrl,
      order.manualPaymentReference,
      order.shippingAddress,
      order.shippingCity,
      order.shippingNotes
    );
    const decision = recommend({
      testSignals,
      hasDispatch: Boolean(dispatch),
      hasReservation: reservedUnits.length > 0,
      hasActivation: activatedUnits.length > 0,
    });

    const row = {
      orderCode: order.orderNumber,
      status: order.orderStatus,
      payment: order.paymentStatus,
      qty: operationalQuantity,
      reserved: reservedUnits.length,
      dispatch: dispatch ? `${dispatch.code} (${dispatch.status})` : "—",
      activation: activatedUnits.length > 0 ? `sí (${activatedUnits.length})` : "no",
      classification: decision.classification,
      recommendation: decision.recommendation,
      risk: decision.risk,
    };
    rows.push(row);

    console.log(`Order: ${order.orderNumber}`);
    console.log(`  orderId: ${order.id}`);
    console.log(`  createdAt: ${order.createdAt.toISOString()}`);
    console.log(`  updatedAt: ${order.updatedAt.toISOString()}`);
    console.log(`  status: ${order.orderStatus}`);
    console.log(`  paymentStatus: ${order.paymentStatus}`);
    console.log(`  adminReviewStatus: ${order.adminReviewStatus || "—"}`);
    console.log(`  total: ${order.amount.toFixed(2)} ${order.currency}`);
    console.log(`  customerName: ${order.customerName || "—"}`);
    console.log(`  customerEmail: ${maskEmail(order.customerEmail)}`);
    console.log(`  customerPhone: ${maskPhone(order.customerPhone)}`);
    console.log(`  userId: ${order.userId || "—"} (comprador/propietario)`);
    console.log(`  product/combo: ${order.items.map((item) => `${item.productType} x${item.quantity}`).join(", ") || "—"}`);
    console.log(`  operationalQuantity: ${operationalQuantity}`);
    console.log(`  reservedUnits: ${reservedUnits.length}`);
    console.log(`  reservedInternalLabels: ${reservedUnits.map((unit) => unit.internalLabel).join(", ") || "—"}`);
    console.log(`  dispatchedUnits: ${dispatchedUnits.map((unit) => unit.internalLabel).join(", ") || "—"}`);
    console.log(`  activatedUnits: ${activatedUnits.map((unit) => unit.internalLabel).join(", ") || "—"}`);
    console.log(`  dispatch: ${dispatch ? `${dispatch.code} (${dispatch.status})` : "—"}`);
    console.log(`  dispatchDestination: ${dispatch ? `${dispatch.destinationName || "—"} | ${dispatch.destinationReference || "—"}` : "—"}`);
    console.log(`  dispatchStateTrail: ${dispatch ? dispatch.status : "—"}`);
    console.log(`  dispatchEvents: ${dispatch ? dispatch.status : "—"}`);
    console.log(`  activationStatus: ${activatedUnits.length > 0 ? activatedUnits[0].activationStatus : "not_activated"}`);
    console.log(`  activationReference: ${activatedUnits[0]?.activationReferenceType || "—"} / ${activatedUnits[0]?.activationReferenceId || "—"}`);
    console.log(`  shortCodeSensitive: no value emitted`);
    console.log(`  availableStockSameProduct: ${availableSameProduct.length}`);
    console.log(`  hasEnoughStockForFutureRepair: ${availableSameProduct.length >= operationalQuantity ? "yes" : "no"}`);
    console.log(`  testSignals: ${testSignals ? "yes" : "no"}`);
    console.log(`  classification: ${decision.classification}`);
    console.log(`  recommendation: ${decision.recommendation}`);
    console.log(`  risk: ${decision.risk}`);
    console.log(`  reason: ${decision.reason}`);
    console.log("");
  }

  console.log("Resumen final");
  console.log("| orderCode | status | payment | qty | reserved | dispatch | activation | classification | recommendation | risk |");
  console.log("| --- | --- | --- | ---: | ---: | --- | --- | --- | --- | --- |");
  for (const row of rows) {
    console.log(
      `| ${row.orderCode} | ${row.status} | ${row.payment} | ${row.qty} | ${row.reserved} | ${row.dispatch} | ${row.activation} | ${row.classification} | ${row.recommendation} | ${row.risk} |`
    );
  }
  console.log("");
  console.log("Totales");
  console.log(`- total legacy real: ${rows.length}`);
  console.log(`- candidatos a reparación protegida: ${rows.filter((row) => row.classification === "CANDIDATE_FOR_PROTECTED_REPAIR").length}`);
  console.log(`- mantener como histórico: ${rows.filter((row) => row.recommendation === "KEEP_AS_LEGACY").length}`);
  console.log(`- revisión humana: ${rows.filter((row) => row.recommendation === "MANUAL_REVIEW_REQUIRED").length}`);
  console.log(`- bloqueados: ${rows.filter((row) => row.classification === "BLOCKED_DO_NOT_TOUCH").length}`);
}

main()
  .catch((error) => {
    console.error("W5.41I.1 audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
