# Auth / Seguridad - PreRescatePTY

## Descripción funcional
Maneja autenticación, autorización, roles, MFA y protección de rutas. Es crítico porque maneja datos médicos y acceso admin.

## Rutas relacionadas
- `app/api/auth/[...nextauth]/route.ts` - NextAuth handlers
- `middleware.ts` - Protección de rutas `/dashboard/*` y `/admin/*`
- `app/(app)/dashboard/layout.tsx` - Shell autenticado cliente
- `app/(admin)/admin/page.tsx` - Shell autenticado admin

## Componentes relacionados
Ningún componente UI directo en website (auth es backend).

## APIs relacionadas
- `app/api/auth/[...nextauth]/route.ts` - NextAuth
- `app/api/users/mfa/*` - MFA handlers
- `app/api/admin/users/*` - Admin de usuarios

## Servicios/helpers
- `lib/auth.ts` - Configuración NextAuth
- `lib/rbac.ts` - Definición de roles y permisos
- `domains/users/services/mfa.service.ts` - Lógica MFA
- `lib/rateLimit.ts` - Rate limiting

## Modelos Prisma relacionados
- `User`, `Account` - Usuarios y cuentas
- `PasswordResetToken` - Recuperación de password
- `OrganizationMember` - Roles corporativos

## Variables de entorno
- `NEXTAUTH_SECRET` - Secreto NextAuth
- `JWT_SECRET` - Firma de tokens
- `NEXTAUTH_URL` - URL base auth
- `SUPABASE_SERVICE_ROLE_KEY` - Auth con Supabase

## Tests existentes
Ninguno para flujos auth.

## Tests faltantes recomendados
- Tests de login/registro
- Tests de MFA
- Tests de middleware (protección de rutas)
- Tests de RBAC (roles y permisos)

## Riesgos detectados
- Auth fragmentada: mezcla de `requireRole`, `isAdmin`, manual checks
- Service role de Supabase usado en request handlers
- Rate limit cae a memoria si Upstash falla

## Pendientes
- Centralizar política de auth/RBAC
- Tests de autorización