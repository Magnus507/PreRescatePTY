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

function productionCode(orderNumber) {
  return `PROD-${orderNumber.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 68)}`;
}

async function createBaseOrder(suffix) {
  const order = await prisma.order.create({
    data: {
      amount: 25,
      paymentStatus: "paid",
      provider: "manual",
      orderNumber: `B4-CANCEL-${suffix}`,
      orderStatus: "processing",
      paymentMethod: "manual",
      adminReviewStatus: "approved",
      customerName: "Cliente B4 Cancelación",
      customerEmail: "b4-cancel@example.test",
      customerPhone: "60000001",
      shippingAddress: "Dirección E2E cancelación",
      shippingCity: "Panamá",
      items: {
        create: {
          productType: "Sticker PreRescatePTY",
          productName: "Sticker PreRescatePTY",
          productCode: "PRP-FG-STICKER",
          operationalProductCode: "PRP-FG-STICKER",
          operationalProductName: "Sticker PreRescatePTY",
          quantity: 1,
          unitPrice: 25,
          totalPrice: 25,
        },
      },
    },
  });

  const commercialOrder = await prisma.operationCommercialOrder.create({
    data: {
      code: `B4-COM-${suffix}`,
      sourceType: "checkout",
      sourceId: order.id,
      status: "accepted",
      customerType: "customer",
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      salesChannel: "web",
      paymentStatus: "paid",
      fulfillmentStatus: "requested",
      totalAmount: 25,
      currency: "USD",
      items: {
        create: {
          productCode: "PRP-FG-STICKER",
          productName: "Sticker PreRescatePTY",
          quantity: 1,
          unitPrice: 25,
          totalPrice: 25,
          unit: "unit",
        },
      },
    },
  });

  return { order, commercialOrder };
}

async function cancelFromPedidos(page, orderNumber, reason) {
  await page.goto("/admin?tab=inventory&op=commercial");
  const card = page.locator("article").filter({ hasText: orderNumber }).first();
  await expect(card).toBeVisible({ timeout: 20_000 });

  await card.getByRole("button", { name: /Cancelar \/ ocultar/i }).first().click();

  const modal = page.getByText("Cancelar / ocultar pedido").locator("..").locator("..");
  await expect(page.getByText("Cancelar / ocultar pedido").last()).toBeVisible();
  await page.getByPlaceholder(/Explica por qué se cancela u oculta/i).fill(reason);
  await page.getByPlaceholder(/Escribe ELIMINAR para confirmar/i).fill("ELIMINAR");
  await page.getByRole("button", { name: /^Confirmar$/i }).click();

  await expect(card).toBeHidden({ timeout: 20_000 });
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test.describe("Block 4 customer cancellation browser evidence", () => {
  test("cancellation before production cancels unstarted work and blocks stale preparation", async ({ page }, testInfo) => {
    const suffix = `PRE-${testInfo.project.name.replace(/[^a-z0-9]+/gi, "-")}-${Date.now()}`;
    const { order, commercialOrder } = await createBaseOrder(suffix);

    const production = await prisma.operationProductionOrder.create({
      data: {
        code: productionCode(order.orderNumber),
        title: "Backorder E2E todavía no iniciado",
        status: "planned",
        plannedQuantity: 1,
        producedQuantity: 0,
        outputType: "PRP-FG-STICKER",
        events: {
          create: {
            eventType: "CREATED",
            quantity: 1,
            reason: "Backorder de pedido cliente",
            metadataJson: JSON.stringify({
              sourceType: "customer_order",
              orderId: order.id,
              orderNumber: order.orderNumber,
              commercialOrderId: commercialOrder.id,
              productCode: "PRP-FG-STICKER",
            }),
          },
        },
      },
    });

    await loginAsAdmin(page);
    await cancelFromPedidos(page, order.orderNumber, "E2E cancelación antes de producción");

    const state = await prisma.$transaction(async (tx) => ({
      order: await tx.order.findUnique({ where: { id: order.id } }),
      commercial: await tx.operationCommercialOrder.findUnique({ where: { id: commercialOrder.id } }),
      production: await tx.operationProductionOrder.findUnique({ where: { id: production.id } }),
      productionCancelEvents: await tx.operationProductionEvent.count({
        where: { productionOrderId: production.id, eventType: "CANCELLED" },
      }),
    }));

    expect(state.order).toMatchObject({ orderStatus: "cancelled", paymentStatus: "cancelled" });
    expect(state.commercial).toMatchObject({ status: "cancelled", fulfillmentStatus: "pending" });
    expect(state.production).toMatchObject({ status: "cancelled", producedQuantity: 0 });
    expect(state.productionCancelEvents).toBe(1);

    const stalePreparation = await page.evaluate(async (productionId) => {
      const response = await fetch(
        `/api/admin/operations/production-orders/${productionId}/prepare-digital-items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity: 1 }),
        }
      );
      return { status: response.status, body: await response.json().catch(() => ({})) };
    }, production.id);

    expect(stalePreparation.status).toBe(409);
    expect(String(stalePreparation.body?.error || "")).toMatch(/cancelada|completada|preparaciones/i);
    expect(
      await prisma.operationDigitalBatchItem.count({ where: { productionOrderId: production.id } })
    ).toBe(0);

    await page.screenshot({
      path: testInfo.outputPath("pre-production-cancellation-pass.png"),
      fullPage: true,
    });
  });

  test("PHY-13 keeps already-produced QA-passed output valid and reusable after customer cancellation", async ({ page }, testInfo) => {
    const suffix = `PHY13-${testInfo.project.name.replace(/[^a-z0-9]+/gi, "-")}-${Date.now()}`;
    const { order, commercialOrder } = await createBaseOrder(suffix);

    const production = await prisma.operationProductionOrder.create({
      data: {
        code: productionCode(order.orderNumber),
        title: "PHY-13 producción ya iniciada",
        status: "started",
        plannedQuantity: 1,
        producedQuantity: 1,
        outputType: "PRP-FG-STICKER",
        events: {
          create: {
            eventType: "CREATED",
            quantity: 1,
            reason: "Producción cliente ya iniciada",
            metadataJson: JSON.stringify({
              sourceType: "customer_order",
              orderId: order.id,
              orderNumber: order.orderNumber,
              commercialOrderId: commercialOrder.id,
              productCode: "PRP-FG-STICKER",
            }),
          },
        },
      },
    });

    const batch = await prisma.operationDigitalBatch.create({
      data: {
        code: `B4-BATCH-${suffix}`,
        name: "PHY-13 produced batch",
        productType: "sticker_nfc_qr",
        finishedGoodCode: "PRP-FG-STICKER",
        prefix: `PHY13-${Date.now()}`,
        startNumber: 1,
        endNumber: 1,
        quantity: 1,
        status: "generated",
      },
    });

    const digitalItem = await prisma.operationDigitalBatchItem.create({
      data: {
        batchId: batch.id,
        productionOrderId: production.id,
        internalLabel: `PHY13-DIGITAL-${suffix}`,
        sequenceNumber: 1,
        qrUrl: "",
        status: "assembled",
        nfcProgrammed: true,
        qrPrepared: true,
        preparedAt: new Date(),
      },
    });

    const unit = await prisma.operationFinishedGoodUnit.create({
      data: {
        internalLabel: `PHY13-UNIT-${suffix}`,
        productCode: "PRP-FG-STICKER",
        productName: "Sticker PreRescatePTY",
        productType: "sticker_nfc_qr",
        digitalBatchId: batch.id,
        digitalBatchItemId: digitalItem.id,
        status: "available",
        qaStatus: "passed",
        activationStatus: "not_activated",
      },
    });

    await loginAsAdmin(page);
    await cancelFromPedidos(page, order.orderNumber, "PHY-13 cliente cancela después de producir");

    const state = await prisma.$transaction(async (tx) => ({
      order: await tx.order.findUnique({ where: { id: order.id } }),
      commercial: await tx.operationCommercialOrder.findUnique({ where: { id: commercialOrder.id } }),
      production: await tx.operationProductionOrder.findUnique({ where: { id: production.id } }),
      unit: await tx.operationFinishedGoodUnit.findUnique({ where: { id: unit.id } }),
      productionCancelEvents: await tx.operationProductionEvent.count({
        where: { productionOrderId: production.id, eventType: "CANCELLED" },
      }),
      commercialCancelEvents: await tx.operationCommercialOrderEvent.count({
        where: { commercialOrderId: commercialOrder.id, eventType: "CANCELLED" },
      }),
    }));

    expect(state.order).toMatchObject({ orderStatus: "cancelled", paymentStatus: "cancelled" });
    expect(state.commercial).toMatchObject({ status: "cancelled", fulfillmentStatus: "pending" });
    expect(state.production).toMatchObject({ status: "started", producedQuantity: 1 });
    expect(state.unit).toMatchObject({
      status: "available",
      qaStatus: "passed",
      activationStatus: "not_activated",
      reservedOrderId: null,
      dispatchedAt: null,
      deliveredAt: null,
      activatedAt: null,
    });
    expect(state.productionCancelEvents).toBe(0);
    expect(state.commercialCancelEvents).toBe(1);

    await page.screenshot({
      path: testInfo.outputPath("phy13-produced-output-remains-reusable.png"),
      fullPage: true,
    });
  });
});
