# W6.03C - Implementación Mínima de Mapeo Canónico

## Qué se implementó

Se agregó una capa mínima de mapeo canónico entre catálogo comercial e inventario operativo.

Elemento central:

- `ProductOperationalMapping`

## Por qué se eligió una nueva tabla

Se prefirió una tabla nueva y delgada porque:

- evita ensuciar `Product` con reglas de tienda e inventario
- permite un puente explícito entre catálogo y operación
- deja `OperationFinishedGood` y `OperationFinishedGoodUnit` como verdad operativa
- reduce el riesgo de romper Pedidos congelado

## Campos finales

- `productId`
- `finishedGoodId`
- `productCode`
- `deviceType`
- `storeSection`
- `purchaseFlow`
- `activationFlow`
- `visibilityRules`
- `requiresCompanyContext`
- `requiresApproval`
- `requiresPersonalization`
- `isPublished`
- `sortOrder`
- `badgeLabel`
- `badgeColor`

## Valores controlados iniciales

Se agregaron constantes controladas en:

- [`lib/products/product-operational-mapping.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/lib/products/product-operational-mapping.ts)

Valores:

- `deviceType`: `personal`, `business`, `pet`, `custom_personal`, `custom_business`, `future`
- `storeSection`: `personal_devices`, `business_devices`, `pet_devices`, `custom_products`, `future`
- `purchaseFlow`: `direct_purchase`, `company_request`, `approval_required`, `coming_soon`
- `activationFlow`: `personal_profile`, `business_profile`, `pet_profile`, `custom_flow`, `none`

## Relación con Pedidos congelado

Regla mantenida:

- `OrderItem` sigue preservando nombre/precio histórico
- la operación se gobierna por `productId`, `finishedGoodId` y `productCode`
- no se tocaron tabs, pagos, reserva, despacho ni activación

## Cómo se hará backfill

Se prepararon dos scripts:

- [`scripts/dry-run-product-operational-mapping-w603c.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/scripts/dry-run-product-operational-mapping-w603c.ts)
- [`scripts/backfill-product-operational-mapping-w603c.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/scripts/backfill-product-operational-mapping-w603c.ts)

Estado actual:

- el dry-run produce sugerencias y reporte
- el backfill permanece inerte en esta fase
- no se ejecutó ningún write operativo

## Qué queda pendiente para W6.03D / W6.03E

- consumir el mapping en la UI admin
- mostrar badges de tipo y sección
- publicar la tienda única por secciones
- hacer backfill real solo cuando exista confirmación explícita posterior

