# W6.08E - Auditoría de creación de producto y compatibilidad genérica

## Resumen
Se auditó la cadena que permite crear, publicar, mapear y consumir productos operativos para validar si un producto nuevo puede entrar al flujo sin depender de sticker como fallback universal.

## Hallazgo principal
El sistema sí tiene una base genérica para productos operativos:
- `ProductOperationalMapping` puede enlazar `Product` con `OperationFinishedGood`.
- `OperationCommercialOrderItem.finishedGoodId` conserva el vínculo comercial.
- `OperationFinishedGoodUnit.productCode` funciona como llave física de inventario.

Sin embargo, existía un bloqueo importante: el traductor comercial todavía devolvía `PRP-FG-STICKER` como fallback para casi cualquier producto no reconocido. Eso hacía que un producto futuro pudiera terminar clasificado como sticker en vez de quedar resuelto por su mapping real o, en su defecto, marcado como no mapeado.

## Cambios realizados
- Se añadió resolución por mapping real en `lib/operations/commercial-product-mapping.ts`.
- Se eliminó el fallback duro a sticker para productos no resueltos.
- Si el producto está publicado y tiene mapping operativo válido, ahora se usa su `finishedGood` real.
- Si no se puede resolver, el resultado queda explícitamente `unmapped`.
- Se agregó una prueba para cubrir la resolución genérica y evitar regresiones al fallback duro.

## Componentes revisados
- `prisma/schema.prisma`
- `app/api/admin/products/route.ts`
- `app/api/admin/products/[id]/operational-mapping/route.ts`
- `app/api/products/route.ts`
- `lib/operations/commercial-product-mapping.ts`
- `lib/operations/commercial-order-reservation.ts`
- `lib/operations/operations-order-view-model.ts`
- `lib/operations/sync-real-order-to-operations.ts`
- `lib/operations/sync-operations-product-to-store.ts`
- `app/api/admin/operations/finished-good-units/route.ts`
- `app/api/admin/operations/finished-good-units/finished-good-units.helpers.ts`

## Qué NO cambió
- Backend de negocio.
- Prisma schema.
- Migraciones.
- BD.
- Stripe.
- Activación.
- QR.
- NFC.
- Lógica de stock, reserva y producción.

## Validaciones
- `git diff`
- `git diff --check`
- `npm run typecheck`
- `npm run build`
- pruebas focalizadas de mapeo comercial

