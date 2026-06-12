# API / Backend - PreRescatePTY

## Descripción funcional
Todos los endpoints HTTP del proyecto: handlers bajo `app/api/**/route.ts`. Cubren auth, fichas, chips, órdenes, admin y público.

## Rutas API principales (78 handlers)
- `app/api/auth/[...nextauth]/route.ts` - NextAuth
- `app/api/public/[shortCode]/route.ts` - Perfil público QR
- `app/api/users/perfiles-medicos/*/` - CRUD fichas médicas
- `app/api/chips/activate/route.ts` - Activación chips
- `app/api/chips/scans/*/` - Registro escaneos
- `app/api/orders/*/` - Órdenes
- `app/api/payments/*/` - Stripe
- `app/api/admin/*/` - Admin endpoints
- `app/api/cron/expire-chips/route.ts` - Cron diario Vercel

## Patrones detectados
- Mezcla de auth: `requireRole`, `getServerSession`, checks inline
- Rate limit aplicado de forma inconsistente
- Service role de Supabase en algunos handlers

## Tests existentes
Ninguno end-to-end.

## Tests faltantes recomendados
- Tests de cada endpoint crítico
- Tests de auth/RBAC por endpoint
- Tests de rate limit
- Tests de webhooks Stripe

## Riesgos detectados
- 78 handlers con patrones diversos
- Sin cobertura de pruebas
- Sin documentación de OpenAPI/Swagger

## Pendientes
- Centralizar middleware auth/api
- Documentar endpoints
- Tests por handler