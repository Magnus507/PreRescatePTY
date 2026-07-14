# P0-01 - Reserva atomica de inventario

**Fecha:** 14 de julio de 2026

**Base auditada:** Auditoria Maestra 2026, commit `812e124`

**Estado:** correccion aplicada y verificada localmente

## 1. Problema encontrado

La auditoria detecto que la reserva de unidades fisicas no era atomica.

El patron anterior hacia:

1. `findMany()` de unidades disponibles.
2. `updateMany()` por IDs.

Ese flujo permitia que dos transacciones concurrentes trabajaran sobre la misma fotografia de inventario y terminaran con doble asignacion o con resultados inconsistentes bajo carrera.

## 2. Riesgo

- Doble reserva de la misma unidad fisica.
- Inventario no trazable.
- Estado comercial incorrecto.
- Backorders y reservas parciales calculadas con un snapshot obsoleto.
- Idempotencia debil para llamadas repetidas sobre el mismo pedido.

## 3. Arquitectura anterior

Antes de esta fase:

- La logica de reserva estaba duplicada entre el helper de operaciones y la ruta heredada `reserve-units`.
- La ruta principal `reserve-stock` y la ruta heredada no compartian una unica fuente de verdad.
- La respuesta dependia demasiado del snapshot inicial de disponibilidad.
- No se releyia el estado final para confirmar que una unidad seguia asignada al pedido correcto.

## 4. Arquitectura nueva

La reserva ahora vive en una sola funcion compartida:

- `[lib/operations/commercial-order-reservation.ts](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/lib/operations/commercial-order-reservation.ts)`

La ruta heredada quedó como alias del flujo actual:

- `[app/api/admin/operations/commercial-orders/[id]/reserve-units/route.ts](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/admin/operations/commercial-orders/%5Bid%5D/reserve-units/route.ts)`

La ruta actual de uso operativo sigue llamando al mismo helper:

- `[app/api/admin/operations/commercial-orders/[id]/reserve-stock/route.ts](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/admin/operations/commercial-orders/%5Bid%5D/reserve-stock/route.ts)`

## 5. Fuente de verdad

La fuente de verdad de la reserva comercial es `reserveCommercialOrderStock(...)`.

Todas las rutas deben reutilizarla y no duplicar el algoritmo.

## 6. Algoritmo

La reserva usa un enfoque de compare-and-set por pasos:

1. Lee las unidades ya reservadas para el mismo `orderId`.
2. Calcula cuantas unidades faltan por reservar para cada item.
3. Busca candidatas disponibles con filtros estrictos:
   - `status = available`
   - `qaStatus = passed`
   - `activationStatus = not_activated`
   - `reservedOrderId = null`
   - sin `dispatchItems`
4. Hace `updateMany()` condicionado por el estado actual de cada unidad.
5. Relee el estado final desde base de datos.
6. Crea eventos solo para las unidades realmente reclamadas.
7. Calcula `reservedQty` y `missingQty` con el estado final, no con la fotografia inicial.

## 7. Manejo de concurrencia

### Caso 1

Inventario: 1 unidad. Pedido A: 1. Pedido B: 1.

Resultado esperado:

- uno reserva;
- el otro no.

### Caso 2

Inventario: 2 unidades. Pedido A: 1. Pedido B: 1.

Resultado esperado:

- cada uno obtiene una distinta.

### Caso 3

Inventario: 1 unidad. Pedido: 2 unidades.

Resultado esperado:

- 1 reservada;
- 1 faltante;
- el backorder sigue correcto.

### Caso 4

Dos procesos reservando el mismo pedido.

Resultado esperado:

- idempotencia;
- no se duplica la reserva;
- el segundo proceso ve el estado final real.

### Caso 5

Rollback.

Si falla la reserva a mitad, la transaccion revierte y no deja unidades en estado corrupto.

### Caso 6

Dos productos distintos.

Resultado esperado:

- no contaminar reservas entre productos.

### Caso 7

QA pendiente.

Resultado esperado:

- no reservar.

### Caso 8

Unidad ya reservada.

Resultado esperado:

- no sobrescribir.

### Caso 9

Unidad despachada.

Resultado esperado:

- nunca volver a reservar.

### Caso 10

Unidad activada.

Resultado esperado:

- nunca volver a reservar.

## 8. Manejo de rollback

La reserva se ejecuta dentro de la transaccion existente del caller.

Si hay un error funcional o una restriccion de negocio no se cumple:

- la transaccion se revierte;
- no se conservan eventos parciales;
- no queda una reserva a medias.

## 9. Manejo de retry

La idempotencia se apoya en el estado real de `reservedOrderId`:

- si el mismo pedido vuelve a ejecutar la reserva, las unidades ya reclamadas se reconocen como reservadas;
- si otra transaccion compite por las mismas unidades, el `updateMany()` condicionado evita la doble asignacion;
- la respuesta se calcula desde el estado final de base de datos.

## 10. Pruebas

Pruebas ejecutadas:

- `[tests/lib/commercial-order-reservation.test.ts](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/tests/lib/commercial-order-reservation.test.ts)`
- `[tests/routes/admin-orders-approve.test.ts](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/tests/routes/admin-orders-approve.test.ts)`

Cobertura focal:

- inventario suficiente;
- inventario insuficiente;
- aprobacion repetida del mismo pedido;
- competencia por la misma unidad;
- pedidos internos sin reserva;
- mapeo faltante o invalido;
- integracion con la aprobacion admin.

## 11. Rendimiento

El costo extra de la correccion es acotado:

- una lectura previa de reservas existentes;
- una lectura de candidatas;
- un `updateMany()` condicionado;
- una lectura final de estado.

No se introdujo locking manual ni cambios de schema.

## 12. Limitaciones

- No se modifico `schema.prisma`.
- No se agregaron migraciones.
- No se toco Stripe.
- No se toco webhook.
- No se toco frontend.
- No se toco activacion, despacho, QA ni produccion.

La fase corrige la integridad de la reserva comercial, pero no resuelve por si sola el resto de la deuda de inventario operacional descrita en la auditoria.

## 13. Que no cambio

- Backorders.
- Flujo de aprobacion de pago.
- Flujo de produccion.
- Flujo de despacho.
- Flujo de activacion.
- Pedidos corporativos.
- Packages legacy.
- Notificaciones.
- Autenticacion.
- Permisos.
- Esquema Prisma.
- Migraciones.

## 14. Validaciones

- `git diff`
- `git diff --check`
- `git status --short`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`
- `npx vitest run tests/lib/commercial-order-reservation.test.ts tests/routes/admin-orders-approve.test.ts`

## 15. Resultado

- `npx prisma validate`: OK
- `npm run typecheck`: OK
- `npm run build`: OK con warnings preexistentes de `<img>` y `react-hooks/exhaustive-deps`
- suite focalizada: OK

## 16. Commit

Pendiente de registrar en esta misma fase.

## 17. Push

Pendiente de registrar en esta misma fase.

## 18. Estado final

- La reserva comercial quedo centralizada en una sola funcion.
- La ruta heredada `reserve-units` ahora reutiliza el flujo actual.
- `tmp/` permanece fuera de git.
