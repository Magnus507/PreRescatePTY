# W6.05G-K2-UX1 Scalable Store Catalog Fix

## Resumen ejecutivo

Se ajustó la tienda de `/dashboard/tienda` para que vuelva a sentirse como un catálogo escalable de productos personales, con empresa separada y checkout personal solo cuando corresponde. También se corrigió el bug visual del total inicial en `0.00`.

## Problema visual detectado

- La tienda se sentía diseñada para un solo producto.
- La sección empresarial se mezclaba con el checkout personal.
- Al tocar empresa, se abría el formulario de envío personal.
- El total podía verse como `$0.00` al inicio.
- La experiencia general se sentía cargada y poco escalable.

## Qué se cambió

### Catálogo personal

- La tienda ahora muestra los productos personales como catálogo.
- Cada card muestra:
  - nombre
  - descripción
  - precio unitario
  - stock disponible
  - selector de cantidad
  - total por producto
  - mensaje de stock o producción
  - botón de selección

### Checkout personal

- El formulario de envío solo aparece después de seleccionar un producto personal.
- El resumen muestra:
  - producto seleccionado
  - cantidad
  - precio unitario
  - total
  - stock disponible
- El texto de ayuda quedó alineado con el flujo de pago/comprobante desde `Mis pedidos`.

### Empresa separada

- La sección empresarial se mantiene aparte.
- Los productos empresariales no activan el checkout personal.
- El botón empresarial solo abre o refuerza el flujo separado.
- El copy visible deja claro que requieren revisión y flujo distinto.

### Total inicial

- El total por producto ahora se calcula como `precio x cantidad`.
- Se normaliza el precio si viniera como string.
- No se muestra un `$0.00` engañoso en el catálogo.
- El checkout solo aparece cuando hay producto personal seleccionado.

## Archivo modificado

- [`app/(app)/dashboard/tienda/page.tsx`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(app)/dashboard/tienda/page.tsx)

## Compatibilidad conservada

El payload sigue siendo compatible con el backend existente:

- `items[0].productType = selectedProduct.id`
- `items[0].quantity = quantity`
- `items[0].unitPrice = selectedProduct.price`
- `shippingAddress`
- `shippingCity`
- `shippingNotes`

No se cambió el contrato del endpoint.

## Qué no se tocó

- no se modificó `schema.prisma`;
- no se hicieron migraciones;
- no se tocó la BD;
- no se tocaron endpoints;
- no se tocó pagos ni comprobantes;
- no se tocó `Mis pedidos`;
- no se tocó `/dashboard/compras`;
- no se creó ningún pedido real;
- no se creó stock;
- no se activaron chips;
- no se tocaron reservas ni despachos.

## Validaciones

- `git status --short`
- `git diff`
- `git diff --check`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`

## Conclusión

La tienda volvió a una estructura clara: catálogo personal escalable, empresa separada y checkout solo cuando corresponde. El resultado evita el enredo visual y deja espacio para que se agreguen más productos normales sin rehacer la UX.
