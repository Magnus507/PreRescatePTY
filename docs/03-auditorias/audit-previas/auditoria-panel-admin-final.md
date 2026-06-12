# Auditoría final — Panel Admin

> **Fecha:** Junio 2026  
> **HEAD:** `f22aeec`  
> **31 API routes admin | 14 secciones UI | 13 audit log writes | 8 rate limit uses**  
> **No se modificó código.**

---

## Estado del Panel Admin

### Funcionalidades operativas

| Sección | Tab | Endpoint principal | Estado |
|---------|-----|-------------------|--------|
| Dashboard | `dashboard` | `GET /api/admin/stats` | ✅ Operativo |
| Usuarios | `users` | `GET /api/admin/users` | ✅ Operativo |
| Gestión de Chips | `chips` | `GET /api/admin/chips` | ✅ Operativo |
| Tienda Admin | `tienda` | `GET /api/admin/products` | ✅ Operativo |
| Cuentas Corporativas | `empresas` | `GET /api/admin/organizations` | ✅ Operativo |
| Stock & Fábrica | `inventory` | `GET /api/admin/chips/inventory` | ✅ Operativo |
| Ventas & Pedidos | `pedidos` | `GET /api/admin/orders` | ✅ Operativo |
| Ajustes Sistema | `settings` | `GET /api/admin/config` | ✅ Operativo |
| Administradores | `admins` | `GET /api/admin/admins` | ✅ Operativo |

### Roles

| Rol | Acceso | Validación |
|-----|--------|-----------|
| `superadmin` | Todo | ✅ `requireRole(SUPERADMIN_ROLES)` |
| `admin` | Todo excepto CRUD admins | ✅ `requireRole(GENERAL_ADMIN_ROLES)` |
| `imprenta` | Solo Stock & Fábrica | ✅ Filtrado en sidebar + `requireRole(ORDER_ADMIN_ROLES)` |

### Seguridad

| Capa | Estado |
|------|--------|
| Auth (getServerSession) | ✅ En los 31 endpoints |
| Role validation (requireRole / isAdmin) | ✅ En los 31 endpoints |
| Rate limiting | ⚠️ En 8 de 31 endpoints |
| AuditLog writes | ⚠️ En 13 puntos de código |

---

## Clasificación de problemas

### P0 — Bloqueantes
> **Ninguno.** No hay problemas críticos de seguridad o funcionalidad.

### Cerrados

| # | Problema | Estado |
|---|----------|--------|
| — | — | No hubo P0 identificados previamente |

### P1 — Importantes

| # | Problema | Estado | Evidencia |
|---|----------|--------|-----------|
| 1 | Sin rate limiting en endpoints admin | ⬜ Pendiente (parcial) | 8/31 endpoints lo tienen. Los 3 críticos (approve, reject, corporate-assign) sí lo tienen. Faltan: `fulfillment`, `chips POST`, `products`, `users`, `organizations`, `config` |
| 2 | Sin vista de auditoría (AuditLog) | ⬜ Pendiente | AuditLog SÍ se escribe (13 puntos), pero no hay UI `AuditSection` ni endpoint `GET /api/admin/audit-logs` |
| 3 | PedidosSection monolítico (1655 líneas) | ⬜ Backlog | 10 responsabilidades en un solo archivo. Funciona, pero es difícil de mantener |
| 4 | `corporate-assign` sin auditLog | ⬜ Pendiente | El endpoint SÍ tiene rate limiting pero NO escribe auditLog |

### Cerrados

| # | Problema | Estado | Evidencia |
|---|----------|--------|-----------|
| — | — | — | No hubo P1 cerrados en commits recientes |

### P2 — Mejoras

| # | Problema | Estado |
|---|----------|--------|
| 1 | ChipsSection sin estados vacíos explícitos | ⬜ Pendiente |
| 2 | UsersSection sin estados vacíos explícitos | ⬜ Pendiente |
| 3 | OrganizationsSection sin estados vacíos explícitos | ⬜ Pendiente |
| 4 | No hay filtros por fecha en pedidos | ⬜ Pendiente |
| 5 | No hay exportación de pedidos a CSV | ⬜ Pendiente |
| 6 | No hay dashboard de métricas de ventas | ⬜ Pendiente |
| 7 | No hay gestión de paquetes desde admin | ⬜ Pendiente |
| 8 | No hay historial de cambios por chip | ⬜ Pendiente |

### P3 — Limpieza

| # | Problema | Estado |
|---|----------|--------|
| 1 | Nombres de secciones inconsistentes | ⬜ Pendiente |
| 2 | CSS inline excesivo | ⬜ Pendiente |
| 3 | No hay gestión de notificaciones | ⬜ Pendiente |

---

## Resumen de cobertura admin vs cliente

| Entidad cliente | Admin puede ver | Admin puede editar | Estado |
|----------------|----------------|-------------------|--------|
| Usuarios | ✅ Listado, detalle | ✅ Bloquear, eliminar | ✅ OK |
| Perfiles médicos | ✅ Solo lectura en UserDetail | ❌ No puede editar | ⚠️ Limitado |
| Contactos emergencia | ✅ Solo lectura en UserDetail | ❌ No puede editar | ⚠️ Limitado |
| Chips | ✅ Listado, detalle, crear batch | ✅ Asignar, activar, suspender, eliminar | ✅ OK |
| Pedidos | ✅ Listado, detalle, comprobante | ✅ Aprobar, rechazar, picking, QR | ✅ OK |
| Productos | ✅ Listado | ✅ CRUD completo | ✅ OK |
| Organizaciones | ✅ Listado, detalle | ✅ Crear, eliminar, asignar chips | ✅ OK |
| Pagos | ✅ Ver comprobante | ✅ Aprobar, rechazar | ✅ OK |
| Configuración | ✅ Ver | ✅ Editar (Yappy, banco, email) | ✅ OK |
| Administradores | ✅ Listado | ✅ CRUD (solo superadmin) | ✅ OK |
| Auditoría | ✅ Logs se escriben | ❌ No hay vista para consultar | ⚠️ Sin UI |
| Historial escaneos | ✅ Solo recientes en dashboard | ❌ No hay sección dedicada | ⚠️ Limitado |

---

## Veredicto final

### ¿Listo para cierre funcional?

**Sí.** El Panel Admin está funcionalmente completo para operar el negocio.

**Razones:**
1. **Todos los flujos críticos están cubiertos:** usuarios, chips, pedidos, productos, empresas, pagos, configuración
2. **Seguridad está implementada:** auth + roles en los 31 endpoints
3. **Rate limiting en endpoints críticos:** approve, reject, corporate-assign
4. **AuditLog se está escribiendo:** 13 puntos de registro
5. **No hay P0:** ningún problema bloqueante

**Lo que queda como backlog técnico no bloqueante:**
- Rate limiting en endpoints no críticos (6 endpoints)
- Vista de auditoría (AuditLog existe, falta UI)
- Refactor de PedidosSection (1655 líneas)
- Estados vacíos en secciones secundarias
- Exportación CSV de pedidos
- Métricas de ventas

**Recomendación:** Cerrar funcionalmente y pasar a producción. Los P1/P2 son mejoras incrementales que no bloquean la operación del negocio.

---
*Originalmente en: docs/audit/*