# W6.05I-B Admin Reserve and Release Stock

## Resumen ejecutivo

Se implementó el flujo administrativo para reservar y liberar stock de pedidos comerciales sobre la estructura existente, sin migraciones ni cambios de schema. La solución usa los campos ya disponibles en `OperationFinishedGoodUnit` y formaliza el contrato API con nombres orientados a stock y reserva.

La reserva ahora puede apartar stock cubierto por inventario real, dejar constancia de las unidades reservadas y liberar una parte o el total con motivo explícito. El flujo sigue sin tocar activación, despacho, entrega ni producción.

## Qué se implementó

- nuevo endpoint `POST /api/admin/operations/commercial-orders/[id]/reserve-stock`;
- nuevo endpoint `POST /api/admin/operations/commercial-orders/[id]/release-reservation`;
- reserva idempotente por pedido y `productCode`;
- liberación parcial o total con motivo;
- confirmación explícita cuando el pedido está con pago pendiente;
- UI admin con copy claro de:
  - `Stock reservado`;
  - `Pendiente de reservar`;
  - `ProductCode`;
  - `Reservar stock disponible`;
  - `Liberar reserva`.

## Archivos modificados

- [`app/api/admin/operations/commercial-orders/[id]/reserve-stock/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/admin/operations/commercial-orders/[id]/reserve-stock/route.ts)
- [`app/api/admin/operations/commercial-orders/[id]/release-reservation/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/admin/operations/commercial-orders/[id]/release-reservation/route.ts)
- [`app/(admin)/admin/_components/sections/CommercialSection.tsx`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(admin)/admin/_components/sections/CommercialSection.tsx)
- [`docs/w605i-b-admin-reserve-release-stock.md`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/docs/w605i-b-admin-reserve-release-stock.md)

## Detalles técnicos

### Reserva

- administra solo pedidos comerciales;
- rechaza pedidos internos;
- rechaza pedidos con más de un `productCode`;
- reserva solo unidades con:
  - `status = available`;
  - `qaStatus = passed`;
  - `activationStatus = not_activated`;
  - `reservedOrderId = null`;
- la reserva es idempotente;
- si ya había unidades reservadas, no duplica la operación;
- si el pedido está con pago pendiente, exige confirmación explícita;
- el estado del pedido se actualiza a `stock_reserved` o `needs_production` según corresponda.

### Liberación

- libera por motivo explícito;
- soporta liberar una cantidad parcial o total;
- evita liberar si hay despacho asociado;
- restituye `status = available`, `reservedOrderId = null`, `reservedAt = null`;
- registra evento `RELEASED` para auditoría;
- si queda reserva remanente, conserva el estado de reserva.

### UI

- la acción principal ahora habla de stock, no de etiqueta interna;
- el bloque de reserva muestra cuántas unidades ya están apartadas;
- se ve el faltante pendiente de reservar;
- la liberación usa el nuevo naming de reserva.

## Qué no se tocó

- no se modificó `schema.prisma`;
- no se hicieron migraciones;
- no se tocó la BD;
- no se crearon unidades;
- no se borraron unidades;
- no se activaron chips;
- no se tocaron reservas de despacho, entrega o activación;
- no se tocó Stripe;
- no se tocó tienda cliente;
- no se tocó `Mis pedidos` cliente.

## Validaciones

Ejecutadas:

- `git status --short`
- `git diff`
- `git diff --check`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`

Resultado:

- `git diff --check`: OK
- `npx prisma validate`: OK
- `npm run typecheck`: OK
- `npm run build`: OK

## Conclusión

W6.05I-B deja una base operativa clara para reserva/liberación de stock sobre pedidos comerciales, con APIs explícitas y UX alineada al lenguaje de inventario real. No se necesitó migración porque el esquema ya tenía la estructura para soportarlo.
