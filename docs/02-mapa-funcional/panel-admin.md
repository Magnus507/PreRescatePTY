# Panel Admin - PreRescatePTY

## Descripción funcional
Consola administrativa completa para operaciones: usuarios, chips, inventario, órdenes, empresas, productos, estadísticas y mantenimiento.

## Rutas relacionadas
- `app/(admin)/admin/page.tsx` - Consola admin principal (~2628 líneas)
- `app/(admin)/admin/_hooks/useAdminDataManager.ts` - Hook de datos admin
- `app/(admin)/admin/_services/*` - Servicios client-side admin

## Componentes relacionados
- Componentes colocalizados en `app/(admin)/admin/_components/`
- Secciones: usuarios, chips, inventario, órdenes, productos, settings

## APIs relacionadas
- `app/api/admin/users/*` - Gestión de usuarios
- `app/api/admin/chips/*` - Gestión de chips
- `app/api/admin/organizations/*` - Empresas
- `app/api/admin/products/*` - Productos/inventario
- `app/api/admin/orders/*` - Órdenes
- `app/api/admin/stats/*` - Estadísticas
- `app/api/admin/settings/*` - Configuraciones

## Servicios/helpers
- `domains/admin/stats/*` - Estadísticas
- `lib/rbac.ts` - Roles admin (admin, superadmin, imprenta)

## Modelos Prisma relacionados
- `User`, `Account` - Usuarios
- `Chip`, `ScanEvent` - Chips y escaneos
- `Organization`, `OrganizationMember` - Empresas
- `Product`, `Inventory` - Productos
- `Order`, `OrderItem` - Órdenes

## Variables de entorno
- `ADMIN_SECRET` - Auth admin APIs
- Variables de base de datos

## Tests existentes
Ninguno.

## Tests faltantes recomendados
- Tests de operaciones admin
- Tests de RBAC
- Tests de estadísticas
- Tests de gestión de inventory

## Riesgos detectados
- Consola admin muy grande (2600+ líneas) difícil de mantener
- Lógica acoplada en page.tsx
- Roles definidos como strings

## Pendientes
- Extraer lógica admin a domain services
- Tests de operaciones críticas
- Enums para roles admin