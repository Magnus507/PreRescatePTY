import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const E2E_ADMIN_EMAIL = "block4-e2e-admin@example.test";
const E2E_ADMIN_PASSWORD = "Block4-E2E-Only-Password-2026!";

async function dismissCookieConsent(page) {
  const consent = page.getByRole("region", { name: /Consentimiento de cookies/i });
  if (await consent.isVisible().catch(() => false)) {
    await consent.getByRole("button", { name: /Solo necesarias/i }).click();
    await expect(consent).toBeHidden();
  }
}

async function loginAsAdmin(page) {
  await page.goto("/login");
  await dismissCookieConsent(page);
  await expect(page.locator("form")).toHaveAttribute("data-hydrated", "true");
  await page.getByLabel(/Correo electrónico/i).fill(E2E_ADMIN_EMAIL);
  await page.getByLabel(/Contraseña/i).fill(E2E_ADMIN_PASSWORD);
  await page.getByRole("button", { name: /Iniciar sesión seguro/i }).click();
  await page.waitForURL(/\/admin(?:$|\?)/, { timeout: 45_000 });
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

async function createPreparedCustomerDispatch(projectName) {
  const suffix = `${projectName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${Date.now()}`;

  const finishedGood = await prisma.operationFinishedGood.create({
    data: {
      code: `PHY11-FG-${suffix}`,
      name: "PHY-11/12 Producto E2E",
      productType: "sticker_nfc_qr",
      status: "active",
      unit: "unit",
    },
  });

  const order = await prisma.order.create({
    data: {
      amount: 25,
      paymentStatus: "paid",
      provider: "manual",
      orderNumber: `PHY11-ORD-${suffix}`,
      orderStatus: "processing",
      paymentMethod: "manual",
      adminReviewStatus: "approved",
      customerName: "Cliente PHY 11",
      customerEmail: "phy11@example.test",
      customerPhone: "60000000",
      shippingAddress: "Dirección de prueba PHY 11",
      shippingCity: "Panamá",
    },
  });

  const unit = await prisma.operationFinishedGoodUnit.create({
    data: {
      internalLabel: `PHY11-UNIT-${suffix}`,
      productCode: finishedGood.code,
      productName: finishedGood.name,
      productType: finishedGood.productType,
      status: "reserved",
      qaStatus: "passed",
      activationStatus: "not_activated",
      reservedOrderId: order.id,
      reservedAt: new Date(),
    },
  });

  const dispatch = await prisma.operationDispatch.create({
    data: {
      code: `PHY11-DSP-${suffix}`,
      status: "prepared",
      destinationType: "customer",
      destinationName: order.customerName,
      destinationReference: order.orderNumber,
      destinationAddress: order.shippingAddress,
      items: {
        create: {
          finishedGoodId: finishedGood.id,
          unitId: unit.id,
          internalLabel: unit.internalLabel,
          productCode: unit.productCode,
          productName: unit.productName,
          quantity: 1,
          unit: "unit",
          status: "packed",
          pickedAt: new Date(),
          packedAt: new Date(),
        },
      },
      events: {
        create: {
          eventType: "PACKED",
          reason: "Fixture E2E preparada para PHY-11/12",
          referenceType: "order",
          referenceId: order.id,
          metadataJson: JSON.stringify({
            customerOrderId: order.id,
            orderCode: order.orderNumber,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            customerPhone: order.customerPhone,
            shippingCity: order.shippingCity,
            shippingAddress: order.shippingAddress,
          }),
        },
      },
    },
  });

  const commercialOrder = await prisma.operationCommercialOrder.create({
    data: {
      code: `PHY11-COM-${suffix}`,
      sourceType: "checkout",
      sourceId: order.id,
      status: "processing",
      customerType: "customer",
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      salesChannel: "web",
      paymentStatus: "paid",
      fulfillmentStatus: "ready_for_dispatch",
      totalAmount: 25,
      currency: "USD",
      dispatchId: dispatch.id,
    },
  });

  return { finishedGood, order, unit, dispatch, commercialOrder };
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test.describe("Block 4 PHY-11 / PHY-12 browser evidence", () => {
  test("cancel dispatch from UI returns reserved unit and stale send is rejected without corruption", async ({ page }, testInfo) => {
    const fixture = await createPreparedCustomerDispatch(testInfo.project.name);

    await loginAsAdmin(page);
    await page.goto("/admin?tab=inventory&op=dispatch");

    const dispatchCard = page.locator("article").filter({ hasText: fixture.dispatch.code });
    await expect(dispatchCard).toBeVisible();
    await expect(dispatchCard.getByText(fixture.unit.internalLabel)).toBeVisible();
    await expect(dispatchCard.getByRole("button", { name: /Enviado/i })).toBeVisible();
    await expect(dispatchCard.getByRole("button", { name: /Cancelar/i })).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath("phy11-before-cancel.png"),
      fullPage: true,
    });

    page.once("dialog", async (dialog) => {
      expect(dialog.type()).toBe("confirm");
      expect(dialog.message()).toContain(fixture.dispatch.code);
      await dialog.accept();
    });
    await dispatchCard.getByRole("button", { name: /Cancelar/i }).click();

    await expect(dispatchCard).toBeHidden({ timeout: 20_000 });

    const afterCancel = await prisma.$transaction(async (tx) => {
      const [dispatch, unit, commercialOrder, order, dispatchItems, cancelledEvent] = await Promise.all([
        tx.operationDispatch.findUnique({ where: { id: fixture.dispatch.id } }),
        tx.operationFinishedGoodUnit.findUnique({ where: { id: fixture.unit.id } }),
        tx.operationCommercialOrder.findUnique({ where: { id: fixture.commercialOrder.id } }),
        tx.order.findUnique({ where: { id: fixture.order.id } }),
        tx.operationDispatchItem.findMany({ where: { dispatchId: fixture.dispatch.id } }),
        tx.operationDispatchEvent.findFirst({
          where: { dispatchId: fixture.dispatch.id, eventType: "CANCELLED" },
          orderBy: { createdAt: "desc" },
        }),
      ]);
      return { dispatch, unit, commercialOrder, order, dispatchItems, cancelledEvent };
    });

    expect(afterCancel.dispatch?.status).toBe("cancelled");
    expect(afterCancel.dispatch?.deliveredAt).toBeNull();
    expect(afterCancel.unit?.status).toBe("available");
    expect(afterCancel.unit?.reservedOrderId).toBeNull();
    expect(afterCancel.unit?.reservedAt).toBeNull();
    expect(afterCancel.unit?.dispatchedAt).toBeNull();
    expect(afterCancel.unit?.deliveredAt).toBeNull();
    expect(afterCancel.unit?.activationStatus).toBe("not_activated");
    expect(afterCancel.dispatchItems).toHaveLength(1);
    expect(afterCancel.dispatchItems[0]?.status).toBe("cancelled");
    expect(afterCancel.dispatchItems[0]?.unitId).toBeNull();
    expect(afterCancel.commercialOrder?.dispatchId).toBeNull();
    expect(afterCancel.commercialOrder?.status).toBe("accepted");
    expect(afterCancel.commercialOrder?.fulfillmentStatus).toBe("pending");
    expect(afterCancel.order?.orderStatus).toBe("processing");
    expect(afterCancel.cancelledEvent).not.toBeNull();

    await page.screenshot({
      path: testInfo.outputPath("phy11-after-cancel.png"),
      fullPage: true,
    });

    // PHY-12 adversarial replay: the UI correctly removes the cancelled dispatch,
    // so replay the stale "send" action from the same authenticated browser
    // context. The server must reject it and preserve the cancelled/released state.
    const staleSend = await page.evaluate(async (dispatchId) => {
      const response = await fetch(`/api/admin/operations/dispatches/${dispatchId}/mark-sent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carrierName: "E2E stale replay" }),
      });
      return {
        status: response.status,
        body: await response.json().catch(() => ({})),
      };
    }, fixture.dispatch.id);

    expect(staleSend.status).toBe(409);
    expect(String(staleSend.body?.error || "")).toMatch(/preparado|cancelado|enviado/i);

    const afterReplay = await prisma.$transaction(async (tx) => {
      const [dispatch, unit, commercialOrder, order, dispatchedEvents] = await Promise.all([
        tx.operationDispatch.findUnique({ where: { id: fixture.dispatch.id } }),
        tx.operationFinishedGoodUnit.findUnique({ where: { id: fixture.unit.id } }),
        tx.operationCommercialOrder.findUnique({ where: { id: fixture.commercialOrder.id } }),
        tx.order.findUnique({ where: { id: fixture.order.id } }),
        tx.operationDispatchEvent.count({
          where: { dispatchId: fixture.dispatch.id, eventType: "DISPATCHED" },
        }),
      ]);
      return { dispatch, unit, commercialOrder, order, dispatchedEvents };
    });

    expect(afterReplay.dispatch?.status).toBe("cancelled");
    expect(afterReplay.dispatch?.sentAt).toBeNull();
    expect(afterReplay.dispatch?.deliveredAt).toBeNull();
    expect(afterReplay.unit?.status).toBe("available");
    expect(afterReplay.unit?.reservedOrderId).toBeNull();
    expect(afterReplay.unit?.dispatchedAt).toBeNull();
    expect(afterReplay.commercialOrder?.dispatchId).toBeNull();
    expect(afterReplay.order?.orderStatus).toBe("processing");
    expect(afterReplay.dispatchedEvents).toBe(0);
  });
});
