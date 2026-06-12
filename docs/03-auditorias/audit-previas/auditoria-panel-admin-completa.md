# Auditoría completa — Panel Admin

> **Fecha:** Junio 2026  
> **Estado del repo:** HEAD `f22aeec`  
> **Alcance:** Todas las rutas `/app/(admin)/admin/*` + endpoints `app/api/admin/**`  
> **No se modificó código ni se hizo commit.**

---

## 1. Mapa general del panel admin

### Sidebar admin

| # | Sección | Tab ID | Componente | Propósito | Roles permitidos | Endpoint principal |
|---|---------|--------|------------|-----------|-----------------|-------------------|
| 1 | Dashboard | `dashboard` | `DashboardSection.tsx` | Métricas, alertas, actividad reciente | admin, superadmin, imprenta | `GET /api/admin/stats` |
| 2 | Usuarios | `users` | `UsersSection.tsx` | Directorio de usuarios, detalle, acciones | admin, superadmin | `GET /api/admin/users` |
| 3 | Gestión de Chips | `chips` | `ChipsSection.tsx` | Listado, filtros, detalle, eliminar | admin, superadmin | `GET /api/admin/chips` |
| 4 | Tienda Admin | `tienda` | `TiendaSection.tsx` | CRUD productos, stock, precios | admin, superadmin | `GET /api/admin/products` |
| 5 | Cuentas Corporativas | `empresas` | `OrganizationsSection.tsx` | Organizaciones, miembros, detalle | admin, superadmin | `GET /api/admin/organizations` |
| 6 | Stock & Fábrica | `inventory` | `InventorySection.tsx` | Crear batches, asignar, inventario físico | admin, superadmin, imprenta | `GET /api/admin/chips/inventory` |
| 7 | Ventas & Pedidos | `pedidos` | `PedidosSection.tsx` | Órdenes, aprobación, picking, QR, corporativos | admin, superadmin | `GET /api/admin/orders` |
| 8 | Ajustes Sistema | `settings` | `SettingsSection.tsx` | Configuración global, pagos, Yappy, banco | admin, superadmin | `GET /api/admin/config` |
| 9 | Administradores | `admins` | `AdminsSection.tsx` | CRUD de cuentas admin | superadmin | `GET /api/admin/admins` |

### Sidebar para rol `imprenta`
Solo ve la sección **Stock & Fábrica** (`inventory`). Las demás secciones se filtran.

### Detección de founder
- Si `session.user.email === "admin@prerescatepty.com"` → se muestra "Fundador Supremo" con branding dorado
- No es un rol distinto, solo es un label visual

---

## 2. Control de acceso y roles

### Cómo entra un admin
1. Login en `/login` con credenciales
2. `lib/auth.ts` valida credenciales via `prisma.user.findUnique`
3. Si el usuario tiene `role` en `["admin", "superadmin", "imprenta"]`, puede acceder
4. `middleware.ts` protege la ruta `/admin` — redirige a `/login?error=AccessDenied` si no tiene rol admin
5. `AdminLayout` verifica nuevamente: `ADMIN_ROLES.includes(role)`

### Roles existentes

| Rol | Label visual | Permite | No permite |
|-----|-------------|---------|------------|
| `superadmin` | "Soberano" | Todo: CRUD admins, ver todos los datos, eliminar usuarios/chips | — |
| `admin` | "Gestor Admin" | Ver todo, aprobar pedidos, gestionar chips, usuarios, orgs | CRUD de administradores |
| `imprenta` | "Gestor Imprenta" | Solo Stock & Fábrica (crear batches, ver inventario) | Ver usuarios, pedidos, config, orgs |

### Detección de founder
- `session.user.email === "admin@prerescatepty.com"` → badge "Fundador Supremo"
- No tiene permisos extra, solo branding

### Riesgos de permisos
- **Bajo:** No hay roles granulares (ej. "solo lectura", "solo pedidos")
- **Medio:** El rol `imprenta` solo se filtra en el sidebar, pero no hay validación server-side en todos los endpoints
- **Alto:** No hay rate limiting en endpoints admin (a diferencia del cliente que tiene rate limiting)

---

## 3. Dashboard principal admin

**Componente:** `DashboardSection.tsx`  
**Endpoint:** `GET /api/admin/stats`

### Métricas mostradas
- `totalUsers` — Total de usuarios
- `totalChips` — Total de chips
- `totalProfiles` — Total de perfiles médicos
- `totalScans` — Total de escaneos
- `totalNotifications` — Total de notificaciones
- `chipsByStatus` — activated, inventory, suspended, sold
- `chipsByService` — active, limited
- `productivity`:
  - `pendingOrders` — Órdenes pendientes
  - `usersWithoutChips` — Usuarios sin chips
  - `newUsersToday` — Usuarios nuevos hoy
  - `inactiveActivatedChips` — Chips activados sin uso

### Alertas del sistema (`SystemAlert`)
- Tipos: critical, warning, info
- Categorías: storage, security, orders, hardware, system
- Con actionUrl y actionLabel para navegar

### Datos recientes
- `recentScans` — Últimos escaneos con chip, IP, ubicación
- `recentUsers` — Últimos usuarios registrados
- `recentOrgs` — Últimas organizaciones

### Estado vacío
- Si no hay stats: muestra loader con spinner

---

## 4. Pedidos / Órdenes

**Componente:** `PedidosSection.tsx` (~1655 líneas, el más grande)  
**Endpoints usados:**
- `GET /api/admin/orders` — Listado
- `PATCH /api/admin/orders/[id]/approve` — Aprobar pago manual
- `PATCH /api/admin/orders/[id]/reject` — Rechazar pago
- `PATCH /api/admin/orders/[id]/corporate-assign` — Asignar chips corporativos
- `PATCH /api/admin/orders/[id]/corporate-delivery` — Marcar entrega corporativa
- `PATCH /api/admin/orders/[id]/corporate-items/[itemId]/fulfillment` — Fulfillment individual
- `GET /api/admin/chips/inventory` — Chips disponibles para picking
- `GET /api/admin/chips/available` — Chips disponibles

### Listado
- Tabla con: ID/Fecha, Cliente, Contacto, Monto, Estado, Acciones
- Filtros por tab: all, pending, under_review, paid, rejected, completed
- Badge "Corporativo" para `orderType === "corporate_employee_purchase"`
- Botón copiar número de pedido
- Link a WhatsApp del cliente

### Estados de pedido
- `orderStatus`: pending, processing, shipped, completed, cancelled
- `paymentStatus`: pending, under_review, paid, rejected
- `adminReviewStatus`: pending, approved, rejected
- Prioridad: paymentStatus y adminReviewStatus tienen prioridad sobre orderStatus

### Detalle del pedido (selectedOrder)
- Muestra: número de pedido, fecha, cliente, email, teléfono, documento
- Items del pedido con producto, cantidad, precio
- Comprobante de pago (imagen)
- Token de activación (QR descargable)
- Chips asignados

### Aprobación de pago manual
- Botón "Aprobar Pago" si `paymentStatus === "under_review"` y `adminReviewStatus !== "approved"`
- Usa `canAdminApproveManual()` de `lib/order-status.ts`
- Registra: admin review notes, fee, tax, final amount
- Asigna chips del inventario al pedido
- `PATCH /api/admin/orders/[id]/approve`

### Rechazo de pago
- Botón "Rechazar Pago" con notas
- `PATCH /api/admin/orders/[id]/reject`

### Picking físico
- Si el pedido no es personalizado: admin asigna chips del inventario
- Chips se seleccionan de `GET /api/admin/chips/inventory`
- Botón "Asignar y Aprobar" combina picking + aprobación

### Pedidos de accesorios personalizados
- Se muestran con badge "Personalizado"
- No requieren picking físico (chip se activa al aprobar)
- Se muestra QR de activación descargable

### Pedidos corporativos
- Badge "Corporativo" con icono Building2
- `corporateEmployeeItems` muestra: empleado, producto, chip asignado
- Botón "Asignar Chips" por item individual
- Botón "Marcar Entrega" con fecha estimada y notas
- `fulfillmentStatus` por item: pending, assigned, delivered

### QR descargable
- `QRCodeCanvas` (qrcode.react) genera QR con activation code
- Botón "Descargar QR" en PNG
- Botón "Copiar Código"

### Polling
- `useOrdersPolling` hook refresca pedidos cada 30 segundos
- Botón "Refrescar" manual

### Estado vacío
- "No hay pedidos registrados"

---

## 5. Chips / Inventario

### 5a. Gestión de Chips (tab `chips`)

**Componente:** `ChipsSection.tsx`  
**Endpoints:**
- `GET /api/admin/chips` — Listado con filtros
- `DELETE /api/admin/chips/[chipId]` — Eliminar chip
- `GET /api/admin/chips/[chipId]` — Detalle (via hook)

### Listado
- Búsqueda por serial, código o email
- Filtros: status (activated/inventory/sold/suspended), service (active/limited/suspended), account
- Tarjetas con: serial, shortCode, estado, servicio, fecha activación, último escaneo, owner, perfil asignado
- Badge de producto (productType)
- Badge isPhysical (físico vs digital)

### Acciones
- Ver detalle → ChipDetailView
- Eliminar chip (solo si no tiene owner)

### ChipDetailView
- Información completa del chip
- Scan events recientes
- Perfil asignado
- Owner
- Organización (si aplica)
- Claim tokens

### 5b. Stock & Fábrica (tab `inventory`)

**Componente:** `InventorySection.tsx`  
**Endpoints:**
- `GET /api/admin/chips/inventory` — Chips en inventario
- `POST /api/admin/chips` — Crear batch
- `PATCH /api/admin/chips/[chipId]` — Editar chip
- `DELETE /api/admin/chips/[chipId]` — Eliminar chip

### Tabs de inventario
- **Disponibles** — Chips listos para asignar
- **Vendidos / Reservados** — Chips en órdenes pendientes
- **Activados** — Chips activos con usuario
- **Revertidos / Devueltos** — Chips desvinculados
- **Dañados / Perdidos** — Chips fuera de servicio

### Crear batch
- `CreateBatchSection.tsx` — Formulario para crear lote de chips
- Cantidad, label base, label start
- Genera chips con serial, shortCode, activationCode
- Retorna chips creados con códigos

### Asignar chip a usuario
- Select de usuario (`GET /api/admin/users`)
- Asigna chip a cuenta del usuario
- Cambia status a "activated"

### Exportar CSV
- Botón "Exportar CSV" para descargar listado de chips

---

## 6. Usuarios / Perfiles médicos

**Componente:** `UsersSection.tsx`  
**Endpoints:**
- `GET /api/admin/users` — Listado
- `GET /api/admin/users/[id]` — Detalle (via hook)
- `PATCH /api/admin/users/[id]/actions` — Acciones (block, unblock, delete-user)
- `GET /api/admin/users/[id]/profiles` — Perfiles médicos

### Listado
- Búsqueda por email, nombre o teléfono
- Tabs: Todos, Activos (con chip), Sin Chip
- Tabla con: usuario, perfil médico, activaciones, estado, acciones
- Click en fila → UserDetailView

### UserDetailView
- Perfil completo: nombre, email, teléfono, fecha registro
- Tipo de cuenta: Individual/Familiar o Empresarial
- Estado: active/blocked
- Chips del usuario con detalle
- Perfil médico: sexo, sangre, alergias, condiciones, medicamentos
- Contactos de emergencia
- Organización (si aplica)
- Paquete asignado
- Acciones:
  - Bloquear/Desbloquear usuario
  - Asignar combo/paquete
  - Ver inventario de la cuenta
  - Eliminar usuario

### Qué puede editar admin
- ✅ Bloquear/desbloquear usuario
- ✅ Asignar combo/paquete
- ✅ Ver perfil médico completo
- ✅ Ver contactos de emergencia
- ✅ Ver chips asignados
- ✅ Eliminar usuario
- ❌ Editar datos del perfil médico (no hay endpoint)
- ❌ Editar contactos de emergencia (no hay endpoint)
- ❌ Crear perfiles médicos (no hay endpoint)

---

## 7. Productos / Tienda

**Componente:** `TiendaSection.tsx`  
**Endpoints:**
- `GET /api/admin/products` — Listado
- `POST /api/admin/products` — Crear
- `PATCH /api/admin/products/[id]` — Editar
- `DELETE /api/admin/products/[id]` — Eliminar
- `POST /api/upload` — Subir imagen

### Listado
- Tarjetas con: nombre, descripción, precio, categoría, stock, imagen, estado
- Badge de productType (sticker, llavero, tarjeta, brazalete, combo, otro)
- Badge isActive (activo/inactivo)
- Badge requiresPersonalization (personalizado/no)

### Crear/Editar
- Modal con formulario: nombre, descripción, precio, categoría, stock, imagen, productType, estimatedProductionTime, requiresPersonalization
- Subida de imagen via `POST /api/upload`
- productType: sticker, llavero, tarjeta, brazalete, combo, otro

### Eliminar
- Confirmación antes de eliminar

### Estados vacío
- "No hay productos registrados"

---

## 8. Empresas / Corporativo

**Componente:** `OrganizationsSection.tsx`  
**Endpoints:**
- `GET /api/admin/organizations` — Listado
- `POST /api/admin/organizations` — Crear (via modal)
- `DELETE /api/admin/organizations/[orgId]` — Eliminar
- `GET /api/admin/organizations/[orgId]` — Detalle (via hook)
- `GET /api/admin/organizations/[orgId]/users` — Miembros
- `POST /api/admin/organizations/[orgId]/assign-bulk` — Asignar chips masivo
- `POST /api/admin/organizations/[orgId]/batch` — Crear batch para org

### Listado
- Tarjetas con: nombre legal, código empresa, email contacto, tipo (company/school/other), estado, miembros
- Click → OrgDetailView

### OrgDetailView
- Información de la organización
- Miembros con roles y estado
- Chips asignados
- Paquete asignado
- Estado de la organización

### Crear organización
- `OrgCreateModal.tsx` — Modal con formulario
- Campos: legalName, displayName, contactEmail, contactPhone, taxId, organizationType

### Acciones
- Asignar chips masivos a miembros
- Crear batch específico para la org
- Eliminar organización

### Estados de organización
- `pending_company_review` — Pendiente de revisión
- `approved_unpaid` — Aprobada, sin pago
- `paid_active` — Activa con pago
- `suspended` — Suspendida
- `archived` — Archivada

---

## 9. Configuración del sistema

**Componente:** `SettingsSection.tsx`  
**Endpoints:**
- `GET /api/admin/config` — Cargar configuraciones
- `PATCH /api/admin/config` — Guardar configuraciones
- `POST /api/upload` — Subir imagen (QR de Yappy)

### Configuraciones disponibles
- `yappy_handle` — Handle de Yappy
- `yappy_qr_url` — URL del QR de Yappy (subida de imagen)
- `bank_name` — Nombre del banco
- `bank_account_type` — Tipo de cuenta
- `bank_account_number` — Número de cuenta
- `bank_account_name` — Nombre de la cuenta
- `sender_email` — Email remitente
- `demo_profile_shortcode` — Shortcode de demo

### Subida de QR de Yappy
- Botón "Subir QR" que abre file picker
- Sube a bucket `payment-proofs` via `POST /api/upload`
- Guarda URL en `yappy_qr_url`

### Guardar
- Botón "Guardar Ajustes"
- `PATCH /api/admin/config` con todos los campos

---

## 10. Historial / Escaneos / Auditoría

### Historial de escaneos
- **Existe** en el dashboard admin como `recentScans`
- Cada scanEvent incluye: id, scannedAt, sourceType (qr/nfc/manual), ipAddress, city, country, notificationStatus, chip
- **No hay una sección dedicada** de historial en el sidebar
- **No hay filtros** por fecha, ubicación o tipo de escaneo

### Auditoría (AuditLog)
- **Existe** en Prisma schema: `AuditLog` con actorUserId, entityType, entityId, action, oldValuesJson, newValuesJson
- **No hay vista admin** para consultar logs de auditoría
- Los logs se crean automáticamente en: crear chip, activar, asignar, eliminar, aprobar orden, etc.

### Notificaciones
- **Existe** el modelo `Notification` en Prisma
- **No hay gestión admin** de notificaciones (solo el dashboard muestra totalNotifications)

---

## 11. Interconexión con Panel Cliente

| Cliente hace X | Admin ve/controla Y | Estado actual |
|---------------|---------------------|---------------|
| Se registra | Admin ve en Users, puede bloquear/eliminar | ✅ OK |
| Crea perfil médico | Admin ve perfil en UserDetail (solo lectura) | ⚠️ Sin edición |
| Agrega contacto de emergencia | Admin ve contactos en UserDetail (solo lectura) | ⚠️ Sin edición |
| Activa chip con código | Admin ve chip activado en ChipsSection | ✅ OK |
| Vincula chip a perfil | Admin ve perfil asignado en ChipDetail | ✅ OK |
| Compra en tienda | Admin ve en PedidosSection | ✅ OK |
| Sube comprobante de pago | Admin revisa y aprueba/rechaza | ✅ OK |
| Compra accesorio personalizado | Admin ve badge "Personalizado", descarga QR | ✅ OK |
| Solicita unión a empresa | Admin aprueba/rechaza en Organizations | ✅ OK |
| Empresa paga | Admin aprueba pago en Pedidos | ✅ OK |
| Empresa pide producto | Admin aprueba en Pedidos (corporate) | ✅ OK |
| Empresa asigna chip a empleado | Admin asigna en Pedidos (corporate-assign) | ✅ OK |
| Cliente cancela pedido | Admin ve estado "cancelled" | ✅ OK |
| Admin crea chip (batch) | Chip aparece en inventario | ✅ OK |
| Admin asigna combo a usuario | Usuario recibe capacidad | ✅ OK |
| Admin cambia config precios | Cliente ve nuevos precios en tienda | ✅ OK |
| Admin crea producto | Cliente ve en tienda | ✅ OK |
| Admin edita producto | Cliente ve cambios | ✅ OK |
| Admin desactiva producto | Cliente no lo ve | ✅ OK |
| Admin crea organización | Empresa puede unirse | ✅ OK |
| Admin asigna chips a org | Empleados pueden activar | ✅ OK |

### Lo que falta

| Capacidades faltantes | Impacto |
|----------------------|---------|
| Admin no puede editar perfiles médicos | Medio — si un cliente ingresa datos incorrectos, admin no puede corregir |
| Admin no puede editar contactos de emergencia | Bajo — los contactos los gestiona el cliente |
| Admin no puede crear perfiles médicos | Bajo — solo el cliente debería crear sus perfiles |
| No hay vista de historial de escaneos dedicada | Medio — solo se ven en dashboard recientes |
| No hay vista de auditoría (AuditLog) | Alto — no se pueden revisar acciones admin |
| No hay gestión de notificaciones | Bajo — las notificaciones se generan automáticamente |
| No hay exportación de pedidos a CSV | Medio — solo chips y usuarios se pueden exportar |
| No hay dashboard de métricas de ventas | Medio — no hay gráficos de ventas por período |
| No hay gestión de precios por volumen | Bajo — los precios son fijos por producto |

---

## 12. Estados vacíos y errores

| Sección | Estado vacío | Texto |
|---------|-------------|-------|
| Dashboard | Sin stats | Loader con spinner |
| Pedidos | Sin pedidos | "No hay pedidos registrados" |
| Chips | Sin chips | Tabla vacía (sin texto explícito) |
| Usuarios | Sin usuarios | Tabla vacía (sin texto explícito) |
| Tienda | Sin productos | "No hay productos registrados" |
| Empresas | Sin orgs | Grid vacío (sin texto explícito) |
| Stock | Sin inventario | Tabla vacía (sin texto explícito) |
| Admins | Sin admins | Lista vacía (sin texto explícito) |
| Settings | Error carga | toast.error("Error al cargar configuraciones") |
| API error | Cualquier endpoint | toast.error con mensaje del servidor |
| No autorizado | Rol incorrecto | Redirect a `/login?error=AccessDenied` |

---

## 13. Problemas encontrados

### P0 — Crítico
> **Ninguno.** No hay problemas críticos de seguridad o funcionalidad bloqueante.

### P1 — Importante

| # | Problema | Archivo | Impacto | Recomendación |
|---|----------|---------|---------|---------------|
| 1 | **PedidosSection.tsx monolítico (1655 líneas)** | `PedidosSection.tsx` | Alto — difícil de mantener,debuggear y testear | Dividir en: OrderList, OrderDetail, PaymentReview, CorporateAssign, QRDownload |
| 2 | **Sin rate limiting en endpoints admin** | `app/api/admin/**` | Medio — un admin podría hacer requests masivos | Agregar rate limiting similar al cliente (10-20/min) |
| 3 | **Sin validación server-side de rol en todos los endpoints** | `app/api/admin/**` | Medio — un usuario con rol `imprenta podría acceder a endpoints de admin | Validar `session.user.role` en cada endpoint admin |
| 4 | **No hay vista de auditoría (AuditLog)** | No existe | Alto — no se pueden revisar acciones admin | Crear sección `AuditSection` que consulte `AuditLog` |
| 5 | **Admin no puede editar perfiles médicos** | `UserDetail.tsx` | Medio — datos incorrectos no se pueden corregir | Agregar endpoint `PATCH /api/admin/users/[id]/profiles/[profileId]` |
| 6 | **No hay exportación de pedidos** | `PedidosSection.tsx` | Medio — no se pueden generar reportes de ventas | Agregar botón "Exportar CSV" para pedidos |
| 7 | **No hay dashboard de métricas de ventas** | `DashboardSection.tsx` | Medio — no se puede analizar tendencias | Agregar gráficos de ventas por período (semanal/mensual) |

### P2 — Mejora

| # | Problema | Archivo | Impacto | Recomendación |
|---|----------|---------|---------|---------------|
| 8 | **ChipsSection sin estados vacíos explícitos** | `ChipsSection.tsx` | Bajo — tabla vacía sin mensaje | Agregar "No hay chips registrados" |
| 9 | **UsersSection sin estados vacíos explícitos** | `UsersSection.tsx` | Bajo — tabla vacía sin mensaje | Agregar "No hay usuarios registrados" |
| 10 | **OrganizationsSection sin estados vacíos explícitos** | `OrganizationsSection.tsx` | Bajo — grid vacío sin mensaje | Agregar "No hay organizaciones registradas" |
| 11 | **No hay filtros por fecha en pedidos** | `PedidosSection.tsx` | Bajo — difícil filtrar por período | Agregar date range picker |
| 12 | **No hay búsqueda por fecha en usuarios** | `UsersSection.tsx` | Bajo — difícil encontrar registros recientes | Agregar filtro por fecha de registro |
| 13 | **No hay gestión de notificaciones** | No existe | Bajo — las notificaciones se generan automáticamente | Opcional: crear sección para enviar notificaciones manuales |
| 14 | **No hay gestión de paquetes desde admin** | `OrganizationsSection.tsx` | Bajo — los paquetes se gestionan desde DB | Agregar CRUD de paquetes |
| 15 | **No hay historial de cambios por chip** | `ChipDetail.tsx` | Bajo — no se ve evolución del chip | Agregar timeline de cambios de estado |

### P3 — Limpieza

| # | Problema | Archivo | Impacto | Recomendación |
|---|----------|---------|---------|---------------|
| 16 | **Nombres de secciones inconsistentes** | `layout.tsx` | Bajo — confusión visual | Unificar: "Tienda Admin" vs "Ventas & Pedidos" |
| 17 | **Algunas funciones no se usan** | `page.tsx` | Bajo — código muerto | Eliminar funciones no referenciadas |
| 18 | **CSS inline excesivo** | Varios archivos | Bajo — difícil de mantener | Mover a clases Tailwind reutilizables |

---

## 14. Recomendación final

### Estado del Panel Admin: ⚠️ FUNCIONAL PERO CON DEUDA TÉCNICA

El panel admin cubre las funcionalidades esenciales para operar el negocio:

- **Gestión de usuarios:** ✅ Listado, detalle, bloqueo, eliminación
- **Gestión de chips:** ✅ Listado, creación por batch, asignación, eliminación
- **Gestión de pedidos:** ✅ Listado, aprobación/rechazo, picking, QR, corporativos
- **Gestión de productos:** ✅ CRUD completo con imagen y personalización
- **Gestión de empresas:** ✅ Organizaciones, miembros, asignación masiva
- **Configuración:** ✅ Pagos (Yappy, banco), email, demo
- **Administradores:** ✅ CRUD de cuentas admin con roles

### Qué falta para paridad completa con cliente

| Capacidades faltantes | Prioridad | Esfuerzo |
|----------------------|-----------|----------|
| Editar perfiles médicos desde admin | P1 | 2-3 días |
| Vista de auditoría (AuditLog) | P1 | 3-5 días |
| Rate limiting en endpoints admin | P1 | 0.5 días |
| Validación server-side de roles | P1 | 1 día |
| Exportación de pedidos a CSV | P2 | 1 día |
| Dashboard de métricas de ventas | P2 | 3-5 días |
| Filtros por fecha en pedidos | P2 | 1 día |
| Estados vacíos explícitos en todas las secciones | P2 | 0.5 días |
| Historial de cambios por chip | P3 | 2-3 días |
| Gestión de notificaciones | P3 | 2-3 días |

### Qué se debe atacar primero

1. **PedidosSection refactor** — El archivo de 1655 líneas es el cuello de botella principal para mantenibilidad
2. **Auditoría admin** — Sin vista de AuditLog, no se pueden investigar problemas
3. **Rate limiting admin** — Seguridad básica que falta comparado con el cliente
4. **Validación de roles server-side** — Seguridad básica

### Qué se puede dejar como backlog

- Dashboard de métricas de ventas (nice to have)
- Filtros por fecha (mejora UX)
- Estados vacíos (cosmético)
- Historial de cambios por chip (nice to have)
- Gestión de notificaciones (las notificaciones automáticas funcionan)

### Resumen

El panel admin está **funcionalmente completo** para las operaciones diarias del negocio. La deuda técnica principal está en `PedidosSection.tsx` (1655 líneas) y en la falta de auditoría/rate limiting. Los problemas P0 son inexistentes. Los P1 son mejorables sin impacto en la funcionalidad core.

---
*Originalmente en: docs/audit/*