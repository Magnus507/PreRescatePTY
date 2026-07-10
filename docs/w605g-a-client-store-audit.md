# W6.05G-A - Auditoria de Tienda Cliente

## 1. Resumen ejecutivo

La tienda cliente ya cuenta con una base tecnica importante: el catalogo publico consume `Product` a traves de `ProductOperationalMapping`, valida publicacion, exige base operacional y muestra stock derivado de inventario operativo. Esto protege la decision de W6.03: no vender productos sin mapeo canonico ni producto terminado valido.

La oportunidad principal no es reconstruir la tienda, sino ordenar la experiencia. Hoy conviven dos superficies de compra:

- `/dashboard/tienda`: tienda cliente actual por productos publicados y secciones de mapping.
- `/dashboard/compras`: flujo legacy de paquetes/combos manuales.

Esa dualidad puede confundir al cliente y al equipo si no se define una direccion en W6.05G-B. La tienda nueva va en la direccion correcta para W6.03, pero visualmente todavia se siente menos alineada con Home, Perfiles y Mis dispositivos.

## 2. Mapa de archivos revisados

### Frontend cliente

- [`app/(app)/dashboard/tienda/page.tsx`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(app)/dashboard/tienda/page.tsx)
- [`app/(app)/dashboard/compras/page.tsx`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(app)/dashboard/compras/page.tsx)
- [`app/(app)/dashboard/pedidos/page.tsx`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(app)/dashboard/pedidos/page.tsx)
- [`app/(public)/comprar/page.tsx`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(public)/comprar/page.tsx)
- [`app/(public)/comprar/ComprarContent.tsx`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(public)/comprar/ComprarContent.tsx)

### APIs cliente / publica

- [`app/api/products/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/products/route.ts)
- [`app/api/orders/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/orders/route.ts)
- [`app/api/orders/manual/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/orders/manual/route.ts)
- [`app/api/orders/[id]/payment-proof/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/orders/[id]/payment-proof/route.ts)
- [`app/api/payments/checkout/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/payments/checkout/route.ts)
- [`app/api/payments/webhook/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/payments/webhook/route.ts)

### Admin / operaciones relacionadas

- [`app/api/admin/products/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/admin/products/route.ts)
- [`app/api/admin/products/[id]/operational-mapping/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/admin/products/[id]/operational-mapping/route.ts)
- [`app/api/admin/operations/finished-goods/[id]/publish-to-store/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/admin/operations/finished-goods/[id]/publish-to-store/route.ts)
- [`app/api/admin/operations/finished-goods/finished-goods.helpers.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/admin/operations/finished-goods/finished-goods.helpers.ts)
- [`app/api/admin/operations/commercial-orders/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/admin/operations/commercial-orders/route.ts)

### Helpers / dominios

- [`lib/products/product-operational-mapping.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/lib/products/product-operational-mapping.ts)
- [`lib/products/group-products-by-store-section.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/lib/products/group-products-by-store-section.ts)
- [`lib/operations/commercial-product-mapping.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/lib/operations/commercial-product-mapping.ts)
- [`lib/operations/sync-real-order-to-operations.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/lib/operations/sync-real-order-to-operations.ts)
- [`domains/shared/services/payment.service.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/domains/shared/services/payment.service.ts)

### Documentacion relacionada

- [`docs/w603a-products-store-inventory-audit.md`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/docs/w603a-products-store-inventory-audit.md)
- [`docs/w603b-product-store-inventory-design.md`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/docs/w603b-product-store-inventory-design.md)
- [`docs/w603c-product-operational-mapping-implementation.md`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/docs/w603c-product-operational-mapping-implementation.md)
- [`docs/w605f-b-client-devices-chips-design.md`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/docs/w605f-b-client-devices-chips-design.md)

## 3. Modelos Prisma relacionados

- `Product`: catalogo comercial, nombre, precio, imagen, categoria, tipo, personalizacion y estado activo.
- `ProductOperationalMapping`: puente canonico entre catalogo, tienda, inventario operativo, tipo de dispositivo, flujo de compra y publicacion.
- `OperationFinishedGood`: producto terminado operacional/base.
- `OperationFinishedGoodUnit`: unidad fisica trazable con estado, reserva, despacho y activacion.
- `Order`: pedido cliente/manual/stripe/admin/corporativo.
- `OrderItem`: snapshot historico de item, cantidad, precio, perfil y chip si aplica.
- `Package`: paquetes/combos legacy usados por `/dashboard/compras`, `/api/orders/manual` y checkout Stripe.

## 4. Flujo actual del usuario

### Entrada

- El cliente entra desde el panel a `Tienda`.
- Algunas rutas antiguas o CTAs pueden seguir apuntando a `/dashboard/compras`.
- La tienda nueva carga productos con `GET /api/products`.

### Visualizacion de productos

- La UI agrupa productos con `groupProductsByStoreSection(products, "public")`.
- Se muestran secciones basadas en `storeSection`.
- Cada card muestra imagen, categoria, `productType`, descripcion, tiempo estimado, personalizacion, stock operativo, precio y CTA.

### Compra / solicitud

- En `/dashboard/tienda`, el CTA `Solicitar` abre checkout inline en mobile o modal en desktop.
- El checkout pide direccion, ciudad y notas.
- El metodo visible es `Yappy Manual`.
- Para productos personalizados, el cliente debe escoger un perfil con chip activo.
- La orden se crea con `POST /api/orders`.

### Pago

- Tras crear el pedido, la tienda muestra instrucciones de Yappy/ACH desde `/api/public/config`.
- El cliente puede subir comprobante desde el modal de exito o luego desde `Mis pedidos`.
- El comprobante va a `/api/upload` y luego a `POST /api/orders/[id]/payment-proof`.
- El pago queda `under_review`; no se aprueba automaticamente.

### Pedidos

- `Mis pedidos` carga `GET /api/orders`.
- Permite enviar comprobante o referencia si el pedido manual lo permite.
- Admin sigue siendo quien revisa y aprueba/rechaza.

### Conexion con activacion

- La tienda no activa chips.
- La compra puede terminar generando pedido y luego flujo operacional/entrega.
- La activacion vive separada en `Mis dispositivos`.
- Para accesorios personalizados, la tienda valida que el perfil ya tenga chip activo antes de pedir el accesorio.

## 5. Productos y mapping

### Lo que esta bien

- `GET /api/products` consulta `Product` activo e incluye `operationalMapping` con `finishedGood`.
- El endpoint descarta productos sin mapping publicado.
- El endpoint descarta mappings sin `storeSection` valida.
- El endpoint descarta productos sin `finishedGoodId`, sin `productCode`, sin `finishedGood` o con `OperationFinishedGood.status === "inactive"`.
- El stock se toma desde inventario operativo con `loadInventoryStockRows()`.
- Stock cero no oculta el producto si la base operacional existe; la UI lo muestra como `Sin stock operativo` y deshabilita compra.
- `groupProductsByStoreSection` vuelve a filtrar en modo publico por `isPublished` y seccion valida.

### Riesgos detectados

- La creacion de orden usa `item.productType = selectedProduct.id`, pero luego `POST /api/orders` resuelve el producto por `id` o `name` y guarda `productType: storeProduct.name`. Funciona para snapshot historico, pero no preserva directamente `productId`, `finishedGoodId` o `productCode` en `OrderItem`.
- `syncRealOrderToOperations` recibe `productCode: item.productType`, que para tienda nueva puede quedar como nombre comercial, no necesariamente como `ProductOperationalMapping.productCode`.
- La UI muestra secciones empresariales si estan publicadas, pero la compra directa debe respetar `purchaseFlow`, `requiresCompanyContext` y `requiresApproval`. En la UI actual no se observa una separacion fuerte de compra directa vs solicitud empresarial.
- `/dashboard/compras` sigue creando pedidos por `Package` y no por `ProductOperationalMapping`. Es legacy util, pero no debe confundirse con la tienda nueva.

## 6. Endpoints auditados

### `GET /api/products`

- Tipo: publico/cliente de catalogo.
- Seguridad de publicacion: buena.
- Respeta W6.03: si, al exigir mapping publicado y base operacional.
- Riesgo: devuelve metadata empresarial/futura si el mapping se publica sin reglas de UX claras.

### `POST /api/orders`

- Requiere sesion.
- Tiene rate limit por usuario.
- Valida payload con `orderCreateSchema`.
- Recalcula precio desde DB para `CHIP_EXTRA`, combos con providerReference y productos de tienda.
- Para accesorios personalizados valida perfil de la misma cuenta, no corporativo, y chip activo.
- Riesgo: la sincronizacion operacional todavia puede depender de nombre comercial en vez del codigo canonico de mapping.

### `POST /api/orders/manual`

- Requiere sesion.
- Valida con Zod.
- Usa `Package` activo y precio desde DB.
- Crea pedido manual legacy de paquete.
- Riesgo: convive con tienda nueva sin una decision UX clara.

### `POST /api/orders/[id]/payment-proof`

- Requiere sesion.
- Verifica propiedad del pedido.
- Solo permite ordenes manuales.
- Valida estado permitido con `canSubmitManualProof`.
- Normaliza URL y restringe comprobantes al bucket `payment-proofs`.
- No aprueba pago automaticamente.

### `POST /api/payments/checkout`

- Requiere sesion.
- Valida `Package` activo.
- Usa precio desde DB para Stripe.
- Pertenece mas al flujo de paquetes/account que a tienda nueva.

### `POST /api/payments/webhook`

- Valida firma Stripe.
- Valida monto/currency contra metadata.
- Crea orden idempotente por providerReference.
- Sincroniza a operaciones.

## 7. UX actual

### Fortalezas

- Hay agrupacion por secciones canonicas.
- Producto agotado queda deshabilitado.
- Checkout mobile es inline, no modal pesado.
- Exito permite subir comprobante inmediatamente.
- Personalizacion exige perfil y chip activo, lo cual reduce compras imposibles.

### Debilidades

- El hero usa una imagen externa de Unsplash y una estetica que no conversa del todo con Home, Perfiles y Mis dispositivos.
- Las cards son grandes, muy redondeadas y con jerarquia mas de catalogo generico que de producto vital/proteccion.
- `Inversion`, `Solicitar`, `Equipamiento de Proteccion` y `Catalogo Oficial` mezclan tono premium con tono administrativo/comercial.
- Los badges de `category` y `productType` pueden sentirse tecnicos o redundantes.
- La tienda no explica claramente la diferencia entre dispositivo, accesorio personalizado, combo, solicitud empresarial o producto futuro.
- En desktop hay mucho alto visual por card; en mobile puede sentirse largo antes de llegar al CTA.
- No se ve un carrito persistente; el flujo es de compra de un producto a la vez.
- El modal de checkout desktop usa lenguaje visual distinto al resto del dashboard nuevo.

## 8. Mobile-first

### Lo que funciona

- Checkout se vuelve inline en mobile.
- Los botones son grandes.
- El selector de perfil esta optimizado para tap.
- El exito de pedido tambien se muestra inline.

### Riesgos mobile

- Cards de producto con imagen cuadrada pueden consumir demasiado alto.
- Badges y textos pequenos con tracking amplio pueden perder legibilidad.
- Formulario de checkout no parece tener una barra de accion persistente; si crece, el CTA puede quedar lejos.
- La experiencia puede sentirse mas como catalogo e-commerce clasico que como panel PreRescueID.

## 9. Desktop

### Lo que funciona

- Grid 3 columnas aprovecha ancho.
- Secciones por mapping dan estructura.
- Modal de checkout evita navegar fuera.

### Riesgos desktop

- La tienda visualmente no hereda suficiente del sistema BRAND-D aplicado al dashboard.
- El modal de checkout ocupa una estetica diferente a la home.
- Mucho radio y sombras grandes pueden hacer que la tienda se vea anterior al nuevo lenguaje visual.

## 10. Vocabulario recomendado

### Mantener

- `Tienda`
- `Mis pedidos`
- `Dispositivo`
- `Chip activo`
- `Sticker`
- `Accesorio personalizado`
- `Agotado`
- `Disponible`
- `Activar chip`

### Ajustar

- `Solicitar` puede ser util para accesorios/empresa, pero para compra directa conviene `Comprar`, `Pedir ahora` o `Agregar al pedido`.
- `Inversion` puede sonar forzado; para cliente final `Precio` es mas claro.
- `Sin stock operativo` es correcto tecnicamente, pero para cliente final conviene `Agotado temporalmente`.
- `Catalogo Oficial` puede quedarse, pero con menos protagonismo.

### Evitar como texto principal

- `ProductOperationalMapping`
- `finishedGood`
- `stock operativo`
- `providerReference`
- `manual`
- codigos internos no necesarios

## 11. Estados y casos auditados

- Sin productos: existe empty state `Suministros agotados temporalmente`.
- Producto disponible: CTA habilitado.
- Producto agotado: CTA deshabilitado y estado visible.
- Producto sin mapping: filtrado por API y por grouping publico.
- Producto no publicado: filtrado.
- Producto sin base operacional: filtrado.
- Producto empresarial: puede aparecer si se publica; requiere decision UX segun `purchaseFlow`.
- Accesorio personalizado: exige perfil y chip activo.
- Combo/paquete: vive principalmente en `/dashboard/compras` y `Package`.
- Checkout vacio: no aplica como carrito; flujo producto unico.
- Error de carga: loading silencioso, sin error state fuerte si falla `fetch("/api/products")`.
- Pago pendiente: se registra como pedido pendiente/manual.
- Pedido creado: modal de exito.
- Pago subido: queda bajo revision.
- Pedido completado: se observa desde `Mis pedidos`.

## 12. Seguridad y logica sensible

### Confirmado

- La tienda no crea orden sin accion explicita del usuario.
- `POST /api/orders`, `POST /api/orders/manual`, `POST /api/payments/checkout` y comprobantes requieren sesion.
- Los precios relevantes se recalculan en servidor desde DB, no se confia solo en `unitPrice` del cliente.
- El pago manual no se aprueba automaticamente.
- El comprobante se restringe al bucket esperado.
- Los pedidos se filtran por `userId`.
- Producto sin mapping valido no aparece en `GET /api/products`.

### Riesgos a vigilar

- `POST /api/orders` deberia idealmente guardar o sincronizar identificadores canonicos del mapping, no solo nombre comercial.
- Si se publican productos con `purchaseFlow` empresarial, la UI debe evitar compra directa accidental.
- `GET /api/products` no requiere sesion; esto puede ser correcto para catalogo publico, pero debe ser intencional si hay precios/secciones privadas futuras.
- El flujo legacy de paquetes puede seguir usando `Package`, lo que debe quedar claramente separado de tienda basada en mapping.

## 13. Riesgos principales

- Romper W6.03 si se rediseña tienda ignorando `ProductOperationalMapping`.
- Vender producto no publicable si se agrega otro endpoint o filtro cliente-only.
- Mezclar empresa/personal si `business_devices` se publica sin flujo de solicitud.
- Romper pedidos si se cambia `OrderItem` sin plan de compatibilidad.
- Romper pagos si se mezcla Stripe packages con pedidos manuales de tienda.
- Manipular stock/reserva desde UI cliente en lugar de operaciones/admin.
- Duplicar rutas `tienda`, `compras`, accesorios y combos sin arquitectura clara.
- Exponer IDs internos o codigos operativos como lenguaje principal.
- Desconectar compra de activacion y de `Mis dispositivos`.

## 14. Propuesta para W6.05G-B

### Direccion visual

Aplicar la marca ya consolidada:

- fondo oscuro/premium controlado;
- rojo emergencia solo para CTA principal;
- superficies claras solo donde aumenten lectura;
- cards menos gigantes y mas escaneables;
- producto como objeto de proteccion, no catalogo generico.

### Arquitectura de tienda

Recomendada:

1. Hero compacto: estado de tienda, promesa y CTA.
2. Secciones por mapping:
   - `Dispositivos personales`
   - `Accesorios personalizados`
   - `Empresarial` como solicitud, no compra directa si aplica.
3. Cards con jerarquia:
   - nombre;
   - tipo humano;
   - disponibilidad;
   - precio;
   - CTA;
   - requisitos breves.
4. Checkout inline mobile-first.
5. Exito conectado a `Mis pedidos` y `Mis dispositivos`.

### Reglas tecnicas para B

- No tocar W6.03.
- Consumir solo `/api/products` o una evolucion compatible que preserve mapping.
- No comprar productos sin mapping publicado y base operacional.
- No recalcular precio en cliente.
- No mezclar `Package` legacy con `ProductOperationalMapping` sin decision explicita.
- Mantener pagos bajo revision manual si el metodo es Yappy/ACH.

### UX recomendada

- Reemplazar `Sin stock operativo` por `Agotado temporalmente`.
- Cambiar `Inversion` por `Precio`.
- Diferenciar `Comprar` vs `Solicitar`.
- Mostrar `Requiere perfil con chip activo` solo cuando aplica.
- Para productos empresariales, usar `Solicitar para empresa` o `Contactar ventas`, no `Comprar` si requiere aprobacion.
- En mobile, reducir alto de cards y acercar precio + CTA.

## 15. Que NO se toco

- No se toco codigo productivo.
- No se toco frontend productivo.
- No se toco backend.
- No se tocaron endpoints.
- No se toco `schema.prisma`.
- No hubo migraciones.
- No se toco BD.
- No se modifico logica de tienda.
- No se modifico logica de pedidos.
- No se modificaron pagos.
- No se aprobaron, rechazaron, crearon ni cancelaron pedidos.
- No se reservaron unidades.
- No se despacho inventario.
- No se activaron ni asignaron chips.
- No se toco W6.03, W6.04, W6.05F ni W6.10.
- No se toco empresarial, mascotas ni `KLFUFPK8`.

## 16. Skills usadas como criterio

- `prerescate-rules`
- `verification-loop`
- `dashboard-builder`
- `frontend-a11y`
- `frontend-patterns`
- `design-system`
- `design-taste-frontend`
- `high-end-visual-design`
- `api-design`
- `backend-patterns`
- `security-review`
- `error-handling`

## 17. Validaciones

- `git status --short`
- `git diff`
- `git diff --check`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`

## 18. Conclusion

W6.05G-A confirma que la tienda cliente tiene una base tecnica razonable y protegida por W6.03. La siguiente fase debe concentrarse en experiencia: clarificar rutas, reducir ruido visual, hacer la tienda mobile-first, diferenciar compra directa de solicitud empresarial y mantener intacta la capa canonica de `ProductOperationalMapping`.
