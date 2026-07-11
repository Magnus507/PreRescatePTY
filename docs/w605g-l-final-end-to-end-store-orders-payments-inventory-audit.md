# W6.05G-L Final End-to-End Store, Orders, Payments, Backorder, and Inventory Audit

## Resumen ejecutivo

Se realizó una auditoría final read-only del flujo completo de tienda, creación de pedido, cálculo canónico de stock/backorder, `Mis pedidos`, pago/comprobante, admin/pedidos e inventario operativo.

Resultado general:

- la tienda quedó enfocada en productos personales;
- el backend de pedidos calcula stock/backorder en servidor;
- `Mis pedidos` ya muestra guía de pago y producción estimada derivada;
- el comprobante sigue asociado al pedido correcto;
- el inventario continúa agrupado por `productCode`;
- no se observan cambios de datos ni señales de desalineación nueva en inventario.

## Tienda

Archivo revisado:

- [`app/(app)/dashboard/tienda/page.tsx`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(app)/dashboard/tienda/page.tsx)

Hallazgos:

- el catálogo muestra solo productos personales;
- la opción empresarial no aparece como producto comprable;
- el botón de Empresa apunta a `/dashboard/empresas`;
- el selector de cantidad sigue operativo;
- el total cambia con la cantidad;
- cuando la cantidad supera el stock, se mantiene el copy de producción estimada de 2 semanas;
- el checkout solo aparece cuando hay producto personal seleccionado;
- el copy de pago ya no encierra al usuario en `Yappy Manual`;
- no se observa un formulario empresarial mezclado en la tienda;
- no hay señal de total `0.00` engañoso en el estado normal del catálogo.

## Backend Orders

Archivo revisado:

- [`app/api/orders/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/orders/route.ts)

Hallazgos:

- `POST /api/orders` usa la ruta canónica `Product.id -> ProductOperationalMapping -> productCode`;
- el pedido se rechaza si el mapping operativo no es válido;
- no se encontró fallback duro nuevo a `PRP-FG-STICKER` en esta fase;
- el total se calcula en servidor;
- `unitPrice` del cliente no es la fuente final;
- el backend calcula:
  - `availableStock`;
  - `stockCoveredQty`;
  - `backorderQty`;
  - `fulfillmentMode`;
  - `productionEstimateDays`;
  - `customerMessage`;
- la respuesta devuelve `fulfillmentSummary`;
- se guarda nota interna segura en `adminReviewNotes`;
- no se reserva stock;
- no se crea producción automática;
- no se crean unidades;
- no se despacha ni entrega.

## Mis Pedidos

Archivo revisado:

- [`app/(app)/dashboard/pedidos/page.tsx`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(app)/dashboard/pedidos/page.tsx)

Hallazgos:

- la vista lista pedidos del usuario;
- muestra `paymentStatus`;
- muestra guía de pago cuando el pedido está pendiente o en revisión;
- muestra instrucciones de pago con QR Yappy y datos bancarios si existen;
- mantiene el upload de comprobante;
- usa el flujo `POST /api/orders/[id]/payment-proof`;
- muestra `customerFulfillmentSummary` derivado para producción estimada/backorder;
- no expone `adminReviewNotes` crudo al cliente;
- no mezcla el checkout Stripe de packages con la tienda física.

## Pagos y comprobante

Archivos revisados:

- [`app/api/orders/[id]/payment-proof/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/orders/[id]/payment-proof/route.ts)
- [`app/api/upload/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/upload/route.ts)
- [`app/(app)/dashboard/tienda/page.tsx`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(app)/dashboard/tienda/page.tsx)
- [`app/(app)/dashboard/pedidos/page.tsx`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(app)/dashboard/pedidos/page.tsx)

Hallazgos:

- el upload acepta JPG, PNG y WebP;
- el límite sigue siendo 5 MB;
- el bucket de pago permitido es `payment-proofs`;
- el comprobante queda asociado al `orderId` del usuario;
- no se permite subir comprobante a un pedido ajeno;
- el flujo no aprueba ni rechaza automáticamente;
- el estado cambia a revisión manual según el endpoint existente;
- no se mueve inventario a partir del upload.

## Admin / Pedidos

Archivo revisado:

- [`app/(admin)/admin/_components/sections/PedidosSection.tsx`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(admin)/admin/_components/sections/PedidosSection.tsx)

Hallazgos:

- el panel admin conserva `adminReviewNotes`;
- admin sigue viendo comprobantes, estados y revisión manual;
- no se observó una exposición indebida al cliente desde esta vista;
- el flujo de operaciones no se rompe por los cambios de K3/K4.

## Inventario

Archivos revisados:

- [`lib/orders/store-order-fulfillment.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/lib/orders/store-order-fulfillment.ts)
- [`lib/operations/inventory-stock.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/lib/operations/inventory-stock.ts)
- [`app/api/admin/operations/commercial-orders/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/admin/operations/commercial-orders/route.ts)

Hallazgos:

- el inventario sigue agrupado por `productCode`;
- el helper de stock calcula `availableCount` desde unidades `available + passed + not_activated`;
- no se encontraron señales nuevas de mezcla normal/empresarial en el código auditado;
- el historial documentado sigue consistente con:
  - `PRP-FG-STICKER = 1`
  - `PRP-FG-STICKER-EMP = 2`
- no hay reservas, despachos ni activaciones inesperadas generadas por esta cadena de cambios;
- la lógica comercial/operativa sigue separando tienda y flujo empresarial.

## Riesgos remanentes

- el backorder se calcula al crear el pedido, pero no reserva stock;
- no existe producción automática desde la creación del pedido;
- si el stock cambia después de crear el pedido, la operación depende de admin;
- los métodos de pago dependen de la configuración pública;
- el pago sigue siendo de revisión manual;
- los pedidos empresariales siguen yendo por el módulo Empresa, no por tienda;
- `Mis pedidos` muestra un resumen derivado seguro, pero no un desglose operativo completo por línea.

## Decisión de cierre

**Cerrable con observaciones**

Motivo:

- el flujo end-to-end está coherente y funcional para tienda, pedidos, pagos y backorder visible;
- no hay bloqueadores técnicos nuevos;
- lo pendiente es de madurez operativa: reserva de stock, producción automática y mayor detalle customer-facing por línea, que pueden tratarse en una fase posterior si hacen falta.

## Qué no se tocó

- no se modificó código productivo;
- no se modificó `schema.prisma`;
- no se hicieron migraciones;
- no se tocó la BD;
- no se crearon pedidos reales;
- no se aprobaron ni rechazaron pagos;
- no se subieron comprobantes reales;
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

W6.05G queda coherente de punta a punta para la experiencia actual de tienda, pedido, pago manual, comprobante y backorder visible. La implementación es consistente y auditable, con observaciones operativas pendientes pero sin bloqueos para cerrar el frente funcional ya entregado.
