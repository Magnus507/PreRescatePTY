# W6.05H-A Backorder to Production Admin Design

## Resumen ejecutivo

Se auditó el flujo que conecta pedidos con backorder hacia la operación interna/admin. El sistema actual ya calcula backorder en servidor y lo muestra al cliente, pero la conversión a producción interna todavía no distingue entre cantidad total pedida y cantidad faltante por producir.

Conclusión principal:

- hoy admin puede ver pedidos, comprobantes y estados operativos;
- hoy `send-to-production` crea una orden de producción por la cantidad total del pedido;
- hoy no existe un mecanismo explícito para producir solo el faltante de backorder;
- por lo tanto, el flujo necesita una fase H-B antes de automatizar o semi-automatizar producción por faltante.

## Estado actual del backorder

### Qué queda persistido

Archivo revisado:

- [`app/api/orders/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/orders/route.ts)

Hallazgos:

- `POST /api/orders` calcula `fulfillmentSummary`;
- la orden guarda una nota interna en `adminReviewNotes`;
- el pedido se sincroniza a Operaciones con `productCode` canónico y `quantity` real;
- la información customer-facing se deriva después desde `GET /api/orders` como `customerFulfillmentSummary`;
- el backend de tienda no reserva stock;
- no se crea producción automática.

### Qué existe solo en response

- `fulfillmentSummary` vive en la respuesta de creación del pedido;
- `customerFulfillmentSummary` vive en la respuesta de lectura del pedido;
- la persistencia principal de la semántica sigue siendo `adminReviewNotes` y el pedido/ítems.

### Qué puede ver admin hoy

- pedidos comerciales y pedidos del cliente;
- comprobantes;
- estados manuales;
- nota interna operativa;
- en el inventario/operaciones, la cantidad total sincronizada del pedido.

### Qué no puede ver admin hoy

- una cantidad faltante explícita como `backorderQty` persistida en un campo operativo dedicado;
- una distinción automática visual entre `quantity total` y `cantidad a producir`;
- un CTA que diga `Crear producción por faltante` con cantidad prellenada desde el backorder.

## Admin hoy

Archivo revisado:

- [`app/(admin)/admin/_components/sections/PedidosSection.tsx`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(admin)/admin/_components/sections/PedidosSection.tsx)

Hallazgos:

- el panel lista pedidos de cliente y pedidos internos;
- existe flujo de revisión manual;
- existe CTA operativo `Enviar a producción`;
- el panel muestra estados, comprobantes, notas y acciones administrativas;
- no se ve un badge dedicado de `Producción requerida` para pedidos con backorder;
- tampoco se ve una indicación explícita de `cantidad faltante`.

## Endpoint `send-to-production` actual

Archivo revisado:

- [`app/api/admin/operations/commercial-orders/[id]/send-to-production/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/admin/operations/commercial-orders/[id]/send-to-production/route.ts)

Hallazgos:

- recibe solo el `commercialOrderId` por params;
- valida rol admin;
- busca el pedido comercial y sus items;
- si ya existe una producción vinculada por marker, reutiliza ese vínculo y marca `fulfillmentStatus = requested`;
- si no existe, crea `OperationProductionOrder`;
- el `plannedQuantity` se calcula como la suma de `item.quantity` de todo el pedido;
- `outputType` sale del primer item y usa `finishedGood.code` o `productCode` o `productName`;
- la producción creada usa `PROD` o `PROD-INT` según `customerType`;
- no distingue `backorderQty` versus `quantity total`;
- no permite producción parcial por faltante;
- no recibe un payload para override de cantidad;
- no tiene fallback duro visible a `PRP-FG-STICKER`, pero sí depende de `firstItem` y del `productInfo` del primer item;
- no evita duplicación mediante un campo estructurado aparte; usa marker en `notes`.

## Modelo operativo recomendado

### Caso A

Pedido `quantity 1`, stock `1`, backorder `0`.

- no requiere producción;
- admin puede preparar/reservar/despachar manualmente en el flujo futuro;
- no mostrar `Producción requerida`.

### Caso B

Pedido `quantity 10`, stock `1`, backorder `9`.

Recomendado:

- mostrar `Producción requerida: 9 unidades`;
- mostrar `Stock disponible al crear pedido: 1`;
- CTA: `Crear producción por faltante`;
- la producción por defecto debe ser de 9, no de 10;
- si admin quiere, puede sobreescribir manualmente.

### Caso C

Pedido `quantity 5`, stock `0`, backorder `5`.

Recomendado:

- mostrar `Producción requerida: 5 unidades`;
- CTA: `Crear producción por faltante`;
- no producir automáticamente;
- requerir acción explícita de admin.

## Riesgos

- el stock puede cambiar después del pedido;
- sin reserva, una unidad disponible puede venderse dos veces operativamente;
- la producción parcial requiere saber si ya existe una producción anterior vinculada;
- duplicar `send-to-production` puede crear dos órdenes si no se controla bien el vínculo;
- pedidos con pago pendiente no deberían ir a producción si la política exige confirmación;
- pedidos empresariales no deben mezclarse con tienda cliente;
- normal/empresarial debe seguir usando `productCode` canónico.

## Decisiones necesarias

1. ¿Crear producción solo después de pago `under_review` o `paid`, o también `pending`?
- Recomendación inicial: `under_review` o `paid`; si `pending`, mostrar alerta y requerir confirmación admin.

2. ¿Cantidad de producción?
- Recomendación: default = `backorderQty`.
- Permitir override manual solo si admin confirma.

3. ¿Evitar duplicados?
- Recomendación: registrar vínculo/estado si ya existe producción asociada.
- Si no hay campo estructurado, detectar por `commercialOrderId`, `notes` o `code`.

4. ¿Reserva de stock?
- Recomendación: no resolver aquí.
- Dejarlo para una fase futura.

5. ¿Producción automática?
- Recomendación: no automática.
- Acción explícita de admin.

## Propuesta H-B

La siguiente fase debería:

- mostrar badge `Producción requerida` en Admin/Pedidos;
- mostrar cantidad faltante;
- mostrar `productCode`;
- mostrar stock disponible al crear pedido;
- agregar CTA `Crear producción por faltante`;
- usar `backorderQty` como default de producción;
- evitar duplicados;
- no crear producción si no hay backorder;
- no tocar activación, despacho ni entrega.

Si la data persistida actual no permite backorder confiable:

- derivar desde `adminReviewNotes` solo si está estructurado;
- o limitar H-B a mostrar resumen y pedir cantidad manual;
- o dejar una fase intermedia de persistencia segura sin migración si ya existe un campo apropiado.

## Qué no se tocó

- no se modificó código productivo;
- no se modificó `schema.prisma`;
- no se hicieron migraciones;
- no se tocó la BD;
- no se crearon pedidos reales;
- no se aprobaron ni rechazaron pagos;
- no se reservaron unidades;
- no se creó producción;
- no se crearon unidades;
- no se despachó;
- no se entregó;
- no se activaron chips;
- no se asignaron chips;
- no se tocó Stripe;
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

El flujo actual ya soporta backorder en la experiencia de cliente, pero todavía no lo convierte en producción interna de manera segura y explícita. Para evitar sobreproducción o duplicados, la recomendación es cerrar primero una fase H-B con badge, cantidad faltante y CTA manual, antes de automatizar cualquier creación de producción interna.
