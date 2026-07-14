# Pedidos / Pagos - PreRescatePTY

## Descripción funcional
Tienda online con pago manual, gestión de órdenes, estados de pago y comprobantes. Conecta con capacidad de cuenta.

## Rutas relacionadas
- `app/(app)/dashboard/tienda/page.tsx` - Catálogo
- `app/(app)/dashboard/pedidos/page.tsx` - Lista de órdenes
- `app/(app)/dashboard/compras/page.tsx` - Compras del usuario
- `app/api/orders/*` - APIs de órdenes
- `app/api/orders/manual/route.ts` - Alta de pedido manual
- `app/api/orders/[id]/payment-proof/route.ts` - Subida de comprobante

## Componentes relacionados
- UI de tienda
- UI de pedidos
- UI de checkout

## APIs relacionadas
- `app/api/orders/create/route.ts`
- `app/api/orders/[id]/route.ts`
- `app/api/orders/manual/route.ts`
- `app/api/orders/[id]/payment-proof/route.ts`

## Servicios/helpers
- `domains/orders/services/*` - Lógica de órdenes
- `syncRealOrderToOperations` - sincronización operacional
- `lib/order-status.ts` - Estados y helpers

## Modelos Prisma relacionados
- `Order`, `OrderItem` - Pedidos
- `Package`, `AccountPackage` - Paquetes y capacidad
- `Product` - Productos en tienda

## Variables de entorno
- Sin variables de pago externo en runtime

## Tests existentes
Ninguno.

## Tests faltantes recomendados
- Tests de creación manual de pedidos
- Tests de subida de comprobante
- Tests de estados de órdenes
- Tests de límites de paquetes/cuentas

## Riesgos detectados
- Flujo manual sin cobertura completa histórica
- Estados de órdenes como strings
- Lógica de órdenes acoplada en rutas

## Pendientes
- Tests de pedidos manuales
- Centralizar lógica en domain services
