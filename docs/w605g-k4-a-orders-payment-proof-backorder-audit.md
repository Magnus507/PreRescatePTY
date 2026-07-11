# W6.05G-K4-A Orders, Payment Proof, and Visible Backorder Audit

## Resumen ejecutivo

Se auditó el flujo de tienda, comprobante y `Mis pedidos` después de K3. El backend ya calcula `fulfillmentSummary` y guarda una nota interna en `Order.adminReviewNotes`, pero esa información todavía no se refleja de forma visible para el cliente en `Mis pedidos`. La tienda, por su parte, muestra `Yappy Manual` en el formulario previo al pedido y recién expone QR Yappy, datos bancarios y carga de comprobante en el modal de éxito.

## Qué muestra la tienda antes de crear el pedido

Archivo revisado:

- [`app/(app)/dashboard/tienda/page.tsx`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(app)/dashboard/tienda/page.tsx)

Hallazgos:

- la tienda carga `paymentConfig` desde `/api/public/config`;
- el formulario de envío muestra un bloque fijo con el texto `Yappy Manual`;
- ese bloque no lista visualmente `yappy_qr_url`, `yappy_handle`, `bank_name` ni `bank_account_number`;
- la carga de comprobante no ocurre antes de crear el pedido;
- el upload de comprobante se habilita en el modal de éxito, usando `lastOrderId`.

## Qué muestra la tienda después de crear el pedido

Hallazgos:

- el modal de éxito sí muestra QR Yappy si existe `paymentConfig.yappy_qr_url`;
- también muestra `yappy_handle` y datos de banco/ACH;
- el usuario puede subir comprobante desde ese modal;
- el comprobante se envía a `POST /api/orders/[id]/payment-proof`;
- `lastOrderId` se setea con `data.order?.id`, así que el flujo depende de que la creación del pedido responda correctamente.

## Configuración de pagos

Archivo revisado:

- [`app/api/public/config/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/public/config/route.ts)

Hallazgos:

- se exponen públicamente `yappy_handle`, `yappy_qr_url`, `bank_name`, `bank_account_type`, `bank_account_number` y `bank_account_name`;
- la tienda ya consume ese endpoint;
- no hay evidencia de que el frontend de tienda use esa info antes del pedido;
- `PaymentInstructions` sí está preparado para mostrar QR + banco/ACH, pero la vista de tienda actual no lo usa en el formulario previo.

Componente revisado:

- [`app/(app)/dashboard/pedidos/_components/PaymentInstructions.tsx`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(app)/dashboard/pedidos/_components/PaymentInstructions.tsx)

Ese componente ya presenta:

- QR Yappy;
- `yappy_handle`;
- banco;
- tipo de cuenta;
- número de cuenta;
- nombre de cuenta.

## Comprobante

Archivos revisados:

- [`app/api/upload/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/upload/route.ts)
- [`app/api/orders/[id]/payment-proof/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/orders/[id]/payment-proof/route.ts)
- [`app/(app)/dashboard/pedidos/page.tsx`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(app)/dashboard/pedidos/page.tsx)

Hallazgos:

- el upload permite imágenes JPG, PNG y WebP;
- el tamaño máximo es 5 MB;
- el bucket permitido para comprobante es `payment-proofs`;
- `payment-proof` exige sesión, propiedad del pedido y que sea una orden manual;
- al registrar comprobante, la orden pasa a `paymentStatus = under_review`, `orderStatus = processing` y `adminReviewStatus = pending`;
- `Mis pedidos` ya tiene CTA claro para subir comprobante en órdenes pendientes;
- el flujo de tienda y el de `Mis pedidos` se complementan: tienda permite subir comprobante en éxito y `Mis pedidos` vuelve a ofrecer el mismo flujo.

## Mis pedidos

Archivo revisado:

- [`app/(app)/dashboard/pedidos/page.tsx`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(app)/dashboard/pedidos/page.tsx)

Hallazgos:

- la vista carga órdenes desde `GET /api/orders`;
- muestra estado de pedido, estado de pago, comprobante y referencia manual;
- muestra `adminReviewNotes` solo para rechazo;
- no usa `fulfillmentSummary` de K3;
- no muestra de forma explícita `backorderQty`, `availableStock` ni `productionEstimateDays`;
- por ahora no hay mensaje visible de producción estimada para el cliente en esta pantalla.

Riesgo de exposición:

- `adminReviewNotes` existe en el modelo de orden y en la pantalla de admin;
- en el frontend de cliente, el uso principal hoy es el box de rechazo;
- no se ve un consumo directo de la nota interna como mensaje general al cliente.

## Admin / pedidos

Archivo revisado:

- [`app/(admin)/admin/_components/sections/PedidosSection.tsx`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(admin)/admin/_components/sections/PedidosSection.tsx)

Hallazgos:

- `adminReviewNotes` se usa ampliamente para gestión interna;
- el admin ya puede ver el detalle del pedido, comprobante y motivo de rechazo;
- no se encontró una visualización específica de `fulfillmentSummary` porque K3 solo lo devuelve en `POST /api/orders`;
- el resumen de backorder está persistido solo como nota interna en `adminReviewNotes`, no como estado operativo dedicado.

## Respuesta de K3 y persistencia

Archivo revisado:

- [`app/api/orders/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/orders/route.ts)

Hallazgos:

- `POST /api/orders` devuelve `order`, `fulfillmentSummary` y `operationsSyncWarning`;
- `fulfillmentSummary` sí existe en la respuesta;
- la tienda actual no usa ese payload para renderizar un mensaje posterior más rico;
- la persistencia actual para el cliente se limita al `Order` creado y su flujo de pago/comprobante;
- K4-B probablemente necesite un campo o una lectura de respuesta adicional para exponer el mensaje de backorder en `Mis pedidos`.

## Riesgos detectados

- el copy `Yappy Manual` puede hacer pensar que solo existe un método de pago;
- QR y banco aparecen solo después de crear el pedido, no antes;
- el backorder de K3 todavía no es visible en `Mis pedidos`;
- si se usa `adminReviewNotes` de forma directa al cliente, habría riesgo de exponer texto interno;
- tienda y `Mis pedidos` duplican la posibilidad de subir comprobante, lo cual es útil pero puede sentirse repetido si no se aclara bien;
- el flujo manual sigue separado del checkout Stripe de paquetes, pero conviene seguir vigilando que no se mezclen.

## Recomendación K4-B

1. En tienda:
   - reemplazar `Yappy Manual` por un copy más claro, por ejemplo `Pago manual disponible después de crear el pedido`.
   - opcionalmente mostrar una mini pista con `Yappy / ACH disponibles`.
   - conservar el upload de comprobante en el modal de éxito.

2. En `Mis pedidos`:
   - mostrar QR Yappy y datos bancarios cuando el pedido esté `pending` o `under_review`.
   - mantener el upload de comprobante.
   - mostrar producción estimada / backorder con un mensaje derivado, no con la nota interna cruda.

3. En backend de lectura:
   - K4-B probablemente deba exponer un mensaje customer-facing derivado de `fulfillmentSummary` o de una persistencia segura.

## Qué no se tocó

- no se modificó código productivo;
- no se modificó `schema.prisma`;
- no se hicieron migraciones;
- no se tocó la BD;
- no se crearon pedidos reales;
- no se aprobaron ni rechazaron pagos;
- no se subieron comprobantes reales;
- no se tocaron reservas, stock, producción ni unidades;
- no se tocó Stripe;
- no se tocó `/dashboard/compras`.

## Skills usadas

- `prerescate-rules`
- `verification-loop`
- `api-design`
- `backend-patterns`
- `security-review`
- `error-handling`
- `frontend-patterns`
- `frontend-a11y`
- `design-system`
- `dashboard-builder`
- `brandkit`
- `coding-standards`

## Validaciones

- `git status --short`
- `git diff`
- `git diff --check`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`

## Conclusión

El flujo de pago y comprobante existe y es consistente, pero la visibilidad del backorder todavía está incompleta para el cliente. K3 resolvió el cálculo en servidor; K4-B debe traducirlo a una experiencia visible y segura en `Mis pedidos`, sin filtrar notas internas.
