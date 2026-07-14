# W6.08C - Corregir clasificación automática de faltante y transición real a producción

## 1. Incidente
Al aprobar un pedido directo de `Sticker PreRescatePTY`, el panel mostraba estados mezclados:
- `Pago aprobado / pendiente de reserva`
- `Pago aprobado`
- `Reservar unidad física`
- `Reservar etiqueta interna`

Pero no mostraba de forma fiable:
- `backorder`
- `Producción requerida`
- `Enviar a producción`

Además, el copy inferior seguía diciendo `Comprobante enviado por el cliente. Pago en revisión.` aun cuando el pago ya estaba aprobado.

## 2. Evidencia de PR-2026-000450
La auditoría se hizo con foco en el pedido `PR-2026-000450` y el flujo de aprobación/reserva/producción asociado a pedidos directos de tienda.

La evidencia de código confirmó que:
- la aprobación manual puede reservar stock si existe;
- si no existe stock suficiente, el sistema debe dejar un faltante operativo real;
- el view model y el panel dependían demasiado de notas derivadas y permitían una acción engañosa de reserva.

## 3. Causa raíz
La causa raíz fue una combinación de dos problemas:
- la aprobación no persistía siempre una semántica de faltante operativa cuando la reserva no alcanzaba;
- el view model todavía exponía la acción de reserva y un copy de revisión aunque el pedido ya estaba aprobado.

## 4. Por qué no se creó/detectó el backorder
El sistema sí calculaba stock/backorder al crear el pedido, pero la aprobación no siempre dejaba una representación operativa suficiente para que el panel viera el faltante como `Producción requerida`.

El problema no era un nuevo modelo faltante. Era una sincronización incompleta entre:
- aprobación manual;
- reserva comercial;
- nota derivada que alimenta el resumen del panel.

## 5. Cálculo `required / reserved / shortage`
La regla funcional quedó así:
- `requiredQty = cantidad solicitada`
- `reservedQty = cantidad realmente reservada`
- `shortageQty = max(requiredQty - reservedQty, 0)`

Interpretación:
- `shortageQty === 0` -> reserva completa;
- `shortageQty > 0` -> backorder / producción requerida.

## 6. Corrección de aprobación
Se ajustó `app/api/admin/orders/[id]/approve/route.ts` para:
- aprobar el pago;
- intentar la reserva comercial dentro de la misma transacción;
- persistir una nota operativa coherente cuando exista faltante;
- evitar una aprobación que deje el pedido “ciego” frente al backorder.

## 7. Corrección del view model
Se ajustó `lib/operations/operations-order-view-model.ts` para:
- dejar de exponer `canReserveInternalLabel` cuando ya existe backorder;
- exponer `pendingCategory = "production_required"` cuando hay faltante;
- permitir `canSendToProduction` en el caso correcto;
- no usar pago en revisión cuando el pago ya está aprobado.

## 8. Corrección de acciones
Se corrigió `app/(admin)/admin/_components/sections/PedidosSection.tsx` para:
- no mostrar “Pago en revisión” si el pago ya está aprobado;
- alinear el texto inferior con el estado real;
- mantener `Reservar etiqueta interna` solo para pedidos que realmente la requieren.

## 9. Corrección de mensajes
Se alineó el copy para estos estados:
- pago en revisión -> `Comprobante enviado. Pago en revisión.`
- pago aprobado con reserva completa -> `Pago aprobado.`
- pago aprobado con faltante -> `Pago aprobado. Producción requerida por faltante de inventario.`

## 10. Integración con producción
Cuando no hay stock suficiente, el pedido debe quedar listo para el flujo existente de producción manual, sin crear una automatización nueva.

## 11. Idempotencia
La aprobación repetida no debe duplicar:
- reserva;
- faltante;
- requerimiento de producción.

La corrección preserva la misma reserva transaccional y usa la nota operativa como fuente derivada consistente.

## 12. Concurrencia
La reserva sigue ejecutándose dentro de la transacción, con selección de unidades elegibles y protección contra doble consumo de la misma unidad.

## 13. Pruebas
Se agregaron o actualizaron pruebas para:
- aprobación de pedido directo con stock suficiente;
- aprobación de pedido directo sin stock suficiente;
- persistencia del faltante en notas operativas;
- `buildOperationsOrderViewModel` para backorder y copy aprobado;
- reserva comercial compartida;
- aprobación manual con y sin `packageId`.

## 14. Archivos modificados
- `app/api/admin/orders/[id]/approve/route.ts`
- `app/(admin)/admin/_components/sections/PedidosSection.tsx`
- `lib/operations/operations-order-view-model.ts`
- `tests/lib/operations-order-view-model.test.ts`
- `tests/routes/admin-orders-approve.test.ts`

## 15. Qué no cambió
- `schema.prisma`
- migraciones
- estructura de BD
- Stripe
- QR
- NFC
- activación
- entrega
- autenticación
- permisos generales
- Design System
- dashboard shell
- módulos no relacionados

## 16. Validaciones
- `git diff`
- `git diff --check`
- `git status --short`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`
- pruebas focalizadas de aprobación, reserva y view model

## 17. Commit
Pendiente al momento de esta documentación.

## 18. Push
Pendiente al momento de esta documentación.

## 19. Estado final
- La lógica de estado ya distingue reserva completa versus faltante con producción requerida.
- `tmp/` permanece sin tocar.
