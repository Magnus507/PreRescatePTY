# W6.05G-J Technical Design

## Tienda por cantidad, stock/backorder, pedidos y pagos

## Resumen ejecutivo

La tienda actual todavía está modelada alrededor de conceptos heredados de combo y producto único por pedido. Para la nueva decisión comercial, el sistema debe vender el producto real `Sticker PreRescatePTY`, permitir cantidad variable y aceptar el pedido incluso cuando el stock no alcance, marcando el exceso como backorder/producción estimada.

Esta fase es solo de diseño técnico y UX. No implementa cambios en código ni toca BD.

## Qué se observó en el código actual

### Tienda

Archivo revisado:

- [`app/(app)/dashboard/tienda/page.tsx`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(app)/dashboard/tienda/page.tsx)

Hallazgos:

- la UI aún contiene vocabulario y metadata de combos;
- el flujo crea pedidos con `quantity`, pero la pantalla todavía está organizada como compra de un solo producto por selección;
- la tienda usa `productType` como identificador de item al crear pedido;
- la separación personal/empresarial ya existe, pero no hay un modelo claro de backorder visible para el cliente.

### Pedidos del cliente

Archivo revisado:

- [`app/(app)/dashboard/pedidos/page.tsx`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(app)/dashboard/pedidos/page.tsx)

Hallazgos:

- la vista de “Mis pedidos” ya sabe mostrar estados de pedido, comprobante y seguimiento;
- el panel no está expresamente diseñado para distinguir “stock disponible” versus “producción pendiente” como experiencia comercial;
- esto hace posible adaptar el estado del pedido, pero hay que definir el vocabulario.

### Creación de pedido

Archivo revisado:

- [`app/api/orders/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/orders/route.ts)

Hallazgos:

- el endpoint ya acepta `items[]` con `quantity` y `unitPrice`;
- el servidor recalcula `totalPrice` y crea `OrderItem` por cantidad;
- el endpoint actualmente sigue mapeando producto desde `productType`/nombre y sincroniza a operaciones;
- sí soporta cantidad hoy;
- no está diseñado todavía para backorder explícito ni para mensaje de “producción estimada 2 semanas”.

### Pago / checkout

Archivo revisado:

- [`app/api/payments/checkout/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/payments/checkout/route.ts)

Hallazgos:

- checkout actual es por `packageId` y flujo de Stripe para planes;
- no representa el nuevo carrito de tienda por cantidad;
- no es la ruta adecuada para el producto físico de sticker por cantidad.

### Comprobante manual

Archivo revisado:

- [`app/api/orders/[id]/payment-proof/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/orders/[id]/payment-proof/route.ts)

Hallazgos:

- ya existe el flujo de envío de comprobante manual;
- el pedido pasa a `paymentStatus = under_review` y `orderStatus = processing`;
- esto encaja con un pedido por cantidad y eventual backorder, siempre que el estado de pedido se nombre bien.

### Webhook Stripe

Archivo revisado:

- [`app/api/payments/webhook/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/payments/webhook/route.ts)

Hallazgos:

- el webhook activa planes `packageId`, no tienda de stickers;
- crea una orden Stripe separada y la sincroniza a operaciones;
- no debe reutilizarse como base para la nueva compra por cantidad.

### Stock operativo

Archivo revisado:

- [`lib/operations/inventory-stock.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/lib/operations/inventory-stock.ts)

Hallazgos:

- el stock se calcula por `productCode` desde `OperationFinishedGoodUnit`;
- `availableCount` existe como métrica exacta;
- el sistema ya puede decir cuántas unidades hay disponibles para un producto;
- esa misma capa sirve para decidir si una parte del pedido entra a stock o a producción.

## Modelo comercial recomendado

### Producto vendible

- `Sticker PreRescatePTY`

### Cantidad

- se elige en la tienda;
- el servidor debe recibir `quantity`;
- el precio no debe depender solo del cliente.

### Precio

- `unitPrice` desde servidor / producto;
- `total = unitPrice * quantity`.

### Inventario

- `availableStock` debe salir del inventario operativo de la unidad real;
- si `quantity <= availableStock`, el pedido se considera cubierto por stock;
- si `quantity > availableStock`, el pedido sigue permitiéndose y el excedente pasa a backorder/producción.

## Regla comercial de backorder

### Caso A

- `availableStock = 10`
- `quantity = 3`
- mensaje recomendado:
  - `Disponible para pedido.`

### Caso B

- `availableStock = 2`
- `quantity = 10`
- mensaje recomendado:
  - `Tenemos 2 disponibles. Las 8 restantes entran a producción. Tiempo estimado: 2 semanas.`

### Caso C

- `availableStock = 0`
- `quantity = 5`
- mensaje recomendado:
  - `No tenemos stock disponible ahora. Puedes crear el pedido; producción estimada: 2 semanas.`

## UX recomendado para la tienda

### Card principal

- producto: `Sticker PreRescatePTY`
- precio unitario
- disponibilidad actual
- selector de cantidad con `- / +` o input numérico
- total visible en tiempo real
- mensaje de stock o producción
- CTA: `Crear pedido` o `Continuar con envío`

### Vocabulario a eliminar

- combos personales
- combo seleccionado
- elegir combo
- combo estándar
- combo dúo
- combo familiar
- combo hogar full

### Vocabulario nuevo

- producto
- cantidad
- unidades
- stock disponible
- producción estimada
- total
- crear pedido

## Empresa

Recomendación:

- mantener `Sticker PreRescatePTY Empresarial` en sección separada;
- si el flujo empresarial requiere revisión, no mezclarlo con compra personal;
- si se habilita compra directa empresarial, también debería aceptar cantidad y mostrar la misma lógica de stock/backorder, pero con copy empresarial.

## Impacto en pedidos

### Preguntas auditadas

- ¿ya soporta quantity? Sí.
- ¿ya soporta producto único con cantidad? Sí, pero la UX aún no lo expresa bien.
- ¿hay que modificar endpoint en la siguiente fase? Probablemente sí, si se quiere enviar stock/backorder explícito como estado o metadato.
- ¿cómo se mantiene Mis pedidos correcto? Con un estado derivado de pago + fulfillment + stock/backorder.

### Estados recomendados para Mis pedidos

- `pending_payment`
- `under_review`
- `confirmed`
- `processing`
- `backorder`
- `ready_to_ship`
- `shipped`
- `delivered`

## Pagos y comprobantes

### Situación actual

- el checkout está separado para packages;
- la tienda de stickers usa pedido manual y comprobante;
- el flujo manual ya soporta subir comprobante y pasar a revisión.

### Recomendación

- la tienda por cantidad debe seguir el flujo de pedido + pago/comprobante actual, pero con una semántica clara:
  - pedido aceptado aunque falte stock;
  - comprobante puede llegar después;
  - fulfillment puede quedar en `backorder` o `production_requested`.

## Stock y producción

La capa operativa ya calcula stock por `productCode`, así que el diseño recomendado es:

- una sola fuente de verdad para inventario disponible;
- el pedido comercial calcula cuántas unidades salen de stock;
- el excedente genera una cola o un estado de producción pendiente;
- no crear combos como inventario separado.

## Recomendación técnica para la siguiente implementación

1. Cambiar la tienda para vender `Sticker PreRescatePTY` con selector de cantidad.
2. Calcular `availableStock` y `backorderQty` en servidor.
3. Mantener el pedido aunque no haya stock total.
4. Guardar un estado/nota de backorder en el pedido.
5. Ajustar “Mis pedidos” para mostrar producción estimada 2 semanas.
6. Mantener empresa separada con su propio copy.

## Qué no se tocó

- no se cambió `schema.prisma`;
- no se hicieron migraciones;
- no se tocó BD;
- no se implementó código productivo;
- no se modificaron endpoints;
- no se creó pedido real;
- no se creó stock.

## Validación

Esta fase es de auditoría y diseño.

Documentación base revisada:

- [`docs/w605g-a*`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/docs)
- [`docs/w605g-b*`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/docs)
- [`docs/w605g-c*`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/docs)
- [`docs/w605g-f*`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/docs)
- [`docs/w605g-g*`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/docs)
- [`docs/w605g-h3*`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/docs)

## Próximo paso sugerido

Implementar la nueva tienda por cantidad y el estado de backorder en una fase siguiente, usando el diseño anterior como guía y sin romper el checkout ni los pedidos ya existentes.
