# Feature — Admin

Esta carpeta es el punto de entrada lógico para entender y, en el futuro, ordenar todo lo relacionado con el panel administrativo de PreRescatePTY.

Actualmente este directorio empieza como documentación de dominio. No reemplaza todavía los archivos existentes en `app/(admin)/admin` ni `app/api/admin`.

Mapa completo actual:

- `docs/architecture/admin.md`

Catálogo de secciones:

- `features/admin/sections.md`

---

## Qué significa “admin” en este proyecto

El panel admin es la consola interna para operar el negocio.

No es un solo dominio de negocio. Es una capa operativa que cruza varios dominios:

- chips
- fichas médicas
- usuarios
- empresas
- pedidos
- pagos
- inventario
- puntos de venta
- tienda
- configuración

Por eso esta carpeta debe responder:

1. qué secciones existen
2. qué APIs usa cada sección
3. qué roles pueden entrar
4. qué datos sensibles se tocan
5. qué dominios de negocio están involucrados

---

## Ubicación actual del código relacionado

### Página principal

- `app/(admin)/admin/page.tsx`
- `app/(admin)/admin/layout.tsx`
- `app/(admin)/admin/error.tsx`

### Hooks

- `app/(admin)/admin/_hooks/useAdminManager.ts`
- `app/(admin)/admin/_hooks/useAdminStats.ts`
- `app/(admin)/admin/_hooks/useAdminChips.ts`
- `app/(admin)/admin/_hooks/useAdminUsers.ts`
- `app/(admin)/admin/_hooks/useAdminOrgs.ts`
- `app/(admin)/admin/_hooks/useOrdersPolling.ts`
- `app/(admin)/admin/_hooks/useDebounce.ts`

### Servicios frontend admin

- `app/(admin)/admin/_services/apiClient.ts`
- `app/(admin)/admin/_services/domains/chips.service.ts`
- `app/(admin)/admin/_services/domains/users.service.ts`
- `app/(admin)/admin/_services/domains/orgs.service.ts`
- `app/(admin)/admin/_services/domains/stats.service.ts`

### Tipos

- `app/(admin)/admin/_types/admin.ts`

### Secciones UI

- `app/(admin)/admin/_components/sections/DashboardSection.tsx`
- `app/(admin)/admin/_components/sections/ChipsSection.tsx`
- `app/(admin)/admin/_components/sections/UsersSection.tsx`
- `app/(admin)/admin/_components/sections/OrganizationsSection.tsx`
- `app/(admin)/admin/_components/sections/InventorySection.tsx`
- `app/(admin)/admin/_components/sections/AdminsSection.tsx`
- `app/(admin)/admin/_components/sections/PedidosSection.tsx`
- `app/(admin)/admin/_components/sections/TiendaSection.tsx`
- `app/(admin)/admin/_components/sections/SettingsSection.tsx`

### Detalles/modales

- `app/(admin)/admin/_components/details/ChipDetail.tsx`
- `app/(admin)/admin/_components/details/UserDetail.tsx`
- `app/(admin)/admin/_components/details/OrgDetail.tsx`
- `app/(admin)/admin/_components/modals/OrgCreateModal.tsx`
- `app/(admin)/admin/_components/modals/OrgEditModal.tsx`
- `app/(admin)/admin/_components/modals/ComboSelectorModal.tsx`
- `app/(admin)/admin/_components/modals/BatchCreateModal.tsx`

### APIs

- `app/api/admin/**`

---

## Secciones activas

- `dashboard`
- `chips`
- `users`
- `empresas`
- `inventory`
- `admins`
- `pedidos`
- `tienda`
- `settings`

Secciones definidas pero no activas/renderizadas como tab principal hoy:

- `create`
- `governance`
- `roadmap`
- `showcase`

---

## Roles admin

Definidos en:

- `lib/rbac.ts`

Roles:

- `admin`
- `superadmin`
- `imprenta`

Grupos:

- `ORDER_ADMIN_ROLES`: `admin`, `superadmin`, `imprenta`
- `GENERAL_ADMIN_ROLES`: `admin`, `superadmin`
- `SUPERADMIN_ROLES`: `superadmin`

Regla mental:

- `superadmin`: control total.
- `admin`: operación general.
- `imprenta`: operación limitada, principalmente inventario/producción y algunas rutas de pedidos/chips.

---

## Cómo pensar este panel

El admin debe verse como una consola con módulos.

Cada módulo debe tener:

1. sección UI
2. hook o servicio de carga
3. APIs backend
4. roles permitidos
5. dominio de negocio responsable
6. datos sensibles que toca
7. acciones peligrosas

Ejemplo:

`inventory` no es solo una pantalla. Toca:

- chips
- lotes
- seriales
- activation codes
- puntos de venta
- retail físico
- exportación CSV

Por eso, cuando algo se cambie en `inventory`, también se debe revisar `features/chips`.

---

## Documentos relacionados

- `features/chips/README.md`
- `features/chips/fields.md`
- `features/fichas-medicas/README.md`
- `features/fichas-medicas/fields.md`
- `docs/architecture/chips.md`
- `docs/architecture/fichas-medicas.md`
- `docs/architecture/admin.md`

---

## Próximos archivos recomendados

1. `features/admin/roles.md`
   - Matriz oficial de permisos.

2. `features/admin/api-map.md`
   - Mapa de todas las rutas `app/api/admin/**`.

3. `features/admin/inventario/README.md`
   - Ordenar stock/fábrica/puntos de venta.

4. `features/admin/pedidos/README.md`
   - Ordenar pagos, pedidos, aprobaciones y asignaciones.

5. `features/admin/chips/README.md`
   - Explicar cómo admin interactúa con `features/chips`.

---

## Regla de migración futura

No mover código de golpe.

Orden recomendado:

1. Documentar secciones y permisos.
2. Crear matriz de roles.
3. Extraer configuración de tabs desde `page.tsx`.
4. Dividir componentes grandes.
5. Homogeneizar permisos backend con `requireRole(...)`.
6. Validar typecheck/lint.
7. Repetir por sección.
