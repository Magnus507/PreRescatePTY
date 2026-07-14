# 🧪 Production Smoke Test Checklist

> **Versión:** 1.0  
> **Última actualización:** 2026-05-27  
> **Repo:** PreRescatePTY  
> **Propósito:** Validar que un deploy a producción no rompe flujos críticos antes de liberar a usuarios.

---

## Tabla de contenidos

1. [Auth (login/logout)](#1-auth)
2. [Registro de nuevo usuario](#2-registro)
3. [Compra manual (Yappy/transferencia)](#3-compra-manual)
4. [Subida de comprobante de pago](#4-subida-comprobante)
5. [Admin approve/reject de orden manual](#5-admin-approvereject)
6. [Asignación de chips por combo](#6-asignación-de-chips)
7. [Activación de chip](#7-activación-de-chip)
8. [Emergencia pública (escaneo de chip)](#8-emergencia-pública)
9. [Upload / Image proxy](#9-upload--image-proxy)
10. [Pago manual](#10-pago-manual)
11. [Admin RBAC por roles](#11-admin-rbac)
12. [Service worker / Cache post-deploy](#12-service-worker--cache)
13. [SQL checks útiles en Supabase](#13-sql-checks)

---

## 1. Auth

### 1.1 Login
- [ ] Ingresar con email/contraseña de usuario activo → redirige a `/dashboard`
- [ ] Ingresar con credenciales inválidas → muestra error
- [ ] Ingresar con admin (`admin`/`superadmin`/`imprenta`) → redirige a `/admin`
- [ ] Verificar que el JWT contiene `role` correcto (abrir DevTools → Application → Cookies → `next-auth.session-token`)

### 1.2 Logout
- [ ] Cerrar sesión → redirige a `/login`
- [ ] Después de logout, intentar acceder a `/dashboard` → redirige a `/login`

### 1.3 Rate limit
- [ ] 10+ intentos de login fallidos en 15 minutos → `429 Demasiados intentos`

---

## 2. Registro

- [ ] Crear cuenta nueva con email + contraseña
- [ ] Confirmar que se crea `User` con `status: "active"` (ver Supabase `users` table)
- [ ] Confirmar que se crea `Account` asociada con `status: "pending"`
- [ ] Confirmar que se crea `Profile` con datos básicos
- [ ] Confirmar que se puede iniciar sesión inmediatamente
- [ ] Email duplicado → error `Este email ya está registrado`

---

## 3. Compra manual

### 3.1 Selección de paquete
- [ ] Navegar a `/comprar` → ver lista de paquetes desde BD `Package`
- [ ] Seleccionar paquete → mostrar resumen con precio, chips, perfiles

### 3.2 Crear pedido manual
- [ ] Seleccionar método de pago "Manual" (Yappy / Transferencia bancaria)
- [ ] Confirmar pedido → redirige a `/dashboard/pedidos`
- [ ] Verificar que se crea `Order` en BD con:
  - `provider: "manual"`
  - `orderStatus: "pending"`
  - `paymentStatus: "pending"`
  - `adminReviewStatus: "pending"`
  - `packageId` correcto

### 3.3 API pública
- [ ] `GET /api/public/packages` → devuelve paquetes activos
- [ ] `GET /api/public/config` → devuelve configuración pública

---

## 4. Subida de comprobante

- [ ] En `/dashboard/pedidos`, pedido manual debe mostrar botón "Subir comprobante"
- [ ] Seleccionar imagen JPG/PNG/WebP < 5MB
- [ ] Subir → debe aparecer URL del comprobante y estado `"pending_review"`
- [ ] Verificar:
  - `Order.paymentProofUrl` se actualiza con URL relativa (`/api/image-proxy?bucket=payment-proofs&path=...`)
  - `Order.manualPaymentReference` se actualiza
  - `Order.orderStatus` cambia a `"pending_review"`
- [ ] Subir archivo no-imagen (PDF, .exe) → error `Archivo inválido: el contenido no corresponde a una imagen permitida.`
- [ ] Subir archivo > 5MB → error
- [ ] Subir sin sesión → `401 No autorizado`
- [ ] Rate limit: 20+ subidas en 15 min → `429 Demasiadas cargas`

---

## 5. Admin approve/reject

### 5.1 Approve
- [ ] Desde `/admin`, sección "Pedidos", ver pedido manual con estado `pending_review`
- [ ] Hacer clic en "Aprobar"
- [ ] Verificar:
  - `Order.paymentStatus` → `"paid"`
  - `Order.orderStatus` → `"completed"`
  - `Order.adminReviewStatus` → `"approved"`
  - `Order.adminReviewedById` → ID del admin
  - `Order.adminReviewedAt` → timestamp
  - `Account.packageId` → ID del paquete
  - `Account.maxChipsAllocated` → se incrementa
  - `Account.status` → `"active"`
  - Se crea `AuditLog` con `action: "order_approved"`
- [ ] Intentar aprobar orden ya aprobada → error
- [ ] Usar `PATCH /api/admin/orders` en orden manual → error `usa /api/admin/orders/{id}/approve o /reject`
- [ ] Rate limit: 20+ approves/min → `429`

### 5.2 Reject
- [ ] Hacer clic en "Rechazar" en orden manual con estado `pending_review`
- [ ] Verificar:
  - `Order.paymentStatus` → `"rejected"`
  - `Order.orderStatus` → `"cancelled"`
  - `Order.adminReviewStatus` → `"rejected"`
  - Se crea `AuditLog` con `action: "order_rejected"`
- [ ] Intentar rechazar orden ya rechazada → error
- [ ] Rate limit: 20+ rejects/min → `429`

### 5.3 RBAC
- [ ] Admin con rol `admin` → puede approve/reject ✅
- [ ] Admin con rol `superadmin` → puede approve/reject ✅
- [ ] Admin con rol `imprenta` → puede approve/reject ✅
- [ ] Usuario regular → `403 Acceso denegado`
- [ ] Usuario sin sesión → `401 No autorizado`

---

## 6. Asignación de chips

### 6.1 Por approve de orden manual
- [ ] Al aprobar orden manual con paquete que incluye chips:
  - [ ] `Account.maxChipsAllocated` se incrementa según `Package.maxChips`
  - [ ] `Account.maxProfilesAllocated` se incrementa según `Package.maxProfiles`
  - [ ] Se crean `ChipClaimToken` para los chips del paquete

### 6.2 Auto-generación vs pool global
- [ ] Si hay chips en inventario global → se asignan al account
- [ ] Si no hay suficientes → se crean chips nuevos con `status: "inventory"`
- [ ] Los chips asignados quedan bajo `accountId` de la cuenta

---

## 7. Activación de chip

- [ ] En `/dashboard/chips`, ver chip pendiente de activación
- [ ] Ingresar código de activación del token
- [ ] Confirmar activación
- [ ] Verificar:
  - `Chip.status` → `"activated"`
  - `Chip.ownerUserId` → ID del usuario
  - `Chip.assignedProfileId` → ID del perfil
  - `Chip.serviceStatus` → `"active"`
  - `Chip.serviceStartDate` / `Chip.serviceEndDate` → fechas correctas
  - `ChipClaimToken.usedAt` → timestamp
- [ ] Sin activar, escanear chip → muestra perfil inactivo

---

## 8. Emergencia pública

### 8.1 Ver perfil público
- [ ] `GET /api/public/{shortCode}` con chip activo → devuelve perfil con datos médicos
- [ ] `GET /api/public/{shortCode}` con chip inactivo → `403 Protocolo inactivo`
- [ ] `GET /api/public/{shortCode}` con código inexistente → `404`
- [ ] Rate limit: 30 req/min por IP → `429`
- [ ] Cache-Control: verificar header en respuesta
- [ ] Datos sensibles: NO exponer email, birthDate, IDs internos
- [ ] Demo profile `44R6DBNQ` → devuelve demo response sin DB hit

### 8.2 Escaneo (scan)
- [ ] `POST /api/public/{shortCode}/scan` con chip activo → `201` con `scanId`
- [ ] Se crea `ScanEvent` con `emergencyMode: true`
- [ ] `Chip.lastScanAt` se actualiza
- [ ] Rate limit: 10 req/min por IP → `429`
- [ ] Chip inactivo → `409 Chip no activo`
- [ ] Sin body válido → `400`

### 8.3 Emergencia página web
- [ ] Navegar a `/e/{shortCode}` → cargar perfil público
- [ ] Verificar que el diseño es mobile-first
- [ ] Verificar botón de llamada a contacto de emergencia
- [ ] Verificar que datos críticos (alergias, condiciones) son visibles sin scroll

---

## 9. Upload / Image proxy

### 9.1 Upload directo
- [ ] Subir imagen JPG → URL de retorno
- [ ] Subir imagen PNG → URL de retorno
- [ ] Subir imagen WebP → URL de retorno
- [ ] Renombrar `.exe` a `.png` → detectado por magic bytes, rechazado
- [ ] Subir imagen real → optimizada (redimensionada, comprimida)
- [ ] Subir tipo `profile` → se actualiza `Profile.photoUrl`
- [ ] Subir tipo `payment` → bucket `payment-proofs`, path seguro
- [ ] Sin sesión → `401`

### 9.2 Image proxy
- [ ] `GET /api/image-proxy?bucket=profile-photos&path=...` → imagen servida
- [ ] `GET /api/image-proxy?bucket=payment-proofs&path=...` sin sesión → `401`
- [ ] `GET /api/image-proxy?bucket=payment-proofs&path=...` con sesión propia → imagen servida
- [ ] `GET /api/image-proxy?bucket=payment-proofs&path=...` con sesión admin → imagen servida
- [ ] `GET /api/image-proxy?bucket=payment-proofs&path=...` con sesión de otro usuario → `403`
- [ ] Path traversal (`../../`) → `400 Invalid path`
- [ ] Bucket no permitido → `403 Bucket not allowed`
- [ ] **Rate limit:** 200 req/min por IP → `429`
- [ ] Cache-Control: `public, max-age=31536000, immutable`

---

## 10. Pago manual

### 10.1 Alta de pedido
- [ ] Crear pedido manual desde tienda
- [ ] Mostrar instrucciones bancarias y referencia de pago
- [ ] Pedido queda en revisión hasta subir comprobante

### 10.2 Comprobante y revisión
- [ ] Subir comprobante
- [ ] Orden pasa a `paymentStatus: "under_review"`
- [ ] Admin aprueba o rechaza la orden
- [ ] Se registra quién tomó la decisión

### 10.3 Seguridad
- [ ] El flujo manual no requiere variables de pago externo
- [ ] El pedido manual no puede aprobarse dos veces
- [ ] La reserva ocurre de forma atómica al aprobar

---

## 11. Admin RBAC

> Basado en `lib/rbac.ts`: `ORDER_ADMIN_ROLES`, `GENERAL_ADMIN_ROLES`, `SUPERADMIN_ROLES`.

### 11.1 Roles en acción

| Ruta | admin | superadmin | imprenta |
|------|:-----:|:----------:|:--------:|
| `/admin` (middleware) | ✅ | ✅ | ✅ |
| `admin/orders` GET/PATCH/DELETE | ✅ | ✅ | ❌ |
| `admin/orders/{id}/approve` | ✅ | ✅ | ✅ |
| `admin/orders/{id}/reject` | ✅ | ✅ | ✅ |
| `admin/chips` GET/POST | ✅ | ✅ | ✅ |
| `admin/chips/{id}` GET/PATCH | ✅ | ✅ | ✅ |
| `admin/chips/{id}/reactivate` | ✅ | ✅ | ❌ |
| `admin/chips/inventory` GET/PATCH | ✅ | ✅ | ✅ |
| `admin/inventory` GET | ✅ | ✅ | ✅ |
| `admin/users` GET/PATCH | ✅ | ✅ | ✅ |
| `admin/users/{id}/actions` POST | ✅ | ✅ | ❌ |
| `admin/packages` GET/POST/PATCH | ✅ | ✅ | ❌ |
| `admin/products` GET/POST | ✅ | ✅ | ❌ |
| `admin/products/{id}` PATCH/DELETE | ✅ | ✅ | ❌ |
| `admin/stats` GET | ✅ | ✅ | ❌ |
| `admin/config` GET/PATCH | ✅ | ✅ | ✅ |
| `admin/admins` GET/POST/PATCH | ❌ | ✅ | ❌ |
| `admin/admins/{id}` PATCH/DELETE | ❌ | ✅ | ❌ |
| `admin/organizations` GET/POST | ✅ | ✅ | ❌ |
| `admin/organizations/{id}` GET/PATCH/DELETE | ✅ | ✅ | ❌ |
| `admin/showcase` GET/PATCH | ✅ | ✅ | ❌ |
| `admin/maintenance/clear-cache` | ✅ | ✅ | ❌ |

### 11.2 Pruebas por rol
- [ ] Probar 3 cuentas con roles `admin`, `superadmin`, `imprenta`
- [ ] Cada una debe poder acceder SOLO a las rutas marcadas como ✅
- [ ] Verificar que admin normal NO puede gestionar admins
- [ ] Verificar que imprenta NO puede modificar paquetes/productos/config
- [ ] Verificar que imprenta NO puede reactivar chips
- [ ] Verificar que admin normal NO puede cambiar su propio rol a superadmin

---

## 12. Service worker / Cache

- [ ] Después del deploy, abrir DevTools → Application → Service Workers
- [ ] Verificar que el nuevo service worker (sw.js) está instalado y activo
- [ ] Forzar actualización: `Skip waiting` en DevTools
- [ ] Navegar por todas las páginas principales → sin errores 404 de assets
- [ ] Verificar que los chunks JS están cacheados correctamente
- [ ] Cargar página con DevTools → Network tab → verificar `200 (from service worker)` en assets estáticos

### 12.1 Post-deploy
- [ ] Borrar cache de navegador antes de probar
- [ ] Cargar la app → confirmar que el nuevo HTML se sirve
- [ ] Verificar que no hay errores de chunks faltantes en la consola
- [ ] Si hay errores `chunk.js 404` → hacer hard refresh (Cmd+Shift+R)

---

## 13. SQL checks útiles en Supabase

> Ejecutar en Supabase SQL Editor después del deploy.

### 13.1 Órdenes manuales sin comprobante (abandonadas)
```sql
SELECT id, "orderNumber", "userId", "createdAt", "orderStatus"
FROM "Order"
WHERE provider = 'manual'
  AND "paymentProofUrl" IS NULL
  AND "orderStatus" = 'pending'
  AND "createdAt" < NOW() - INTERVAL '24 hours'
ORDER BY "createdAt" DESC;
```

### 13.2 Órdenes en estado incorrecto
```sql
SELECT id, "orderNumber", "orderStatus", "paymentStatus", "adminReviewStatus", provider
FROM "Order"
WHERE provider = 'manual'
  AND (
    ("adminReviewStatus" = 'approved' AND "orderStatus" != 'completed')
    OR ("adminReviewStatus" = 'rejected' AND "orderStatus" != 'cancelled')
    OR ("adminReviewStatus" = 'pending' AND "orderStatus" NOT IN ('pending', 'pending_review'))
  );
```

### 13.3 Chips sin token de activación
```sql
SELECT c.id, c."serialPublic", c.status
FROM "Chip" c
LEFT JOIN "ChipClaimToken" t ON t."chipId" = c.id
WHERE t.id IS NULL;
```

### 13.4 Usuarios con cuenta pero sin account activo
```sql
SELECT u.id, u.email, a.status as account_status
FROM "User" u
JOIN "Account" a ON a.id = u."accountId"
WHERE a.status NOT IN ('active', 'trial')
  AND u.status = 'active';
```

### 13.5 Paquetes con displayOrder duplicado
```sql
SELECT "displayOrder", COUNT(*) as count
FROM "Package"
GROUP BY "displayOrder"
HAVING COUNT(*) > 1;
```

### 13.6 Órdenes sin auditoría (manuales aprobadas/rechazadas sin AuditLog)
```sql
SELECT o.id, o."orderNumber", o."adminReviewStatus", o."adminReviewedAt"
FROM "Order" o
LEFT JOIN "AuditLog" a ON a."entityId" = o.id AND a.action IN ('order_approved', 'order_rejected')
WHERE o.provider = 'manual'
  AND o."adminReviewStatus" IN ('approved', 'rejected')
  AND a.id IS NULL;
```

### 13.7 Rate limit events recientes (si usa Upstash Redis)
```sql
-- No disponible en SQL (Upstash Redis). Ver logs de Vercel:
-- Buscar "Rate limit" en Vercel Logs > Production
```

---

## Checklist de verificación pre-deploy

- [ ] Build local exitoso (`npm run build`)
- [ ] No hay errores TypeScript
- [ ] Migraciones de Prisma aplicadas en producción
- [ ] Variables de entorno configuradas en Vercel:
  - `NEXTAUTH_SECRET`
  - `NEXTAUTH_URL`
  - `DATABASE_URL`
  - `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - ninguna variable de pago externo
  - `NEXT_PUBLIC_APP_URL`
- [ ] Supabase Storage buckets creados:
  - `profile-photos` (público)
  - `payment-proofs` (autenticado)
  - `general` (público)
- [ ] RLS policies aplicadas en Supabase
- [ ] Último commit pusheado a `origin/master`
- [ ] Deploy en Vercel completado sin errores

---

## Post-deploy inmediato

- [ ] Revisar Vercel Logs → sin errores 500/404 inesperados
- [ ] Revisar Sentry (si configurado) → sin errores nuevos
- [ ] Probar flujo completo de principio a fin:
  Registro → Compra manual → Subir comprobante → Admin approve → Activar chip
- [ ] Probar emergencia pública con chip recién activado
- [ ] Confirmar que el service worker se actualizó (ver `sw.js` version)
- [ ] Si algo falla: `git revert <commit>` y redeploy
