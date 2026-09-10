import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

// Fixture creation is allowed only in the disposable browser-test database.
const database = new URL(process.env.DATABASE_URL || "postgresql://invalid/invalid");
if (!["localhost", "127.0.0.1", "[::1]"].includes(database.hostname) || !/(?:_e2e|_ci|test)$/.test(database.pathname)) {
  throw new Error("Block 4 backorder fixtures require an isolated localhost test database");
}
const prisma = new PrismaClient();

async function login(page) {
  await page.goto("/login");
  const consent = page.getByRole("region", { name: /Consentimiento de cookies/i });
  if (await consent.isVisible().catch(() => false)) {
    await consent.getByRole("button", { name: /Solo necesarias/i }).click();
    await expect(consent).toBeHidden();
  }
  await expect(page.locator("form")).toHaveAttribute("data-hydrated", "true");
  await page.getByLabel(/Correo electrónico/i).fill("block4-e2e-admin@example.test");
  await page.getByLabel(/Contraseña/i).fill("Block4-E2E-Only-Password-2026!");
  await page.getByRole("button", { name: /Iniciar sesión seguro/i }).click();
  await page.waitForURL(/\/admin(?:$|\?)/, { timeout: 45_000 });
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

async function fixture(projectName, cancelledHistory) {
  const suffix = `${projectName}-${Date.now()}-${cancelledHistory ? "recovery" : "new"}`;
  const sku = `PHY13-${suffix}`;
  const order = await prisma.order.create({ data: {
    amount: 25, orderNumber: `PHY13-ORD-${suffix}`, provider: "manual",
    paymentStatus: "paid", orderStatus: "processing", customerName: "Synthetic backorder customer",
  } });
  const commercial = await prisma.operationCommercialOrder.create({ data: {
    code: `PHY13-COM-${suffix}`, sourceType: "checkout", sourceId: order.id,
    status: "accepted", customerType: "customer", paymentStatus: "paid",
    fulfillmentStatus: "pending", totalAmount: 25, currency: "USD",
    items: { create: { productCode: sku, productName: "PHY-13 five-unit order", quantity: 5, unitPrice: 5, totalPrice: 25, unit: "unit" } },
  } });
  const reserved = [];
  for (let index = 0; index < 2; index += 1) {
    reserved.push(await prisma.operationFinishedGoodUnit.create({ data: {
      internalLabel: `PHY13-R${index}-${suffix}`, productCode: sku, productName: "PHY-13 fixture",
      productType: sku, status: "reserved", qaStatus: "passed", activationStatus: "not_activated",
      reservedOrderId: order.id, reservedAt: new Date(),
    } }));
  }
  const available = await prisma.operationFinishedGoodUnit.create({ data: {
    internalLabel: `PHY13-A-${suffix}`, productCode: sku, productName: "PHY-13 fixture",
    productType: sku, status: "available", qaStatus: "passed", activationStatus: "not_activated",
  } });
  const marker = `W605H-B-BACKORDER-PRODUCTION:${commercial.id}:${sku}`;
  const cancelled = cancelledHistory ? await prisma.operationProductionOrder.create({ data: {
    code: `PHY14-CANCELLED-${suffix}`, title: "Previously cancelled synthetic backorder",
    status: "cancelled", plannedQuantity: 2, producedQuantity: 0, outputType: sku, notes: marker,
  } }) : null;
  return { order, commercial, sku, available, reserved, marker, cancelled };
}

test.afterAll(async () => prisma.$disconnect());

for (const cancelledHistory of [false, true]) {
  test(`PHY-13/14: reserve 1, produce 2, retries preserve allocation${cancelledHistory ? " after cancelled production" : ""}`, async ({ page }, testInfo) => {
    const data = await fixture(testInfo.project.name, cancelledHistory);
    const endpoint = `/api/admin/operations/commercial-orders/${data.commercial.id}/send-to-production`;

    const denied = await page.request.post(endpoint, { data: { mode: "backorder" } });
    expect(denied.status()).toBe(401);
    await login(page);

    // There is no manual backorder button in the current UI. Exercise the real
    // HTTP route with the session obtained from UI login, then verify its UI
    // projection. This does not claim a button click or a full-sale E2E.
    const first = await page.request.post(endpoint, { data: { mode: "backorder" } });
    expect(first.status(), await first.text()).toBe(201);
    const created = await first.json();
    expect(created.products).toEqual([expect.objectContaining({ productCode: data.sku, plannedQuantity: 2, backorderQty: 2 })]);
    expect(created.created).toBe(true);
    if (data.cancelled) expect(created.productionOrder.id).not.toBe(data.cancelled.id);

    const retries = await Promise.all([
      page.request.post(endpoint, { data: { mode: "backorder" } }),
      page.request.post(endpoint, { data: { mode: "backorder" } }),
    ]);
    for (const response of retries) {
      expect(response.status(), await response.text()).toBe(200);
      const repeated = await response.json();
      expect(repeated.created).toBe(false);
      expect(repeated.productionOrder.id).toBe(created.productionOrder.id);
    }

    const units = await prisma.operationFinishedGoodUnit.findMany({ where: { productCode: data.sku }, orderBy: { id: "asc" } });
    expect(units).toHaveLength(3);
    expect(units.map(unit => unit.id).sort()).toEqual([...data.reserved.map(unit => unit.id), data.available.id].sort());
    expect(units.every(unit => unit.status === "reserved" && unit.reservedOrderId === data.order.id && unit.activationStatus === "not_activated")).toBe(true);
    const productions = await prisma.operationProductionOrder.findMany({ where: { notes: { contains: data.marker } } });
    expect(productions).toHaveLength(cancelledHistory ? 2 : 1);
    const active = productions.filter(order => order.status !== "cancelled");
    expect(active).toHaveLength(1);
    expect(active[0]).toMatchObject({ id: created.productionOrder.id, plannedQuantity: 2, producedQuantity: 0 });
    if (data.cancelled) expect(productions.find(order => order.id === data.cancelled.id)?.status).toBe("cancelled");
    expect(await prisma.operationCommercialOrderEvent.count({ where: { commercialOrderId: data.commercial.id, eventType: "FULFILLMENT_REQUESTED" } })).toBe(1);

    await page.goto("/admin?tab=inventory&op=production");
    const productionRow = page.getByRole("button").filter({ hasText: created.productionOrder.code });
    await expect(productionRow).toBeVisible();
    await expect(productionRow).toContainText("0/2");
    if (data.cancelled) await expect(page.getByRole("button").filter({ hasText: data.cancelled.code })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("phy13-14-production.png"), fullPage: true });
    await testInfo.attach("phy13-14-evidence", { contentType: "application/json", body: Buffer.from(JSON.stringify({
      project: testInfo.project.name, demand: 5, initiallyReserved: 2, newlyReserved: 1,
      finalReserved: units.length, activeProductionCount: active.length,
      plannedQuantity: active[0].plannedQuantity, concurrentRetries: 2,
      cancelledHistory, realUiLogin: true, mutationSurface: "authenticated HTTP", productionVisible: true,
    }, null, 2)) });
  });
}
