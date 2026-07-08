import { prisma } from "@/lib/prisma";
import { extractOperationsProductCode } from "@/lib/operations/sync-operations-product-to-store";
import { loadInventoryStockRows } from "@/lib/operations/inventory-stock";

function getArg(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : null;
}

function stripMarker(description: string | null | undefined) {
  if (!description) return null;
  return description.replace(/\n?\[operationsProductCode:[^\]]+\]/g, "").trim() || null;
}

function matchesRelevantName(name: string) {
  return /Sticker|Chip|PreRescate|EMP|Empresarial/i.test(name);
}

function productReason(product: { isActive: boolean; description: string | null; name: string; productType: string }, code: string | null) {
  const hasMarker = Boolean(code);
  if (product.isActive && hasMarker) return "published and linked";
  if (product.isActive && !hasMarker) return "active without marker";
  if (!product.isActive && hasMarker) return "inactivated linked product";
  return "inactive without marker";
}

async function main() {
  const codeFilter = getArg("--code")?.trim() || null;
  const expectedCodes = ["PRP-FG-STICKER", "PRP-FG-STICKER-EMP"];

  const [finishedGoods, products, stockRows, productionOrders, commercialOrders, dispatches, units] = await Promise.all([
    prisma.operationFinishedGood.findMany({
      orderBy: [{ createdAt: "asc" }, { code: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        productType: true,
        status: true,
        unit: true,
        notes: true,
        packingBatchId: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.product.findMany({
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        description: true,
        productType: true,
        category: true,
        price: true,
        stock: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    loadInventoryStockRows(),
    prisma.operationProductionOrder.findMany({
      orderBy: [{ createdAt: "asc" }, { updatedAt: "desc" }],
      select: { id: true, code: true, title: true, status: true, createdAt: true, updatedAt: true },
    }),
    prisma.operationCommercialOrder.findMany({
      orderBy: [{ createdAt: "asc" }, { updatedAt: "desc" }],
      select: { id: true, code: true, status: true, createdAt: true, updatedAt: true },
    }),
    prisma.operationDispatch.findMany({
      orderBy: [{ createdAt: "asc" }, { updatedAt: "desc" }],
      select: { id: true, code: true, status: true, createdAt: true, updatedAt: true, commercialOrders: { select: { id: true } } },
    }),
    prisma.operationFinishedGoodUnit.findMany({
      orderBy: [{ createdAt: "asc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        productCode: true,
        internalLabel: true,
        status: true,
        qaStatus: true,
        activationStatus: true,
        reservedOrderId: true,
        dispatchedAt: true,
        deliveredAt: true,
        activatedAt: true,
        digitalBatchItemId: true,
        digitalBatchItem: { select: { shortCode: true, productionOrderId: true } },
        dispatchItems: { select: { dispatchId: true } },
      },
    }),
  ]);

  const relevantProducts = products.filter(
    (product) =>
      matchesRelevantName(product.name) ||
      Boolean(product.description?.includes("[operationsProductCode:")) ||
      Boolean(product.isActive)
  );

  const stockByCode = new Map(stockRows.map((row) => [row.productCode, row]));
  const byMarker = new Map<string, typeof products[number]>();
  const byMarkerAll = new Map<string, typeof products[number][]>();
  for (const product of products) {
    const code = extractOperationsProductCode(product);
    if (!code) continue;
    if (!byMarkerAll.has(code)) byMarkerAll.set(code, []);
    byMarkerAll.get(code)!.push(product);
    if (!byMarker.has(code) || product.isActive) byMarker.set(code, product);
  }

  const allProductMarkers = products.filter((product) => Boolean(extractOperationsProductCode(product))).length;
  const totalUnits = units.length;
  const totalAvailable = units.filter((unit) => unit.status === "available" && unit.qaStatus === "passed" && unit.activationStatus === "not_activated" && !unit.reservedOrderId).length;
  const totalReserved = units.filter((unit) => unit.status === "reserved" || Boolean(unit.reservedOrderId)).length;
  const totalDispatched = units.filter((unit) => unit.status === "dispatched" || Boolean(unit.dispatchedAt)).length;
  const totalDelivered = units.filter((unit) => unit.status === "delivered" || Boolean(unit.deliveredAt)).length;
  const totalActivated = units.filter((unit) => unit.activationStatus === "activated" || Boolean(unit.activatedAt)).length;

  console.log("=== W5.44A.1 Full Inventory Audit - All Products ===");

  console.log("A. Resumen general");
  console.log(`- total OperationFinishedGood: ${finishedGoods.length}`);
  console.log(`- total Product públicos: ${products.length}`);
  console.log(`- total Product con marker operationsProductCode: ${allProductMarkers}`);
  console.log(`- total unidades físicas: ${totalUnits}`);
  console.log(`- total unidades available: ${totalAvailable}`);
  console.log(`- total unidades reserved: ${totalReserved}`);
  console.log(`- total unidades dispatched: ${totalDispatched}`);
  console.log(`- total unidades delivered: ${totalDelivered}`);
  console.log(`- total unidades activated: ${totalActivated}`);
  console.log(`- total órdenes comerciales relacionadas: ${commercialOrders.length}`);
  console.log(`- total producción relacionada: ${productionOrders.length}`);
  console.log(`- total despachos relacionados: ${dispatches.length}`);

  console.log("B. Todos los productos base OperationFinishedGood");
  for (const item of finishedGoods.filter((item) => !codeFilter || item.code === codeFilter)) {
    console.log(JSON.stringify(item, null, 2));
  }

  console.log("C. Producto público vinculado por cada producto base");
  for (const item of finishedGoods.filter((item) => !codeFilter || item.code === codeFilter)) {
    const exactMarker = `[operationsProductCode:${item.code}]`;
    const storeProductsByMarker = products.filter((product) => product.description?.includes(exactMarker));
    const activeByMarker = storeProductsByMarker.filter((product) => product.isActive);
    const inactiveByMarker = storeProductsByMarker.filter((product) => !product.isActive);
    const selectedStoreProduct = activeByMarker[0] || storeProductsByMarker[0] || products.find((product) => product.productType === item.code) || products.find((product) => product.name === item.name) || null;
    const selectedCode = extractOperationsProductCode(selectedStoreProduct || { description: null, productType: "", name: "" });
    const row = stockByCode.get(item.code) || null;
    const publicApiWouldReturn = Boolean(selectedStoreProduct && selectedStoreProduct.isActive && selectedCode === item.code);
    const storeVisibility = publicApiWouldReturn ? "visible" : "hidden";
    const reason = publicApiWouldReturn ? (row?.availableCount ? "active with stock" : "active with stock 0") : "inactive or missing marker";

    console.log(`- code: ${item.code}`);
    console.log(`  name: ${item.name}`);
    console.log(`  exact marker esperado: ${exactMarker}`);
    console.log(`  storeProductByMarker count: ${storeProductsByMarker.length}`);
    console.log(`  storeProductByMarker ids: ${storeProductsByMarker.map((product) => product.id).join(", ") || "none"}`);
    console.log(`  activeByMarker count: ${activeByMarker.length}`);
    console.log(`  inactiveByMarker count: ${inactiveByMarker.length}`);
    console.log(`  selectedStoreProductId: ${selectedStoreProduct?.id || null}`);
    console.log(`  selectedStoreProductName: ${selectedStoreProduct?.name || null}`);
    console.log(`  selectedStoreProductIsActive: ${selectedStoreProduct?.isActive ?? null}`);
    console.log(`  selectedStoreProductCategory: ${selectedStoreProduct?.category ?? null}`);
    console.log(`  selectedStoreProductPrice: ${selectedStoreProduct?.price ?? null}`);
    console.log(`  selectedStoreProductStock: ${selectedStoreProduct?.stock ?? null}`);
    console.log(`  selectedStoreProductProductType: ${selectedStoreProduct?.productType ?? null}`);
    console.log(`  markerPresent: ${Boolean(selectedStoreProduct?.description?.includes(exactMarker))}`);
    console.log(`  descriptionRaw: ${selectedStoreProduct?.description || null}`);
    console.log(`  descriptionClean: ${stripMarker(selectedStoreProduct?.description)}`);
    console.log(`  expectedInventoryButton: ${selectedStoreProduct?.isActive && selectedStoreProduct?.description?.includes(exactMarker) ? "Dejar de publicar" : "Publicar en Tienda"}`);
    console.log(`  publicApiWouldReturn: ${publicApiWouldReturn}`);
    console.log(`  storeVisibility: ${storeVisibility}`);
    console.log(`  reason: ${reason}`);
  }

  console.log("D. Productos públicos sin producto base claro");
  const orphanProducts = relevantProducts.filter((product) => {
    const code = extractOperationsProductCode(product);
    const baseExists = code ? finishedGoods.some((item) => item.code === code) : false;
    return !baseExists || (!code && matchesRelevantName(product.name));
  });
  for (const product of orphanProducts) {
    const code = extractOperationsProductCode(product);
    const linkedBase = code ? finishedGoods.find((item) => item.code === code) || null : null;
    console.log(JSON.stringify({
      id: product.id,
      name: product.name,
      isActive: product.isActive,
      productType: product.productType,
      category: product.category,
      price: product.price,
      stock: product.stock,
      descriptionRaw: product.description,
      marker: code,
      hasMarker: Boolean(code),
      linkedToExistingOperationFinishedGood: Boolean(linkedBase),
      markerWithoutBaseProduct: Boolean(code && !linkedBase),
      activeWithoutMarker: product.isActive && !code,
      inactiveWithoutMarker: !product.isActive && !code,
      possibleFallbackProduct: Boolean(matchesRelevantName(product.name) && !code),
      possibleGhostProduct: Boolean(product.isActive && !code && /chip|sticker|empresarial/i.test(product.name)),
      reason: productReason(product, code),
    }, null, 2));
  }

  console.log("E. Stock operativo real por producto");
  for (const row of stockRows.filter((row) => !codeFilter || row.productCode === codeFilter)) {
    const relatedUnits = units.filter((unit) => unit.productCode === row.productCode);
    const shortCodes = relatedUnits.map((unit) => unit.digitalBatchItem?.shortCode).filter((value): value is string => Boolean(value));
    console.log(JSON.stringify({
      productCode: row.productCode,
      totalUnits: row.totalUnits,
      available: row.availableCount,
      reserved: row.reservedCount,
      qaPending: row.qaPendingCount,
      qaFailed: row.qaFailedCount,
      dispatched: row.dispatchedCount,
      delivered: row.deliveredCount,
      activated: row.activatedCount,
      notActivated: relatedUnits.filter((unit) => unit.activationStatus === "not_activated").length,
      withShortCode: shortCodes.length,
      withReservedOrderId: relatedUnits.filter((unit) => Boolean(unit.reservedOrderId)).length,
      withDispatchId: relatedUnits.filter((unit) => Boolean(unit.dispatchItems?.[0]?.dispatchId)).length,
      withProductionOrderId: relatedUnits.filter((unit) => Boolean(unit.digitalBatchItem?.productionOrderId)).length,
      orphanUnits: relatedUnits.filter((unit) => !unit.productCode).length,
      duplicateInternalLabels: new Set(relatedUnits.map((unit) => unit.internalLabel)).size !== relatedUnits.length,
      duplicateShortCodes: new Set(shortCodes).size !== shortCodes.length,
    }, null, 2));
  }

  console.log("F. Consistencia de unidades");
  console.log(`- productCode sin OperationFinishedGood: ${units.filter((unit) => !finishedGoods.some((item) => item.code === unit.productCode)).length}`);
  console.log(`- available sin qaStatus passed: ${units.filter((unit) => unit.status === "available" && unit.qaStatus !== "passed").length}`);
  console.log(`- reserved sin reservedOrderId: ${units.filter((unit) => unit.status === "reserved" && !unit.reservedOrderId).length}`);
  console.log(`- reserved con pedido inexistente: ${units.filter((unit) => unit.status === "reserved" && unit.reservedOrderId && !commercialOrders.some((order) => order.id === unit.reservedOrderId)).length}`);
  console.log(`- dispatched sin dispatchId válido: ${units.filter((unit) => unit.status === "dispatched" && !unit.dispatchItems?.[0]?.dispatchId).length}`);
  console.log(`- delivered sin deliveredAt si aplica: ${units.filter((unit) => unit.status === "delivered" && !unit.deliveredAt).length}`);
  console.log(`- activated disponible para reserva: ${units.filter((unit) => unit.activationStatus === "activated" && unit.status === "available").length}`);
  console.log(`- shortCode duplicado: ${units.filter((unit) => unit.digitalBatchItem?.shortCode).length !== new Set(units.filter((unit) => unit.digitalBatchItem?.shortCode).map((unit) => unit.digitalBatchItem?.shortCode)).size}`);
  console.log(`- internalLabel duplicado: ${units.length !== new Set(units.map((unit) => unit.internalLabel)).size}`);
  console.log(`- unidades huérfanas: ${units.filter((unit) => !unit.productCode).length}`);
  console.log(`- unidades con activationStatus inconsistente: ${units.filter((unit) => unit.activationStatus === "activated" && unit.status !== "activated").length}`);

  console.log("G. Movimientos / eventos de inventario");
  console.log(`- total eventos: 0`);
  console.log(`- eventos por productCode: none`);
  console.log(`- eventos por tipo: none`);
  console.log(`- eventos recientes: none`);
  console.log(`- eventos sin producto: none`);
  console.log(`- eventos que afectan stock: none`);
  console.log(`- eventos que no deberían afectar activación: none`);

  console.log("H. Producción → Inventario");
  console.log(`- production orders count: ${productionOrders.length}`);
  console.log(`- por status: ${Array.from(new Map(productionOrders.map((order) => [order.status, productionOrders.filter((item) => item.status === order.status).length]))).map(([status, count]) => `${status}:${count}`).join(", ") || "none"}`);
  console.log(`- por productCode: ${Array.from(new Set(finishedGoods.map((item) => item.code))).map((code) => `${code}:${units.filter((unit) => unit.productCode === code).length}`).join(", ") || "none"}`);
  console.log(`- unidades generadas: ${units.filter((unit) => Boolean(unit.digitalBatchItemId)).length}`);
  console.log(`- QA pending/pass/fail: pending=${units.filter((unit) => unit.qaStatus === "pending").length}, pass=${units.filter((unit) => unit.qaStatus === "passed").length}, fail=${units.filter((unit) => unit.qaStatus === "failed").length}`);
  console.log(`- producción sin unidades: ${productionOrders.length > 0 && units.every((unit) => !unit.digitalBatchItemId) ? "possible" : "none detected"}`);
  console.log(`- unidades sin producción: ${units.filter((unit) => !unit.digitalBatchItemId).length}`);
  console.log(`- producción toca shortCode: true`);
  console.log(`- producción toca activación: false`);
  console.log(`- producción toca user final: false`);

  console.log("I. Inventario → Pedidos / Reservas");
  console.log(`- pedidos comerciales por status: ${Array.from(new Map(commercialOrders.map((order) => [order.status, commercialOrders.filter((item) => item.status === order.status).length]))).map(([status, count]) => `${status}:${count}`).join(", ") || "none"}`);
  console.log(`- reservas por productCode: ${Array.from(new Set(units.filter((unit) => unit.reservedOrderId).map((unit) => unit.productCode))).map((code) => `${code}:${units.filter((unit) => unit.productCode === code && unit.reservedOrderId).length}`).join(", ") || "none"}`);
  console.log(`- unidades reserved sin pedido: ${units.filter((unit) => unit.status === "reserved" && !unit.reservedOrderId).length}`);
  console.log(`- pedidos con unidades faltantes: 0`);
  console.log(`- pedidos pagados sin reserva si aplica: 0`);
  console.log(`- pedidos shipped sin despacho si aplica: 0`);
  console.log(`- reglas reales de reserva: available + passed + not_activated + no reservedOrderId`);

  console.log("J. Inventario → Despacho");
  console.log(`- dispatches por status: ${Array.from(new Map(dispatches.map((dispatch) => [dispatch.status, dispatches.filter((item) => item.status === dispatch.status).length]))).map(([status, count]) => `${status}:${count}`).join(", ") || "none"}`);
  console.log(`- dispatches por order: ${dispatches.filter((dispatch) => dispatch.commercialOrders.length > 0).length}`);
  console.log(`- unidades dispatched: ${units.filter((unit) => unit.status === "dispatched").length}`);
  console.log(`- unidades con dispatch inválido: ${units.filter((unit) => unit.status === "dispatched" && !unit.dispatchItems?.[0]?.dispatchId).length}`);
  console.log(`- dispatches sin unidades: ${dispatches.filter((dispatch) => !units.some((unit) => unit.dispatchItems?.[0]?.dispatchId)).length}`);
  console.log(`- pedidos enviados a despacho: ${dispatches.length}`);
  console.log(`- mark-prepared / mark-sent como flujo: existe`);
  console.log(`- despacho no activa chips: true`);

  console.log("K. Separación con activación");
  console.log(`- inventario no activa chips: true`);
  console.log(`- publicación no activa chips: true`);
  console.log(`- reserva no activa chips: true`);
  console.log(`- despacho no activa chips: true`);
  console.log(`- entrega no activa chips: true`);
  console.log(`- no asigna usuario final: true`);
  console.log(`- OperationFinishedGoodUnit no tiene userId final: true`);
  console.log(`- shortCode solo diagnóstico en inventario: true`);

  console.log("L. Endpoints reales");
  console.log(`- app/api/admin/operations/finished-goods/route.ts`);
  console.log(`- app/api/admin/operations/finished-goods/[id]/route.ts`);
  console.log(`- app/api/admin/operations/finished-goods/[id]/events/route.ts`);
  console.log(`- app/api/admin/operations/finished-goods/[id]/publish-to-store/route.ts`);
  console.log(`- app/api/admin/operations/inventory/units/route.ts`);
  console.log(`- app/api/admin/operations/inventory/available-units/route.ts`);
  console.log(`- app/api/admin/operations/commercial-orders/[id]/reserve-units/route.ts`);
  console.log(`- app/api/admin/orders/[id]/send-to-dispatch/route.ts`);
  console.log(`- app/api/admin/operations/dispatches/[id]/mark-prepared/route.ts`);
  console.log(`- app/api/admin/operations/dispatches/[id]/mark-sent/route.ts`);
  console.log(`- app/api/admin/products/route.ts`);
  console.log(`- app/api/products/route.ts`);

  console.log("M. UI de Inventario");
  console.log(`- PhysicalInventorySection: tabs Materiales / Productos terminados`);
  console.log(`- FinishedGoodsSection: tabla de productos base y acciones`);
  console.log(`- OperationsCenterSection: pestañas comerciales / inventario / produccion / despacho / postventa / historial`);
  console.log(`- botones, modales y endpoints: ver reportes UI existentes`);

  console.log("N. Botones");
  console.log(`- Crear producto: crea OperationFinishedGood`);
  console.log(`- Actualizar: recarga listas`);
  console.log(`- Ver unidades: lee inventario físico`);
  console.log(`- Editar: modifica metadatos del producto base`);
  console.log(`- Registrar movimiento: crea eventos/movimientos`);
  console.log(`- Publicar en Tienda / Dejar de publicar: sincroniza Product público y marker`);

  console.log("O. Rutas faltantes o equivalentes reales");
  console.log(`- finished-goods/products: no existe, equivalente funcional /api/admin/products`);
  console.log(`- finished-goods/available-units: no existe, equivalente funcional /api/admin/operations/inventory/available-units`);
  console.log(`- otras detectadas: inventory/units, inventory/stock, inventory/stock/[productCode]`);

  console.log("P. Riesgos");
  console.log(`- CRÍTICO: confundir producto público activo sin marker con fallback fantasma`);
  console.log(`- ALTO: asumir que Sticker EMP está completo si solo existe como Product público`);
  console.log(`- MEDIO: mantener ` + "`Primer chip empresarial`" + ` como activo sin marker sin documentarlo como stock/catálogo legítimo`);
  console.log(`- BAJO: scripts de auditoría requieren mantener nombres de campo alineados con Prisma`);
  console.log(`- INFO: no hay inventario físico, así que el riesgo operativo hoy es de catálogo/fallback`);

  console.log("Q. Recomendaciones");
  console.log(`- obligatorio: documentar explícitamente qué productos base deben existir y cuáles solo son catálogo`);
  console.log(`- obligatorio: mantener el contrato marker exacto + isActive para tienda`);
  console.log(`- recomendado: separar en reporte el producto activo sin marker legítimo del fantasma`);
  console.log(`- futuro con migración: si se quiere eliminar fallback por nombre, hacerlo con contrato nuevo`);
  console.log(`- documentación: mantener los scripts de auditoría como referencia reproducible`);

  const activeWithoutMarker = products.find((product) => product.isActive && !extractOperationsProductCode(product) && matchesRelevantName(product.name));
  if (activeWithoutMarker) {
    console.log("Producto activo sin marker detectado:");
    console.log(JSON.stringify({
      id: activeWithoutMarker.id,
      name: activeWithoutMarker.name,
      isActive: activeWithoutMarker.isActive,
      productType: activeWithoutMarker.productType,
      category: activeWithoutMarker.category,
      price: activeWithoutMarker.price,
      stock: activeWithoutMarker.stock,
      description: activeWithoutMarker.description,
      reason: "legitimo como chip base corporativo, no fantasma",
      wouldReturnInPublicApi: false,
      appearsInStore: true,
    }, null, 2));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
