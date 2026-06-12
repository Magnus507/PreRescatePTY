# Pedidos / Pagos - PreRescatePTY

## Descripción funcional
Tienda online, checkout con Stripe, gestión de órdenes, estados de pago y webhooks. Conecta con capacidad de cuenta.

## Rutas relacionadas
- `app/(app)/dashboard/tienda/page.tsx` - Catálogo
- `app/(app)/dashboard/pedidos/page.tsx` - Lista de órdenes
- `app/(app)/dashboard/compras/page.tsx` - Compras del usuario
- `app/api/orders/*` - APIs de órdenes
- `app/api/payments/checkout/route.ts` - Checkout Stripe
- `app/api/payments/webhook/route.ts` - Webhook Stripe

## Componentes relacionados
- UI de tienda
- UI de pedidos
- UI de checkout

## APIs relacionadas
- `app/api/orders/create/route.ts`
- `app/api/orders/[id]/route.ts`
- `app/api/payments/checkout/route.ts`
- `app/api/payments/webhook/route.ts`

## Servicios/helpers
- `domains/orders/services/*` - Lógica de órdenes
- `domains/shared/services/payment.service.ts` - Stripe integration
- `lib/order-status.ts` - Estados y helpers

## Modelos Prisma relacionados
- `Order`, `OrderItem` - Pedidos
- `Package`, `AccountPackage` - Paquetes y capacidad
- `Product` - Productos en tienda

## Variables de entorno
- `STRIPE_SECRET_KEY` - Stripe backend
- `STRIPE_WEBHOOK_SECRET` - Validación webhooks
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Frontend Stripe

## Tests existentes
Ninguno.

## Tests faltantes recomendados
- Tests de checkout
- Tests de webhook Stripe (idempotencia)
- Tests de estados de órdenes
- Tests de límites de paquetes/cuentas

## Riesgos detectados
- Webhooks sin idempotencia garantizada
- Estados de órdenes como strings
- Lógica de órdenes acoplada en rutas

## Pendientes
- Tests de webhooks Stripe
- Enums para estados de órdenes
- Centralizar lógica en domain services