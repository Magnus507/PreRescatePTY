# W5.48A-PEDIDOS — Matriz de cierre y protección de Pedidos

## 1. Propósito

Este documento define qué partes del módulo Pedidos ya están cerradas, qué no debe tocarse sin auditoría previa y qué validaciones deben ejecutarse antes o después de cualquier cambio futuro.

El objetivo es evitar regresiones: no volver a romper montos, fechas, datos cliente, reservas, cancelados, aprobación de pagos ni la separación con activación.

## 2. Estado actual cerrado

Último estado estable:
- Commit: `d49b78ffa516f06a57c237ad69a0b74dd40808dd`
- Rama: `master`
- `HEAD = origin/master` confirmado
- Validaciones OK:
  - `npx prisma migrate status`
  - `npx prisma validate`
  - `npm run typecheck`
  - `npm run build`
  - `git diff --check`

## 3. Pedidos - Áreas cerradas

### 3.1 Montos

Cerrado:
- No usar `.toFixed()` directamente sobre valores crudos.
- El monto principal usa total normalizado.
- Orden de fallback:
  1. `order.total`
  2. `commercialTotal`
  3. `amount`
- Dashboard cliente también usa total normalizado.

No tocar salvo auditoría:
- helpers de formato de dinero
- render de monto principal
- render de comercial total

Scripts relacionados:
- `scripts/audit-order-customer-data-w545c.ts`
- `scripts/audit-orders-customer-data-general-w545d.ts`

### 3.2 Fechas

Cerrado:
- No formatear fechas sin validarlas.
- Fechas nulas o inválidas deben mostrarse de forma segura.
- Se eliminó el crash `Invalid time value`.

No tocar salvo auditoría:
- helpers de fecha segura
- render de `createdAt` / `updatedAt` / `reviewedAt` / `estimatedDeliveryDate`

Scripts relacionados:
- `scripts/audit-orders-invalid-date-w545b.ts`

### 3.3 Datos cliente y envío

Cerrado:
- Cliente, email, teléfono, dirección, ciudad y notas de envío están mapeados.
- El admin puede ver datos operativos del pedido.
- Los datos no dependen de un solo pedido puntual.

No tocar salvo auditoría:
- mapping de `customerName` / `customerEmail` / `customerPhone`
- `shippingAddress` / `shippingCity` / `shippingNotes`
- `operations-order-view-model`

Scripts relacionados:
- `scripts/audit-order-customer-data-w545c.ts`
- `scripts/audit-orders-customer-data-general-w545d.ts`

### 3.4 Unidades reservadas

Cerrado:
- No se muestra `/sin-shortCode`.
- `shortCode` no pertenece a reserva física.
- `shortCode` pertenece a activación o link público.
- En Pedidos se muestra:
  - `internalLabel`
  - QC
  - Reserva
  - Activación
- `internalLabel` es el identificador operativo físico.
- La UI no debe confundir reserva física con activación.

No tocar salvo auditoría:
- render de unidades reservadas
- exposición de `unit.status`
- etiquetas QC / Reserva / Activación
- `shortCode`
- `internalLabel`

Regla:
- Nunca cambiar `shortCode` o `internalLabel` desde un fix de Pedidos.
- Nunca activar chips desde Pedidos.

Scripts relacionados:
- `scripts/audit-order-operational-flow-w546a.ts`
- `scripts/audit-orders-full-flow-w547a.ts`

### 3.5 Botones y acciones de Pedidos

Cerrado:
- Las acciones dependen del estado real del pedido.
- `Aprobar pago` y `Rechazar pago` aparecen para pedidos con comprobante y pago en revisión.
- `Reservar etiqueta interna` depende de pago aprobado y unidades faltantes.
- `Enviar a despacho` depende de pago aprobado, reserva completa y ausencia de despacho.
- Pedidos terminales no muestran acciones operativas normales.

Reglas esperadas:
- `Aprobar pago`: visible si `paymentStatus=under_review` y comprobante existe.
- `Rechazar pago`: visible si `paymentStatus=under_review` y comprobante existe.
- `Reservar etiqueta interna`: visible si pago aprobado, faltan unidades y no hay despacho.
- `Enviar a despacho`: visible si pago aprobado, reserva completa y no hay despacho.
- `Cancelar / ocultar`: permitido solo si no avanzó a despacho, entrega o activación.
- Activación: nunca desde Pedidos.

No tocar salvo auditoría:
- `canApprovePayment`
- `canRejectPayment`
- `canReserveUnits` / `canReserveInternalLabel`
- `canSendToDispatch` / `canCreateDispatch`
- `canSoftDeleteOrder`
- `requiresAction`
- `pendingReasonLabel`

Scripts relacionados:
- `scripts/audit-orders-full-flow-w547a.ts`

### 3.6 Aprobar/Rechazar pago

Cerrado:
- Backend existe:
  - `POST /api/admin/orders/[id]/approve`
  - `POST /api/admin/orders/[id]/reject`
- View model habilita acciones correctamente.
- UI ahora muestra feedback visible y loading para evitar doble clic.
- Botones duplicados o renders alternos quedaron protegidos con handlers explícitos por acción/pedido.
- La prueba real en producción con `PR-2026-000558` ya validó el flujo completo.
- Los mensajes deben incluir el código del pedido y avisar si cambió de pestaña.
- Si falla refresh posterior, muestra warning.
- Las rutas devuelven payload útil para actualizar UI.
- No se cambió lógica de negocio.
- `POST approve` respondió `200` en la validación real.
- El pedido avanzó a `paymentStatus=paid` y `status=processing`.
- Apareció `Reservar etiqueta interna`.
- No se reservó automáticamente.
- No se despachó automáticamente.
- No se tocó activación.

No tocar salvo auditoría:
- handlers de aprobar/rechazar en `PedidosSection`
- rutas approve/reject
- payload de respuesta
- refresh / `loadOrders`
- estado local `selectedOrder` / `orders`

Script relacionado:
- `scripts/audit-orders-full-flow-w547a.ts`

### 3.7 Cancelados

Cerrado:
- Existe filtro/pestaña Cancelados.
- Cancelados no se mezclan en flujo normal.
- Cancelados no muestran acciones operativas normales.
- Cancelación con reserva simple libera la unidad.
- Cancelación con despacho, entrega o activación se bloquea.
- La liberación deja:
  - `unit.status = available`
  - `reservedOrderId = null`
  - `reservedAt = null`
- No toca:
  - `internalLabel`
  - `shortCode`
  - activación
  - QR/NFC
  - producción

No tocar salvo auditoría:
- `app/api/admin/orders/[id]/delete/route.ts`
- `lib/operations/release-order-reservations.ts`
- filtros de cancelados
- reglas de bloqueo por despacho, entrega o activación

Script relacionado:
- `scripts/audit-cancel-order-release-w546c.ts`

## 4. Archivos sensibles de Pedidos

No tocar sin justificar y auditar:

- `app/(admin)/admin/_components/sections/PedidosSection.tsx`
- `app/api/admin/orders/route.ts`
- `app/api/admin/orders/[id]/approve/route.ts`
- `app/api/admin/orders/[id]/reject/route.ts`
- `app/api/admin/orders/[id]/delete/route.ts`
- `app/api/admin/orders/[id]/send-to-dispatch/route.ts`
- `lib/operations/operations-order-view-model.ts`
- `lib/operations/release-order-reservations.ts`
- `scripts/audit-order-operational-flow-w546a.ts`
- `scripts/audit-orders-full-flow-w547a.ts`
- `scripts/audit-cancel-order-release-w546c.ts`

## 5. Prohibiciones permanentes en Pedidos

En fixes de Pedidos queda prohibido salvo bloque explícito:

- Activar chips.
- Crear o modificar QR/NFC.
- Cambiar `shortCode`.
- Cambiar `internalLabel`.
- Asignar usuario final de chip.
- Crear unidades físicas.
- Borrar unidades.
- Borrar pedidos reales.
- Ejecutar acciones reales desde scripts de auditoría.
- Aprobar o rechazar pagos durante auditorías.
- Reservar unidades durante auditorías.
- Enviar a despacho durante auditorías.
- Cancelar pedidos durante auditorías.
- Liberar reservas durante auditorías, salvo script con confirmación explícita.
- Usar `prisma db push`.
- Usar `prisma migrate reset`.
- Modificar migraciones históricas.
- Usar force push.

## 6. Scripts oficiales de auditoría de Pedidos

Antes de tocar Pedidos, usar según corresponda:

```bash
npx tsx scripts/audit-orders-full-flow-w547a.ts --recent 10
npx tsx scripts/audit-orders-full-flow-w547a.ts --code <ORDER_CODE>
npx tsx scripts/audit-order-operational-flow-w546a.ts --code <ORDER_CODE>
npx tsx scripts/audit-order-customer-data-w545c.ts --code <ORDER_CODE>
npx tsx scripts/audit-orders-customer-data-general-w545d.ts --recent 10
npx tsx scripts/audit-orders-invalid-date-w545b.ts
npx tsx scripts/audit-cancel-order-release-w546c.ts --code <ORDER_CODE>
```

## 7. Matriz de cierre por flujo

### 7.1 Revisiones que ya no deben romperse

- Montos seguros
- Fechas seguras
- Mapeo de cliente y envío
- Unidades reservadas sin confundir activación
- Aprobación / rechazo con feedback visible
- Cancelación con liberación segura de reserva
- Conteos de pestañas con contador correcto por filtro

### 7.2 Validaciones mínimas para cualquier cambio futuro

Antes de tocar Pedidos:
- ejecutar una auditoría del caso concreto
- revisar el view model
- revisar las rutas impactadas
- verificar que el cambio no toque datos físicos

Después de tocar Pedidos:
- `npx prisma migrate status`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`
- `git diff --check`

### 7.3 Criterio de cierre

Un cambio en Pedidos solo se considera listo si:
- no rompe la lectura de montos
- no rompe fechas
- no rompe la visibilidad de cliente/envío
- no confunde reserva con activación
- no altera shortCode/internalLabel
- no abre acciones en estados terminales
- no introduce silencios en feedback de UI
- no desalinean los contadores de pestañas con la lista visible
- no toca datos reales sin necesidad explícita

## 8. Qué sigue abierto

Pendiente de validación ocasional, no de corrección funcional:
- consistencia visual fina de la pestaña Pedidos en escritorio y móvil
- percepción de cambio de filtro cuando una orden pasa a estado terminal
- experiencia al refrescar listas grandes
- mensajes de ayuda en escenarios extremos
- prueba manual de `Rechazar pago` en un pedido `under_review` si todavía no se hizo

No requiere cambiar negocio, solo revisar UX si aparece un reporte nuevo.

## 9. Conclusión

La pestaña Pedidos ya tiene una base estable y protegida.

El foco futuro debe ser preservar:
- seguridad de montos y fechas
- fidelidad de cliente y envío
- reserva física correctamente separada de activación
- acciones de pago con feedback visible
- cancelación segura con liberación controlada
- auditorías read-only para cualquier ajuste posterior

Este documento sirve como barrera para evitar regresiones en uno de los flujos más sensibles del sistema.

Nota:
- No reintroducir debug visible en producción salvo bloque explícito de diagnóstico.
- `approve` debe permanecer en `processing` para permitir la reserva posterior.
