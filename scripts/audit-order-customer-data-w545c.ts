import { prisma } from "@/lib/prisma";
import { moneyToNumber } from "@/lib/money";

type Args = {
  code?: string;
  recent?: number;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const current = argv[i];
    if (current === "--code") {
      args.code = argv[i + 1];
      i += 1;
    } else if (current === "--recent") {
      args.recent = Number(argv[i + 1]);
      i += 1;
    }
  }
  return args;
}

function isValidDate(value: unknown) {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function classifyField(value: unknown) {
  const isMissing = value === null || value === undefined || value === "";
  const type = value === null ? "null" : typeof value;
  const status = isMissing ? "MISSING" : "OK";
  return {
    currentValue: value,
    type,
    status,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const where = args.code ? { orderNumber: args.code } : {};
  const take = args.recent && args.recent > 0 ? args.recent : 10;

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    include: {
      user: {
        include: {
          profile: true,
        },
      },
      items: true,
    },
  });

  console.log("=== W5.45C Order Customer Data Audit ===");
  console.log(`ordersScanned: ${orders.length}`);

  for (const order of orders) {
    const expectedTotalFromItems = order.items.reduce((sum, item) => sum + moneyToNumber(item.totalPrice), 0);
    const commercialTotal = expectedTotalFromItems;
    const mismatches = {
      mismatchAmountVsItems: moneyToNumber(order.amount || 0) - expectedTotalFromItems,
      mismatchAmountVsCommercialTotal: moneyToNumber(order.amount || 0) - commercialTotal,
    };

    const fields = {
      customerName: classifyField(order.customerName),
      customerEmail: classifyField(order.customerEmail),
      customerPhone: classifyField(order.customerPhone),
      customerDocument: classifyField(order.customerDocument),
      shippingAddress: classifyField(order.shippingAddress),
      shippingCity: classifyField(order.shippingCity),
      shippingNotes: classifyField(order.shippingNotes),
      paymentMethod: classifyField(order.paymentMethod),
      paymentProofUrl: classifyField(order.paymentProofUrl),
      amount: classifyField(order.amount),
      commercialTotal: classifyField(commercialTotal),
      createdAt: classifyField(order.createdAt),
      updatedAt: classifyField(order.updatedAt),
    };

    console.log(
      JSON.stringify(
        {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.orderStatus,
          paymentStatus: order.paymentStatus,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          userId: order.userId,
          userEmail: order.user?.email || null,
          userName: [order.user?.profile?.firstName, order.user?.profile?.lastName].filter(Boolean).join(" ").trim() || null,
          profileName: [order.user?.profile?.firstName, order.user?.profile?.lastName].filter(Boolean).join(" ").trim() || null,
          profilePhone: order.user?.phone || null,
          rawCustomerFields: {
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            customerPhone: order.customerPhone,
            customerDocument: order.customerDocument,
          },
          rawShippingFields: {
            shippingAddress: order.shippingAddress,
            shippingCity: order.shippingCity,
            shippingNotes: order.shippingNotes,
          },
          rawPaymentFields: {
            paymentMethod: order.paymentMethod,
            paymentProofUrl: order.paymentProofUrl,
            paymentStatus: order.paymentStatus,
          },
          items: order.items.map((item) => ({
            productId: null,
            productCode: item.productType,
            productName: item.productType,
            quantity: item.quantity,
          unitPrice: moneyToNumber(item.unitPrice),
          totalPrice: moneyToNumber(item.totalPrice),
          })),
          amount: moneyToNumber(order.amount),
          commercialTotal,
          subtotal: expectedTotalFromItems,
          total: moneyToNumber(order.amount),
          expectedTotalFromItems,
          ...mismatches,
          adminFields: Object.fromEntries(
            Object.entries(fields).map(([key, value]) => [
              key,
              {
                adminDisplayField: key,
                currentValue: value.currentValue,
                expectedSource: key === "amount" ? "Order.amount or items total" : key,
                expectedValue:
                  key === "amount"
                    ? expectedTotalFromItems
                    : key === "customerName"
                      ? [order.user?.profile?.firstName, order.user?.profile?.lastName].filter(Boolean).join(" ").trim() || order.customerName
                      : key === "customerEmail"
                        ? order.user?.email || order.customerEmail
                        : key === "customerPhone"
                          ? order.user?.phone || order.customerPhone
                          : value.currentValue,
                status: value.status,
                isValidDate: key === "createdAt" || key === "updatedAt" ? isValidDate(value.currentValue) : undefined,
              },
            ])
          ),
        },
        null,
        2
      )
    );
  }
}

main()
  .catch((error) => {
    console.error("W5.45C audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
