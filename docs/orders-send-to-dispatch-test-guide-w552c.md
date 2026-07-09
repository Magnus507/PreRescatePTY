# W5.52C — Guía de prueba visual controlada: Enviar a despacho

## 1. Propósito

`Enviar a despacho` sirve para crear el despacho operativo de un pedido que ya tiene:

- pago aprobado
- unidad física reservada
- reserva completa
- sin despacho previo

Este paso mueve el pedido desde la preparación operativa hacia el flujo de despacho.

Aclaraciones:

- Enviar a despacho no entrega automáticamente.
- Enviar a despacho no activa el chip.
- Enviar a despacho no genera QR.
- Enviar a despacho no cambia `shortCode`.
- Enviar a despacho no cambia `internalLabel`.
- Enviar a despacho no asigna usuario final.
- Enviar a despacho no debe mover el pedido a `completed`.

## 2. Candidato válido

Un pedido puede usar `Enviar a despacho` solo si cumple:

- `paymentStatus = paid` o equivalente aprobado
- `status` / `orderStatus = processing`
- no `completed`
- no `cancelled`
- no `rejected`
- sin dispatch existente
- reserva completa
- `reservedUnitsCount >= quantity`
- `missingReservedUnits = 0`
- unidades reservadas pertenecen a ese pedido
- unidades reservadas no están activadas
- `canCreateDispatch = true`
- `canReserveInternalLabel = false`

## 3. Cuándo NO debe aparecer el botón

No debe aparecer si:

- pago pendiente
- pago en revisión
- pago rechazado
- pedido cancelado
- pedido completado
- pedido entregado
- pedido sin reserva
- pedido con reserva parcial
- pedido con dispatch existente
- unidad reservada pertenece a otro pedido
- unidad ya está activada
- falta información operativa mínima para despacho

## 4. Endpoint usado por la UI

El botón usa:

`POST /api/admin/orders/[id]/send-to-dispatch`

No cambiar este endpoint sin auditoría previa.

## 5. Validaciones esperadas del backend

El backend debe validar:

- pedido existe
- pago aprobado
- pedido no cancelado
- pedido no completado
- no hay dispatch existente
- reserva completa
- unidades reservadas pertenecen al pedido
- cantidad reservada coincide con cantidad operativa
- no crear dispatch parcial
- no entregar automáticamente
- no activar chips

Si la reserva no coincide con la cantidad esperada, debe fallar con error tipo:

`RESERVATION_MISMATCH`

## 6. Mutaciones esperadas

Una ejecución real exitosa puede:

- crear dispatch
- crear líneas de dispatch si aplica
- asociar unidades reservadas al despacho
- dejar dispatch en `pending_pick`
- dejar pedido en `processing`
- registrar evento/log operativo si el sistema lo hace

## 7. Campos prohibidos

`Enviar a despacho` no debe cambiar:

- `activationStatus`
- `activatedAt`
- `shortCode`
- `internalLabel`
- QR/NFC
- usuario final del chip
- `paymentStatus`
- pedido a `completed`
- pedido a `delivered`
- reserva física ya hecha, salvo asociarla al despacho si el modelo lo requiere

## 8. Estado UI esperado antes del click

Antes del click debe verse:

- pedido en `Activos` o `Pendientes`
- pago aprobado
- unidad reservada visible con `internalLabel`
- QC visible
- activación visible como `not_activated`
- botón `Enviar a despacho`
- no debe verse `Reservar etiqueta interna` si la reserva está completa
- no debe verse acción de activación

## 9. Estado UI durante el click

Durante el POST debe verse:

- botón deshabilitado
- texto `Enviando a despacho...`
- no debe permitir doble click
- no debe disparar dos requests
- no debe cambiar de pestaña antes de respuesta

## 10. Estado UI esperado después de éxito

Después de POST 200:

- aparece mensaje de éxito
- la UI ejecuta `loadOrders()`
- desaparece `Enviar a despacho`
- aparece `Ver despacho`
- el dispatch queda en `pending_pick`
- el pedido sigue en `processing`
- el pedido no pasa a `Completados`
- la unidad reservada sigue visible
- activación sigue `not_activated`
- `shortCode` sin cambios
- `internalLabel` sin cambios

## 11. Auditoría antes de prueba real

Antes de hacer click real, ejecutar:

```bash
npx tsx scripts/audit-orders-full-flow-w547a.ts --code <ORDER_CODE>
npx tsx scripts/audit-orders-tabs-distribution-w550a.ts --code <ORDER_CODE>
npx tsx scripts/audit-reserve-candidates-w551a1.ts --product PRP-FG-STICKER
npx tsx scripts/audit-reserve-dry-run-w551b.ts --product PRP-FG-STICKER --quantity 1
```

## 12. Auditoría después de prueba real

Después de un POST real exitoso, revisar:

- que el dispatch exista
- que el pedido siga en `processing`
- que el dispatch esté en `pending_pick`
- que la UI refresque
- que `Ver despacho` aparezca
- que `Enviar a despacho` desaparezca
- que no se haya tocado activación
- que no se haya movido el pedido a `completed`

## 13. Cuándo detenerse

Detenerse si:

- el pedido ya está completado o cancelado
- no hay reserva completa
- el backend intenta tocar campos prohibidos
- la UI no muestra loading dedicado
- el botón queda habilitado durante el POST
- aparece riesgo de doble submit
- el pedido cambia de estado a una etapa no esperada
- el response no devuelve un estado coherente con `pending_pick` / `processing`

