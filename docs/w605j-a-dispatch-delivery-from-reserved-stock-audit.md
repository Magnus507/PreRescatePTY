# W6.05J-A Dispatch and Delivery from Reserved Stock Audit

## Resumen ejecutivo

Se auditó en modo read-only el flujo de despacho y entrega desde stock reservado. El sistema ya tiene una base razonable: la creación de despacho desde pedido reservado exige unidades reservadas, QA aprobado y activación pendiente; la confirmación de entrega marca el despacho y las unidades como entregadas; y la UI admin muestra reserva, producción requerida y despacho por separado.

Hallazgo principal:

- el flujo está bastante alineado con el modelo deseado;
- la reserva precede correctamente al despacho en la ruta comercial;
- la entrega no activa chips ni asigna perfiles;
- pero la creación de despacho desde pedido reservado todavía no valida explícitamente que las unidades reservadas coincidan por `productCode` con el pedido en esa misma ruta, y la confirmación de entrega tampoco conserva `reservedOrderId` como trazabilidad explícita al pasar a `delivered`.

## Modelo actual de despacho y entrega

### Modelos relacionados

#### `OperationDispatch`

- representa el despacho operativo;
- tiene `code`, `status`, `destinationType`, `destinationName`, `destinationReference`, `destinationAddress`, `carrierName`, `trackingReference`, `scheduledAt`, `sentAt`, `dispatchedAt`, `deliveredAt`, `notes`;
- se relaciona con `items`, `events` y `commercialOrders`.

#### `OperationDispatchItem`

- representa las líneas del despacho;
- puede ligar `unitId` y/o `finishedGoodId` según el flujo;
- en la práctica, el flujo desde pedido reservado crea líneas por unidad.

#### `OperationFinishedGoodUnit`

- conserva `status`, `qaStatus`, `activationStatus`, `reservedOrderId`, `reservedAt`, `dispatchedAt`, `deliveredAt`;
- tiene relación `dispatchItems[]`;
- es la unidad que pasa de reservada a despachada y luego a entregada.

#### `OperationCommercialOrder`

- mantiene `dispatchId` a nivel de pedido;
- el estado cambia según la acción operativa;
- el despacho queda vinculado al pedido por `dispatchId`.

## Cómo se vincula el despacho

### Con `OperationCommercialOrder`

En la ruta comercial, `create-dispatch`:

- toma el pedido por `commercialOrderId`;
- verifica que no exista despacho previo;
- exige que no sea pedido interno;
- exige que existan unidades reservadas;
- exige que la cantidad de unidades reservadas sea al menos igual a la cantidad operativa del pedido;
- crea `OperationDispatch`;
- actualiza el pedido con `dispatchId`, `fulfillmentStatus = reserved` y `status = dispatch_created`.

### Con `OperationFinishedGoodUnit`

En la ruta comercial, el despacho se crea usando unidades reservadas del pedido:

- `reservedOrderId = commercialOrderId`;
- `status = reserved`;
- `qaStatus = passed`;
- `activationStatus = not_activated`.

Además, la ruta de despacho crea items por unidad usando `unitId`, `internalLabel`, `productCode` y `productName`.

## Si existe dispatchId, dispatchItems y delivery

Confirmado:

- `OperationCommercialOrder` tiene `dispatchId`;
- `OperationFinishedGoodUnit` tiene `dispatchItems`;
- la entrega se marca desde `confirm-delivery`;
- la entrega cambia `status = delivered` y `deliveredAt` en despacho y unidades;
- la activación queda separada y no ocurre en la ruta de entrega.

## Qué estados cambian

### Durante despacho

En la ruta comercial:

- el pedido pasa a `dispatch_created`;
- el pedido guarda `dispatchId`;
- las unidades reservadas se mantienen como `reserved` al crear el despacho;
- el despacho arranca en `pending_pick`.

En el flujo de eventos de despacho:

- `RESERVED` puede llevar el despacho a `reserved`;
- `PICKED` puede cambiar unidades y estado del despacho;
- `DISPATCHED` cambia el despacho a `dispatched`;
- `DELIVERED` cambia el despacho a `delivered`.

### Durante entrega

En `confirm-delivery`:

- el despacho pasa a `delivered`;
- el despacho gana `deliveredAt`;
- las unidades vinculadas pasan a `status = delivered`;
- las unidades ganan `deliveredAt`;
- el pedido fuente pasa a `orderStatus = completed` cuando se puede resolver el `orderId`.

## Confirmación de reserva para despacho

### Pedido comercial

El flujo comercial sí exige reserva:

- `send-to-dispatch` en pedidos comerciales requiere `reservedUnits.length === operationalQuantity`;
- además exige `status = reserved`, `qaStatus = passed`, `activationStatus = not_activated`;
- no acepta pedidos internos;
- no acepta pedido sin unidades reservadas suficientes.

### Riesgo exacto remanente

En la ruta comercial de creación de despacho:

- la selección se basa en `reservedOrderId = commercialOrderId`;
- pero no valida explícitamente `productCode` contra la orden en ese mismo `findMany`;
- eso significa que, si existiera una inconsistencia previa de clasificación, la reserva errónea podría colarse en el despacho mientras siga perteneciendo al pedido.

En la práctica, el modelo actual ya protege bastante por reserva y QA, pero el blindaje de `productCode` podría endurecerse en una fase posterior.

## Selección de unidades para despacho

### Cómo se selecciona

Hay dos rutas relevantes:

1. `app/api/admin/orders/[id]/send-to-dispatch/route.ts`
2. `app/api/admin/operations/commercial-orders/[id]/create-dispatch/route.ts`

### Manual o automática

- el flujo de pedidos legacy/comerciales usa selección automática de las unidades reservadas del pedido;
- la UI de admin muestra la acción de crear despacho, pero no requiere selección manual de cada unidad en esa ruta específica;
- la unidad elegible se deriva del estado reservado y del pedido.

### Validaciones observadas

- se valida cantidad vs pedido;
- se valida existencia de unidades reservadas suficientes;
- se valida que la unidad esté reservada;
- se valida `qaStatus = passed`;
- se valida `activationStatus = not_activated`;
- se valida que no haya pedido interno en la ruta comercial;
- no se usa `available` como insumo directo del despacho comercial.

## Entrega

### Qué acción marca como entregado

La confirmación de entrega está en:

- [`app/api/admin/operations/dispatches/[id]/confirm-delivery/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/admin/operations/dispatches/[id]/confirm-delivery/route.ts)

### Comportamiento

- el despacho pasa a `delivered`;
- se registra evento `DELIVERED`;
- las unidades vinculadas pasan a `delivered`;
- se fija `deliveredAt`;
- si se puede resolver el pedido de origen, se marca `orderStatus = completed`.

### Qué no hace

- no activa chip;
- no asigna perfil;
- no genera `shortCode`;
- no toca `qaStatus`;
- no toca `reservedOrderId`;
- no toca identidad del usuario final.

### Riesgo residual

- la entrega deja la unidad en estado `delivered`, pero no borra la trazabilidad de reserva de forma explícita;
- esto es aceptable para auditoría, aunque convendría definir en una futura fase si `reservedOrderId` debe conservarse o limpiarse como política.

## UI admin

### `CommercialSection`

Confirmado:

- se ve `Stock reservado`;
- se ve `Pendiente de reservar`;
- se ve `ProductCode`;
- existe `Reservar stock disponible`;
- existe `Crear producción por faltante`;
- existe `Liberar reserva`;
- la reserva y la producción por faltante están separadas visualmente;
- `Reservar stock disponible` y `Crear producción por faltante` no compiten de forma confusa.

### `PedidosSection`

Confirmado:

- se ve backorder visible;
- se ve producción requerida;
- se ve despacho y entrega como estados distintos;
- hay una separación razonable entre reserva, producción y despacho;
- el flujo corporativo y el comercial no se mezclan con la reserva de stock.

### `FinishedGoodUnitsSection`

Confirmado:

- se visualiza `reservedOrderId`;
- se visualiza `dispatchId`/estado de despacho donde corresponde;
- la unidad entregada aparece en inventario como `delivered` o `delivered_pending_activation`;
- se entiende que la activación es otro paso.

## Modelo recomendado

### Para despachar

1. Usar solo unidades reservadas para ese pedido.
2. Verificar `productCode` contra el pedido.
3. Verificar `qaStatus = passed`.
4. Verificar `activationStatus = not_activated`.
5. No usar unidades `available` no reservadas salvo acción explícita de reserva previa.
6. No usar unidades reservadas para otro pedido.
7. No despachar si la política de pago no se cumple.
8. No despachar si faltan unidades reservadas, salvo despacho parcial explícito.

### Para despacho parcial

- permitirlo solo con confirmación explícita de admin;
- mantener el faltante como pendiente;
- no cerrar el pedido completo.

### Para entrega

- marcar la unidad/pedido como entregado;
- no activar chip;
- no asignar perfil;
- conservar trazabilidad operativa.

### Para reserva

- la reserva debe preceder al despacho;
- el despacho debe consumir únicamente lo ya reservado.

## Endpoints o fixes futuros sugeridos

### Fase J-B recomendada

- endurecer `create-dispatch` para validar `productCode` explícitamente;
- validar `paymentStatus` o estado de aprobación según política;
- mantener la exigencia de `reservedOrderId`;
- separar despacho parcial de despacho completo;
- reforzar la UI para mostrar claramente las unidades reservadas que se están moviendo a despacho.

### Observación sobre entrega

- la confirmación de entrega funciona y no activa chip;
- si en el futuro se quiere mayor trazabilidad, puede revisarse la política de `reservedOrderId` al entregar.

## Riesgos remanentes

- despacho puede seguir dependiendo de reserva previa sin validar `productCode` de forma explícita en la ruta comercial;
- pedido mixto requiere atención especial;
- stock producido después del pedido no entra solo al despacho;
- pago pendiente todavía depende de política administrativa;
- unidades reservadas olvidadas pueden quedar bloqueadas;
- puede existir despacho sin que la reserva sea revisada con suficiente atención humana;
- activación accidental sigue siendo un riesgo de proceso, no de la ruta de entrega;
- la trazabilidad de reserva al entregar puede requerir política explícita futura.

## Decisión

**Cerrable con observaciones.**

Motivo:

- el flujo actual ya respeta la reserva como precondición razonable para despacho comercial;
- la entrega no activa chips ni asigna perfiles;
- la UI ayuda a distinguir reserva, producción y despacho;
- el riesgo que queda es de endurecimiento, no un bloqueo funcional mayor.

## Qué no se tocó

- no se modificó código;
- no se modificó `schema.prisma`;
- no se hicieron migraciones;
- no se tocó la BD;
- no se despachó;
- no se entregó;
- no se activaron chips;
- no se asignaron chips;
- no se tocaron pedidos cliente;
- no se tocó tienda cliente;
- no se tocó `/dashboard/compras`;
- no se tocó Stripe;
- no se generaron `shortCode`;
- no se asignaron perfiles.

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

El flujo de despacho y entrega desde stock reservado ya está suficientemente alineado con la operación segura: reserva primero, despacho después y entrega sin activar. Aun así, conviene una futura fase J-B si se quiere blindar explícitamente `productCode` en la creación de despacho comercial y formalizar la política de trazabilidad al entregar.
