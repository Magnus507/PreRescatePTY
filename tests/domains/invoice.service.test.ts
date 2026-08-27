import { beforeEach, describe, expect, it } from "vitest";
import { InvoiceCreationError, InvoiceService } from "@/domains/invoices/services/invoice.service";
import { mockPrisma } from "../helpers/mock-prisma";
import { resetAllMocks } from "../helpers/reset-mocks";

function paidOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-1",
    orderNumber: "ORD-001",
    paymentStatus: "paid",
    amount: "25.00",
    currency: "USD",
    customerName: "Cliente",
    customerEmail: "cliente@example.com",
    customerDocument: "8-123-456",
    customerPhone: "60000000",
    shippingAddress: "Panamá",
    items: [{
      id: "item-1",
      productName: "Sticker PreRescate",
      productType: "STICKER",
      productCode: "STK-001",
      quantity: 1,
      unitPrice: "25.00",
      totalPrice: "25.00",
    }],
    ...overrides,
  };
}

describe("InvoiceService.ensurePendingForPaidOrder", () => {
  beforeEach(() => resetAllMocks());

  it("creates one pending snapshot from the paid order", async () => {
    mockPrisma.invoice.findUnique.mockResolvedValue(null);
    mockPrisma.order.findUnique.mockResolvedValue(paidOrder() as never);
    mockPrisma.invoice.create.mockResolvedValue({ id: "invoice-1" } as never);

    await InvoiceService.ensurePendingForPaidOrder(mockPrisma as never, {
      orderId: "order-1",
      sourcePaymentAttemptId: "attempt-1",
    });

    expect(mockPrisma.invoice.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        orderId: "order-1",
        sourcePaymentAttemptId: "attempt-1",
        internalNumber: "INV-ORD-001",
        status: "pending_configuration",
        total: expect.objectContaining({}),
        taxTotal: expect.objectContaining({}),
        priceIncludesTax: true,
        lines: {
          create: [expect.objectContaining({
            description: "Sticker PreRescate",
            quantity: 1,
          })],
        },
      }),
    }));
  });

  it("is idempotent when the order already has an invoice", async () => {
    const existing = { id: "invoice-1", lines: [] };
    mockPrisma.invoice.findUnique.mockResolvedValue(existing as never);

    const result = await InvoiceService.ensurePendingForPaidOrder(mockPrisma as never, {
      orderId: "order-1",
    });

    expect(result).toBe(existing);
    expect(mockPrisma.order.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
  });

  it("rejects an unpaid order", async () => {
    mockPrisma.invoice.findUnique.mockResolvedValue(null);
    mockPrisma.order.findUnique.mockResolvedValue(paidOrder({ paymentStatus: "pending" }) as never);

    await expect(InvoiceService.ensurePendingForPaidOrder(mockPrisma as never, {
      orderId: "order-1",
    })).rejects.toMatchObject({ code: "ORDER_NOT_PAID" } satisfies Partial<InvoiceCreationError>);
    expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
  });

  it("rejects totals that do not match the order", async () => {
    mockPrisma.invoice.findUnique.mockResolvedValue(null);
    mockPrisma.order.findUnique.mockResolvedValue(paidOrder({ amount: "30.00" }) as never);

    await expect(InvoiceService.ensurePendingForPaidOrder(mockPrisma as never, {
      orderId: "order-1",
    })).rejects.toMatchObject({ code: "INVALID_TOTALS" } satisfies Partial<InvoiceCreationError>);
  });

  it("creates a single fallback line for a legacy paid order without items", async () => {
    mockPrisma.invoice.findUnique.mockResolvedValue(null);
    mockPrisma.order.findUnique.mockResolvedValue(paidOrder({ items: [] }) as never);
    mockPrisma.invoice.create.mockResolvedValue({ id: "invoice-1" } as never);

    await InvoiceService.ensurePendingForPaidOrder(mockPrisma as never, { orderId: "order-1" });

    expect(mockPrisma.invoice.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        lines: { create: [expect.objectContaining({ description: "Pedido ORD-001", total: expect.objectContaining({}) })] },
      }),
    }));
  });
});
