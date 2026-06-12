# Evolución del Dashboard Admin

> **Commit base:** `c11b914`  
> **Fecha:** Junio 2026  
> **Archivo analizado:** `domains/admin/services/admin-stats.service.ts` + `app/api/admin/stats/route.ts` + `_components/sections/DashboardSection.tsx`

---

## 1. DashboardSection actual — Qué consume hoy

### Endpoint utilizado
`GET /api/admin/stats`

### Hook
`useAdminStats.ts` — consume el endpoint y almacena el resultado en estado local.

### Interfaces (definidas en `admin-stats.service.ts`)

**AdminDashboardStats:**
- `totalUsers: number`
- `totalChips: number`
- `totalProfiles: number`
- `totalScans: number`
- `totalNotifications: number`
- `chipsByStatus: { activated, inventory, suspended, sold }`
- `chipsByService: { active, limited }`
- `productivity: { pendingOrders, usersWithoutChips, newUsersToday, inactiveActivatedChips }`
- `storageUsage: { usedBytes, totalBytes, percentage }`
- `alerts: DashboardAlert[]`
- `recentScans: unknown[]`
- `recentUsers: { id, email, createdAt, status }[]`
- `recentOrgs: { id, legalName, createdAt, status }[]`

### Métricas que consume actualmente

| Métrica | Fuente Prisma | Query |
|---------|--------------|-------|
| totalUsers | `prisma.user.count()` | COUNT simple |
| totalChips | `prisma.chip.count()` | COUNT simple |
| totalProfiles | `prisma.profile.count()` | COUNT simple |
| totalScans | `prisma.scanEvent.count()` | COUNT simple |
| totalNotifications | `prisma.notification.count()` | COUNT simple |
| activatedChips | `prisma.chip.count({ where: { status: "activated" } })` | COUNT con filtro |
| inventoryChips | `prisma.chip.count({ where: { status: "inventory" } })` | COUNT con filtro |
| suspendedChips | `prisma.chip.count({ where: { status: "suspended" } })` | COUNT con filtro |
| soldChips | `prisma.chip.count({ where: { status: "sold" } })` | COUNT con filtro |
| activeService | `prisma.chip.count({ where: { serviceStatus: "active", status: "activated" } })` | COUNT con 2 filtros |
| limitedService | `prisma.chip.count({ where: { serviceStatus: "limited" } })` | COUNT con filtro |
| pendingOrders | `prisma.order.count({ where: { orderStatus: "pending" } })` | COUNT con filtro |
| usersWithoutChips | `prisma.user.count({ where: { role: "user", chips: { none: {} } } })` | COUNT con relación |
| newUsersToday | `prisma.user.count({ where: { createdAt: { gte: hoy } } })` | COUNT con fecha |
| inactiveActivatedChips | `prisma.chip.count({ where: { status: "activated", assignedProfileId: null } })` | COUNT con 2 filtros |
| storageUsed | `prisma.$queryRawUnsafe(...)` | Raw SQL a storage.objects |
| recentScans | `prisma.scanEvent.findMany({ take: 10, include: chip })` | SELECT con JOIN |
| recentUsers | `prisma.user.findMany({ take: 5 })` | SELECT simple |
| recentOrgs | `prisma.organization.findMany({ take: 5 })` | SELECT simple |

### Coste estimado
- 16 queries COUNT paralelos via `Promise.all` — coste bajo
- 1 raw SQL para storage — coste bajo
- 3 queries SELECT con take limitado — coste bajo
- Cache Redis con TTL de 60 segundos — reduce coste a 0 en requests subsecuentes
- **Total: 20 queries por request, cacheadas cada 60s**

---

## 2. Endpoint de estadísticas

**Ruta:** `GET /api/admin/stats`  
**Roles:** `GENERAL_ADMIN_ROLES` (admin, superadmin)  
**Cache:** Redis, TTL 60s, key `admin_stats_v1`

### Queries ejecutadas (20 en total)

| # | Query | Tabla | Coste |
|---|-------|-------|-------|
| 1 | `user.count()` | User | Bajo |
| 2 | `chip.count()` | Chip | Bajo |
| 3 | `profile.count()` | Profile | Bajo |
| 4 | `scanEvent.count()` | ScanEvent | Bajo |
| 5 | `notification.count()` | Notification | Bajo |
| 6 | `chip.count({ status: "activated" })` | Chip | Bajo |
| 7 | `chip.count({ status: "inventory" })` | Chip | Bajo |
| 8 | `chip.count({ status: "suspended" })` | Chip | Bajo |
| 9 | `chip.count({ status: "sold" })` | Chip | Bajo |
| 10 | `chip.count({ serviceStatus: "active", status: "activated" })` | Chip | Bajo |
| 11 | `chip.count({ serviceStatus: "limited" })` | Chip | Bajo |
| 12 | `scanEvent.findMany({ take: 10, include: chip })` | ScanEvent + Chip | Bajo |
| 13 | `user.findMany({ take: 5 })` | User | Bajo |
| 14 | `organization.findMany({ take: 5 })` | Organization | Bajo |
| 15 | `order.count({ orderStatus: "pending" })` | Order | Bajo |
| 16 | `user.count({ role: "user", chips: { none: {} } })` | User + Chip | Medio |
| 17 | `user.count({ createdAt: { gte: hoy } })` | User | Bajo |
| 18 | `chip.count({ status: "activated", assignedProfileId: null })` | Chip | Bajo |
| 19 | Raw SQL storage | storage.objects | Bajo |
| 20 | Alert engine (lógica en memoria) | — | Mínimo |

---

## 3. Validación de factibilidad de cada KPI propuesto

### CENTRO DE ALERTAS

| KPI | Existe | Fuente actual | Tabla | Campo | Complejidad | Tiempo |
|-----|--------|--------------|-------|-------|-------------|--------|
| Pagos pendientes de revisión | **SI** | `productivity.pendingOrders` | Order | `orderStatus = "pending"` | Baja | Ya existe |
| Solicitudes empresariales pendientes | **NO** | — | Organization | `corporateStatus = "pending_company_review"` | Baja | 30 min |
| Chips por asignar | **SI** | `chipsByStatus.inventory` | Chip | `status = "inventory"` | Baja | Ya existe |
| Pedidos en producción | **NO** | — | Order | `orderStatus = "processing"` | Baja | 15 min |

### SALUD DEL ECOSISTEMA

| KPI | Existe | Fuente actual | Tabla | Campo | Complejidad | Tiempo |
|-----|--------|--------------|-------|-------|-------------|--------|
| Usuarios totales | **SI** | `totalUsers` | User | COUNT | Baja | Ya existe |
| Usuarios activos | **NO** | — | User | `status = "active"` | Baja | 15 min |
| Usuarios bloqueados | **NO** | — | User | `status = "blocked"` | Baja | 15 min |
| Perfiles registrados | **SI** | `totalProfiles` | Profile | COUNT | Baja | Ya existe |
| Perfiles con chip activo | **NO** | — | Profile + Chip | `chips.some(status = "activated")` | Media | 1 hora |
| Perfiles sin chip | **NO** | — | Profile | `chips.none({})` | Media | 1 hora |
| Perfiles corporativos | **NO** | — | Profile | `profileType = "corporate"` | Baja | 15 min |

### HARDWARE

| KPI | Existe | Fuente actual | Tabla | Campo | Complejidad | Tiempo |
|-----|--------|--------------|-------|-------|-------------|--------|
| Chips totales | **SI** | `totalChips` | Chip | COUNT | Baja | Ya existe |
| Chips activos | **SI** | `chipsByStatus.activated` | Chip | `status = "activated"` | Baja | Ya existe |
| Chips inventario | **SI** | `chipsByStatus.inventory` | Chip | `status = "inventory"` | Baja | Ya existe |
| Chips vendidos | **SI** | `chipsByStatus.sold` | Chip | `status = "sold"` | Baja | Ya existe |
| Chips suspendidos | **SI** | `chipsByStatus.suspended` | Chip | `status = "suspended"` | Baja | Ya existe |

### OPERACIÓN COMERCIAL

| KPI | Existe | Fuente actual | Tabla | Campo | Complejidad | Tiempo |
|-----|--------|--------------|-------|-------|-------------|--------|
| Pedidos pendientes | **SI** | `productivity.pendingOrders` | Order | `orderStatus = "pending"` | Baja | Ya existe |
| Pagos en revisión | **NO** | — | Order | `paymentStatus = "under_review"` | Baja | 15 min |
| Pedidos en producción | **NO** | — | Order | `orderStatus = "processing"` | Baja | 15 min |
| Pedidos enviados | **NO** | — | Order | `orderStatus = "shipped"` | Baja | 15 min |
| Pedidos completados | **NO** | — | Order | `orderStatus = "completed"` | Baja | 15 min |

### CORPORATIVO

| KPI | Existe | Fuente actual | Tabla | Campo | Complejidad | Tiempo |
|-----|--------|--------------|-------|-------|-------------|--------|
| Empresas registradas | **NO** | `recentOrgs` (solo 5 recientes) | Organization | COUNT | Baja | 15 min |
| Empresas activas | **NO** | — | Organization | `status = "active"` | Baja | 15 min |
| Solicitudes pendientes | **NO** | — | Organization | `corporateStatus = "pending_company_review"` | Baja | 15 min |
| Colaboradores activos | **NO** | — | OrganizationMember | `corporateStatus = "active"` | Baja | 15 min |

### VENTAS

| KPI | Existe | Fuente actual | Tabla | Campo | Complejidad | Tiempo |
|-----|--------|--------------|-------|-------|-------------|--------|
| Ventas hoy | **NO** | — | Order | `paymentStatus = "paid"` + `paidAt = hoy` | Baja | 30 min |
| Pedidos hoy | **NO** | — | Order | `createdAt = hoy` | Baja | 15 min |
| Usuarios nuevos hoy | **SI** | `productivity.newUsersToday` | User | `createdAt >= hoy` | Baja | Ya existe |
| Ventas mes | **NO** | — | Order | `paymentStatus = "paid"` + `paidAt >= inicioMes` | Media | 1 hora |
| Pedidos mes | **NO** | — | Order | `createdAt >= inicioMes` | Baja | 15 min |
| Activaciones mes | **NO** | — | Chip | `activatedAt >= inicioMes` | Baja | 15 min |

---

## 4. Resumen de factibilidad

| Categoría | Existen | Nuevas necesarias | Total |
|-----------|---------|------------------|-------|
| Centro de Alertas | 2 | 2 | 4 |
| Salud del Ecosistema | 2 | 5 | 7 |
| Hardware | 5 | 0 | 5 |
| Operación Comercial | 1 | 4 | 5 |
| Corporativo | 0 | 4 | 4 |
| Ventas | 1 | 5 | 6 |
| **TOTAL** | **11** | **20** | **31** |

---

## 5. Accesos rápidos

### Tabs que existen en el sidebar

| Tab | Existe | Puede abrirse desde Dashboard |
|-----|--------|-------------------------------|
| `dashboard` | SI | — |
| `users` | SI | SI — actionUrl `?tab=users` |
| `chips` | SI | SI — actionUrl `?tab=chips` |
| `tienda` | SI | SI — actionUrl `?tab=tienda` |
| `empresas` | SI | SI — actionUrl `?tab=empresas` |
| `inventory` | SI | SI — actionUrl `?tab=inventory` |
| `pedidos` | SI | SI — actionUrl `?tab=pedidos` |
| `settings` | SI | SI — actionUrl `?tab=settings` |
| `admins` | SI | SI — actionUrl `?tab=admins` |

### Tabs que el DashboardSection ya usa para actionUrl

- `?tab=pedidos` — en alerta "Pedidos Pendientes"
- `?tab=chips` — en alerta "Chips sin Perfil"
- `?tab=governance` — en alerta de almacenamiento (NO existe como tab real)

### Tabs que podrían agregarse como accesos rápidos

- `?tab=users` — desde métricas de usuarios
- `?tab=organizations` — desde métricas corporativas
- `?tab=inventory` — desde métricas de hardware
- `?tab=tienda` — desde métricas de ventas

---

## 6. Riesgos

### Métricas duplicadas

| Métrica 1 | Métrica 2 | Duplicación |
|-----------|-----------|-------------|
| `totalChips` | Suma de `chipsByStatus` (activated + inventory + suspended + sold) | Parcial — la suma no incluye chips con status "pending" |
| `productivity.pendingOrders` | `orderStatus = "pending"` | Identical — misma query |
| `chipsByStatus.activated` | `chipsByStatus.inventory` | Complementarias — no duplicadas |

### Métricas costosas

| Métrica | Coste | Razón |
|---------|-------|-------|
| `usersWithoutChips` | Medio | JOIN entre User y Chip con `none: {}` — puede ser lento con muchos usuarios |
| `recentScans` | Medio | JOIN entre ScanEvent y Chip, ordenado por fecha |
| `storageRaw` | Medio | Raw SQL contra Supabase storage — puede fallar por permisos |

### Métricas inconsistentes

| Métrica | Inconsistencia |
|---------|---------------|
| `totalNotifications` | Cuenta todas las notificaciones, no solo las no leídas |
| `productivity.inactiveActivatedChips` | Chips activados sin perfil — definition ambigua |
| `storageUsage.totalBytes` | Hardcodeado a 1GB — no consulta el plan real |

### Posibles problemas de rendimiento

| Problema | Impacto | Solución |
|----------|---------|----------|
| 20 queries simultáneas en cada request | Medio | Cache Redis ya mitiga (60s TTL) |
| `usersWithoutChips` con muchos usuarios | Alto | Agregar índice o pre-computar |
| Raw SQL de storage puede fallar | Bajo | Ya tiene `.catch()` con fallback |

---

## 7. Propuesta final

### FASE 1 — Implementar ya (estas semana)

**Objetivo:** Completar el Centro de Alertas y Operación Comercial básico.

| KPI | Query Prisma necesaria | Tiempo |
|-----|----------------------|--------|
| Pagos en revisión | `order.count({ paymentStatus: "under_review" })` | 15 min |
| Pedidos en producción | `order.count({ orderStatus: "processing" })` | 15 min |
| Pedidos enviados | `order.count({ orderStatus: "shipped" })` | 15 min |
| Pedidos completados | `order.count({ orderStatus: "completed" })` | 15 min |
| Empresas registradas | `organization.count()` | 15 min |
| Empresas activas | `organization.count({ status: "active" })` | 15 min |
| Solicitudes empresariales pendientes | `organization.count({ corporateStatus: "pending_company_review" })` | 15 min |
| Usuarios activos | `user.count({ status: "active" })` | 15 min |
| Usuarios bloqueados | `user.count({ status: "blocked" })` | 15 min |
| Pedidos hoy | `order.count({ createdAt: { gte: hoy } })` | 15 min |
| Pedidos mes | `order.count({ createdAt: { gte: inicioMes } })` | 15 min |
| Activaciones mes | `chip.count({ activatedAt: { gte: inicioMes } })` | 15 min |

**Total FASE 1:** 12 queries nuevas, ~3 horas de implementación.

### FASE 2 — Valor medio (próxima semana)

**Objetivo:** Completar Salud del Ecosistema y Ventas avanzadas.

| KPI | Query Prisma necesaria | Tiempo |
|-----|----------------------|--------|
| Perfiles con chip activo | `profile.count({ where: { chips: { some: { status: "activated" } } } })` | 1 hora |
| Perfiles sin chip | `profile.count({ where: { chips: { none: {} } } })` | 1 hora |
| Perfiles corporativos | `profile.count({ profileType: "corporate" })` | 15 min |
| Colaboradores activos | `organizationMember.count({ corporateStatus: "active" })` | 15 min |
| Ventas hoy | `order.aggregate({ sum: amount, where: { paymentStatus: "paid", paidAt: { gte: hoy } } })` | 1 hora |
| Ventas mes | `order.aggregate({ sum: amount, where: { paymentStatus: "paid", paidAt: { gte: inicioMes } } })` | 1 hora |
| Solicitudes pendientes (corporativo) | `corporateProductRequest.count({ status: "pending" })` | 15 min |

**Total FASE 2:** 7 queries nuevas, ~5 horas de implementación.

### FASE 3 — Futuro (backlog)

**Objetivo:** Dashboard de ventas avanzado y métricas derivadas.

| KPI | Complejidad | Razón |
|-----|-------------|-------|
| Gráfico de ventas por período | Alta | Requiere agrupación por fecha y renderizado de gráfico |
| Tasa de conversión de pedidos | Media | Requiere lógica de cálculo entre estados |
| Tiempo promedio de aprobación | Media | Requiere diferencia de fechas entre estados |
| Top productos vendidos | Media | Requiere agrupación por productId |
| Alertas inteligentes predictivas | Alta | Requiere lógica de tendencias |

**Total FASE 3:** 5 features, ~2 semanas de implementación.

---

## Resumen ejecutivo

| Categoría | Existen | FASE 1 | FASE 2 | FASE 3 |
|-----------|---------|--------|--------|--------|
| Centro de Alertas | 2 | 2 | 0 | 0 |
| Salud del Ecosistema | 2 | 2 | 3 | 0 |
| Hardware | 5 | 0 | 0 | 0 |
| Operación Comercial | 1 | 4 | 0 | 0 |
| Corporativo | 0 | 3 | 1 | 0 |
| Ventas | 1 | 2 | 2 | 5 |
| **TOTAL** | **11** | **13** | **6** | **5** |

### Veredicto

El dashboard actual tiene **11 de 31 KPIs** (35%). Las **13 queries de FASE 1** son todas COUNT simples que pueden implementarse en ~3 horas. Las **6 queries de FASE 2** requieren JOINs más complejos (~5 horas). Las **5 features de FASE 3** son opcionales y de largo plazo.

**Recomendación:** Implementar FASE 1 esta semana. El dashboard pasaría de 35% a 77% de cobertura de KPIs.

---
*Originalmente en: docs/audit/*