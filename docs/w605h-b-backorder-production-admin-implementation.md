# W6.05H-B Backorder Production Admin Implementation

## Resumen ejecutivo

Se implementó el flujo administrativo para crear producción por faltante de backorder desde `CommercialSection` y el endpoint `send-to-production`. El sistema ahora puede pedir producción con modo explícito `backorder`, usar la cantidad faltante como valor por defecto y bloquear casos ambiguos antes de crear una orden de producción.

## Qué se resolvió

- el panel admin ya no envía siempre la cantidad total al crear producción;
- el UI muestra un bloque de `Producción requerida` cuando el pedido necesita fabricación;
- el botón principal pasó a `Crear producción por faltante`;
- el endpoint acepta `mode`, `plannedQuantity` y `confirmPendingPayment`;
- si el pago sigue en `pending`, el admin debe confirmarlo explícitamente;
- si el pedido mezcla más de un `productCode`, el modo `backorder` se bloquea para evitar una producción ambigua;
- la producción reutiliza el vínculo existente si ya fue creada antes;
- no se tocaron migraciones, schema ni automatizaciones de inventario.

## Archivos modificados

- [`app/api/admin/operations/commercial-orders/[id]/send-to-production/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/admin/operations/commercial-orders/[id]/send-to-production/route.ts)
- [`app/(admin)/admin/_components/sections/CommercialSection.tsx`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(admin)/admin/_components/sections/CommercialSection.tsx)
- [`app/(admin)/admin/_components/sections/PedidosSection.tsx`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(admin)/admin/_components/sections/PedidosSection.tsx)
- [`lib/orders/store-order-fulfillment.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/lib/orders/store-order-fulfillment.ts)
- [`lib/operations/operations-order-view-model.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/lib/operations/operations-order-view-model.ts)

## Backend tocado

### Endpoint de producción

- `POST /api/admin/operations/commercial-orders/[id]/send-to-production`

### Cambios funcionales

- `mode = "backorder"` crea producción por faltante;
- `mode = "full"` conserva el comportamiento anterior;
- `plannedQuantity` puede sobreescribirse manualmente;
- `confirmPendingPayment` evita envíos accidentales con pago pendiente;
- se usa un marcador estable en `notes` para evitar duplicados;
- la orden de producción guarda metadata con `requestedQuantity`, `availableStock`, `backorderQty` y `plannedQuantity`.

## Frontend tocado

### CommercialSection

- se agregó el bloque `Producción requerida`;
- se muestra `productCode`, stock disponible y faltante;
- el CTA principal ahora dice `Crear producción por faltante`;
- el botón manda `mode: backorder` con la cantidad faltante por defecto;
- si el pedido tiene pago `pending`, el admin debe confirmar.

### PedidosSection

- ahora puede mostrar el resumen de backorder derivado del texto interno del pedido;
- el badge visible deja claro cuándo hay producción requerida;
- el detalle amplía el contexto sin tocar el flujo del cliente.

## Reglas aplicadas

- no se modificó `schema.prisma`;
- no se hicieron migraciones;
- no se tocó la base de datos;
- no se creó producción automática;
- no se reservaron unidades;
- no se tocaron activación, despacho ni entrega;
- no se alteró Stripe;
- no se tocaron pedidos cliente.

## Validaciones

- `git status --short`
- `git diff`
- `git diff --check`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`

## Recomendación

Mantener este flujo como paso manual controlado. Si más adelante se quiere automatizar por tipo de pedido o por política de pago, conviene hacerlo sobre un campo estructurado de backorder y no sobre heurísticas de texto.

