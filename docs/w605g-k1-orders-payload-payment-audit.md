# W6.05G-K1 Orders Payload and Payment Audit

## Resumen ejecutivo

La tienda actual ya crea pedidos con cantidad en el backend, pero la UX y el payload siguen pensados para un producto único seleccionado desde una tarjeta/flujo heredado de combos. El endpoint de pedidos no conoce todavía un concepto explícito de backorder ni de producción estimada, y el checkout principal de Stripe sigue siendo un flujo distinto para paquetes, no para stickers por cantidad.

Esta auditoría identifica exactamente qué envía la tienda, qué endpoint recibe el pedido, cómo se calcula el total, cómo se maneja pago/comprobante y qué brechas quedan para K2/K3/K4.

## Payload actual desde `/dashboard/tienda`

Archivo revisado:

- [`app/(app)/dashboard/tienda/page.tsx`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(app)/dashboard/tienda/page.tsx)

### Endpoint usado

La tienda crea pedidos con:

- `POST /api/orders`

No usa `POST /api/orders/manual` desde esta pantalla.

### Payload que envía hoy

La función `handleCreateOrder` manda este body:

```ts
{
  items: [{
    productType: selectedProduct.id,
    quantity: 1,
    unitPrice: selectedProduct.price,
  }],
  shippingAddress: shippingData.address,
  shippingCity: shippingData.city,
  shippingNotes: shippingData.notes
}
```

### Campos enviados hoy

- `productType`: sí, usa el `id` del producto seleccionado.
- `quantity`: sí, pero siempre `1` en el flujo actual.
- `unitPrice`: sí, desde `selectedProduct.price`.
- `total`: no.
- `productId`: no.
- `productCode`: no.
- `name`: no.
- `shippingAddress`: sí.
- `shippingCity`: sí.
- `shippingNotes`: sí.
- `customer info`: no, porque el backend lo toma de la sesión.
- `payment method`: no.
- `stock/backorder metadata`: no.

### Brecha importante

Aunque el backend acepta cantidad, la tienda todavía no expone un selector de cantidad para este flujo y sigue operando visualmente como producto único / combo heredado.

## Endpoint de creación de pedidos

Archivo revisado:

- [`app/api/orders/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/orders/route.ts)

### Qué hace

- valida sesión con `getServerSession(authOptions)`;
- carga usuario y perfil;
- valida el payload con `orderCreateSchema`;
- recalcula `unitPrice` en servidor;
- crea `Order` con `orderNumber` nuevo;
- crea `OrderItem[]` por cada item recibido;
- sincroniza el pedido a Operaciones con `syncRealOrderToOperations`.

### Cómo trata `quantity`

- sí lo soporta;
- cada item debe traer `quantity` entero positivo;
- el total se calcula en servidor como suma de `unitPrice * quantity`.

### Cómo trata `unitPrice`

- no confía solo en el cliente para el total;
- el servidor recalcula precio final usando el producto resuelto;
- para productos de tienda, busca el producto activo en `prisma.product`.

### Cómo resuelve el producto

Actualmente intenta resolver por:

- `id === item.productType`
- `name === item.productType`

Luego usa `storeProduct.name` y `storeProduct.price`.

Esto significa:

- no resuelve por `productCode` canónico;
- no consulta `ProductOperationalMapping` en este endpoint;
- no usa stock/backorder;
- no usa `availableStock` de operaciones.

### Qué hace con operaciones

El pedido se sincroniza con:

- [`lib/operations/sync-real-order-to-operations.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/lib/operations/sync-real-order-to-operations.ts)

Ese helper:

- construye `code` operativo;
- mapea cada item a requerimiento operacional;
- crea o actualiza `OperationCommercialOrder`;
- no reserva stock;
- no crea unidades;
- no despacha;
- no produce físicamente nada por sí mismo.

## `manual` route

Archivo revisado:

- [`app/api/orders/manual/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/orders/manual/route.ts)

### Observación

Esta ruta es para un flujo manual de paquete, no para la tienda por cantidad de stickers.

Hallazgos:

- requiere `packageId`;
- crea orden con `pkg.price` y `pkg.maxChips`;
- sincroniza a operaciones como un pedido tipo checkout/paquete;
- no es la ruta correcta para la nueva tienda de stickers por cantidad.

## Producto / mapping / stock

### Stock operativo

Archivo revisado:

- [`lib/operations/inventory-stock.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/lib/operations/inventory-stock.ts)

### Qué ya existe

- inventario por `productCode`;
- conteo de `availableCount`;
- detalle de unidades por `productCode`;
- vínculo de cada unidad a `productionOrderId` vía `digitalBatchItem`.

### Qué no existe en el endpoint actual de tienda

- resolución explícita por `productCode` canónico;
- consulta a `ProductOperationalMapping`;
- cálculo de `availableStock`;
- cálculo de `requestedQty`;
- cálculo de `backorderQty`;
- campo de `fulfillmentMode`.

## Estados de pedido

### Campos actuales útiles

Desde `app/api/orders/route.ts` y el modelo de orden:

- `orderStatus`
- `paymentStatus`
- `shippingAddress`
- `shippingCity`
- `shippingNotes`
- `providerReference`
- `manualPaymentReference`
- `paymentProofUrl`

### Estados que ya aparecen en el flujo

- `pending`
- `processing`
- `completed`
- `cancelled`
- `under_review`
- `paid`
- `rejected`

### Limitación actual

No hay una columna o enum explícito para:

- `backorder`
- `production_requested`
- `production_pending`

Sin migración, esa semántica tendría que representarse con:

- `orderStatus = processing`
- `paymentStatus = under_review` o `pending`
- una nota/metadata operativa

## Mis pedidos

Archivo revisado:

- [`app/(app)/dashboard/pedidos/page.tsx`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(app)/dashboard/pedidos/page.tsx)

### Qué muestra hoy

- lista de pedidos;
- estado de pedido;
- estado de pago;
- CTA para subir comprobante;
- seguimiento visual de pedidos activos.

### Dónde se sube comprobante

- vía `payment-proof` en el panel de pedido.

### Qué falta para la nueva UX

- mostrar mensaje de producción estimada;
- diferenciar claramente stock disponible versus backorder;
- mostrar que el pedido fue aceptado aunque parte vaya a producción.

## Métodos de pago y comprobante

### De dónde sale la configuración

- [`app/api/payments/checkout/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/payments/checkout/route.ts) usa `packageId` y Stripe para planes;
- [`app/api/public/config`] se usa desde la tienda para cargar datos de pago;
- el flujo manual de comprobante usa `payment-proof`.

### Qué se observa

- la tienda actual no muestra un checkout de stickers por cantidad;
- la configuración de pago sigue existiendo para Yappy / banco / QR en el sistema;
- el endpoint `payment-proof` sí sirve para recibir comprobante manual.

### Recomendación

- en K2/K3, la tienda por cantidad puede mostrar métodos de pago después de crear el pedido o en un panel de checkout ligero;
- no duplicar el checkout Stripe de packages para stickers;
- usar el flujo actual de pedido + comprobante como base.

## Flujo actual real

1. El usuario elige un producto en la tienda.
2. La tienda manda `POST /api/orders`.
3. El backend resuelve producto activo y recalcula total.
4. Se crea `Order` + `OrderItem[]`.
5. Se sincroniza a Operaciones.
6. El pedido aparece en `Mis pedidos`.
7. El usuario puede subir comprobante si aplica.
8. Admin revisa el pago.
9. Operaciones continúa el flujo de inventario / producción / activación.

## Brechas para tienda por cantidad

- la tienda todavía se ve como combo / producto único;
- el payload no trae `productCode` canónico;
- no hay cálculo de stock/backorder;
- no se transmite `availableStock` ni `backorderQty`;
- `Mis pedidos` no muestra producción estimada;
- el checkout Stripe de packages no cubre stickers;
- la tienda no muestra claramente métodos de pago para este nuevo flujo;
- empresa y personal necesitan copy separado.

## Recomendación por fases

### K2 - Frontend tienda por cantidad

- cambiar la UI para seleccionar cantidad;
- eliminar vocabulario de combos;
- enviar `quantity` real;
- mostrar precio total en vivo;
- mostrar copy de stock o producción.

### K3 - Endpoint y stock/backorder

- resolver producto por `productCode` o `productId` canónico;
- calcular `availableStock` en servidor;
- calcular `backorderQty`;
- guardar metadata o nota de backorder;
- mantener total calculado por servidor;
- no reservar stock si aún no existe la lógica.

### K4 - Mis pedidos y pago

- mostrar producción estimada;
- mostrar métodos de pago / comprobante de forma clara;
- mantener el upload de comprobante;
- reflejar estados de backorder o producción pendiente.

## Qué no se tocó

- no se modificó código;
- no se tocaron endpoints;
- no se tocó BD;
- no se hicieron migraciones;
- no se creó ningún pedido real;
- no se creó stock.

## Validación

Auditoría realizada en modo read-only sobre:

- tienda
- pedidos
- orders route
- manual route
- payment proof
- checkout
- webhook
- inventory stock
- operations sync

## Conclusión

El backend actual sí soporta cantidad en pedidos, pero aún no soporta semántica de tienda por cantidad con stock/backorder. La próxima implementación debe separar claramente:

- la UX de cantidad;
- la resolución canónica del producto;
- el cálculo de stock;
- la comunicación de backorder;
- y el flujo de pago/comprobante para no mezclarlo con el checkout de packages.
