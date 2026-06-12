# Admin — Catálogo de Secciones y APIs

Este documento lista las secciones del panel admin, sus responsabilidades, componentes actuales, APIs y roles observados.

Fuente principal:

- `app/(admin)/admin/page.tsx`
- `app/(admin)/admin/_hooks/useAdminManager.ts`
- `app/api/admin/**`
- `lib/rbac.ts`

---

## 1. Resumen de tabs

| Tab | Activa | Componente | Dominio principal |
|---|---|---|---|
| `dashboard` | sí | `DashboardSection` | métricas/admin general |
| `chips` | sí | `ChipsSection` | chips |
| `users` | sí | `UsersSection` | usuarios/fichas/cuentas |
| `empresas` | sí | `OrganizationsSection` | empresas |
| `inventory` | sí | `InventorySection` | inventario/chips/puntos de venta |
| `admins` | sí | `AdminsSection` | permisos/admin accounts |
| `pedidos` | sí | `PedidosSection` | pedidos/pagos |
| `tienda` | sí | `TiendaSection` | tienda/productos/paquetes |
| `settings` | sí | `SettingsSection` | configuración |
| `create` | no/render fallback | no principal | legacy/futuro |
| `governance` | no/render fallback | `GovernanceSection` existe | alertas/gobernanza |
| `roadmap` | no/render fallback | no visto | futuro/legacy |
| `showcase` | no/render fallback | `ShowcaseProfileSection` existe | demo/showcase |

---

## 2. `dashboard`

### Responsabilidad

Centro de control ejecutivo.

Muestra:

- métricas globales
- usuarios recientes
- escaneos recientes
- organizaciones recientes
- alertas/estado general

### UI

- `app/(admin)/admin/_components/sections/DashboardSection.tsx`

### Hook/servicio

- `app/(admin)/admin/_hooks/useAdminStats.ts`
- `app/(admin)/admin/_services/domains/stats.service.ts`

### APIs

- `GET /api/admin/stats`

Archivo:

- `app/api/admin/stats/route.ts`

### Roles observados

- `GENERAL_ADMIN_ROLES`
  - `admin`
  - `superadmin`

### Datos sensibles

- métricas de usuarios
- métricas de chips
- actividad reciente
- posibles alertas operativas

---

## 3. `chips`

### Responsabilidad

Control maestro de identificadores QR/NFC.

Permite:

- listar chips
- filtrar por estado/servicio/cuenta
- buscar por serial/shortCode/internalLabel/token/owner
- ver detalle de chip
- eliminar chip
- reactivar/rehabilitar/asignar directamente según rutas

### UI

- `app/(admin)/admin/_components/sections/ChipsSection.tsx`
- `app/(admin)/admin/_components/details/ChipDetail.tsx`

### Hook/servicio

- `app/(admin)/admin/_hooks/useAdminChips.ts`
- `app/(admin)/admin/_services/domains/chips.service.ts`

### APIs

- `GET /api/admin/chips`
- `POST /api/admin/chips`
- `GET /api/admin/chips/[chipId]`
- `PATCH /api/admin/chips/[chipId]`
- `POST/PATCH /api/admin/chips/[chipId]/assign-direct`
- `POST/PATCH /api/admin/chips/[chipId]/reactivate`
- `POST/PATCH /api/admin/chips/[chipId]/rehabilitate`
- `GET /api/admin/chips/available`
- `GET/PATCH /api/admin/chips/inventory`

### Roles observados

- `admin`
- `superadmin`
- `imprenta` en varias rutas
- acciones sensibles pueden usar solo `admin/superadmin`

### Datos sensibles

- datos médicos vía `assignedProfile` en detalle
- datos de contacto de emergencia
- owner email/phone
- escaneos recientes
- activation codes/tokens

### Nota importante

`GET /api/admin/chips/[chipId]` crea una notificación de transparencia al usuario cuando un admin consulta información sensible del chip.

---

## 4. `users`

### Responsabilidad

Gestión de usuarios, cuentas y perfiles asociados.

Permite:

- listar usuarios
- buscar usuarios
- ver detalle
- eliminar usuario
- acciones administrativas
- ver perfiles de usuario
- navegar a chips por cuenta

### UI

- `app/(admin)/admin/_components/sections/UsersSection.tsx`
- `app/(admin)/admin/_components/details/UserDetail.tsx`
- `app/(admin)/admin/_components/modals/ComboSelectorModal.tsx`

### Hook/servicio

- `app/(admin)/admin/_hooks/useAdminUsers.ts`
- `app/(admin)/admin/_services/domains/users.service.ts`

### APIs

- `GET /api/admin/users`
- `PATCH /api/admin/users`
- `GET /api/admin/users/[id]/profiles`
- `POST/PATCH /api/admin/users/[id]/actions`

### Roles observados

- lectura general: `ORDER_ADMIN_ROLES`
- acciones sensibles: `GENERAL_ADMIN_ROLES`

### Datos sensibles

- email
- teléfono
- perfiles médicos
- cuentas
- estado de usuario
- consentimientos
- chips del usuario

---

## 5. `empresas`

### Responsabilidad

Gestión de organizaciones/cuentas corporativas.

Permite:

- listar organizaciones
- crear organización
- ver detalle
- editar/eliminar organización
- gestionar usuarios/miembros relacionados
- filtrar chips por cuenta corporativa

### UI

- `app/(admin)/admin/_components/sections/OrganizationsSection.tsx`
- `app/(admin)/admin/_components/details/OrgDetail.tsx`
- `app/(admin)/admin/_components/modals/OrgCreateModal.tsx`
- `app/(admin)/admin/_components/modals/OrgEditModal.tsx`

### Hook/servicio

- `app/(admin)/admin/_hooks/useAdminOrgs.ts`
- `app/(admin)/admin/_services/domains/orgs.service.ts`

### APIs

- `GET /api/admin/organizations`
- `POST /api/admin/organizations`
- `GET /api/admin/organizations/[orgId]`
- `PATCH /api/admin/organizations/[orgId]`
- `DELETE /api/admin/organizations/[orgId]`
- `GET /api/admin/organizations/[orgId]/users`

### Roles observados

- `GENERAL_ADMIN_ROLES`
  - `admin`
  - `superadmin`

### Datos sensibles

- información fiscal/empresa
- usuarios corporativos
- contactos empresa
- chips/cuenta asociada

---

## 6. `inventory`

### Responsabilidad

Stock físico, fábrica, lotes, producción y consignación.

Permite:

- ver chips en inventario
- crear lotes
- exportar CSV
- etiquetar chips
- operar stock físico
- gestionar puntos de venta/consignación según UI actual

### UI

- `app/(admin)/admin/_components/sections/InventorySection.tsx`
- `app/(admin)/admin/inventario/lotes/page.tsx`
- `app/(admin)/admin/_components/sections/CreateBatchSection.tsx`
- `app/(admin)/admin/_components/modals/BatchCreateModal.tsx`

### Hook/servicio

- `useAdminChips`
- `chips.service.ts`

### APIs

- `GET /api/admin/chips?status=inventory`
- `POST /api/admin/chips`
- `GET /api/admin/chips/inventory`
- `PATCH /api/admin/chips/inventory`
- `GET /api/admin/chips/available`
- `GET /api/admin/inventory`
- `GET/POST /api/admin/points-of-sale`
- `POST /api/admin/points-of-sale/[id]/consign`
- `POST /api/admin/points-of-sale/[id]/return`
- `POST /api/admin/points-of-sale/[id]/mark-lost`
- `POST /api/admin/retail/sell`

### Roles observados

- `imprenta` es forzado a este tab desde `page.tsx`.
- chips/inventory permite `admin`, `superadmin`, `imprenta`.
- puntos de venta y retail suelen requerir `admin`, `superadmin`.

### Datos sensibles

- activation codes
- seriales
- labels internos
- stock físico
- exportaciones CSV

---

## 7. `admins`

### Responsabilidad

Gestión de cuentas administrativas.

Permite:

- listar admins
- crear admin
- actualizar rol/status
- eliminar admin

### UI

- `app/(admin)/admin/_components/sections/AdminsSection.tsx`

### Hook/servicio

- `useAdminUsers`
- `users.service.ts`

### APIs

- `GET /api/admin/admins`
- `POST /api/admin/admins`
- `PATCH /api/admin/admins`
- `PATCH /api/admin/admins/[id]`
- `DELETE /api/admin/admins/[id]`

### Roles observados

- `SUPERADMIN_ROLES`
  - solo `superadmin`

### Datos sensibles

- emails admin
- roles admin
- estados de acceso

---

## 8. `pedidos`

### Responsabilidad

Gestión de ventas y pedidos.

Permite:

- listar pedidos
- revisar pagos manuales
- aprobar/rechazar pagos
- asignación de chips
- asignación corporativa
- cancelar/borrar pedidos según flujo

### UI

- `app/(admin)/admin/_components/sections/PedidosSection.tsx`
- `app/(admin)/admin/_components/orders/ManualPaymentReview.tsx`
- `app/(admin)/admin/_components/orders/ChipAssignmentPanel.tsx`

### Hook/servicio

- `useOrdersPolling.ts`
- lógica local dentro de `PedidosSection.tsx`

### APIs

- `GET /api/admin/orders`
- `PATCH /api/admin/orders`
- `DELETE /api/admin/orders`
- `POST /api/admin/orders/[id]/approve`
- `POST /api/admin/orders/[id]/reject`
- `POST /api/admin/orders/[id]/corporate-assign`

### Roles observados

- `admin` / `superadmin` en `orders/route.ts`.
- `admin`, `superadmin`, `imprenta` en algunas rutas específicas approve/reject/corporate assign.

### Datos sensibles

- pagos
- comprobantes
- datos cliente
- chips asignados
- pedidos corporativos

### Pregunta abierta

Revisar si `imprenta` debe poder listar todos los pedidos o solo operar acciones específicas.

---

## 9. `tienda`

### Responsabilidad

Gestión de productos y paquetes comerciales.

Permite:

- listar productos
- crear/editar productos
- gestionar paquetes
- configurar tienda

### UI

- `app/(admin)/admin/_components/sections/TiendaSection.tsx`

### APIs

- `GET /api/admin/products`
- `POST /api/admin/products`
- `PATCH /api/admin/products/[id]`
- `DELETE /api/admin/products/[id]`
- `GET /api/admin/packages`
- `POST /api/admin/packages`
- `PATCH /api/admin/packages`

### Roles observados

- `GENERAL_ADMIN_ROLES`
  - `admin`
  - `superadmin`

### Datos sensibles

- precios
- stock
- configuración comercial

---

## 10. `settings`

### Responsabilidad

Configuración global de plataforma.

Permite:

- editar parámetros globales
- configurar pagos/comunicaciones según implementación
- limpiar cache en maintenance

### UI

- `app/(admin)/admin/_components/sections/SettingsSection.tsx`

### APIs

- `GET /api/admin/config`
- `PATCH /api/admin/config`
- `POST /api/admin/maintenance/clear-cache`

### Roles observados

- config: `ORDER_ADMIN_ROLES`
- maintenance: `GENERAL_ADMIN_ROLES`

### Datos sensibles

- configuración global
- posibles claves/valores operativos si se almacenan en config

### Pregunta abierta

Revisar si `imprenta` debe tener acceso a config por pertenecer a `ORDER_ADMIN_ROLES`.

---

## 11. Reglas de oro

1. Toda sección admin debe tener roles explícitos documentados.
2. Las rutas admin deberían usar `requireRole(...)` de forma homogénea.
3. Evitar múltiples implementaciones locales de `isAdmin()`.
4. Toda consulta admin de datos médicos debe ser auditable.
5. `imprenta` debe tener un alcance claramente limitado.
6. `inventory` debe revisarse junto con `features/chips`.
7. `pedidos` debe revisarse junto con futuros `features/pedidos` y `features/pagos`.
8. `empresas` debe revisarse junto con futuros `features/empresas`.
9. Los componentes admin grandes deben dividirse por subdominio antes de agregar más funcionalidad.
10. Antes de cambiar permisos, actualizar esta matriz.
