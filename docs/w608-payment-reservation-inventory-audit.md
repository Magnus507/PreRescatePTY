# W6.08 - Auditoría y corrección funcional Pago → Reserva → Inventario

## 1. Resumen ejecutivo
Se confirmó que el problema no era visual ni de permisos: la aprobación manual de un pedido en `/api/admin/orders/[id]/approve` aprobaba el pago, pero no ejecutaba la reserva de inventario operacional del producto comercial vinculado. El flujo quedaba coherente para `Order`, pero incompleto para `OperationCommercialOrder`.

## 2. Incidente observado
- Pedido de `Sticker PreRescatePTY` con código `PRP-FG-STICKER`.
- Pago manual con comprobante en revisión.
- El panel mostraba `Aprobar pago`.
- Después de aprobar, seguía apareciendo `Sin unidades reservadas`.
- El balance en Productos Base mostraba `1`, pero la reserva no ocurría.

## 3. Evidencia
- `app/api/admin/orders/[id]/approve/route.ts` aprobaba pago y actualizaba cuenta, pero no ejecutaba reserva de stock operacional.
- La reserva real del inventario existía en el flujo de Operaciones, en:
  - `app/api/admin/operations/commercial-orders/[id]/reserve-stock/route.ts`
  - `app/api/admin/operations/commercial-orders/[id]/reserve-units/route.ts`
- `app/api/orders/route.ts` sí sincroniza el pedido legacy a Operaciones mediante `syncRealOrderToOperations`, por lo que el pedido sí tiene un `OperationCommercialOrder` asociado.

## 4. Flujo esperado
Comprobante enviado -> Pago en revisión -> Aprobación de pago -> Reserva de inventario -> Preparación o despacho.

## 5. Flujo encontrado
La aprobación de pago:
- aprobaba `Order.paymentStatus`;
- aprobaba `Order.adminReviewStatus`;
- actualizaba cuenta y chips;
- pero no llamaba a la reserva del pedido comercial sincronizado.

## 6. Causa raíz confirmada
La causa raíz fue una separación incompleta entre `Order` y `OperationCommercialOrder`:
- `Order` se aprobaba en `/api/admin/orders/[id]/approve`;
- la reserva operacional vivía en otra ruta;
- no había puente entre ambas acciones.

Eso dejaba el sistema en un estado donde el pago quedaba aprobado, pero el inventario reservable no se consumía.

## 7. Archivos auditados
- `app/api/admin/orders/[id]/approve/route.ts`
- `app/api/admin/operations/commercial-orders/[id]/reserve-stock/route.ts`
- `app/api/admin/operations/commercial-orders/[id]/reserve-units/route.ts`
- `app/api/orders/route.ts`
- `lib/operations/sync-real-order-to-operations.ts`
- `lib/operations/commercial-product-mapping.ts`
- `lib/operations/inventory-stock.ts`
- `lib/operations/operations-order-view-model.ts`
- `app/(admin)/admin/_components/sections/PedidosSection.tsx`
- `prisma/schema.prisma`

## 8. Archivos modificados
- `app/api/admin/orders/[id]/approve/route.ts`
- `app/api/admin/operations/commercial-orders/[id]/reserve-stock/route.ts`
- `lib/operations/commercial-order-reservation.ts`
- `tests/helpers/mock-prisma.ts`
- `tests/routes/admin-orders-approve.test.ts`
- `tests/lib/commercial-order-reservation.test.ts`

## 9. Corrección aplicada
- Se extrajo la lógica de reserva de stock comercial a `lib/operations/commercial-order-reservation.ts`.
- Se reutilizó esa lógica desde el endpoint de reserva comercial.
- Se conectó la aprobación manual de pagos con el `OperationCommercialOrder` sincronizado por el `sourceMarker` `[sourceType:legacy_order][sourceId:<orderId>]`.
- La aprobación ahora ejecuta la reserva dentro de la misma transacción del approve.

## 10. Transaccionalidad y concurrencia
- La aprobación y la reserva quedan dentro de la transacción de `prisma.$transaction`.
- La reserva verifica unidades disponibles dentro de esa operación.
- La lógica de reserva consulta unidades con `reservedOrderId: null`, `status: "available"`, `qaStatus: "passed"`, `activationStatus: "not_activated"` y sin ítems de despacho.
- La reserva no duplica unidades ya reservadas al mismo pedido.

## 11. Inventario suficiente
- Con disponibilidad `1` y pedido `1`, el helper reserva exactamente `1`.
- El estado pasa a `stock_reserved`.
- La disponibilidad consumible queda en `0`.

## 12. Inventario insuficiente
- Si no hay stock reservable, la lógica conserva el comportamiento de backorder/producción pendiente ya existente.
- No se crean reservas falsas.

## 13. Backorder
- Se mantiene la semántica operativa existente.
- La corrección no inventa una regla nueva de inventario.

## 14. Pruebas agregadas o actualizadas
- `tests/lib/commercial-order-reservation.test.ts`
  - inventario suficiente;
  - sin inventario;
  - aprobación repetida;
  - dos pedidos compitiendo por una unidad;
  - pedidos internos sin reserva;
  - mapeo faltante o inválido.
- `tests/routes/admin-orders-approve.test.ts`
  - confirma que la aprobación llama a la reserva comercial vinculada.

## 15. Verificación manual
- Confirmado por código que el pedido legacy se sincroniza a Operaciones antes de la aprobación.
- Confirmado por pruebas que una aprobación puede disparar la reserva comercial.
- No se usaron datos productivos ni correcciones manuales en BD.

## 16. Qué no cambió
- Stripe.
- QR.
- NFC.
- activación.
- producción.
- despacho.
- entrega.
- autenticación.
- permisos generales.
- precios.
- impuestos.
- flujo operativo no relacionado.
- `schema.prisma`.
- migraciones.
- estructura de base de datos.

## 17. Validaciones
- `git diff`
- `git diff --check`
- `git status --short`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`
- `npx vitest run tests/routes/admin-orders-approve.test.ts tests/lib/commercial-order-reservation.test.ts`

## 18. Resultados
- `npx prisma validate`: OK
- `npm run typecheck`: OK
- `npm run build`: OK
- suite focalizada de reserva/aprobación: OK
- `npm test -- --run`: falló por casos preexistentes en `chips-activate` y `public-demo`, no relacionados con esta fase

## 19. Warnings preexistentes
- Durante `npm run build` aparecieron warnings de `@next/next/no-img-element` y un warning de `react-hooks/exhaustive-deps` en archivos fuera del alcance.
- No se corrigieron porque no pertenecen a esta fase.

## 20. Commit
- Pendiente al momento de esta documentación.

## 21. Push
- Pendiente al momento de esta documentación.

## 22. Estado final del workspace
- Quedan modificados solo los archivos de la corrección funcional y la documentación.
- `tmp/` permanece sin tocar.
