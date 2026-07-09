# W6.02A - Freeze / Protección Final de Pedidos

## 1. Estado Congelado de Pedidos

El módulo de Pedidos queda validado como flujo estable después de W6.01.

Se considera validado:

- creación del pedido cliente
- carga de comprobante
- revisión/aprobación/rechazo admin
- reserva de unidad física
- envío a despacho
- preparación, salida y entrega del despacho
- separación completa entre pedido, entrega y activación

No debe cambiarse sin auditoría previa:

- reglas de estados terminales
- criterios de tabs de admin
- relación entre `Order.userId` y el comprador real
- separación entre `internalLabel` y `shortCode`
- separación entre `dispatch` y activación de chip

## 2. Flujo Oficial de Pedidos

Diagrama textual del flujo validado:

`order created`
→ `payment proof submitted`
→ `admin approves payment`
→ `reserve internal unit`
→ `send to dispatch`
→ `prepare`
→ `send`
→ `deliver`
→ `order completed`
→ `activation remains separate`

La activación nunca forma parte del cierre del pedido. La entrega física tampoco activa chips.

## 3. Guardrails

Reglas de protección para bloques futuros:

- W6.03 productos/inventario puede alimentar stock, pero no debe cambiar historial de pedidos.
- W6.04 QR/link no debe cambiar pagos ni despachos.
- W6.05 panel cliente puede mostrar pedidos, pero no debe alterar reglas admin.
- W6.06 activación no debe modificar un pedido como si fuera entrega.
- W6.07 empresarial no debe reutilizar pedidos normales sin contexto separado.

## 4. Invariantes Técnicos

Invariantes que deben mantenerse:

- aprobar pago no activa chip
- reservar unidad no crea `shortCode` público
- despacho no activa chip
- entrega no activa chip
- pedido completado no significa perfil público activo
- `activationStatus` sigue separado
- `internalLabel` es operacional / físico
- `shortCode` es público / activación / acceso
- `Order.userId` no es necesariamente el usuario final del dispositivo
- compra ≠ activación
- entrega ≠ activación
- pedido ≠ perfil médico

## 5. Checklist Antes de Tocar Pedidos en el Futuro

Antes de cualquier cambio funcional sobre Pedidos:

- correr `npx prisma validate`
- correr `npm run typecheck`
- correr `npm run build`
- correr `git diff --check`
- auditar endpoints tocados
- verificar visualmente tabs
- verificar que no se mezcle activación con entrega

## 6. Archivos y Endpoints Relevantes

Archivos y rutas a vigilar:

- `app/api/admin/orders/[id]/approve/route.ts`
- `app/api/admin/orders/[id]/send-to-dispatch/route.ts`
- `app/api/admin/operations/commercial-orders/[id]/reserve-units/route.ts`
- `app/api/admin/operations/dispatches/[id]/confirm-delivery/route.ts`
- `app/api/admin/orders/[id]/payment-proof/route.ts`
- `app/api/admin/orders/route.ts`
- `app/api/orders/[id]/route.ts`
- `app/api/orders/[id]/payment-proof/route.ts`
- `app/api/orders/route.ts`
- `app/(admin)/admin/_utils/order-helpers.ts`
- `app/(admin)/admin/_components/sections/PedidosSection.tsx`
- `app/(admin)/admin/_components/sections/DispatchSection.tsx`
- `scripts/audit-orders-full-flow-w547a.ts`
- `scripts/audit-orders-approve-ignored-w549e.ts`
- `scripts/audit-orders-payment-proof-w540v2.ts`
- `scripts/audit-orders-tabs-distribution-w550a.ts`
- `scripts/audit-operations-status-consistency-w541h.ts`

## 7. Riesgos Conocidos

- cambios futuros de inventario podrían afectar la reserva
- cambios de tienda podrían afectar `productId` / `productCode` en pedidos
- cambios de activación podrían confundir entrega con activación
- el flujo empresarial puede requerir contexto separado
- `manualDecision` de `KLFUFPK8` no debe usarse como base para limpiar Pedidos

## 8. Resumen Operativo

El estado actual queda congelado para que futuros bloques no rompan el flujo de Pedidos.

Puntos clave:

- pedido cliente y activación son flujos distintos
- reserva y entrega no activan chips
- el estado terminal del pedido no debe reinterpretarse fuera del contrato actual
- el panel admin debe seguir mostrando tabs coherentes con la lógica validada

