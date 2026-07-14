# W6.08D - Auditoría integral y corrección del motor de disponibilidad, reserva y producción por producto

## Resumen
Se corrigió la relación que el motor usaba para decidir disponibilidad, reserva y producción por línea. El problema real no estaba en la cantidad visible, sino en la llave usada para cruzar la orden comercial con la unidad física elegible.

## Incidente
El pedido `PR-2026-000597` mostraba `Producción requerida · 1 u.` aun cuando existía una unidad física elegible `PROD-INT-0004-0001` con:
- `productCode = PRP-FG-STICKER`
- `status = available`
- `qaStatus = passed`
- `activationStatus = not_activated`

## Causa raíz
El helper de reserva tomaba `finishedGood.productType` como si fuera el código físico del producto. En este modelo, `productType` puede ser un slug interno (`sticker_prerescatepty`) y no coincide con el código físico/reservable (`PRP-FG-STICKER`).

## Fuente de verdad real
- `ProductOperationalMapping.finishedGoodId` conecta el producto de tienda con el producto terminado.
- `OperationCommercialOrderItem.finishedGoodId` preserva el vínculo comercial al finished good correcto.
- `OperationFinishedGoodUnit.productCode` y `OperationFinishedGoodUnit.productType` son los campos usados para inventario físico y reserva.

## Corrección aplicada
- La reserva comercial ahora usa `finishedGood.code` o `productCode` como llave de cruce.
- Se deja de depender del slug interno para resolver disponibilidad.
- Se mantiene la reserva dentro de la misma transacción.

## Resultado funcional
- `requiredQty = cantidad solicitada`
- `reservedQty = cantidad reservada realmente`
- `availableQty = inventario elegible del finishedGood exacto`
- `shortageQty = max(requiredQty - reservedQty - newlyReservedQty, 0)`

## Qué debe pasar
- `shortageQty === 0` -> reserva completa, sin producción.
- `shortageQty > 0` -> backorder y producción requerida por el faltante.

## Pruebas
- reserva comercial con stock suficiente;
- reserva comercial con stock insuficiente;
- reserva comercial con `finishedGood.productType` como slug interno;
- view model de producción requerida;
- aprobación manual con persistencia del faltante.

## Qué no cambió
- Prisma.
- migraciones.
- estructura de BD.
- Stripe.
- QR.
- NFC.
- activación.
- entrega.
- autenticación.
- permisos.
- Design System.
- shell del dashboard.

## Validaciones
- `git diff`
- `git diff --check`
- `git status --short`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`
- pruebas focalizadas de aprobación, reserva y view model

