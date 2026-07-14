# W6.08B - Auditoría y corrección del flujo Stock insuficiente -> Producción -> Reserva

## Resumen
Se corrigió el estado derivado que hacía aparecer `Reservar etiqueta interna` para pedidos directos de `Sticker PreRescatePTY` cuando el sistema ya los había clasificado como backorder. El flujo correcto ahora distingue entre reserva física con stock disponible y producción requerida cuando no hay stock reservable.

## Causa raíz
`PedidosSection` consumía el view model de operaciones con una regla demasiado amplia: cualquier pedido aprobado y sin unidades reservadas podía exponer `canReserveInternalLabel`, incluso si el pedido ya tenía backorder visible.

## Qué significa realmente cada cosa
- `Reservar etiqueta interna`: reserva de una unidad física trazable disponible.
- `Producción requerida`: faltante que debe pasar por producción antes de poder reservarse.
- `backorder`: semántica de falta de stock que no se resuelve con una reserva inmediata.
- `packageId`: vínculo de planes/chips, no la fuente de verdad del sticker directo.

## Flujo confirmado
1. La tienda crea el pedido.
2. La aprobación manual marca el pago como aprobado.
3. Si hay stock, el pedido puede mostrar reserva física.
4. Si no hay stock, el pedido queda en producción requerida.
5. Cuando entra el finished good producido, la reserva comercial vuelve a ser válida.

## Corrección aplicada
- Se bloqueó `canReserveInternalLabel` cuando el pedido directo ya tiene backorder.
- Se expuso `pendingCategory = "production_required"` para reflejar la etapa real.
- Se dejó `canSendToProduction` disponible para el caso de backorder.

## Componentes afectados
- `lib/operations/operations-order-view-model.ts`
- `app/(admin)/admin/_components/sections/PedidosSection.tsx`
- `tests/lib/operations-order-view-model.test.ts`

## Qué NO cambió
- No se tocó backend operativo.
- No se tocaron Prisma ni migraciones.
- No se cambió el flujo de producción existente.
- No se creó una automatización nueva.

## Validaciones
- `git diff --check`
- `npx vitest run tests/lib/operations-order-view-model.test.ts`
- `npm run typecheck`
- `npm run build`

