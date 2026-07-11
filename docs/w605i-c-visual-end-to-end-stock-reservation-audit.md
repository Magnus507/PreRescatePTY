# W6.05I-C Visual End-to-End Stock Reservation Audit

## Resumen ejecutivo

Se revisó en modo read-only el flujo visual y funcional de reserva/liberación de stock en admin después de W6.05I-B. La implementación está bien encaminada: el panel muestra reserva, faltante y acciones separadas, y los endpoints usan la estructura operativa existente sin tocar BD ni inventario físico fuera de la reserva.

Hallazgo principal:

- la UX quedó entendible y estable;
- la reserva no compite visualmente con producción por faltante;
- `inventory-stock` sigue separando stock disponible por `productCode`;
- pero el endpoint `reserve-stock` aún no expone de forma explícita un cálculo separado de `availableQty` y `targetReservationQty` como variables de contrato;
- además, la validación de unidades candidatas no filtra de forma explícita `dispatchId = null`, aunque en la práctica el filtro de disponibilidad ya reduce el riesgo.

## Alcance auditado

### Archivos revisados

- [`app/api/admin/operations/commercial-orders/[id]/reserve-stock/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/admin/operations/commercial-orders/[id]/reserve-stock/route.ts)
- [`app/api/admin/operations/commercial-orders/[id]/release-reservation/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/admin/operations/commercial-orders/[id]/release-reservation/route.ts)
- [`app/api/admin/operations/commercial-orders/[id]/send-to-production/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/admin/operations/commercial-orders/[id]/send-to-production/route.ts)
- [`app/api/admin/operations/commercial-orders/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/admin/operations/commercial-orders/route.ts)
- [`app/(admin)/admin/_components/sections/CommercialSection.tsx`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(admin)/admin/_components/sections/CommercialSection.tsx)
- [`app/(admin)/admin/_components/sections/PedidosSection.tsx`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(admin)/admin/_components/sections/PedidosSection.tsx)
- [`lib/operations/inventory-stock.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/lib/operations/inventory-stock.ts)
- [`lib/operations/operations-order-view-model.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/lib/operations/operations-order-view-model.ts)
- [`lib/orders/store-order-fulfillment.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/lib/orders/store-order-fulfillment.ts)
- [`prisma/schema.prisma`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/prisma/schema.prisma)
- [`docs/w605i-a-stock-reservation-admin-design.md`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/docs/w605i-a-stock-reservation-admin-design.md)
- [`docs/w605i-b-admin-reserve-release-stock.md`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/docs/w605i-b-admin-reserve-release-stock.md)
- [`docs/w605h-c-admin-backorder-production-visual-e2e-audit.md`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/docs/w605h-c-admin-backorder-production-visual-e2e-audit.md)

## Auditoría visual

### ComercialSection

Confirmado:

- `Stock reservado` es visible;
- `Pendiente de reservar` es visible;
- `ProductCode` se ve claro;
- `Reservar stock disponible` es claro;
- `Liberar reserva` es claro;
- la tarjeta de reserva está separada de `Producción requerida`;
- el CTA de producción por faltante sigue diferenciándose bien del CTA de reserva.

Observaciones:

- la pantalla mantiene un layout estable en desktop;
- en responsive, las tarjetas apilan correctamente;
- no se observó overflow ni duplicación visual de CTAs;
- la advertencia de pago pendiente sigue siendo comprensible dentro del flujo de pedido comercial.

### PedidosSection

Confirmado:

- la lectura de backorder y producción requerida sigue visible;
- la reserva no invade el panel de pedidos del cliente;
- la semántica visual de reserva quedó mejor concentrada en `CommercialSection`;
- el panel no mezcla reserva con activación ni con despacho.

## Auditoría del endpoint `reserve-stock`

### Confirmaciones

- es admin only;
- valida rol con `requireRole`;
- identifica `OperationCommercialOrder`;
- obtiene `productCode` canónico desde el pedido;
- rechaza pedidos internos;
- rechaza pedidos con múltiples `productCode`;
- calcula `requestedQty`;
- calcula `alreadyReservedQty`;
- respeta `confirmPendingPayment` si el pago está pendiente;
- selecciona unidades con:
  - `status = available`;
  - `qaStatus = passed`;
  - `activationStatus = not_activated`;
  - `productCode` correcto;
  - `reservedOrderId = null`;
- usa orden FIFO por `createdAt` e `internalLabel`;
- actualiza:
  - `status = reserved`;
  - `reservedOrderId`;
  - `reservedAt`;
- no crea unidades;
- no despacha;
- no entrega;
- no activa.

### Matices detectados

- el cálculo de `targetQty` existe, pero no se expone con ese nombre como respuesta separada;
- el endpoint se apoya en la cantidad solicitada y en lo ya reservado, pero no publica `availableQty` como variable de contrato;
- no se filtra `dispatchId = null` de forma explícita en el `findMany`, aunque la condición de disponibilidad reduce la probabilidad de tomar una unidad ya comprometida.

### Evaluación

- funcionalmente correcto para la fase;
- contractualmente suficiente para uso interno;
- si en el futuro se quiere endurecer la auditoría automática, convendrá formalizar `availableQty` y el filtro de `dispatchId`.

## Auditoría del endpoint `release-reservation`

### Confirmaciones

- es admin only;
- valida rol con `requireRole`;
- usa `reason`;
- puede liberar parcialmente o en bloque;
- solo libera unidades con `status = reserved` y `reservedOrderId` del pedido;
- actualiza:
  - `status = available`;
  - `reservedOrderId = null`;
  - `reservedAt = null`;
- no borra nada;
- no toca producción;
- no toca despacho;
- no toca activación.

### Riesgos residuales

- la liberación parcial opera desde el final de la lista reservada;
- no existe una capa explícita de expiración automática;
- la acción depende de que admin recuerde liberar cuando corresponda.

## Auditoría de stock e inventario

Confirmado en `inventory-stock`:

- `availableCount` excluye unidades con `reservedOrderId`;
- `reservedCount` contempla unidades reservadas;
- después de reservar, el stock disponible baja;
- después de liberar, el stock disponible sube;
- `productCode` gobierna la separación normal vs empresarial;
- no hay mezcla entre inventario normal y empresarial en el cálculo.

## Casos funcionales esperados

### Caso A

- Pedido `quantity 1`, stock `1`, `paymentStatus = under_review`.
- Resultado esperado:
  - reservar `1`;
  - el stock disponible baja;
  - no hay producción requerida.

### Caso B

- Pedido `quantity 10`, stock `1`, backorder `9`.
- Resultado esperado:
  - reservar `1`;
  - producción faltante `9`;
  - no reservar `9`.

### Caso C

- Pedido `quantity 5`, stock `0`.
- Resultado esperado:
  - no reservar;
  - producción faltante `5`.

### Caso D

- `paymentStatus = pending`.
- Resultado esperado:
  - requiere confirmación explícita.

### Caso E

- Pedido mixto con varios `productCode`.
- Resultado esperado:
  - la reserva simple se rechaza;
  - queda para un flujo futuro por línea/productCode.

### Caso F

- Reserva ya existente.
- Resultado esperado:
  - no duplica;
  - conserva el estado de reserva ya aplicada.

### Caso G

- Liberación parcial.
- Resultado esperado:
  - libera la cantidad solicitada;
  - no toca otras unidades.

### Caso H

- Liberación total.
- Resultado esperado:
  - libera todas las reservas del pedido.

## Riesgos remanentes

- no hay expiración automática;
- reservas olvidadas pueden bloquear stock;
- no hay reserva automática al subir comprobante;
- no hay política automática por pago aprobado;
- pedidos mixtos requieren flujo futuro;
- la concurrencia depende de la transacción actual;
- si producción completa nuevas unidades, aún hay que reservarlas manualmente;
- el panel aún usa nomenclatura operativa basada en pedidos comerciales, no en un workflow de reserva aislado.

## Qué no se tocó

- no se modificó código;
- no se modificó `schema.prisma`;
- no se hicieron migraciones;
- no se tocó la BD;
- no se reservaron unidades;
- no se liberaron reservas;
- no se despachó;
- no se entregó;
- no se activaron chips;
- no se asignaron chips;
- no se tocó Stripe;
- no se tocó tienda cliente;
- no se tocó `Mis pedidos` cliente;
- no se tocó `/dashboard/compras`.

## Skills usadas

- `prerescate-rules`
- `verification-loop`
- `dashboard-builder`
- `frontend-patterns`
- `frontend-a11y`
- `design-system`
- `api-design`
- `backend-patterns`
- `security-review`
- `error-handling`
- `coding-standards`

## Validaciones

- `git status --short`
- `git diff`
- `git diff --check`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`

## Conclusión

El flujo de reserva/liberación quedó visualmente claro y funcionalmente coherente con backorder y producción por faltante. La implementación es segura para uso operativo, aunque todavía hay dos mejoras de endurecimiento posibles para una fase futura: formalizar mejor el contrato de cálculo en `reserve-stock` y explicitar el filtro de `dispatchId` en la selección de unidades.
