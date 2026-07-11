# W6.05G-K2 Store Quantity Frontend Implementation

## Resumen ejecutivo

Esta fase implementa la tienda por cantidad en el frontend de `/dashboard/tienda` para vender `Sticker PreRescatePTY` con selector de unidades, total en vivo y copy de stock o producción estimada. La lógica de backend, pagos, comprobantes y BD no se modifica en esta etapa.

## Qué se implementó

- Se reemplazó la experiencia heredada de combos por una experiencia centrada en `Sticker PreRescatePTY`.
- Se agregó selector de cantidad con controles `- / +` e input numérico.
- Se calculó el total en vivo en el frontend con `cantidad x precio unitario`.
- Se mostró copy de stock disponible o producción estimada usando los datos que expone `/api/products`.
- Se mantuvo el flujo de creación de pedido compatible con el backend existente.
- Se reforzó el mensaje de éxito para indicar que, si falta stock, la producción estimada es de 2 semanas y que el comprobante se revisa desde `Mis pedidos`.
- Se dejó la sección empresarial separada, sin mezclarla con la compra personal.

## Archivo modificado

- [`app/(app)/dashboard/tienda/page.tsx`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(app)/dashboard/tienda/page.tsx)

## Cambios de UX

### Hero principal

- Se ajustó el encabezado para hablar de compra por cantidad.
- Se orientó el copy a `Sticker PreRescatePTY`.
- Se añadió una tarjeta destacada con precio unitario, stock disponible y estimación de producción.

### Selector de cantidad

- Se agregó un contador visual con `-` y `+`.
- Se aceptan cantidades mayores al stock disponible.
- El total se recalcula en tiempo real.

### Mensaje de stock

- Si hay stock suficiente, se muestra disponibilidad.
- Si no alcanza el stock, se muestra el excedente que entra a producción.
- Si no hay stock, se informa producción estimada de 2 semanas.

### Éxito de pedido

- Se actualizó el copy del modal de confirmación.
- Se dejó claro que el pago y el comprobante se revisan desde `Mis pedidos`.
- Se mantuvo el acceso a `Mis pedidos` y a `Mis dispositivos`.

## Payload

El frontend mantiene compatibilidad con el backend actual:

- `items[0].productType = selectedProduct.id`
- `items[0].quantity = quantity`
- `items[0].unitPrice = selectedProduct.price`
- `shippingAddress`, `shippingCity` y `shippingNotes` siguen igual

No se cambió el contrato del endpoint en esta fase.

## Qué no se tocó

- no se modificó `schema.prisma`;
- no se hicieron migraciones;
- no se tocó la BD;
- no se modificaron endpoints;
- no se agregó lógica de stock en servidor;
- no se implementó checkout nuevo;
- no se cambió el flujo de comprobantes;
- no se creó pedido real en pruebas;
- no se creó stock desde script.

## Validaciones previstas

Antes de cerrar la fase, deben revisarse:

- `git status --short`
- `git diff`
- `git diff --check`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`

## Conclusión

K2 deja lista la experiencia visual y de interacción para compra por cantidad, sin romper el contrato actual del backend. La siguiente fase puede trabajar stock/backorder o estados operativos si hace falta, pero esta implementación ya entrega la UI funcional para el flujo nuevo.
