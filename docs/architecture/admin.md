# Arquitectura — Panel Admin

Estado: documento de orden interno.
Fecha: 2026-06-10.
Propósito: explicar cómo está organizado el panel administrativo de PreRescatePTY: secciones, roles, APIs, hooks, servicios, vistas de detalle y responsabilidades.

Este documento no cambia la lógica de la app. Es un mapa del dominio actual.

---

## 1. Definición del dominio

El panel admin es el centro operativo interno de PreRescatePTY.

Desde aquí se gestionan:

- métricas generales
- chips QR/NFC
- usuarios y perfiles
- organizaciones/empresas
- inventario físico
- administradores
- pedidos y pagos manuales
- tienda/productos
- configuración del sistema
- puntos de venta y consignación

El panel admin no es una sola feature de negocio; es una consola que cruza varios dominios:

- `features/chips`
- `features/fichas-medicas`
- `features/empresas`
- `features/pedidos`
- `features/inventario`
- `features/usuarios`
- `features/website` / tienda pública

---

## 2. Archivos principales actuales

### Entrada principal

- `app/(admin)/admin/page.tsx`
  - Página principal del panel admin.
  - Maneja autorización cliente con sesión.
  - Renderiza tabs/secciones.
  - Orquesta detalles de chip, usuario y organización.

- `app/(admin)/admin/layout.tsx`
  - Layout admin.

- `app/(admin)/admin/error.tsx`
  - Manejo de error del segmento admin.

### Hook orquestador

- `app/(admin)/admin/_hooks/useAdminManager.ts`
  - Define tabs válidas.
  - Sincroniza tab con URL `/admin?tab=...`.
  - Maneja búsqueda global y filtros.
  - Coordina hooks especializados:
    - `useAdminStats`
    - `useAdminChips`
    - `useAdminUsers`
    - `useAdminOrgs`

### Hooks especializados

- `app/(admin)/admin/_hooks/useAdminStats.ts`
- `app/(admin)/admin/_hooks/useAdminChips.ts`
- `app/(admin)/admin/_hooks/useAdminUsers.ts`
- `app/(admin)/admin/_hooks/useAdminOrgs.ts`
- `app/(admin)/admin/_hooks/useOrdersPolling.ts`
- `app/(admin)/admin/_hooks/useDebounce.ts`

### Cliente API admin

- `app/(admin)/admin/_services/apiClient.ts`
  - Wrapper de fetch con métodos `get`, `post`, `patch`, `delete`.
  - Lanza `ApiError` si la respuesta no es OK.

### Servicios por dominio del frontend admin

- `app/(admin)/admin/_services/domains/chips.service.ts`
- `app/(admin)/admin/_services/domains/users.service.ts`
- `app/(admin)/admin/_services/domains/orgs.service.ts`
- `app/(admin)/admin/_services/domains/stats.service.ts`

### Tipos compartidos del admin

- `app/(admin)/admin/_types/admin.ts`
  - `Profile`
  - `EmergencyContact`
  - `ChipAdmin`
  - `ScanEvent`
  - `ChipDetail`
  - `UserAdmin`
  - `OrganizationAdmin`
  - `AdminStats`
  - `SystemAlert`
  - `DashboardStats`
  - `AdminAccount`

### Utilidades

- `app/(admin)/admin/_utils/export.ts`
  - Exportación CSV.

---

## 3. Secciones actuales del panel

Las secciones activas se renderizan desde `app/(admin)/admin/page.tsx` según `admin.tab`.

Tabs activas:

- `dashboard`
- `chips`
- `users`
- `empresas`
- `inventory`
- `admins`
- `pedidos`
- `tienda`
- `settings`

Tabs definidas pero no renderizadas como sección principal actualmente:

- `create`
- `governance`
- `roadmap`
- `showcase`

### `dashboard`

Componente:

- `app/(admin)/admin/_components/sections/DashboardSection.tsx`

Responsabilidad:

- métricas generales
- actividad reciente
- usuarios recientes
- organizaciones recientes
- navegación rápida a chips/usuarios/orgs

APIs relacionadas:

- `app/api/admin/stats/route.ts`

Roles:

- `GENERAL_ADMIN_ROLES`: `admin`, `superadmin`

### `chips`

Componente:

- `app/(admin)/admin/_components/sections/ChipsSection.tsx`

Responsabilidad:

- control maestro de chips no inventario
- búsqueda por serial/shortCode/label/token/owner
- filtros por status/serviceStatus/accountId
- detalle de chip
- eliminación admin

APIs relacionadas:

- `app/api/admin/chips/route.ts`
- `app/api/admin/chips/[chipId]/route.ts`
- `app/api/admin/chips/[chipId]/reactivate/route.ts`
- `app/api/admin/chips/[chipId]/rehabilitate/route.ts`
- `app/api/admin/chips/[chipId]/assign-direct/route.ts`

Roles observados:

- listado/creación usa `admin`, `superadmin`, `imprenta`.
- detalle usa `ORDER_ADMIN_ROLES`: `admin`, `superadmin`, `imprenta`.
- algunas acciones más sensibles usan `GENERAL_ADMIN_ROLES` o `admin/superadmin`.

### `users`

Componente:

- `app/(admin)/admin/_components/sections/UsersSection.tsx`

Responsabilidad:

- gestión de usuarios
- ver detalle usuario
- acciones sobre usuario
- navegación hacia inventario/chips de cuenta

Vistas detalle:

- `app/(admin)/admin/_components/details/UserDetail.tsx`

APIs relacionadas:

- `app/api/admin/users/route.ts`
- `app/api/admin/users/[id]/profiles/route.ts`
- `app/api/admin/users/[id]/actions/route.ts`

Roles observados:

- lectura general puede usar `ORDER_ADMIN_ROLES`.
- acciones sensibles usan `GENERAL_ADMIN_ROLES`.

### `empresas`

Componente:

- `app/(admin)/admin/_components/sections/OrganizationsSection.tsx`

Responsabilidad:

- cuentas corporativas
- organizaciones
- colegios/flotas/empresas
- detalle organización
- crear/editar/eliminar organización
- usuarios de organización

Vistas/modales:

- `app/(admin)/admin/_components/details/OrgDetail.tsx`
- `app/(admin)/admin/_components/modals/OrgCreateModal.tsx`
- `app/(admin)/admin/_components/modals/OrgEditModal.tsx`

APIs relacionadas:

- `app/api/admin/organizations/route.ts`
- `app/api/admin/organizations/[orgId]/route.ts`
- `app/api/admin/organizations/[orgId]/users/route.ts`

Roles:

- `GENERAL_ADMIN_ROLES`: `admin`, `superadmin`

### `inventory`

Componente:

- `app/(admin)/admin/_components/sections/InventorySection.tsx`

Responsabilidad:

- stock físico
- fábrica/producción
- crear lotes de chips
- etiquetado interno
- exportación CSV
- puntos de venta/consignación según lógica reciente

Página adicional:

- `app/(admin)/admin/inventario/lotes/page.tsx`

APIs relacionadas:

- `app/api/admin/chips/route.ts`
- `app/api/admin/chips/inventory/route.ts`
- `app/api/admin/chips/available/route.ts`
- `app/api/admin/inventory/route.ts`
- `app/api/admin/points-of-sale/route.ts`
- `app/api/admin/points-of-sale/[id]/consign/route.ts`
- `app/api/admin/points-of-sale/[id]/return/route.ts`
- `app/api/admin/points-of-sale/[id]/mark-lost/route.ts`
- `app/api/admin/retail/sell/route.ts`

Roles observados:

- `imprenta` es redirigido al tab `inventory`.
- muchas rutas permiten `admin`, `superadmin`, `imprenta` para inventario básico.
- puntos de venta/retail restringen a `admin`, `superadmin`.

### `admins`

Componente:

- `app/(admin)/admin/_components/sections/AdminsSection.tsx`

Responsabilidad:

- crear administradores
- actualizar roles/status
- eliminar administradores

APIs relacionadas:

- `app/api/admin/admins/route.ts`
- `app/api/admin/admins/[id]/route.ts`

Roles:

- `SUPERADMIN_ROLES`: solo `superadmin`

### `pedidos`

Componente:

- `app/(admin)/admin/_components/sections/PedidosSection.tsx`

Responsabilidad:

- ventas y pedidos
- revisión de pagos manuales
- aprobación/rechazo
- asignación corporativa
- cancelación/borrado según flujo

Componentes relacionados:

- `app/(admin)/admin/_components/orders/ManualPaymentReview.tsx`
- `app/(admin)/admin/_components/orders/ChipAssignmentPanel.tsx`

APIs relacionadas:

- `app/api/admin/orders/route.ts`
- `app/api/admin/orders/[id]/approve/route.ts`
- `app/api/admin/orders/[id]/reject/route.ts`
- `app/api/admin/orders/[id]/corporate-assign/route.ts`

Roles observados:

- algunas rutas permiten `admin`, `superadmin`, `imprenta`.
- `app/api/admin/orders/route.ts` parece restringir base a `admin`/`superadmin`.

### `tienda`

Componente:

- `app/(admin)/admin/_components/sections/TiendaSection.tsx`

Responsabilidad:

- productos de tienda
- stock
- ventas/productos adicionales

APIs relacionadas:

- `app/api/admin/products/route.ts`
- `app/api/admin/products/[id]/route.ts`
- `app/api/admin/packages/route.ts`

Roles:

- `GENERAL_ADMIN_ROLES`: `admin`, `superadmin`

### `settings`

Componente:

- `app/(admin)/admin/_components/sections/SettingsSection.tsx`

Responsabilidad:

- configuración global de plataforma
- pagos
- comunicaciones
- settings operativos

APIs relacionadas:

- `app/api/admin/config/route.ts`
- `app/api/admin/maintenance/clear-cache/route.ts`

Roles observados:

- config usa `ORDER_ADMIN_ROLES`.
- maintenance usa `GENERAL_ADMIN_ROLES`.

---

## 4. Vistas de detalle

### Detalle de chip

Archivo:

- `app/(admin)/admin/_components/details/ChipDetail.tsx`

API:

- `app/api/admin/chips/[chipId]/route.ts`

Notas:

- Puede incluir datos médicos sensibles de `assignedProfile`.
- La API crea notificación de transparencia al usuario si un admin consulta detalle sensible.

### Detalle de usuario

Archivo:

- `app/(admin)/admin/_components/details/UserDetail.tsx`

APIs:

- `app/api/admin/users/[id]/profiles/route.ts`
- `app/api/admin/users/[id]/actions/route.ts`

Notas:

- Puede navegar a inventario filtrado por cuenta.
- Puede actualizar plan mediante `ComboSelectorModal`.

### Detalle de organización

Archivo:

- `app/(admin)/admin/_components/details/OrgDetail.tsx`

APIs:

- `app/api/admin/organizations/[orgId]/route.ts`
- `app/api/admin/organizations/[orgId]/users/route.ts`

Notas:

- Relaciona empresa con usuarios, cuenta, chips y organización.

---

## 5. Roles y permisos

Roles admin actuales:

- `admin`
- `superadmin`
- `imprenta`

Definiciones centralizadas:

- `lib/rbac.ts`

Grupos:

```ts
ORDER_ADMIN_ROLES = ["admin", "superadmin", "imprenta"]
GENERAL_ADMIN_ROLES = ["admin", "superadmin"]
SUPERADMIN_ROLES = ["superadmin"]
```

### `admin`

Puede operar gran parte del panel administrativo.

Áreas típicas:

- dashboard
- chips
- usuarios
- empresas
- inventario
- pedidos
- tienda
- settings según ruta
- puntos de venta

### `superadmin`

Tiene acceso total, incluyendo gestión de administradores.

Áreas exclusivas:

- `admins`
- creación/actualización/eliminación de cuentas admin

### `imprenta`

Rol operativo de impresión/inventario/pedidos.

Observaciones actuales:

- En `page.tsx`, si `role === "imprenta"`, se fuerza tab `inventory`.
- Varias rutas de chips/inventario permiten `imprenta`.
- Algunas rutas de pedidos permiten `imprenta`.
- Rutas generales y puntos de venta suelen excluir `imprenta`.

---

## 6. API admin actual

Directorio:

- `app/api/admin/`

Áreas:

### Admin accounts

- `admin/admins/route.ts`
- `admin/admins/[id]/route.ts`

### Chips

- `admin/chips/route.ts`
- `admin/chips/[chipId]/route.ts`
- `admin/chips/[chipId]/assign-direct/route.ts`
- `admin/chips/[chipId]/reactivate/route.ts`
- `admin/chips/[chipId]/rehabilitate/route.ts`
- `admin/chips/available/route.ts`
- `admin/chips/inventory/route.ts`

### Config/maintenance

- `admin/config/route.ts`
- `admin/maintenance/clear-cache/route.ts`

### Inventory

- `admin/inventory/route.ts`

### Orders

- `admin/orders/route.ts`
- `admin/orders/[id]/approve/route.ts`
- `admin/orders/[id]/reject/route.ts`
- `admin/orders/[id]/corporate-assign/route.ts`

### Organizations

- `admin/organizations/route.ts`
- `admin/organizations/[orgId]/route.ts`
- `admin/organizations/[orgId]/users/route.ts`

### Packages/products/store

- `admin/packages/route.ts`
- `admin/products/route.ts`
- `admin/products/[id]/route.ts`

### Points of sale

- `admin/points-of-sale/route.ts`
- `admin/points-of-sale/[id]/consign/route.ts`
- `admin/points-of-sale/[id]/return/route.ts`
- `admin/points-of-sale/[id]/mark-lost/route.ts`

### Retail

- `admin/retail/sell/route.ts`

### Showcase/stats/users

- `admin/showcase/route.ts`
- `admin/stats/route.ts`
- `admin/users/route.ts`
- `admin/users/[id]/profiles/route.ts`
- `admin/users/[id]/actions/route.ts`

---

## 7. Riesgos de confusión actuales

1. `page.tsx` actúa como orquestador grande.
   - Define labels, tabs, detalles, modales, exportación y render principal.

2. Algunas tabs están definidas pero no renderizadas.
   - `governance`, `roadmap`, `showcase`, `create`.

3. Permisos no están completamente homogéneos.
   - Algunas rutas usan `requireRole`.
   - Otras implementan `isAdmin()` local.
   - Algunas aceptan `imprenta`, otras no.

4. `inventory` mezcla varios subdominios:
   - inventario físico
   - chips
   - puntos de venta
   - retail
   - creación de lotes

5. `pedidos` mezcla pagos, órdenes, asignación de chips y flujos corporativos.

6. Los tipos admin viven juntos en un solo archivo.
   - `app/(admin)/admin/_types/admin.ts`
   - Esto ayuda a centralizar, pero puede crecer demasiado.

7. Algunos componentes grandes son difíciles de mantener.
   - `InventorySection.tsx`
   - `PedidosSection.tsx`
   - `DashboardSection.tsx`

---

## 8. Propuesta de organización futura

Crear estructura progresiva:

```txt
features/admin/
  README.md
  sections.md
  roles.md
  api-map.md
  dashboard/
    README.md
  chips/
    README.md
  usuarios/
    README.md
  empresas/
    README.md
  inventario/
    README.md
  pedidos/
    README.md
  tienda/
    README.md
  settings/
    README.md
  administradores/
    README.md
```

Regla recomendada:

- `app/(admin)/admin` mantiene rutas Next.js y composición.
- `features/admin` documenta el panel como producto interno.
- Los dominios reales siguen viviendo en `features/chips`, `features/fichas-medicas`, `features/empresas`, etc.
- Con el tiempo, se pueden mover componentes grandes a `features/admin/<seccion>/components`.

---

## 9. Candidatos de refactor futuro

### Alta prioridad de orden

- `app/(admin)/admin/page.tsx`
  - Separar config de tabs a un archivo:
    - `features/admin/tabs.ts`
  - Separar header/search principal.
  - Separar render de secciones.

- `app/(admin)/admin/_components/sections/InventorySection.tsx`
  - Mover gradualmente a `features/admin/inventario/components` o `features/chips/inventario/components`.

- `app/(admin)/admin/_components/sections/PedidosSection.tsx`
  - Mover gradualmente a `features/admin/pedidos/components` o futuro `features/pedidos/admin`.

- `app/(admin)/admin/_types/admin.ts`
  - Dividir por dominio cuando crezca:
    - `admin-chip.types.ts`
    - `admin-user.types.ts`
    - `admin-org.types.ts`
    - `admin-stats.types.ts`

- Rutas admin con permisos locales
  - Homogeneizar a `requireRole(...)`.
  - Evitar múltiples implementaciones de `isAdmin()`.

### Mantener por ahora

- `useAdminManager.ts`
  - Ya centraliza navegación/filtros.
  - Puede documentarse mejor antes de dividir.

- `apiClient.ts`
  - Buen punto común para llamadas admin.

---

## 10. Preguntas abiertas

1. ¿Debe `imprenta` ver únicamente inventario o también pedidos?

2. ¿Debe `settings` permitir `imprenta` por `ORDER_ADMIN_ROLES` o solo `admin/superadmin`?

3. ¿Debe `config` usar `GENERAL_ADMIN_ROLES` en vez de `ORDER_ADMIN_ROLES`?

4. ¿Debe `orders/route.ts` permitir `imprenta`, ya que approve/reject/corporate-assign sí lo contemplan en algunas rutas?

5. ¿Qué acciones deben ser exclusivas de `superadmin` además de gestionar admins?

6. ¿Debe haber auditoría visible para toda consulta admin de datos médicos, no solo detalle de chip?

7. ¿Qué tabs son legacy o futuras: `governance`, `roadmap`, `showcase`, `create`?

---

## 11. Próximo paso recomendado

Crear una matriz oficial de permisos:

- `features/admin/roles.md`

Con columnas:

- Sección
- Acción
- Ruta API
- `admin`
- `superadmin`
- `imprenta`
- Datos sensibles
- Requiere audit log

Esto ayudaría a ordenar los permisos antes de tocar código.
