# W6.05G-K3 Backend Canonical Stock Backorder Orders

## Resumen ejecutivo

Se implementó en backend la resolución canónica del producto para pedidos de tienda por cantidad, junto con el cálculo de stock disponible y backorder antes de crear el pedido. La tienda sigue aceptando pedidos aunque no exista stock suficiente, pero ahora el servidor decide la semántica real del fulfillment.

## Contrato actual

### Antes

- `POST /api/orders` aceptaba `items[].productType`, `items[].quantity` y `items[].unitPrice`.
- El backend resolvía producto por `id` o `name`.
- La sincronización a operaciones usaba `productType` como `productCode`.
- No existía un cálculo canónico de stock/backorder en servidor.

### Ahora

- `POST /api/orders` resuelve el producto por `Product.id -> ProductOperationalMapping -> productCode`.
- El servidor calcula `availableStock`, `stockCoveredQty`, `backorderQty` y `fulfillmentMode`.
- La respuesta devuelve `fulfillmentSummary` sin romper el contrato anterior.
- El frontend puede ignorar los campos nuevos si no los necesita.

## Resolución canónica

La ruta de pedido ahora usa este camino:

1. Buscar `Product` activo por `id` o, como compatibilidad limitada, por `name`.
2. Exigir `operationalMapping` publicado.
3. Exigir `productCode` canónico.
4. Exigir `finishedGoodId` y `finishedGood` activos.
5. Rechazar el pedido si el producto no tiene configuración operativa válida.

Esto evita el fallback duro a `PRP-FG-STICKER` y mantiene la separación entre producto personal y producto empresarial.

## Cálculo de stock y backorder

El backend calcula para cada línea:

- `requestedQty`
- `availableStock`
- `stockCoveredQty = min(quantity, availableStock)`
- `backorderQty = max(quantity - availableStock, 0)`
- `fulfillmentMode`
  - `stock`
  - `partial_backorder`
  - `production_backorder`
- `productionEstimateDays = 14`
- `customerMessage`

Reglas aplicadas:

- Si `quantity <= availableStock`, el modo es `stock`.
- Si `quantity > availableStock` y `availableStock > 0`, el modo es `partial_backorder`.
- Si `availableStock = 0`, el modo es `production_backorder`.

## Dónde quedó la lógica

### Archivos tocados

- [`app/api/orders/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/orders/route.ts)
- [`lib/orders/store-order-fulfillment.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/lib/orders/store-order-fulfillment.ts)

### Helpers nuevos

- `resolveStoreProductForOrder`
- `calculateStoreOrderFulfillment`
- `buildStoreOrderInternalNote`

## Qué se guarda sin migración

Se usó un campo ya existente y seguro:

- `Order.adminReviewNotes`

Ahí se guarda una nota interna no destructiva con:

- stock disponible
- cantidad solicitada
- backorder
- tiempo estimado

No se tocó `shippingNotes`, para no mezclar metadata operativa con dirección/envío.

## Response del endpoint

`POST /api/orders` ahora puede devolver:

- `order`
- `fulfillmentSummary`
- `operationsSyncWarning`

`fulfillmentSummary` incluye:

- `hasBackorder`
- `productionEstimateDays`
- `items[]`

Cada item incluye:

- `productId`
- `productCode`
- `quantity`
- `availableStock`
- `stockCoveredQty`
- `backorderQty`
- `fulfillmentMode`
- `productionEstimateDays`
- `customerMessage`

## Impacto en operaciones

La sincronización a Operaciones ahora recibe:

- `productCode` canónico
- `productName` canónico
- `quantity` real
- `finishedGoodId`
- nota con resumen de fulfillment

No se reserva stock.
No se crea producción automática.
No se crean unidades.

## Cómo se evita el fallback incorrecto

- No se usa el nombre como fuente principal de identidad.
- Si no existe mapping operativo publicado y coherente, el pedido se rechaza.
- No se cae silenciosamente al producto normal.

## Qué no se tocó

- no se modificó `schema.prisma`;
- no se hicieron migraciones;
- no se tocó la BD;
- no se tocaron pagos Stripe;
- no se tocaron comprobantes;
- no se tocó `/dashboard/compras`;
- no se tocó `Mis pedidos`;
- no se reservaron unidades;
- no se despachó;
- no se entregó;
- no se activaron chips;
- no se crearon pedidos reales desde scripts.

## Validaciones

- `git status --short`
- `git diff`
- `git diff --check`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`

## Pendientes K4

- Reflejar `fulfillmentSummary` en la UX de pedido y comprobante.
- Mostrar mensaje de backorder y producción estimada de forma más visible en `Mis pedidos`.
- Si se decide persistir metadata más rica, evaluar un campo dedicado en una fase futura.

## Conclusión

K3 deja el backend listo para tienda por cantidad con semántica real de stock/backorder, sin migraciones ni reservas. El cálculo ahora vive en servidor y la operación recibe el código canónico correcto.
