import { Prisma, PrismaClient } from "@prisma/client";
import { addMoney, moneyEquals, multiplyMoney, parseMoney } from "@/lib/money";

type DbClient = PrismaClient | Prisma.TransactionClient;

export class InvoiceCreationError extends Error {
  constructor(
    message: string,
    readonly code: "ORDER_NOT_FOUND" | "ORDER_NOT_PAID" | "INVALID_TOTALS"
  ) {
    super(message);
    this.name = "InvoiceCreationError";
  }
}

function internalNumberForOrder(orderNumber: string) {
  return `REC-${orderNumber}`;
}

export class InvoiceService {
  static async ensurePendingForPaidOrder(
    db: DbClient,
    input: { orderId: string; sourcePaymentAttemptId?: string | null }
  ) {
    const existing = await db.invoice.findUnique({
      where: { orderId: input.orderId },
      include: { lines: true },
    });
    if (existing) return existing;

    const order = await db.order.findUnique({
      where: { id: input.orderId },
      include: { items: true },
    });
    if (!order) {
      throw new InvoiceCreationError("Pedido no encontrado", "ORDER_NOT_FOUND");
    }
    if (order.paymentStatus !== "paid") {
      throw new InvoiceCreationError("Solo se generan constancias para pedidos pagados", "ORDER_NOT_PAID");
    }

    const total = parseMoney(order.amount);
    if (total.lte(0)) {
      throw new InvoiceCreationError("El total de la constancia debe ser mayor que cero", "INVALID_TOTALS");
    }

    const sourceLines = order.items.length > 0
      ? order.items.map((item) => {
          const quantity = item.quantity;
          const unitPrice = parseMoney(item.unitPrice);
          const subtotal = multiplyMoney(unitPrice, quantity);
          const lineTotal = parseMoney(item.totalPrice);
          if (quantity <= 0 || !moneyEquals(subtotal, lineTotal)) {
            throw new InvoiceCreationError("Las líneas del pedido no cuadran", "INVALID_TOTALS");
          }
          return {
            description: item.productName?.trim() || item.productType,
            productCode: item.productCode || null,
            quantity,
            unitPrice,
            subtotal,
            discount: parseMoney(0),
            taxRate: new Prisma.Decimal(0),
            taxAmount: parseMoney(0),
            total: lineTotal,
          };
        })
      : [{
          description: `Pedido ${order.orderNumber}`,
          productCode: null,
          quantity: 1,
          unitPrice: total,
          subtotal: total,
          discount: parseMoney(0),
          taxRate: new Prisma.Decimal(0),
          taxAmount: parseMoney(0),
          total,
        }];

    const linesTotal = addMoney(...sourceLines.map((line) => line.total));
    if (!moneyEquals(linesTotal, total)) {
      throw new InvoiceCreationError("El total del pedido no coincide con sus líneas", "INVALID_TOTALS");
    }

    return db.invoice.create({
      data: {
        orderId: order.id,
        sourcePaymentAttemptId: input.sourcePaymentAttemptId || null,
        internalNumber: internalNumberForOrder(order.orderNumber),
        status: "pending_configuration",
        currency: order.currency.toUpperCase(),
        subtotal: total,
        discountTotal: parseMoney(0),
        taxRate: new Prisma.Decimal(0),
        taxTotal: parseMoney(0),
        total,
        priceIncludesTax: true,
        buyerName: order.customerName,
        buyerEmail: order.customerEmail,
        buyerDocument: order.customerDocument,
        buyerPhone: order.customerPhone,
        buyerAddress: order.shippingAddress,
        lines: { create: sourceLines },
      },
      include: { lines: true },
    });
  }
}
