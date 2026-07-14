# W6.08H - Auditoría integral de los flujos legacy: `orders/manual` + `payments/webhook`

## 1. Resumen ejecutivo

Esta auditoría confirma que `orders/manual` y `payments/webhook` no forman parte del flujo moderno de producto operativo.

Ambos caminos siguen existiendo para un propósito legacy de paquetes y sus efectos asociados sobre `Order`, `Account` y Stripe. No crean `CommercialOrder` ni resuelven `Product.operationalMapping` como fuente canónica.

Conclusión basada en el código:

- `orders/manual` es un flujo legacy de paquete.
- `payments/webhook` es un flujo legacy Stripe/paquete.
- No deben fusionarse con el flujo moderno sin una fase separada.

## 2. Qué es realmente `orders/manual`

Archivo auditado:

- [`app/api/orders/manual/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/orders/manual/route.ts)

Comportamiento real:

- exige `packageId`;
- busca `Package` por `id`;
- crea `Order` con `provider: "manual"`;
- persiste `Order.packageId = pkg.id`;
- crea un `OrderItem` snapshot con `productType: pkg.name`;
- no consulta `Product`;
- no consulta `Product.operationalMapping`;
- no consulta `FinishedGood`;
- no crea `CommercialOrder`;
- sí sincroniza al final con `syncRealOrderToOperations`, pero le pasa `pkg.name` como `productCode` y `productName`.

Responsabilidad real:

- representar una compra manual de paquete;
- no representar el catálogo moderno de productos operativos.

## 3. Qué es realmente `payments/webhook`

Archivo auditado:

- [`app/api/payments/webhook/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/payments/webhook/route.ts)

Comportamiento real:

- recibe `checkout.session.completed` de Stripe;
- exige `client_reference_id` y `metadata.packageId`;
- valida `amount_total` y moneda contra metadata;
- busca `User` y `Package`;
- actualiza `Account` con:
  - `packageId`;
  - `accountType`;
  - `maxChipsAllocated`;
  - `maxProfilesAllocated`;
  - `status: "active"`;
- crea `Order` con `provider: "stripe"`, `paymentStatus: "paid"`, `orderStatus: "completed"`;
- no crea `CommercialOrder`;
- no crea `CommercialOrderItem`;
- no consulta `Product`;
- no consulta `Product.operationalMapping`;
- sí sincroniza al final con `syncRealOrderToOperations`, pero usando `pkg.name` como `productCode` y `productName`.

Responsabilidad real:

- confirmar una compra Stripe de paquete y activar la cuenta;
- no ejecutar el flujo moderno de producto operativo.

## 4. Mapa completo

### Flujo manual legacy

`POST /api/orders/manual`
→ valida `packageId`
→ busca `Package`
→ crea `Order` con `packageId`
→ crea `OrderItem` snapshot
→ sincroniza a Operaciones con datos de paquete

### Flujo Stripe legacy

Stripe `checkout.session.completed`
→ `POST /api/payments/webhook`
→ valida metadata `packageId`
→ busca `Package`
→ actualiza `Account`
→ crea `Order`
→ sincroniza a Operaciones con datos de paquete

## 5. Flujos encontrados

### `orders/manual`

- usado para compras manuales de paquete;
- depende de `packageId`;
- crea un pedido de paquete, no un pedido de producto operativo.

### `payments/webhook`

- usado para la confirmación final de Stripe;
- depende de `packageId` en metadata;
- activa la cuenta y materializa el pedido Stripe.

## 6. Package

La evidencia del código muestra que `Package` significa:

- plan/paquete/kit comercial legacy;
- vínculo de cuenta con capacidad;
- fuente de `maxChips` y `maxProfiles`;
- insumo para Stripe checkout;
- insumo para `Account.packageId`.

No actúa como `Product.operationalMapping`.

## 7. Producto operativo

El producto operativo moderno vive en:

- `Product`
- `ProductOperationalMapping`
- `OperationFinishedGood`

Ese camino ya quedó alineado en fases W6.08A-W6.08G para:

- checkout moderno;
- órdenes corporativas;
- sync hacia Operaciones;
- reserva;
- producción.

`orders/manual` y `payments/webhook` no son la fuente primaria de esa arquitectura.

## 8. Dónde convergen

Convergen únicamente al final en:

- `Order`
- `syncRealOrderToOperations`

Pero la identidad que llevan al sync es distinta:

- moderno: identidad de producto operativo resuelta;
- legacy: identidad de paquete (`pkg.name`, `packageId`, `Account`).

## 9. Dónde divergen

Divergen en:

- origen de la verdad;
- entidades persistidas;
- finalidad funcional;
- dependencias de contexto;
- posibilidad de reconstrucción canónica.

`orders/manual` y `payments/webhook` no usan `Product.operationalMapping` como punto de partida.

## 10. Hardcoding encontrado

Hallazgos relevantes:

- `productCode: pkg.name`
- `productName: pkg.name`
- `packageId` como identidad primaria del flujo
- `metadata.packageId` en Stripe

Clasificación:

- correcto: `packageId` en estos flujos, porque su responsabilidad es legacy de paquetes;
- legacy válido: `pkg.name` como snapshot comercial del paquete;
- deuda técnica: transportar `pkg.name` hacia Operaciones como si fuera un `productCode` canónico;
- bug: no se encontró un bug crítico que rompa el flujo, pero sí una mezcla de identidades que impide tratarlo como flujo moderno.

No se encontró fallback universal a `PRP-FG-STICKER` dentro de estos dos flujos legacy.

## 11. Legacy válido

Es legacy válido porque:

- `orders/manual` exige `packageId`;
- `payments/webhook` exige `packageId` en metadata;
- actualizan `Account.packageId`;
- encajan con los tests y la documentación de Stripe/paquetes;
- su propósito operativo no es vender productos operativos nuevos.

## 12. Legacy obsoleto

Obsoleto en el sentido funcional para el flujo moderno:

- usar `pkg.name` como identidad de Operaciones;
- inferir catálogo moderno a partir de paquete;
- tratar estos flows como si fueran `Product.operationalMapping`.

No es obsoleto como código todavía, porque sigue teniendo una responsabilidad vigente.

## 13. Riesgos

- mezcla de identidades entre paquete y producto operativo;
- posibles duplicados por reintentos webhook;
- pérdida de contexto si se intenta reconstruir el item después del request original;
- dependencia de metadata Stripe para idempotencia;
- `syncRealOrderToOperations` recibe items sin `Product.id` ni mapping real en estos caminos;
- si se intentara migrarlos sin rediseño, se arriesgaría compatibilidad de cuentas y paquetes.

## 14. Recomendaciones

- Mantener `orders/manual` como legacy de paquete.
- Mantener `payments/webhook` como legacy de Stripe/paquete.
- No migrarlos al flujo moderno dentro de esta fase.
- Si se desea unificar arquitectura, abrir una fase nueva que:
  - defina si `Package` sigue existiendo como entidad independiente;
  - diseñe un contrato de sync específico para paquetes;
  - evite usar `pkg.name` como `productCode`.

## 15. Qué NO se modificó

- No se tocó `schema.prisma`.
- No se crearon migraciones.
- No se modificó la BD.
- No se cambió UI.
- No se cambió frontend.
- No se refactorizó masivamente.
- No se migraron los flujos legacy.
- No se cambió el flujo moderno ya corregido.

## 16. Archivos auditados

- [`app/api/orders/manual/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/orders/manual/route.ts)
- [`app/api/payments/webhook/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/payments/webhook/route.ts)
- [`lib/operations/sync-real-order-to-operations.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/lib/operations/sync-real-order-to-operations.ts)
- [`docs/logic/order-state-machine.md`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/docs/logic/order-state-machine.md)
- [`docs/04-operaciones/QUICK_REFERENCE.md`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/docs/04-operaciones/QUICK_REFERENCE.md)
- [`tests/routes/payments-webhook.test.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/tests/routes/payments-webhook.test.ts)
- [`tests/routes/payments-checkout.test.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/tests/routes/payments-checkout.test.ts)
- [`tests/routes/admin-orders-approve.test.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/tests/routes/admin-orders-approve.test.ts)

## 17. Pruebas

Pruebas relacionadas revisadas:

- [`tests/routes/payments-webhook.test.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/tests/routes/payments-webhook.test.ts)
- [`tests/routes/payments-checkout.test.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/tests/routes/payments-checkout.test.ts)
- [`tests/routes/admin-orders-approve.test.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/tests/routes/admin-orders-approve.test.ts)

La cobertura actual demuestra:

- webhook Stripe con validaciones de firma y metadata;
- idempotencia por `providerReference`;
- uso de `packageId` en checkout Stripe;
- tratamiento de órdenes directas sin `packageId` en admin approve para productos modernos.

## 18. Validaciones

A ejecutar para cierre formal:

- `git diff`
- `git diff --check`
- `git status --short`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`

## 19. Commit

Pendiente al momento de escribir esta auditoría.

## 20. Push

Pendiente al momento de escribir esta auditoría.

## 21. Conclusión

`orders/manual` debe seguir siendo legacy: **SI**.

`payments/webhook` debe seguir siendo legacy: **SI**.

¿Deben migrarse?: **NO** en esta fase.

¿Debe existir un único flujo?: **NO**.

Arquitectura recomendada:

- mantener dos carriles separados:
  - flujo moderno de producto operativo;
  - flujo legacy de paquete/Stripe para compatibilidad histórica;
- no mezclar `Package` con `Product.operationalMapping`;
- no interpretar `pkg.name` como `productCode` canónico del catálogo operativo.
