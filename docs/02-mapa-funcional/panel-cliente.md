# Panel de Cliente - PreRescatePTY

## Descripción funcional
Dashboard autenticado donde el usuario gestiona su cuenta, fichas médicas, chips, órdenes y configuraciones.

## Rutas relacionadas
- `app/(app)/dashboard/layout.tsx` - Shell del dashboard
- `app/(app)/dashboard/page.tsx` - Home del dashboard
- `app/(app)/dashboard/perfil/page.tsx` - Perfil del usuario
- `app/(app)/dashboard/perfiles-medicos/page.tsx` - Lista fichas médicas
- `app/(app)/dashboard/chips/page.tsx` - Lista chips
- `app/(app)/dashboard/pedidos/page.tsx` - Órdenes del usuario
- `app/(app)/dashboard/tienda/page.tsx` - Catálogo de productos
- `app/(app)/dashboard/historial/page.tsx` - Historial de escaneos
- `app/(app)/dashboard/empresas/page.tsx` - Gestión corporativa

## Componentes relacionados
- Formularios de fichas médicas: `components/forms/MedicalProfileForm.tsx`
- Componentes de dashboard genéricos
- `ScanMonitor` - Monitoreo de escaneos

## APIs relacionadas
- `app/api/account/state/route.ts` - Estado de cuenta
- `app/api/users/perfiles-medicos/*` - CRUD fichas médicas
- `app/api/chips/*` - Gestión de chips
- `app/api/orders/*` - Órdenes del usuario
- `app/api/products/*` - Productos disponibles

## Servicios/helpers
- `lib/account-state.ts` - Estado de cuenta (5 min cache)
- `domains/profiles/repositories/profile.repository.ts` - Fichas médicas
- `domains/chips/services/*` - Chips
- `domains/orders/services/*` - Órdenes

## Modelos Prisma relacionados
- `User`, `Account` - Usuario y cuenta
- `Profile` - Fichas médicas
- `Chip` - Dispositivos
- `Order`, `OrderItem` - Órdenes
- `AccountPackage` - Capacidad de cuenta

## Variables de entorno
- Variables de Supabase para storage
- Variables de Redis para cache

## Tests existentes
Ninguno.

## Tests faltantes recomendados
- Tests de dashboard shell
- Tests de límites de cuenta
- Tests de asignación ficha-chip
- Tests de historial

## Riesgos detectados
- Dashboard gana datos de múltiples APIs sin centralización
- Cache de cuenta puede estar stale

## Pendientes
- Tests de interacción dashboard
- Centralizar fetches de dashboard