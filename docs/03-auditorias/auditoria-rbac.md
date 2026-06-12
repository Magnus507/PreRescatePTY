# Auditoría de seguridad y RBAC

## Alcance revisado
- `middleware.ts`
- `lib/auth.ts`, `lib/rbac.ts`, `lib/requireAuth.ts`
- layouts y páginas admin/dashboard
- rutas `app/api/*` relevantes para auth, usuarios, chips, órdenes, organizaciones, pagos y cron

## Resumen ejecutivo
Hay una base de RBAC funcional, pero está fragmentada y tiene dos riesgos serios:
1. Los JWT de NextAuth son de 30 días y no se revalidan contra la base en cada request, así que una suspensión/cambio de rol no revoca acceso de inmediato.
2. Varias rutas administrativas usan `ORDER_ADMIN_ROLES` (`admin`, `superadmin`, `imprenta`) para operaciones demasiado amplias: usuarios, configuración global y detalle/mutación de chips.

## Mapa de rutas por nivel de riesgo

### Público / sin sesión
- `app/api/auth/[...nextauth]/route.ts`
- `app/api/auth/register/route.ts`
- `app/api/auth/forgot-password/route.ts`
- `app/api/auth/reset-password/route.ts`
- `app/api/public/*`
- `app/api/products/route.ts`
- `app/api/contacts/public/route.ts`

### Público con secreto/firma de máquina
- `app/api/cron/expire-chips/route.ts` → `CRON_SECRET`
- `app/api/cron/notify/route.ts` → deshabilitada
- `app/api/payments/webhook/route.ts` → firma Stripe

### Autenticado por sesión de usuario
- `account/state`, `chips/*`, `orders/*`, `organizations/*`, `users/*`, `upload`, `image-proxy`, `payments/checkout`, `contacts/profile-link`

### Admin / backoffice
- Generalmente protegidas por `requireRole(...)` o chequeo manual en `app/api/admin/*`
- El problema no es ausencia total de auth, sino exceso de alcance en varias rutas

## Hallazgos prioritarios

### 1) CRÍTICO — Revocación de permisos no inmediata
Evidencia:
- `lib/auth.ts` usa `session.strategy = "jwt"` y `maxAge = 30 días`
- `requireRole()` y los handlers dependen de `session.user.role`
- No vi revalidación de estado/rol contra DB en cada request sensible

Impacto:
- Un usuario suspendido o degradado sigue pudiendo usar rutas protegidas hasta que expire el JWT.
- También aplica a cambios de `adminRole`/`isAdmin`.

### 2) ALTO — Exceso de privilegio en `/api/admin/users`
Evidencia:
- `app/api/admin/users/route.ts` usa `requireRole(ORDER_ADMIN_ROLES)`
- `ORDER_ADMIN_ROLES = ["admin", "superadmin", "imprenta"]`
- El handler permite listar usuarios y cambiar su estado (`active/suspended`)

Impacto:
- La cuenta `imprenta` puede ver/suspender usuarios, aunque la UI de admin sólo le deja el módulo de inventario.
- Es una discrepancia clara entre frontend y backend.

### 3) ALTO — Exceso de privilegio en `/api/admin/chips/[chipId]`
Evidencia:
- También usa `requireRole(ORDER_ADMIN_ROLES)`
- `GET` devuelve datos sensibles del chip: dueño, teléfono, perfil asignado, contactos, últimos escaneos
- `PATCH` permite borrar el chip, cambiar `accountId`, `isPhysical`, `status`, `serviceStatus`

Impacto:
- `imprenta` puede acceder a datos sensibles y ejecutar mutaciones de alto riesgo sobre chips.
- Esto excede un rol de operaciones/inventario si la intención era limitarlo a stock.

### 4) ALTO — Configuración global expuesta a `ORDER_ADMIN_ROLES`
Evidencia:
- `app/api/admin/config/route.ts` usa `requireRole(ORDER_ADMIN_ROLES)`
- `ConfigRepository.setMany()` actualiza configuración global

Impacto:
- Un rol que sólo debería operar inventario puede tocar settings globales del sistema.

## Inconsistencias RBAC observadas
- Hay mezcla de `requireRole`, `requireAuth` y chequeos inline `getServerSession(...)` + arrays de roles.
- La semántica de error también varía: casi todo devuelve `401` incluso cuando el problema es `403`.
- Algunas rutas admin aceptan `imprenta`, otras no; eso parece una matriz de permisos no consolidada.

## Recomendación
### Mantener, pero corregir ya
No retiraría el módulo; la estructura es útil. Pero sí hay que endurecerlo.

### Plan de refactor seguro por fases
1. Corto plazo:
   - Restringir `admin/users`, `admin/chips/[chipId]` y `admin/config` a `GENERAL_ADMIN_ROLES` o `SUPERADMIN_ROLES` según el caso.
   - Cambiar respuestas de acceso denegado a `403` cuando corresponda.
2. Medio plazo:
   - Unificar guards en `requireAuth`/`requireRole` y eliminar helpers locales `isAdmin()` duplicados.
   - Separar lectura sensible de mutaciones peligrosas en rutas de chips.
3. Largo plazo:
   - Agregar revalidación de rol/estado contra DB o token versioning para revocación inmediata.
   - Centralizar una matriz de permisos por dominio, no por archivo suelto.

## Conclusión
La base es usable, pero hoy el RBAC tiene fuga de privilegios y revocación lenta. El sistema debe endurecerse antes de seguir centralizando auth o expandiendo roles.