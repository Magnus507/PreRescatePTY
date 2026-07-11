# W6.05I-A Stock Reservation Admin Design

## Resumen ejecutivo

Se auditó el modelo actual de inventario, pedidos y operaciones para diseñar la reserva de stock de pedidos de tienda. La conclusión principal es que **el esquema ya soporta reserva** mediante campos existentes en `OperationFinishedGoodUnit`, por lo que **no se requiere migración nueva para arrancar la política funcional de reserva**. Lo que falta no es la capacidad de marcar una unidad como reservada, sino una UX/admin flow más claro y una API dedicada para reservar y liberar con idempotencia.

La tienda ya permite vender con stock parcial o backorder. Admin ya puede producir el faltante. La pieza ausente es reservar de forma segura la parte cubierta por inventario para evitar sobreventa operativa.

## Estado actual de unidades

### Modelo revisado

Archivo revisado:

- [`prisma/schema.prisma`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/prisma/schema.prisma)

### Campos relevantes en `OperationFinishedGoodUnit`

La unidad trazable ya tiene:

- `status`
- `qaStatus`
- `activationStatus`
- `productCode`
- `productName`
- `productType`
- `reservedOrderId`
- `reservedAt`
- `dispatchId`
- `delivery` vía vínculos de despacho / eventos
- `productionOrderId` vía `digitalBatchItem`

### Lo que ya existe hoy

- vínculo de reserva con pedido mediante `reservedOrderId`;
- timestamp de reserva mediante `reservedAt`;
- vínculo con despacho mediante `dispatchId` / eventos de despacho;
- vínculo con activación mediante `activationStatus`;
- vínculo con pedido de origen y producción mediante `digitalBatchItem` y `digitalBatchId`.

### Lo que se considera disponible hoy

La disponibilidad actual se calcula como:

- `status === "available"`
- `qaStatus === "passed"`
- `activationStatus === "not_activated"`
- `!reservedOrderId`

### Estados que quedan fuera del inventario disponible

- `reserved`
- `qa_pending`
- `qa_failed`
- `dispatched`
- `delivered`
- `activated`
- cualquier unidad con `reservedOrderId` asignado

## Cálculo actual de stock

Archivos revisados:

- [`lib/operations/inventory-stock.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/lib/operations/inventory-stock.ts)
- [`lib/orders/store-order-fulfillment.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/lib/orders/store-order-fulfillment.ts)

### `availableStock`

El stock disponible se calcula hoy por `productCode` usando inventario real operativo y excluyendo unidades que no cumplan:

- `status = available`
- `qaStatus = passed`
- `activationStatus = not_activated`
- sin `reservedOrderId`

### `reservedCount`

El stock reservado ya se cuenta cuando:

- `status = reserved`

o cuando la unidad tiene reserva por pedido y el flujo la trata como reservada.

### Evolución posible

El sistema ya puede evolucionar a una reserva más estricta **sin migración adicional** porque:

- el campo `reservedOrderId` ya existe;
- el campo `reservedAt` ya existe;
- `status = reserved` ya es un estado operativo válido en rutas de admin.

La parte que aún no existe es una API formal de reserva de tienda con reglas claras, no la estructura de datos básica.

## Flujo de pedido actual

Archivo revisado:

- [`app/api/orders/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/orders/route.ts)

### Cuándo se calcula stock/backorder

- el cálculo de `fulfillmentSummary` ocurre antes de persistir la orden;
- se hace con inventario actual al momento de la compra;
- el pedido y sus ítems se crean dentro de una transacción posterior;
- la sincronización operativa ocurre después, sin reservar stock.

### Orden y items

- primero se resuelve el producto;
- luego se calcula el fulfillment;
- luego se crea `Order` + `OrderItem[]` dentro de transacción;
- luego se sincroniza a Operaciones;
- no existe reserva automática en esta etapa.

### Concurrencia

Si dos pedidos entran al mismo tiempo:

- ambos pueden ver el mismo `availableStock` si no existe bloqueo/reserva;
- el cálculo de backorder seguirá siendo correcto por pedido, pero la asignación física puede quedar ambigua;
- esta es la razón de negocio para introducir reserva.

### Reserva futura en la misma transacción

Sí, sería viable en una fase futura reservar stock dentro de la misma transacción de creación o aprobación, pero solo si:

- se decide el momento exacto de reserva;
- se define una política de rollback;
- se evita reservar backorder;
- se controla idempotencia.

## Admin y operaciones

Archivos revisados:

- [`app/api/admin/operations/commercial-orders/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/admin/operations/commercial-orders/route.ts)
- [`app/api/admin/operations/commercial-orders/[id]/send-to-production/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/admin/operations/commercial-orders/[id]/send-to-production/route.ts)
- [`app/(admin)/admin/_components/sections/CommercialSection.tsx`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(admin)/admin/_components/sections/CommercialSection.tsx)
- [`app/(admin)/admin/_components/sections/PedidosSection.tsx`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(admin)/admin/_components/sections/PedidosSection.tsx)
- [`app/api/admin/operations/finished-good-units/finished-good-units.helpers.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/admin/operations/finished-good-units/finished-good-units.helpers.ts)
- [`app/api/admin/operations/finished-good-units/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/admin/operations/finished-good-units/route.ts)
- [`app/api/admin/operations/production-orders/[id]/unit-assembly/[preparationId]/complete/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/admin/operations/production-orders/[id]/unit-assembly/[preparationId]/complete/route.ts)

### Dónde ve admin las unidades disponibles

- inventario operativo;
- inventario terminado;
- pedidos comerciales con `reservedUnits`;
- pedidos internos con producción vinculada;
- `CommercialSection` y `PedidosSection` muestran stock y reserva donde aplica.

### Reserva hoy

- sí existe acción de reservar unidad en admin;
- existe liberación de reserva;
- el flujo de reserva ya está conectado a pedidos comerciales;
- dispatch exige unidades reservadas;
- el flujo de reserva no activa chips.

### Consumo de reserva

- despacho consume reserva;
- entrega y activación no deben ocurrir por accidente sobre una unidad reservada;
- la reserva es una capa previa al despacho, no al chip.

## Modelo de reserva recomendado

### Cuándo reservar

Recomendación:

- no reservar automáticamente al crear pedido si `paymentStatus = pending`;
- reservar cuando el pedido esté `under_review` o `paid`, según la política operativa;
- mantener backorder para la parte que no alcanza;
- permitir reserva y liberación manual desde admin.

### Cuánto reservar

Recomendación:

- reservar solo `stockCoveredQty`;
- no reservar `backorderQty`;
- si hay `quantity = 10` y `availableStock = 1`, reservar `1`;
- si `availableStock = 0`, no reservar.

### Qué unidad reservar

Recomendación:

- `status = available`;
- `qaStatus = passed`;
- `activationStatus = not_activated`;
- `productCode` correcto;
- sin asignación a usuario final;
- sin despacho;
- sin entrega;
- sin activación;
- FIFO por `createdAt` o `internalLabel`.

### Cómo representar reserva

Recomendación:

- usar el estado existente `reserved`;
- usar `reservedOrderId` y `reservedAt`;
- no depender de notes para representar una reserva real.

### Cómo liberar reserva

Casos recomendados:

- pago rechazado;
- pedido cancelado;
- admin libera manualmente;
- expiración o cambio de pedido.

### Cómo consumir reserva

Casos:

- despacho;
- entrega;
- activación posterior.

La reserva no debe activar chip.

## UI admin propuesta

### Para pedido con stock cubierto

- `Stock reservado: X/Y`
- `Pendiente de reservar` si aún no se apartó
- CTA:
  - `Reservar stock`
  - `Liberar reserva`

### Para pedido con backorder

- `Reservable ahora: X`
- `Producción faltante: Y`
- CTA:
  - `Reservar stock disponible`
  - `Crear producción por faltante`

### Para pedido sin pago

- advertencia:
  - `Pago pendiente. Reservar antes de revisión puede bloquear inventario.`

## API propuesta

### Endpoints recomendados

1. `POST /api/admin/operations/commercial-orders/[id]/reserve-stock`

Payload:

```json
{
  "confirmPendingPayment": true,
  "quantity": 1
}
```

2. `POST /api/admin/operations/commercial-orders/[id]/release-reservation`

Payload:

```json
{
  "reason": "string"
}
```

### Reglas sugeridas

- admin only;
- validar `productCode`;
- validar unidades disponibles;
- no activar;
- no despachar;
- no entregar;
- transacción;
- idempotente;
- evitar doble reserva;
- respuesta con unidades reservadas.

## Riesgos

- reserva sin pago puede bloquear stock;
- no reservar puede causar sobreventa;
- concurrencia;
- liberaciones olvidadas;
- pedidos mixtos;
- producto normal vs empresarial;
- backorder parcial;
- producción completada luego debe poder reservarse;
- no activar unidades reservadas por accidente.

## Migración

### ¿El schema soporta reserva?

Sí.

### ¿Hace falta migración para esta fase?

No para empezar la política funcional de reserva.

### ¿Cuándo sí haría falta migración?

Si más adelante se decide separar reserva de manera más formal, por ejemplo con:

- más metadata de reserva;
- relación explícita con pedido;
- expiración;
- auditoría estructurada adicional.

Para I-A no se toca schema ni migración.

## Plan W6.05I-B

La siguiente fase debería:

- decidir si la reserva será manual, semi-automática o automática;
- formalizar el endpoint de reserva/liberación;
- mantener idempotencia;
- definir política de expiración;
- si la política requiere más estructura, pedir autorización explícita para migración mínima.

## Qué no se tocó

- no se modificó `schema.prisma`;
- no se hicieron migraciones;
- no se tocó la BD;
- no se creó producción;
- no se crearon unidades;
- no se reservaron unidades;
- no se liberaron reservas;
- no se despachó;
- no se entregó;
- no se activaron chips;
- no se asignaron chips;
- no se tocó Stripe;
- no se tocó comprobantes;
- no se tocó `/dashboard/compras`.

## Skills usadas

- `prerescate-rules`
- `verification-loop`
- `api-design`
- `backend-patterns`
- `security-review`
- `error-handling`
- `dashboard-builder`
- `frontend-patterns`
- `frontend-a11y`
- `design-system`
- `coding-standards`
- `database-migrations`

## Validaciones

- `git status --short`
- `git diff`
- `git diff --check`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`

## Conclusión

El sistema ya tiene la base de datos y los campos necesarios para representar reserva de stock sin migración inmediata. Lo que falta es definir la política operativa, la API explícita y la UX de admin para que la reserva no se convierta en una heurística frágil. La recomendación es cerrar una fase W6.05I-B para implementar el flujo de reserva manual o semi-automático sobre la estructura existente, y solo migrar si luego se necesita más formalización.

