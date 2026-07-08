# W5.42D

Pedido quedó como pestaña oficial dentro de Centro de Operaciones.

## Cambios

- Se removió el encabezado duplicado del overview operativo.
- Se agregaron filtros visuales en Pedidos: Todos, Clientes, Internos y Pendientes.
- No se tocó backend crítico ni estados reales.

## Validación

- `npx tsx scripts/audit-operations-cleanup-w542d.ts`
- `npm run typecheck`
- `npm run build`
