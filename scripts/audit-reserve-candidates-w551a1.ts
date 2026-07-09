import { prisma } from "@/lib/prisma";
import { buildOperationsOrderViewModel } from "@/lib/operations/operations-order-view-model";

type Args = {
  recent?: number;
  product?: string;
};

type CandidateRow = {
  id: string;
  code: string;
  provider: string;
  status: string;
  orderStatus: string;
  paymentStatus: string;
  productCode: string;
  quantity: number;
  reservedUnitsCount: number;
  missingReservedUnits: number;
  dispatchExists: boolean;
  dispatchStatus: string | null;
  requiresAction: boolean;
  canReserveInternalLabel: boolean;
  canCreateDispatch: boolean;
  eligibleUnitsCount: number;
  firstEligibleUnit: string | null;
  blockers: string[];
  bucket: "perfect" | "near" | "completed";
};

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--recent") {
      args.recent = Number(argv[i + 1]);
      i += 1;
    } else if (argv[i] === "--product") {
      args.product = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function normalizeStatus(value: string | null | undefined) {
  return (value || "").toLowerCase();
}

function isCompletedStatus(orderStatus: string, dispatchStatus: string | null) {
  return ["completed", "delivered"].includes(normalizeStatus(orderStatus)) || ["completed", "delivered"].includes(normalizeStatus(dispatchStatus));
}

async function main() {
  const args = parseArgs(process.argv);
  const take = args.recent && args.recent > 0 ? args.recent : 50;
  const productCode = args.product?.trim() || "PRP-FG-STICKER";

  const [orders, eligibleUnits] = await Promise.all([
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take,
      where: {
        provider: "manual",
      },
      include: {
        items: {
          select: {
            id: true,
            productType: true,
            quantity: true,
            totalPrice: true,
            unitPrice: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
    prisma.operationFinishedGoodUnit.findMany({
      where: {
        productCode,
        status: "available",
        qaStatus: "passed",
        activationStatus: "not_activated",
        reservedOrderId: null,
      },
      orderBy: [{ createdAt: "asc" }, { internalLabel: "asc" }],
      select: {
        id: true,
        internalLabel: true,
        productCode: true,
        productName: true,
        status: true,
        qaStatus: true,
        activationStatus: true,
        reservedOrderId: true,
        reservedAt: true,
        createdAt: true,
      },
    }),
  ]);

  const rows: CandidateRow[] = [];

  for (const order of orders) {
    const reservedUnits = await prisma.operationFinishedGoodUnit.findMany({
      where: { reservedOrderId: order.id },
      select: {
        id: true,
        internalLabel: true,
        status: true,
        qaStatus: true,
        activationStatus: true,
        reservedOrderId: true,
        reservedAt: true,
      },
      orderBy: [{ createdAt: "asc" }, { internalLabel: "asc" }],
    });

    const dispatch = await prisma.operationDispatch.findFirst({
      where: {
        events: {
          some: {
            OR: [
              { referenceType: "order", referenceId: order.id },
              { metadataJson: { contains: `"orderId":"${order.id}"` } },
            ],
          },
        },
      },
      select: { id: true, code: true, status: true, dispatchedAt: true, deliveredAt: true },
    });

    const viewModel = buildOperationsOrderViewModel({
      ...(order as Parameters<typeof buildOperationsOrderViewModel>[0]),
      customerName:
        order.customerName ||
        `${order.user?.profile?.firstName || ""} ${order.user?.profile?.lastName || ""}`.trim() ||
        order.user?.email ||
        "Sin cliente",
      customerEmail: order.customerEmail || order.user?.email || null,
      customerPhone: order.customerPhone || order.user?.phone || null,
      reservedUnits,
      dispatch,
      user: order.user
        ? {
            email: order.user.email || null,
            phone: order.user.phone || null,
            profile: order.user.profile
              ? {
                  firstName: order.user.profile.firstName || null,
                  lastName: order.user.profile.lastName || null,
                }
              : null,
          }
        : null,
    });

    const product = order.items[0];
    const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const missingReservedUnits = Math.max(0, quantity - reservedUnits.length);
    const eligibleCount = eligibleUnits.length;
    const firstEligibleUnit = eligibleUnits[0]?.internalLabel || null;
    const isCompleted = isCompletedStatus(order.orderStatus, dispatch?.status || null);
    const canReserve = viewModel.canReserveInternalLabel;
    const canDispatch = viewModel.canCreateDispatch;

    const blockers: string[] = [];
    if (normalizeStatus(order.paymentStatus) !== "paid" && normalizeStatus(order.adminReviewStatus) !== "approved") blockers.push("payment_not_approved");
    if (normalizeStatus(order.orderStatus) !== "processing") blockers.push("status_not_processing");
    if (isCompleted) blockers.push("completed");
    if (normalizeStatus(order.orderStatus) === "cancelled") blockers.push("cancelled");
    if (dispatch) blockers.push(`dispatch_${dispatch.status}`);
    if (reservedUnits.length > 0) blockers.push("already_reserved");
    if (missingReservedUnits <= 0) blockers.push("no_missing_units");
    if (eligibleCount <= 0) blockers.push("no_eligible_units");

    const bucket: CandidateRow["bucket"] = isCompleted
      ? "completed"
      : canReserve && missingReservedUnits > 0 && eligibleCount > 0 && !dispatch
        ? "perfect"
        : "near";

    rows.push({
      id: order.id,
      code: order.orderNumber,
      provider: order.provider,
      status: order.orderStatus,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      productCode: productCode,
      quantity,
      reservedUnitsCount: reservedUnits.length,
      missingReservedUnits,
      dispatchExists: Boolean(dispatch),
      dispatchStatus: dispatch?.status || null,
      requiresAction: viewModel.requiresAction,
      canReserveInternalLabel: canReserve,
      canCreateDispatch: canDispatch,
      eligibleUnitsCount: eligibleCount,
      firstEligibleUnit,
      blockers,
      bucket,
    });
  }

  const perfect = rows.filter((row) => row.bucket === "perfect");
  const near = rows.filter((row) => row.bucket === "near");
  const completed = rows.filter((row) => row.bucket === "completed");

  console.log("=== W5.51A.1 Reserve Candidates Audit ===");
  console.log(JSON.stringify({
    productCode,
    scanned: rows.length,
    eligibleUnitsCount: eligibleUnits.length,
    perfectCount: perfect.length,
    nearCount: near.length,
    completedCount: completed.length,
  }, null, 2));
  console.log("--- PERFECT ---");
  for (const row of perfect) console.log(JSON.stringify(row, null, 2));
  console.log("--- NEAR ---");
  for (const row of near) console.log(JSON.stringify(row, null, 2));
  console.log("--- COMPLETED ---");
  for (const row of completed) console.log(JSON.stringify(row, null, 2));
}

main()
  .catch((error) => {
    console.error("W5.51A.1 audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
