# W5.51C — Guía de prueba visual controlada: Reservar etiqueta interna

## 1. Propósito

`Reservar etiqueta interna` sirve para asociar un pedido pagado con una unidad física real del inventario.

Ejemplo:
- Pedido: `PR-2026-XXXXX`
- Unidad física: `PROD-INT-0003-0002`

La reserva significa:
- la unidad queda apartada para ese pedido
- ya no debe estar disponible para otros pedidos
- el pedido queda listo para despacho si la reserva está completa

Aclaraciones:
- Reservar no activa el chip.
- Reservar no genera QR.
- Reservar no cambia `shortCode`.
- Reservar no cambia `internalLabel`.
- Reservar no despacha.
- Reservar no entrega.
- Reservar no asigna usuario final.

## 2. Candidato válido

Un pedido puede usar `Reservar etiqueta interna` solo si cumple:

- `provider = manual`
- `paymentStatus = paid` o `approved` según el contrato actual
- `status` / `orderStatus = processing`
- no `completed`
- no `cancelled`
- no `rejected`
- sin despacho
- sin unidades reservadas o con reserva incompleta
- `missingReservedUnits > 0`
- producto con unidades disponibles
- `canReserveInternalLabel = true`
- `canCreateDispatch = false` antes de reservar

## 3. Cuándo no debe aparecer el botón

No debe aparecer si:

- pago pendiente
- pago en revisión
- pago rechazado
- pedido cancelado
- pedido completado
- pedido entregado
- pedido ya tiene despacho
- pedido ya tiene reserva completa
- pedido no es manual
- no faltan unidades
- no hay producto físico compatible

## 4. Inventario elegible

Una unidad es elegible solo si:

- `productCode` coincide con el producto del pedido
- `status = available`
- `qaStatus = passed`
- `activationStatus = not_activated`
- `reservedOrderId = null`

Ejemplo actual disponible para `PRP-FG-STICKER`:
- `PROD-INT-0003-0002`
- `PROD-INT-0003-0003`

## 5. Orden de selección

La selección debe ser estable:

1. `createdAt asc`
2. `internalLabel asc`
3. `id asc`

Primera unidad esperada en dry-run:
- `PROD-INT-0003-0002`

## 6. Endpoint usado por la UI

El botón no usa:

`POST /api/admin/operations/commercial-orders/[id]/reserve-units`

El flujo visual actual usa:

`POST /api/admin/operations/finished-good-units/[unitId]/events`

Body esperado:

```json
{
  "action": "reserve",
  "referenceType": "commercial_order",
  "referenceId": "<orderId>",
  "reason": "Reservado para pedido <orderCode>"
}
```

## 7. Mutaciones esperadas en una reserva real

Una reserva real puede cambiar:

- `unit.status -> reserved`
- `unit.reservedOrderId -> order.id`
- `unit.reservedAt -> now`
- registro o evento operativo si el endpoint lo crea

## 8. Campos prohibidos

La reserva no debe cambiar:

- `activationStatus`
- `activatedAt`
- `shortCode`
- `internalLabel`
- QR/NFC
- dispatch
- `dispatchStatus`
- `order.userId` como usuario final
- `paymentStatus`
- pedido a `completed`
- usuario final del chip

## 9. Estado UI esperado después de reservar

Después de una reserva completa:

- desaparece `Reservar etiqueta interna`
- aparece la unidad reservada con `internalLabel`
- QC sigue visible como `passed`
- activación sigue `not_activated`
- aparece `Enviar a despacho`
- `canReserveInternalLabel = false`
- `canCreateDispatch = true`
- el pedido sigue en `Activos` o `Pendientes`
- el pedido no pasa a `Completados`

## 10. Cómo auditar antes de una prueba real

Antes de probar en real:

- revisar que el pedido siga elegible en la auditoría read-only
- verificar que haya inventario disponible
- comprobar que el botón sea visible solo en el pedido correcto
- confirmar que no haya despacho ni reserva completa
- validar que el dry-run apunte a la primera unidad elegible esperada

## 11. Cómo auditar después de una prueba real

Después de una reserva real:

- verificar que la unidad pasó a `reserved`
- confirmar que `reservedOrderId` apunta al pedido
- confirmar que `reservedAt` quedó presente
- revisar que la UI refrescó el pedido
- confirmar que `Reservar etiqueta interna` desapareció si la reserva quedó completa
- confirmar que `Enviar a despacho` apareció solo cuando corresponde

## 12. Cuándo detenerse

Detenerse si:

- el pedido ya está completado o cancelado
- no hay unidades disponibles elegibles
- el backend intenta tocar campos prohibidos
- la UI no refresca el estado después de reservar
- aparece riesgo de doble reserva por doble clic
- el pedido cambia de estado a una etapa no esperada

## 13. Referencias de auditoría

Scripts útiles:

```bash
npx tsx scripts/audit-reserve-candidates-w551a1.ts --recent 50
npx tsx scripts/audit-reserve-candidates-w551a1.ts --product PRP-FG-STICKER
npx tsx scripts/audit-reserve-dry-run-w551b.ts --product PRP-FG-STICKER --quantity 1
npx tsx scripts/audit-reserve-dry-run-w551b.ts --code PR-2026-000558
```

La guía oficial de dry-run para esta prueba es:

- [`scripts/audit-reserve-dry-run-w551b.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/scripts/audit-reserve-dry-run-w551b.ts)
