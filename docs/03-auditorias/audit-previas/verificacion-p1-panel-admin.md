# Verificación P1 Panel Admin

> **Fecha:** Junio 2026  
> **Estado del repo:** HEAD `f22aeec`  
> **No se modificó código ni se hizo commit.**

---

## P1 reales

### P1 #1 — PedidosSection monolítico (1655 líneas) ✅ REAL

- **Archivo:** `app/(admin)/admin/_components/sections/PedidosSection.tsx`
- **Tamaño:** 1655 líneas
- **Responsabilidades:** Listado de pedidos, filtros por estado, detalle de pedido, aprobación de pago, rechazo de pago, picking físico, QR descargable, pedidos corporativos, asignación de chips, entrega corporativa, polling
- **Urgencia:** Media — funciona, pero es difícil de mantener y testear
- **Recomendación:** Backlog — no bloquea funcionalidad

### P1 #2 — Rate limiting faltante en endpoints admin ⚠️ PARCIALMENTE REAL

**Endpoints CON rate limiting:**
| Endpoint | Rate limit | Límite |
|----------|-----------|--------|
| `PATCH /api/admin/orders/[id]/approve` | ✅ `admin-approve` | 20/min |
| `PATCH /api/admin/orders/[id]/reject` | ✅ `admin-reject` | 20/min |
| `PATCH /api/admin/orders/[id]/corporate-assign` | ✅ `admin-corporate-assign` | 20/min |

**Endpoints SIN rate limiting:**
| Endpoint | Modifica datos | Riesgo | Límite recomendado |
|----------|---------------|--------|-------------------|
| `PATCH /api/admin/orders/[id]/corporate-items/[itemId]/fulfillment` | ✅ Sí | Medio — fulfillment individual | 20/min |
| `GET/POST /api/admin/chips` | ✅ Sí (POST crea batch) | Medio — creación masiva | 10/min |
| `GET/POST/PATCH/DELETE /api/admin/products` | ✅ Sí | Bajo — CRUD productos | 20/min |
| `GET/POST /api/admin/users` | ✅ Sí (POST crea admin) | Bajo — solo lectura GET | 20/min |
| `GET/POST/DELETE /api/admin/organizations` | ✅ Sí | Bajo — CRUD orgs | 20/min |
| `GET/PATCH /api/admin/config` | ✅ Sí (PATCH guarda) | Bajo — config global | 10/min |

**Veredicto:** Los endpoints críticos (approve, reject, corporate-assign) YA tienen rate limiting. Los endpoints de CRUD (chips, products, users, organizations, config) NO lo tienen, pero son operaciones de admin que solo un admin autenticado puede ejecutar. El riesgo es bajo porque:
1. Solo admins autenticados pueden acceder
2. No hay endpoints públicos sin auth
3. Las operaciones son de bajo volumen

**Recomendación:** Agregar rate limiting a `corporate-items/fulfillment` (es el más crítico de los que faltan). Los demás pueden esperar.

### P1 #4 — No hay vista de auditoría (AuditLog) ⚠️ PARCIALMENTE REAL

**El modelo AuditLog SÍ existe** en Prisma schema (línea 494).

**Los logs SÍ se escriben** en múltiples endpoints admin:
- `approve/route.ts` — 3 auditLog.create
- `reject/route.ts` — 2 auditLog.create
- `corporate-items/fulfillment/route.ts` — 1 auditLog.create
- `chips/[chipId]/reactivate/route.ts` — 1 auditLog.create
- `chips/[chipId]/assign-direct/route.ts` — 1 auditLog.create
- `chips/[chipId]/rehabilitate/route.ts` — 1 auditLog.create
- `users/[id]/actions/route.ts` — 3 auditLog.create
- `organizations/[orgId]/users/route.ts` — 1 auditLog.create

**Pero NO hay vista admin** para consultar los logs. No hay sección en el sidebar, no hay endpoint `GET /api/admin/audit-logs`, no hay componente `AuditSection`.

**Veredicto:** La auditoría se está registrando correctamente. Lo que falta es la UI para consultarla. Esto es un P1 real pero no urgente — los logs están ahí para cuando se necesite investigar.

---

## P1 falsos positivos

### P1 #3 — Sin validación server-side de roles ❌ FALSO POSITIVO

**Todos los endpoints admin SÍ validan roles.** La verificación encontró:

| Endpoint | Método de validación | Roles permitidos |
|----------|---------------------|-----------------|
| `orders/[id]/approve` | `getServerSession` + inline check | admin, superadmin, imprenta |
| `orders/[id]/reject` | `requireRole(ORDER_ADMIN_ROLES)` | admin, superadmin, imprenta |
| `orders/[id]/corporate-assign` | `getServerSession` + inline check | admin, superadmin, imprenta |
| `orders/[id]/corporate-items/[itemId]/fulfillment` | `getServerSession` + inline check | admin, superadmin, imprenta |
| `chips/route.ts` | `isAdmin()` helper | admin, superadmin, imprenta |
| `products/route.ts` | `requireRole(GENERAL_ADMIN_ROLES)` | admin, superadmin |
| `users/route.ts` | `requireRole(ORDER_ADMIN_ROLES)` | admin, superadmin, imprenta |
| `organizations/route.ts` | `requireRole(GENERAL_ADMIN_ROLES)` | admin, superadmin |
| `config/route.ts` | `requireRole(ORDER_ADMIN_ROLES)` | admin, superadmin, imprenta |
| `admins/route.ts` | `requireRole(SUPERADMIN_ROLES)` | superadmin |

**El módulo `lib/rbac.ts`** proporciona:
- `requireRole(allowedRoles)` — valida sesión + rol
- `hasRole(role, allowedRoles)` — helper de verificación
- 3 grupos de roles: `ORDER_ADMIN_ROLES`, `GENERAL_ADMIN_ROLES`, `SUPERADMIN_ROLES`

**Nota:** El rol `imprenta` está incluido en `ORDER_ADMIN_ROLES` (acceso a pedidos, chips, users, config), pero NO en `GENERAL_ADMIN_ROLES` (productos, organizaciones). Esto es correcto — la imprenta solo necesita ver inventario y pedidos.

---

## Riesgo por endpoint

| Endpoint | Auth | Rate limit | AuditLog | Riesgo total |
|----------|------|-----------|----------|-------------|
| `orders/[id]/approve` | ✅ | ✅ 20/min | ✅ | 🟢 Bajo |
| `orders/[id]/reject` | ✅ | ✅ | ✅ | 🟢 Bajo |
| `orders/[id]/corporate-assign` | ✅ | ✅ 20/min | ❌ | 🟡 Medio |
| `orders/[id]/corporate-items/[itemId]/fulfillment` | ✅ | ❌ | ✅ | 🟡 Medio |
| `chips/route.ts` | ✅ | ❌ | ❌ | 🟡 Medio |
| `chips/[chipId]/reactivate` | ✅ | ❌ | ✅ | 🟢 Bajo |
| `chips/[chipId]/assign-direct` | ✅ | ❌ | ✅ | 🟢 Bajo |
| `chips/[chipId]/rehabilitate` | ✅ | ❌ | ✅ | 🟢 Bajo |
| `products/route.ts` | ✅ | ❌ | ❌ | 🟢 Bajo |
| `users/route.ts` | ✅ | ❌ | ❌ | 🟢 Bajo |
| `users/[id]/actions` | ✅ | ❌ | ✅ | 🟢 Bajo |
| `organizations/route.ts` | ✅ | ❌ | ❌ | 🟢 Bajo |
| `organizations/[orgId]/users` | ✅ | ❌ | ✅ | 🟢 Bajo |
| `config/route.ts` | ✅ | ❌ | ❌ | 🟢 Bajo |
| `admins/route.ts` | ✅ | ❌ | ❌ | 🟢 Bajo |

---

## Fixes rápidos recomendados

| # | Fix | Esfuerzo | Impacto |
|---|-----|----------|---------|
| 1 | Agregar rate limiting a `corporate-items/fulfillment` | 5 min | Medio — previene abuso de fulfillment |
| 2 | Agregar rate limiting a `chips` POST (creación de batch) | 5 min | Medio — previene creación masiva |
| 3 | Agregar auditLog a `corporate-assign` | 10 min | Bajo — ya se escribe en otros endpoints |
| 4 | Agregar auditLog a `products` CRUD | 15 min | Bajo — trazabilidad de cambios de producto |

**Total: ~35 minutos de trabajo**

---

## Fixes grandes para backlog

| # | Fix | Esfuerzo | Impacto |
|---|-----|----------|---------|
| 1 | Refactor PedidosSection (1655 líneas) | 3-5 días | Alto — mantenibilidad |
| 2 | Crear vista de auditoría (AuditSection) | 3-5 días | Alto — trazabilidad |
| 3 | Agregar rate limiting a todos los endpoints admin | 1 día | Medio — seguridad |
| 4 | Agregar exportación de pedidos a CSV | 1 día | Medio — reportes |

---

## Orden sugerido de implementación

1. **Inmediato (hoy):** Agregar rate limiting a `corporate-items/fulfillment` y `chips` POST
2. **Corto plazo (esta semana):** Agregar auditLog a `corporate-assign` y `products`
3. **Medio plazo (próxima semana):** Crear vista de auditoría (AuditSection)
4. **Backlog:** Refactor PedidosSection, exportación CSV, métricas de ventas

---

## Resumen

| P1 | Real | Estado actual | Acción |
|----|------|--------------|--------|
| PedidosSection monolítico | ✅ Real | 1655 líneas, funciona | Backlog |
| Rate limiting faltante | ⚠️ Parcial | 3 endpoints lo tienen, 6 no | Fix rápido en 2 endpoints |
| Validación de roles | ❌ Falso | Todos los endpoints validan | No hacer nada |
| Vista de auditoría | ⚠️ Parcial | Logs se escriben, no hay UI | Fix rápido + backlog UI |

---
*Originalmente en: docs/audit/*