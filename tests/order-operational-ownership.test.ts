import { describe, expect, it } from "vitest";
import {
  isOrderOperationallyCancelled,
  isOrderOperationallyDelivered,
  isOrderOwnedByPedidos,
  isOrderTransferredToDispatch,
  isOrderVisibleInPedidosHistory,
} from "@/lib/orders/order-operational-ownership";

describe("order operational ownership", () => {
  it("keeps a paid processing order in Pedidos before a dispatch exists", () => {
    const order = { orderStatus: "processing", paymentStatus: "paid", dispatch: null };
    expect(isOrderOwnedByPedidos(order)).toBe(true);
    expect(isOrderTransferredToDispatch(order)).toBe(false);
    expect(isOrderOperationallyDelivered(order)).toBe(false);
  });

  it("transfers ownership away from Pedidos as soon as a dispatch exists", () => {
    const order = {
      orderStatus: "processing",
      paymentStatus: "paid",
      dispatch: { id: "dispatch-1", status: "pending_pick" },
    };
    expect(isOrderTransferredToDispatch(order)).toBe(true);
    expect(isOrderOwnedByPedidos(order)).toBe(false);
    expect(isOrderVisibleInPedidosHistory(order)).toBe(true);
    expect(isOrderOperationallyDelivered(order)).toBe(false);
  });

  it("treats a dispatched shipment as transferred but not delivered", () => {
    const order = {
      orderStatus: "shipped",
      paymentStatus: "paid",
      dispatch: { id: "dispatch-1", status: "dispatched" },
    };
    expect(isOrderTransferredToDispatch(order)).toBe(true);
    expect(isOrderOperationallyDelivered(order)).toBe(false);
    expect(isOrderOwnedByPedidos(order)).toBe(false);
  });

  it("only treats a real delivery state as delivered", () => {
    const order = {
      orderStatus: "completed",
      paymentStatus: "paid",
      dispatch: { id: "dispatch-1", status: "delivered" },
    };
    expect(isOrderOperationallyDelivered(order)).toBe(true);
    expect(isOrderTransferredToDispatch(order)).toBe(false);
    expect(isOrderOwnedByPedidos(order)).toBe(false);
  });

  it("supports the separate corporate delivery workflow", () => {
    const order = {
      orderStatus: "processing",
      paymentStatus: "paid",
      corporateDeliveryStatus: "delivered",
    };
    expect(isOrderOperationallyDelivered(order)).toBe(true);
  });

  it("never equates manufacturing state or estimated dates with delivery", () => {
    const order = {
      orderStatus: "processing",
      paymentStatus: "paid",
      dispatch: null,
      productionOrder: { status: "completed" },
      estimatedDeliveryDate: new Date().toISOString(),
    };
    expect(isOrderOperationallyDelivered(order)).toBe(false);
    expect(isOrderOwnedByPedidos(order)).toBe(true);
  });

  it("keeps cancelled or rejected orders out of active ownership", () => {
    expect(isOrderOperationallyCancelled({ orderStatus: "cancelled", paymentStatus: "paid" })).toBe(true);
    expect(isOrderOwnedByPedidos({ orderStatus: "cancelled", paymentStatus: "paid" })).toBe(false);
    expect(isOrderOperationallyCancelled({ orderStatus: "processing", paymentStatus: "rejected" })).toBe(true);
    expect(isOrderOwnedByPedidos({ orderStatus: "processing", paymentStatus: "rejected" })).toBe(false);
  });
});
