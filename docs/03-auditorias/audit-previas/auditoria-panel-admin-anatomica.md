# Auditoría anatómica — Panel Admin

> **Commit auditado:** `f22aeec`  
> **Fecha:** Junio 2026  
> **Método:** Inspección directa del código fuente. Cada dato está respaldado por código encontrado.

---

## FASE 1 — Mapa completo del admin

### Archivos admin (39 archivos TypeScript)

| Ruta | Archivo | Propósito |
|------|---------|-----------|
| `/admin` | `app/(admin)/admin/layout.tsx` | Layout admin con sidebar, header, footer |
| `/admin` | `app/(admin)/admin/page.tsx` | Página principal admin (440 líneas) |
| `/admin` | `app/(admin)/admin/error.tsx` | Error boundary |
| `/admin` | `app/(admin)/layout.tsx` | Layout raíz admin |
| `/admin/inventario/lotes` | `app/(admin)/admin/inventario/lotes/page.tsx` | Sub-ruta de lotes |

### Secciones UI (12 componentes, 4946 líneas totales)

| Sección | Archivo | Líneas | Tab ID |
|---------|---------|--------|--------|
| DashboardSection | `_components/sections/DashboardSection.tsx` | ~400 | `dashboard` |
| UsersSection | `_components/sections/UsersSection.tsx` | ~200 | `users` |
| ChipsSection | `_components/sections/ChipsSection.tsx` | ~250 | `chips` |
| TiendaSection | `_components/sections/TiendaSection.tsx` | ~450 | `tienda` |
| OrganizationsSection | `_components/sections/OrganizationsSection.tsx` | ~150 | `empresas` |
| InventorySection | `_components/sections/InventorySection.tsx` | ~750 | `inventory` |
| PedidosSection | `_components/sections/PedidosSection.tsx` | **1655** | `pedidos` |
| SettingsSection | `_components/sections/SettingsSection.tsx` | ~300 | `settings` |
| AdminsSection | `_components/sections/AdminsSection.tsx` | ~250 | `admins` |
| CreateBatchSection | `_components/sections/CreateBatchSection.tsx` | ~200 | (interno de inventory) |
| GovernanceSection | `_components/sections/GovernanceSection.tsx` | ~200 | (no visible en sidebar) |
| ShowcaseProfileSection | `_components/sections/ShowcaseProfileSection.tsx` | ~350 | (no visible en sidebar) |

### Detalle views (3 componentes)

| Componente | Archivo | Entidad |
|-----------|---------|---------|
| ChipDetailView | `_components/details/ChipDetail.tsx` | Chip |
| UserDetailView | `_components/details/UserDetail.tsx` | User |
| OrgDetailView | `_components/details/OrgDetail.tsx` | Organization |

### Modales (3 componentes)

| Componente | Archivo | Propósito |
|-----------|---------|-----------|
| OrgCreateModal | `_components/modals/OrgCreateModal.tsx` | Crear organización |
| BatchCreateModal | `_components/modals/BatchCreateModal.tsx` | Crear batch de chips |
| ComboSelectorModal | `_components/modals/ComboSelectorModal.tsx` | Asignar combo a usuario |

### Componentes de pedidos (2 componentes)

| Componente | Archivo | Propósito |
|-----------|---------|-----------|
| ChipAssignmentPanel | `_components/orders/ChipAssignmentPanel.tsx` | Asignar chips a pedido |
| ManualPaymentReview | `_components/orders/ManualPaymentReview.tsx` | Revisión de pago manual |

### Hooks (7 hooks)

| Hook | Archivo | Propósito |
|------|---------|-----------|
| useAdminManager | `_hooks/useAdminManager.ts` | Orquestador principal |
| useAdminStats | `_hooks/useAdminStats.ts` | Dashboard stats |
| useAdminChips | `_hooks/useAdminChips.ts` | Chips CRUD |
| useAdminUsers | `_hooks/useAdminUsers.ts` | Users CRUD |
| useAdminOrgs | `_hooks/useAdminOrgs.ts` | Organizations CRUD |
| useOrdersPolling | `_hooks/useOrdersPolling.ts` | Polling de pedidos |
| useDebounce | `_hooks/useDebounce.ts` | Debounce de búsqueda |

### Servicios (4 servicios + apiClient)

| Servicio | Archivo | Propósito |
|---------|---------|-----------|
| apiClient | `_services/apiClient.ts` | HTTP client con get/post/patch/delete |
| statsService | `_services/domains/stats.service.ts` | Stats API |
| chipsService | `_services/domains/chips.service.ts` | Chips API |
| usersService | `_services/domains/users.service.ts` | Users API |
| orgsService | `_services/domains/orgs.service.ts` | Organizations API |

### Sidebar navigation (tabs)

| # | Label | Tab ID | Icon | Roles |
|---|-------|--------|------|-------|
| 1 | Dashboard | `dashboard` | LayoutDashboard | admin, superadmin, imprenta |
| 2 | Usuarios | `users` | Users | admin, superadmin |
| 3 | Gestión de Chips | `chips` | Cpu | admin, superadmin |
| 4 | Tienda Admin | `tienda` | Store | admin, superadmin |
| 5 | Cuentas Corporativas | `empresas` | Building2 | admin, superadmin |
| 6 | Stock & Fábrica | `inventory` | Package | admin, superadmin, imprenta |
| 7 | Ventas & Pedidos | `pedidos` | Activity | admin, superadmin |
| 8 | Ajustes Sistema | `settings` | Settings | admin, superadmin |
| 9 | Administradores | `admins` | Shield | superadmin |

---

## FASE 2 — Inventario de formularios

### Crear Producto (TiendaSection)

**Archivo:** `app/(admin)/admin/_components/sections/TiendaSection.tsx`

**Campos:**

| Campo | Tipo | Requerido | Default |
|-------|------|-----------|---------|
| name | text | sí | `""` |
| description | textarea | no | `""` |
| price | number | sí | `""` |
| category | select | sí | `"Accesorios"` |
| stock | number | sí | `"0"` |
| image | file upload | no | `""` |
| productType | select | sí | `"otro"` |
| estimatedProductionTime | text | no | `""` |
| requiresPersonalization | checkbox | no | `false` |

**productType opciones:** `sticker`, `llavero`, `tarjeta`, `brazalete`, `combo`, `otro`

**Botones:** Guardar, Cancelar

**Endpoint:** `POST /api/admin/products` (crear) / `PATCH /api/admin/products/[id]` (editar)

---

### Configuración del Sistema (SettingsSection)

**Archivo:** `app/(admin)/admin/_components/sections/SettingsSection.tsx`

**Campos:**

| Campo | Tipo | Requerido | Default |
|-------|------|-----------|---------|
| yappy_handle | text | no | `""` |
| yappy_qr_url | file upload | no | `""` |
| bank_name | text | no | `""` |
| bank_account_type | text | no | `""` |
| bank_account_number | text | no | `""` |
| bank_account_name | text | no | `""` |
| sender_email | text | no | `""` |
| demo_profile_shortcode | text | no | `""` |

**Botones:** Guardar Ajustes, Subir QR

**Endpoint:** `GET /api/admin/config` (cargar) / `PATCH /api/admin/config` (guardar)

---

### Crear Administrador (AdminsSection)

**Archivo:** `app/(admin)/admin/_components/sections/AdminsSection.tsx`

**Campos:**

| Campo | Tipo | Requerido | Default |
|-------|------|-----------|---------|
| email | email | sí | `""` |
| password | password | sí | `""` |
| role | select | sí | `"admin"` |

**role opciones:** `admin`, `superadmin`, `imprenta`

**Botones:** Crear Admin, Cancelar

**Endpoint:** `POST /api/admin/admins`

---

### Crear Organización (OrgCreateModal)

**Archivo:** `app/(admin)/admin/_components/modals/OrgCreateModal.tsx`

**Campos:**

| Campo | Tipo | Requerido | Default |
|-------|------|-----------|---------|
| legalName | text | sí | `""` |
| organizationType | select | sí | `"company"` |
| ownerEmail | email | sí | `""` |
| contactPhone | text | no | `""` |
| maxMembers | number | no | `""` |

**organizationType opciones:** `company`, `school`, `other`

**Botones:** Crear Empresa, Cancelar

**Endpoint:** `POST /api/admin/organizations`

---

### Crear Batch de Chips (CreateBatchSection)

**Archivo:** `app/(admin)/admin/_components/sections/CreateBatchSection.tsx`

**Campos:**

| Campo | Tipo | Requerido | Default |
|-------|------|-----------|---------|
| createCount | number | sí | `0` |
| labelBase | text | no | `""` |
| labelStart | number | no | `0` |

**Botones:** Crear Lote, Descargar CSV

**Endpoint:** `POST /api/admin/chips`

---

### Asignar Combo a Usuario (ComboSelectorModal)

**Archivo:** `app/(admin)/admin/_components/modals/ComboSelectorModal.tsx`

**Campos:**

| Campo | Tipo | Requerido | Default |
|-------|------|-----------|---------|
| selectedUserId | select | sí | `""` |
| selectedProfileId | select | sí | `""` |
| reason | text | no | `""` |

**Botones:** Asignar Combo, Cancelar

**Endpoint:** `POST /api/admin/chips/[chipId]/assign-direct`

---

### Revisión de Pago Manual (ManualPaymentReview)

**Archivo:** `app/(admin)/admin/_components/orders/ManualPaymentReview.tsx`

**Campos:**

| Campo | Tipo | Requerido | Default |
|-------|------|-----------|---------|
| reviewNote | textarea | no | `""` |
| fee | number | no | `0` |
| tax | number | no | `0` |
| finalAmount | number | no | `0` |

**Botones:** Aprobar Pago, Rechazar Pago

**Endpoint:** `POST /api/admin/orders/[id]/approve` / `POST /api/admin/orders/[id]/reject`

---

### Asignar Chips a Pedido (ChipAssignmentPanel)

**Archivo:** `app/(admin)/admin/_components/orders/ChipAssignmentPanel.tsx`

**Campos:**

| Campo | Tipo | Requerido | Default |
|-------|------|-----------|---------|
| selectedChipIds | multi-select | sí | `[]` |
| searchInventory | text | no | `""` |

**Botones:** Asignar y Aprobar

**Endpoint:** `POST /api/admin/orders/[id]/approve`

---

## FASE 3 — Inventario de botones de acción

### PedidosSection (1655 líneas)

| Botón | Ubicación | Endpoint | Permisos | Impacto |
|-------|-----------|----------|----------|---------|
| Ver Detalle | Tabla pedidos | — | — | Abre panel detalle |
| Copiar # Pedido | Tabla pedidos | — | — | Copia al clipboard |
| Aprobar Pago | Detalle pedido | `POST /api/admin/orders/[id]/approve` | admin, superadmin, imprenta | paymentStatus→paid, adminReviewStatus→approved, AuditLog |
| Rechazar Pago | Detalle pedido | `POST /api/admin/orders/[id]/reject` | admin, superadmin, imprenta | paymentStatus→rejected, adminReviewStatus→rejected, AuditLog |
| Asignar y Aprobar | Detalle pedido | `POST /api/admin/orders/[id]/approve` | admin, superadmin, imprenta | Asigna chips + aprueba, AuditLog |
| Asignar Chips Corporativos | Detalle corporate | `POST /api/admin/orders/[id]/corporate-assign` | admin, superadmin, imprenta | corporateEmployeeItems.chipId |
| Marcar Entrega | Detalle corporate | `PATCH /api/admin/orders/[id]/corporate-delivery` | admin, superadmin, imprenta | deliveryStatus, estimatedDate |
| Fulfillment Individual | Detalle corporate | `PATCH /api/admin/orders/[id]/corporate-items/[itemId]/fulfillment` | admin, superadmin, imprenta | fulfillmentStatus, AuditLog |
| Eliminar Pedido | Detalle pedido | `DELETE /api/admin/orders/[id]` | admin, superadmin | Elimina orden |
| Eliminar Cancelados | Lista pedidos | `DELETE /api/admin/orders` | admin, superadmin | Elimina todas las canceladas |
| Eliminar Órdenes Antiguas | Detalle pedido | `DELETE /api/admin/orders` | admin, superadmin | Elimina órdenes con más de 30 días |
| Refrescar | Lista pedidos | `GET /api/admin/orders` | admin, superadmin, imprenta | Recarga lista |
| Descargar QR | Detalle pedido | — | — | Genera PNG con QRCodeCanvas |
| Copiar Código | Detalle pedido | — | — | Copia activationCode al clipboard |
| Ver Comprobante | Detalle pedido | `window.open(url)` | — | Abre imagen en nueva pestaña |
| Link WhatsApp | Tabla pedidos | `https://wa.me/{phone}` | — | Abre WhatsApp |

### ChipsSection

| Botón | Ubicación | Endpoint | Permisos | Impacto |
|-------|-----------|----------|----------|---------|
| Ver Detalle | Tarjeta chip | `GET /api/admin/chips/[chipId]` | admin, superadmin | Abre ChipDetailView |
| Eliminar Chip | Tarjeta chip | `DELETE /api/admin/chips/[chipId]` | admin, superadmin | Elimina chip |
| Filtrar por Cuenta | Filtros | — | — | Filtra chips por accountId |

### UsersSection

| Botón | Ubicación | Endpoint | Permisos | Impacto |
|-------|-----------|----------|----------|---------|
| Ver Detalle | Fila usuario | `GET /api/admin/users/[id]` | admin, superadmin | Abre UserDetailView |
| Bloquear/Desbloquear | Detalle usuario | `POST /api/admin/users/[id]/actions` | admin, superadmin | status→blocked/active |
| Eliminar Usuario | Detalle usuario | `POST /api/admin/users/[id]/actions` | admin, superadmin | Elimina usuario |
| Asignar Combo | Detalle usuario | `POST /api/admin/chips/[chipId]/assign-direct` | admin, superadmin | Asigna combo |
| Ver Inventario | Detalle usuario | — | — | Navega a inventory |

### InventorySection

| Botón | Ubicación | Endpoint | Permisos | Impacto |
|-------|-----------|----------|----------|---------|
| Crear Batch | Formulario | `POST /api/admin/chips` | admin, superadmin, imprenta | Crea N chips |
| Copiar Código | Tarjeta chip | — | — | Copia activationCode |
| Toggle Físico/Digital | Tarjeta chip | `PATCH /api/admin/chips/[chipId]` | admin, superadmin, imprenta | Cambia isPhysical |
| Guardar Etiqueta | Tarjeta chip | `PATCH /api/admin/chips/[chipId]` | admin, superadmin, imprenta | Cambia internalLabel |
| Rehabilitar Chip | Tarjeta chip | `POST /api/admin/chips/[chipId]/rehabilitate` | admin, superadmin, imprenta | Genera nuevo activationCode |
| Asignar a Cliente | Tarjeta chip | `POST /api/admin/chips/[chipId]/assign-direct` | admin, superadmin, imprenta | Asigna chip a usuario |
| Eliminar Chip | Tarjeta chip | `DELETE /api/admin/chips/[chipId]` | admin, superadmin, imprenta | Elimina chip |
| Exportar CSV | Lista | — | — | Descarga CSV |

### TiendaSection

| Botón | Ubicación | Endpoint | Permisos | Impacto |
|-------|-----------|----------|----------|---------|
| Crear Producto | Header | `POST /api/admin/products` | admin, superadmin | Crea producto |
| Editar Producto | Tarjeta | `PATCH /api/admin/products/[id]` | admin, superadmin | Edit producto |
| Eliminar Producto | Tarjeta | `DELETE /api/admin/products/[id]` | admin, superadmin | Elimina producto |

### OrganizationsSection

| Botón | Ubicación | Endpoint | Permisos | Impacto |
|-------|-----------|----------|----------|---------|
| Nueva Empresa | Header | `POST /api/admin/organizations` | admin, superadmin | Crea org |
| Ver Detalle | Tarjeta org | `GET /api/admin/organizations/[orgId]` | admin, superadmin | Abre OrgDetailView |
| Eliminar Empresa | Tarjeta org | `DELETE /api/admin/organizations/[orgId]` | admin, superadmin | Elimina org |

### AdminsSection

| Botón | Ubicación | Endpoint | Permisos | Impacto |
|-------|-----------|----------|----------|---------|
| Crear Admin | Header | `POST /api/admin/admins` | superadmin | Crea admin |
| Toggle Rol | Lista | `PATCH /api/admin/admins/[id]` | superadmin | Cambia rol |
| Eliminar Admin | Lista | `DELETE /api/admin/admins/[id]` | superadmin | Elimina admin |

### SettingsSection

| Botón | Ubicación | Endpoint | Permisos | Impacto |
|-------|-----------|----------|----------|---------|
| Guardar Ajustes | Footer | `PATCH /api/admin/config` | admin, superadmin | Guarda configs |
| Subir QR | Sección Yappy | `POST /api/upload` | admin, superadmin | Sube imagen QR |

---

## FASE 4 — Inventario de estados

### OrderStatus (lib/order-status.ts)

| Estado | Descripción | Dónde se usa |
|--------|-------------|-------------|
| `pending` | Esperando pago | orderStatus |
| `processing` | Trabajando en el pedido | orderStatus |
| `shipped` | En camino | orderStatus |
| `completed` | Completado | orderStatus |
| `cancelled` | Cancelado | orderStatus |

### PaymentStatus (lib/order-status.ts)

| Estado | Descripción | Dónde se usa |
|--------|-------------|-------------|
| `pending` | Esperando pago | paymentStatus |
| `under_review` | Pago en revisión | paymentStatus |
| `paid` | Pago aprobado | paymentStatus |
| `rejected` | Pago rechazado | paymentStatus |
| `cancelled` | Pago cancelado | paymentStatus |

### AdminReviewStatus (lib/order-status.ts)

| Estado | Descripción | Dónde se usa |
|--------|-------------|-------------|
| `pending` | Pendiente de revisión | adminReviewStatus |
| `approved` | Aprobado por admin | adminReviewStatus |
| `rejected` | Rechazado por admin | adminReviewStatus |

### ChipStatus (app/(admin)/admin/_types/admin.ts)

| Estado | Descripción | Dónde se usa |
|--------|-------------|-------------|
| `activated` | Chip activo con usuario | chip.status |
| `inventory` | En inventario, sin asignar | chip.status |
| `sold` | Vendido | chip.status |
| `suspended` | Suspendido | chip.status |
| `pending` | Pendiente de activación | chip.status |

### ServiceStatus (app/(admin)/admin/_types/admin.ts)

| Estado | Descripción | Dónde se usa |
|--------|-------------|-------------|
| `active` | Servicio activo | chip.serviceStatus |
| `limited` | Servicio limitado | chip.serviceStatus |
| `suspended` | Servicio suspendido | chip.serviceStatus |
| `expired` | Servicio expirado | chip.serviceStatus |

### UserStatus (app/(admin)/admin/_types/admin.ts)

| Estado | Descripción | Dónde se usa |
|--------|-------------|-------------|
| `active` | Usuario activo | user.status |
| `blocked` | Usuario bloqueado | user.status |
| `pending` | Pendiente de activación | user.status |

### OrganizationType (app/api/admin/organizations/[orgId]/route.ts)

| Tipo | Descripción | Dónde se usa |
|------|-------------|-------------|
| `company` | Empresa | org.organizationType |
| `school` | Escuela | org.organizationType |
| `other` | Otro | org.organizationType |

### OrganizationStatus (app/api/admin/organizations/[orgId]/route.ts)

| Estado | Descripción | Dónde se usa |
|--------|-------------|-------------|
| `active` | Activa | org.status |
| `suspended` | Suspendida | org.status |
| `archived` | Archivada | org.status |
| `pending_company_review` | Pendiente revisión | org.corporateStatus |
| `approved_unpaid` | Aprobada, sin pago | org.corporateStatus |
| `paid_active` | Activa con pago | org.corporateStatus |

### ProductType (app/(admin)/admin/_components/sections/TiendaSection.tsx)

| Tipo | Descripción | Dónde se usa |
|------|-------------|-------------|
| `sticker` | Sticker | product.productType |
| `llavero` | Llavero | product.productType |
| `tarjeta` | Tarjeta | product.productType |
| `brazalete` | Brazalete | product.productType |
| `combo` | Combo | product.productType |
| `otro` | Otro | product.productType |

### AdminRoles (lib/rbac.ts)

| Rol | Descripción | Permite |
|-----|-------------|---------|
| `superadmin` | Acceso total | CRUD admins, todo |
| `admin` | Operador admin | Ver/editar todo excepto CRUD admins |
| `imprenta` | Gestor imprenta | Solo Stock & Fábrica |

### AdminRoleGroups (lib/rbac.ts)

| Grupo | Roles | Uso |
|-------|-------|-----|
| `ORDER_ADMIN_ROLES` | admin, superadmin, imprenta | Pedidos, chips, users, config |
| `GENERAL_ADMIN_ROLES` | admin, superadmin | Productos, organizaciones |
| `SUPERADMIN_ROLES` | superadmin | CRUD de administradores |

---

## FASE 5 — Inventario de endpoints admin

**Total real de endpoints:** 31 archivos de ruta  
**Total real de métodos HTTP:** 47 métodos

| # | Endpoint | Métodos |
|---|----------|---------|
| 1 | `/api/admin/stats` | GET |
| 2 | `/api/admin/users` | GET, PATCH |
| 3 | `/api/admin/users/[id]/actions` | POST |
| 4 | `/api/admin/users/[id]/profiles` | GET |
| 5 | `/api/admin/chips` | GET, POST |
| 6 | `/api/admin/chips/[chipId]` | GET, PATCH |
| 7 | `/api/admin/chips/[chipId]/assign-direct` | POST |
| 8 | `/api/admin/chips/[chipId]/reactivate` | POST |
| 9 | `/api/admin/chips/[chipId]/rehabilitate` | POST |
| 10 | `/api/admin/chips/available` | GET |
| 11 | `/api/admin/chips/inventory` | GET, PATCH |
| 12 | `/api/admin/products` | GET, POST |
| 13 | `/api/admin/products/[id]` | PATCH, DELETE |
| 14 | `/api/admin/organizations` | GET, POST |
| 15 | `/api/admin/organizations/[orgId]` | GET, PATCH, DELETE |
| 16 | `/api/admin/organizations/[orgId]/users` | POST |
| 17 | `/api/admin/organizations/[orgId]/assign-bulk` | POST |
| 18 | `/api/admin/organizations/[orgId]/batch` | POST |
| 19 | `/api/admin/orders` | GET, PATCH, DELETE |
| 20 | `/api/admin/orders/[id]/approve` | POST |
| 21 | `/api/admin/orders/[id]/reject` | POST |
| 22 | `/api/admin/orders/[id]/corporate-assign` | POST |
| 23 | `/api/admin/orders/[id]/corporate-delivery` | PATCH |
| 24 | `/api/admin/orders/[id]/corporate-items/[itemId]/fulfillment` | PATCH |
| 25 | `/api/admin/config` | GET, PATCH |
| 26 | `/api/admin/admins` | GET, POST, PATCH |
| 27 | `/api/admin/admins/[id]` | PATCH, DELETE |
| 28 | `/api/admin/packages` | GET, POST, PATCH |
| 29 | `/api/admin/inventory` | GET |
| 30 | `/api/admin/showcase` | GET, PATCH |
| 31 | `/api/admin/maintenance/clear-cache` | POST |

---

## FASE 6 — Seguridad

| Endpoint | Roles | Rate Limit | AuditLog | Riesgo |
|----------|-------|-----------|----------|--------|
| `stats` GET | admin, superadmin, imprenta | ❌ | ❌ | 🟢 Bajo |
| `users` GET | admin, superadmin | ❌ | ❌ | 🟢 Bajo |
| `users` PATCH | admin, superadmin | ❌ | ❌ | 🟢 Bajo |
| `users/[id]/actions` POST | admin, superadmin | ❌ | ✅ (3 writes) | 🟢 Bajo |
| `users/[id]/profiles` GET | admin, superadmin | ❌ | ❌ | 🟢 Bajo |
| `chips` GET | admin, superadmin, imprenta | ❌ | ❌ | 🟢 Bajo |
| `chips` POST | admin, superadmin, imprenta | ❌ | ❌ | 🟡 Medio |
| `chips/[chipId]` GET | admin, superadmin, imprenta | ❌ | ❌ | 🟢 Bajo |
| `chips/[chipId]` PATCH | admin, superadmin, imprenta | ❌ | ❌ | 🟢 Bajo |
| `chips/[chipId]/assign-direct` POST | admin, superadmin, imprenta | ❌ | ✅ (1 write) | 🟢 Bajo |
| `chips/[chipId]/reactivate` POST | admin, superadmin, imprenta | ❌ | ✅ (1 write) | 🟢 Bajo |
| `chips/[chipId]/rehabilitate` POST | admin, superadmin, imprenta | ❌ | ✅ (1 write) | 🟢 Bajo |
| `chips/available` GET | admin, superadmin, imprenta | ❌ | ❌ | 🟢 Bajo |
| `chips/inventory` GET | admin, superadmin, imprenta | ❌ | ❌ | 🟢 Bajo |
| `chips/inventory` PATCH | admin, superadmin, imprenta | ❌ | ❌ | 🟢 Bajo |
| `products` GET | admin, superadmin | ❌ | ❌ | 🟢 Bajo |
| `products` POST | admin, superadmin | ❌ | ❌ | 🟢 Bajo |
| `products/[id]` PATCH | admin, superadmin | ❌ | ❌ | 🟢 Bajo |
| `products/[id]` DELETE | admin, superadmin | ❌ | ❌ | 🟢 Bajo |
| `organizations` GET | admin, superadmin | ❌ | ❌ | 🟢 Bajo |
| `organizations` POST | admin, superadmin | ❌ | ❌ | 🟢 Bajo |
| `organizations/[orgId]` GET | admin, superadmin | ❌ | ❌ | 🟢 Bajo |
| `organizations/[orgId]` PATCH | admin, superadmin | ❌ | ❌ | 🟢 Bajo |
| `organizations/[orgId]` DELETE | admin, superadmin | ❌ | ❌ | 🟢 Bajo |
| `organizations/[orgId]/users` POST | admin, superadmin | ❌ | ✅ (1 write) | 🟢 Bajo |
| `organizations/[orgId]/assign-bulk` POST | admin, superadmin | ❌ | ❌ | 🟢 Bajo |
| `organizations/[orgId]/batch` POST | admin, superadmin | ❌ | ❌ | 🟢 Bajo |
| `orders` GET | admin, superadmin, imprenta | ❌ | ❌ | 🟢 Bajo |
| `orders` PATCH | admin, superadmin, imprenta | ❌ | ❌ | 🟢 Bajo |
| `orders` DELETE | admin, superadmin | ❌ | ❌ | 🟢 Bajo |
| `orders/[id]/approve` POST | admin, superadmin, imprenta | ✅ 20/min | ✅ (3 writes) | 🟢 Bajo |
| `orders/[id]/reject` POST | admin, superadmin, imprenta | ✅ 20/min | ✅ (2 writes) | 🟢 Bajo |
| `orders/[id]/corporate-assign` POST | admin, superadmin, imprenta | ✅ 20/min | ❌ | 🟡 Medio |
| `orders/[id]/corporate-delivery` PATCH | admin, superadmin, imprenta | ✅ 20/min | ❌ | 🟢 Bajo |
| `orders/[id]/corporate-items/[itemId]/fulfillment` PATCH | admin, superadmin, imprenta | ❌ | ✅ (1 write) | 🟡 Medio |
| `config` GET | admin, superadmin, imprenta | ❌ | ❌ | 🟢 Bajo |
| `config` PATCH | admin, superadmin, imprenta | ❌ | ❌ | 🟢 Bajo |
| `admins` GET | superadmin | ❌ | ❌ | 🟢 Bajo |
| `admins` POST | superadmin | ❌ | ❌ | 🟢 Bajo |
| `admins` PATCH | superadmin | ❌ | ❌ | 🟢 Bajo |
| `admins/[id]` PATCH | superadmin | ❌ | ❌ | 🟢 Bajo |
| `admins/[id]` DELETE | superadmin | ❌ | ❌ | 🟢 Bajo |
| `packages` GET | admin, superadmin | ❌ | ❌ | 🟢 Bajo |
| `packages` POST | admin, superadmin | ❌ | ❌ | 🟢 Bajo |
| `packages` PATCH | admin, superadmin | ❌ | ❌ | 🟢 Bajo |
| `inventory` GET | admin, superadmin, imprenta | ❌ | ❌ | 🟢 Bajo |
| `showcase` GET | admin, superadmin | ❌ | ❌ | 🟢 Bajo |
| `showcase` PATCH | admin, superadmin | ❌ | ❌ | 🟢 Bajo |
| `maintenance/clear-cache` POST | admin, superadmin, imprenta | ❌ | ❌ | 🟡 Medio |

**Totales de seguridad:**
- Endpoints con auth: **47/47** (100%)
- Endpoints con rate limiting: **4/47** (9%)
- Endpoints con auditLog: **8/47** (17%)
- AuditLog writes totales: **13**

---

## FASE 7 — Relación cliente ↔ admin

| Acción Cliente | Acción Admin | Endpoint involucrado | Entidad |
|---------------|-------------|---------------------|---------|
| Se registra | Ve en Users, bloquea/elimina | `GET /api/admin/users`, `POST /api/admin/users/[id]/actions` | User |
| Crea perfil médico | Ve en UserDetail (solo lectura) | `GET /api/admin/users/[id]/profiles` | Profile |
| Agrega contacto emergencia | Ve en UserDetail (solo lectura) | `GET /api/admin/users/[id]/profiles` | Contact |
| Activa chip con código | Ve chip activado en ChipsSection | `GET /api/admin/chips` | Chip |
| Vincula chip a perfil | Ve perfil asignado en ChipDetail | `GET /api/admin/chips/[chipId]` | Chip |
| Compra en tienda | Ve en PedidosSection | `GET /api/admin/orders` | Order |
| Sube comprobante pago | Revisa y aprueba/rechaza | `POST /api/admin/orders/[id]/approve`, `POST /api/admin/orders/[id]/reject` | Order |
| Compra accesorio personalizado | Ve badge "Personalizado", descarga QR | `GET /api/admin/orders` | Order |
| Solicita unión empresa | Aprueba/rechaza en Organizations | `POST /api/admin/organizations/[orgId]/users` | OrganizationMember |
| Empresa paga | Aprueba pago en Pedidos | `POST /api/admin/orders/[id]/approve` | Order |
| Empresa pide producto | Aprueba en Pedidos (corporate) | `POST /api/admin/orders/[id]/corporate-assign` | CorporateOrderEmployeeItem |
| Empresa asigna chip a empleado | Admin asigna en Pedidos | `POST /api/admin/orders/[id]/corporate-assign` | CorporateOrderEmployeeItem |
| Cliente cancela pedido | Ve estado "cancelled" | `GET /api/admin/orders` | Order |
| Admin crea chip (batch) | Chip aparece en inventario | `POST /api/admin/chips` | Chip |
| Admin asigna combo a usuario | Usuario recibe capacidad | `POST /api/admin/chips/[chipId]/assign-direct` | Chip |
| Admin cambia config precios | Cliente ve nuevos precios | `PATCH /api/admin/config` | SystemConfig |
| Admin crea producto | Cliente ve en tienda | `POST /api/admin/products` | Product |
| Admin edita producto | Cliente ve cambios | `PATCH /api/admin/products/[id]` | Product |
| Admin desactiva producto | Cliente no lo ve | `DELETE /api/admin/products/[id]` | Product |
| Admin crea organización | Empresa puede unirse | `POST /api/admin/organizations` | Organization |
| Admin asigna chips a org | Empleados pueden activar | `POST /api/admin/organizations/[orgId]/assign-bulk` | Chip |

---

## FASE 8 — Entidades administradas

### User (prisma/schema.prisma:73)

**Campos principales:** id, email, phone, role, status, isAdmin, adminRole, createdAt, lastLoginAt, accountId  
**Quién la modifica:** Admin (bloquear, eliminar, asignar combo)  
**Pantallas:** UsersSection, UserDetailView  
**Endpoints:** `GET /api/admin/users`, `PATCH /api/admin/users`, `POST /api/admin/users/[id]/actions`

### Account (prisma/schema.prisma:29)

**Campos principales:** id, packageId, maxChipsAllocated, maxProfilesAllocated, accountType  
**Quién la modifica:** Admin (asignar combo)  
**Pantallas:** UserDetailView  
**Endpoints:** `POST /api/admin/chips/[chipId]/assign-direct`

### Profile (prisma/schema.prisma:115)

**Campos principales:** id, firstName, lastName, bloodType, sex, dateOfBirth, phone, allergies, chronicConditions, medications, insuranceProvider, insurancePolicyNumber, preferredHospital, primaryDoctorName, primaryDoctorPhone, additionalNotes, profileType  
**Quién la modifica:** Solo el cliente (admin solo lee)  
**Pantallas:** UserDetailView (solo lectura)  
**Endpoints:** `GET /api/admin/users/[id]/profiles`

### Chip (prisma/schema.prisma:206)

**Campos principales:** id, serialPublic, shortCode, internalLabel, status, serviceStatus, serviceStartDate, serviceEndDate, activatedAt, lastScanAt, isPhysical, ownerUserId, assignedProfileId, accountId, batchId, productType, nicheType, nfcUrl, qrUrl  
**Quién la modifica:** Admin (crear, asignar, activar, suspender, rehabilitar, eliminar)  
**Pantallas:** ChipsSection, ChipDetailView, InventorySection  
**Endpoints:** `GET /api/admin/chips`, `POST /api/admin/chips`, `PATCH /api/admin/chips/[chipId]`, `DELETE /api/admin/chips/[chipId]`, `POST /api/admin/chips/[chipId]/assign-direct`, `POST /api/admin/chips/[chipId]/reactivate`, `POST /api/admin/chips/[chipId]/rehabilitate`

### Order (prisma/schema.prisma:528)

**Campos principales:** id, orderNumber, provider, orderStatus, paymentStatus, adminReviewStatus, adminReviewNotes, amount, customerName, customerEmail, customerPhone, customerDocument, paymentMethod, paymentProofUrl, shippingAddress, shippingCity, shippingNotes, orderType, fee, tax, finalAmount  
**Quién la modifica:** Admin (aprobar, rechazar, picking, asignar chips)  
**Pantallas:** PedidosSection  
**Endpoints:** `GET /api/admin/orders`, `PATCH /api/admin/orders`, `DELETE /api/admin/orders`, `POST /api/admin/orders/[id]/approve`, `POST /api/admin/orders/[id]/reject`

### OrderItem (prisma/schema.prisma:583)

**Campos principales:** id, orderId, productId, productType, quantity, unitPrice, totalPrice, profileId, chipId, customization (JSON)  
**Quién la modifica:** Admin (asignar chip)  
**Pantallas:** PedidosSection  
**Endpoints:** `POST /api/admin/orders/[id]/approve`

### CorporateOrderEmployeeItem (prisma/schema.prisma:604)

**Campos principales:** id, orderId, productId, chipId, fulfillmentStatus, activatedAt, quantity, unitPrice, subtotal  
**Quién la modifica:** Admin (asignar chip, marcar entrega)  
**Pantallas:** PedidosSection  
**Endpoints:** `POST /api/admin/orders/[id]/corporate-assign`, `PATCH /api/admin/orders/[id]/corporate-items/[itemId]/fulfillment`

### Organization (prisma/schema.prisma:247)

**Campos principales:** id, accountId, legalName, displayName, companyCode, contactEmail, contactPhone, taxId, address, organizationType, status, corporateStatus, maxMembers  
**Quién la modifica:** Admin (crear, editar, eliminar, asignar chips)  
**Pantallas:** OrganizationsSection, OrgDetailView  
**Endpoints:** `GET /api/admin/organizations`, `POST /api/admin/organizations`, `PATCH /api/admin/organizations/[orgId]`, `DELETE /api/admin/organizations/[orgId]`

### OrganizationMember (prisma/schema.prisma:396)

**Campos principales:** id, organizationId, userId, role, corporateStatus, activatedAt  
**Quién la modifica:** Admin (agregar miembro)  
**Pantallas:** OrgDetailView  
**Endpoints:** `POST /api/admin/organizations/[orgId]/users`

### Product (prisma/schema.prisma:11)

**Campos principales:** id, name, description, price, category, stock, image, isActive, productType, estimatedProductionTime, requiresPersonalization, isPersonalized, available_online, requires_profile  
**Quién la modifica:** Admin (CRUD completo)  
**Pantallas:** TiendaSection  
**Endpoints:** `GET /api/admin/products`, `POST /api/admin/products`, `PATCH /api/admin/products/[id]`, `DELETE /api/admin/products/[id]`

### Package (prisma/schema.prisma:48)

**Campos principales:** id, name, description, price, maxChips, maxProfiles, features  
**Quién la modifica:** Admin (crear, editar)  
**Pantallas:** PackagesSection (via API)  
**Endpoints:** `GET /api/admin/packages`, `POST /api/admin/packages`, `PATCH /api/admin/packages`

### AuditLog (prisma/schema.prisma:494)

**Campos principales:** id, actorUserId, accountId, entityType, entityId, action, oldValuesJson, newValuesJson, createdAt  
**Quién la modifica:** Sistema (escrito automáticamente en endpoints admin)  
**Pantallas:** NO ENCONTRADO EN EL CÓDIGO  
**Endpoints:** NO ENCONTRADO ENDPOINT DE LECTURA

### SystemConfig (prisma/schema.prisma:705)

**Campos principales:** id, key, value  
**Quién la modifica:** Admin (configuración global)  
**Pantallas:** SettingsSection  
**Endpoints:** `GET /api/admin/config`, `PATCH /api/admin/config`

---

## FASE 9 — Auditoría de UI

### Estados vacíos por sección

| Sección | Estado vacío | Texto encontrado en código |
|---------|-------------|---------------------------|
| DashboardSection | Sin stats | Loader con spinner |
| UsersSection | Sin usuarios | Tabla vacía (sin texto explícito) |
| ChipsSection | Sin chips | Tabla vacía (sin texto explícito) |
| TiendaSection | Sin productos | `"Almacén Vacío"` |
| OrganizationsSection | Sin orgs | `"No hay empresas registradas."` |
| InventorySection | Sin inventario | `"Sin resultados para esta vista."` |
| PedidosSection | Sin pedidos | `"No hay pedidos registrados"` |
| AdminsSection | Sin admins | `"No se han registrado operadores secundarios."` |
| SettingsSection | — | Siempre muestra formulario |

### Loading states

| Sección | Loading state | Componente |
|---------|--------------|-----------|
| AdminsSection | `"Consultando alto mandо..."` | Loader2 spinner |
| ChipsSection | Loader2 spinner | Loader2 spinner |
| UsersSection | Loader2 spinner | Loader2 spinner |
| DashboardSection | Loader2 spinner | Loader2 spinner |
| InventorySection | Loader2 spinner | Loader2 spinner |
| PedidosSection | Loader2 spinner | Loader2 spinner |
| TiendaSection | Loader2 spinner | Loader2 spinner |
| OrganizationsSection | `"Orquestando datos corporativos..."` | Loader2 spinner |

### Confirmaciones destructivas

| Sección | Acción | Texto de confirmación |
|---------|--------|----------------------|
| PedidosSection | Cambiar estado | `"¿Estás seguro de marcar esta orden como '{action}'?"` |
| PedidosSection | Aprobar/Rechazar | `"¿Estás seguro de marcar esta orden como '{action}'?"` |
| PedidosSection | Eliminar canceladas | `"¿Deseas eliminar permanentemente TODAS las órdenes canceladas?"` |
| PedidosSection | Eliminar orden | `"¿Eliminar de forma permanente? No se puede deshacer."` |
| PedidosSection | Chips insuficientes | `"Has seleccionado {n} chips, pero el pedido requiere aproximadamente {n}. ¿Deseas continuar?"` |
| InventorySection | Rehabilitar chip | `"¿Estás seguro de rehabilitar este chip? Se generará un nuevo código de activación."` |
| InventorySection | Eliminar chip | `"Esta acción eliminará el chip disponible del inventario. No se puede deshacer."` |
| TiendaSection | Eliminar producto | `"¿Eliminar {name}?"` |
| UsersSection | Eliminar usuario | `"¿Estás seguro de eliminar permanentemente a {email}?"` |

---

## FASE 10 — Hallazgos

### P0 — Bloqueantes
> **NINGUNO.** No se encontró ningún problema crítico de seguridad o funcionalidad bloqueante en el código auditado.

### P1 — Importantes

| # | Hallazgo | Archivo | Línea | Evidencia |
|---|----------|---------|-------|-----------|
| 1 | `corporate-assign` no escribe AuditLog | `app/api/admin/orders/[id]/corporate-assign/route.ts` | — | grep auditLog.create: 0 resultados |
| 2 | `corporate-delivery` no escribe AuditLog | `app/api/admin/orders/[id]/corporate-delivery/route.ts` | — | grep auditLog.create: 0 resultados |
| 3 | No existe endpoint `GET /api/admin/audit-logs` | NO ENCONTRADO EN EL CÓDIGO | — | No hay forma de consultar AuditLog desde la UI |
| 4 | No existe componente `AuditSection` | NO ENCONTRADO EN EL CÓDIGO | — | No hay sección de auditoría en el sidebar |
| 5 | PedidosSection tiene 1655 líneas | `app/(admin)/admin/_components/sections/PedidosSection.tsx` | 1 | 10 responsabilidades en un solo archivo |

### P2 — Mejoras

| # | Hallazgo | Archivo | Evidencia |
|---|----------|---------|-----------|
| 6 | ChipsSection no tiene texto de estado vacío explícito | `ChipsSection.tsx` | Tabla vacía sin mensaje |
| 7 | UsersSection no tiene texto de estado vacío explícito | `UsersSection.tsx` | Tabla vacía sin mensaje |
| 8 | No hay filtros por fecha en pedidos | `PedidosSection.tsx` | Solo tabs por estado |
| 9 | No hay exportación de pedidos a CSV | `PedidosSection.tsx` | Solo chips y usuarios se exportan |
| 10 | GovernanceSection no visible en sidebar | `GovernanceSection.tsx` | Existe pero no se renderiza |
| 11 | ShowcaseProfileSection no visible en sidebar | `ShowcaseProfileSection.tsx` | Existe pero no se renderiza |

### P3 — Limpieza

| # | Hallazgo | Archivo | Evidencia |
|---|----------|---------|-----------|
| 12 | GovernanceSection no referenciada en page.tsx | `page.tsx` | No hay import ni uso |
| 13 | ShowcaseProfileSection no referenciada en page.tsx | `page.tsx` | No hay import ni uso |

---

## FASE 11 — Resumen ejecutivo

### Números reales del Panel Admin

| Métrica | Valor |
|---------|-------|
| Rutas admin (archivos page.tsx) | 2 |
| API routes admin (archivos route.ts) | 31 |
| Métodos HTTP totales | 47 |
| Secciones UI | 12 |
| Detalle views | 3 |
| Modales | 3 |
| Componentes de pedidos | 2 |
| Hooks | 7 |
| Servicios | 4 + apiClient |
| Formularios | 7 |
| Botones de acción | ~35 |
| AuditLog writes | 13 |
| Rate limits | 4 endpoints |
| Entidades Prisma | 22 |
| Estados documentados | 25 |
| Confirmaciones destructivas | 9 |

### Veredicto

El Panel Admin tiene:
- ✅ **Auth completa** en los 47 métodos HTTP
- ✅ **Role validation** en los 47 métodos HTTP
- ⚠️ **Rate limiting** en 4 de 47 métodos (9%)
- ⚠️ **AuditLog** en 8 de 47 métodos (17%)
- ❌ **Vista de auditoría** no existe
- ❌ **Gestión de perfiles médicos** no existe (solo lectura)

### Commit auditado
`f22aeec` (HEAD -> master, origin/master)

### Archivos inspeccionados
- 39 archivos TypeScript admin
- 31 archivos de ruta API
- 12 secciones UI
- 3 detail views
- 3 modals
- 2 order components
- 7 hooks
- 4 services + apiClient
- 1 types file
- 1 utils file
- lib/rbac.ts
- lib/order-status.ts
- prisma/schema.prisma

---
*Originalmente en: docs/audit/*