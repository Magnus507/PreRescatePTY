# Auditoría Admin — Cuentas Corporativas

**Fecha:** 2026-06-09  
**Objetivo:** Auditar la sección "Cuentas Corporativas" (tab `empresas`) del Panel Admin.  
**No se modificó código. No se hizo commit.**

---

## 1. Mapa de la sección

| Propiedad | Valor |
|-----------|-------|
| **Nombre visible** | Entidades Corporativas |
| **Tab ID** | `empresas` (definido en `AdminTab` de `useAdminManager.ts`) |
| **Archivo principal** | `app/(admin)/admin/_components/sections/OrganizationsSection.tsx` (144 líneas) |
| **Detalle** | `app/(admin)/admin/_components/details/OrgDetail.tsx` (256 líneas) |
| **Modal creación** | `app/(admin)/admin/_components/modals/OrgCreateModal.tsx` (138 líneas) |
| **Hook** | `app/(admin)/admin/_hooks/useAdminOrgs.ts` (176 líneas) |
| **Service** | `app/(admin)/admin/_services/domains/orgs.service.ts` (37 líneas) |
| **Roles admin** | `GENERAL_ADMIN_ROLES = ["admin", "superadmin"]` |
| **Endpoint list** | `GET /api/admin/organizations` |
| **Endpoint create** | `POST /api/admin/organizations` |
| **Endpoint detail** | `GET /api/admin/organizations/[orgId]` |
| **Endpoint users** | `POST /api/admin/organizations/[orgId]/users` |
| **Endpoint assign** | `POST /api/admin/organizations/[orgId]/assign-bulk` |
| **Endpoint batch** | `POST /api/admin/organizations/[orgId]/batch` |

---

## 2. Tabla/listado de empresas

### Formato: **Cards** (no tabla)

```
[Card 1] [Card 2] [Card 3]
[Card 4] [Card 5] [Card 6]
```

Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

### Datos visibles por card

| Campo | Render | Fuente |
|-------|--------|--------|
| Icono | Building2 + color | — |
| Nombre legal | `org.legalName` (truncado) | `Organization.legalName` |
| Fecha registro | `formatDate(org.createdAt)` | `Organization.createdAt` |
| Código empresa | `org.companyCode \|\| "(pendiente)"` | `Organization.companyCode` |
| Miembros | `org._count.members \|\| 0` | `_count.members` |
| Estado | `org.status \|\| "active"` | `Organization.status` |
| Email contacto | `org.contactEmail \|\| "Sin email..."` | `Organization.contactEmail` |

### Botones por card

| Botón | Icono | Acción |
|-------|-------|--------|
| **Ver Chips** | — | `setAccountFilter(org.accountId); setTab("chips")` |
| **Eliminar** | Trash2 | `handleDeleteOrg(org.id, org.legalName)` — solo visible en hover (`opacity-40 group-hover:opacity-100`) |
| **Click card** | — | `loadOrgDetail(org.id)` — abre detalle |

### Header

| Elemento | Descripción |
|----------|-------------|
| Título | "Entidades Corporativas" |
| Subtítulo | "Gestión de cuentas multicuenta y membresías" |
| Botón | "Nueva Empresa" — abre `OrgCreateModal` |

### Estados

| Estado | Implementación |
|--------|----------------|
| **Loading** | Spinner + "Orquestando datos corporativos..." |
| **Vacío** | Icono Building2 opaco + "No hay empresas registradas." |
| **Error** | Toast error (en hook) |

### Filtros
- **NO ENCONTRADOS EN CÓDIGO** — no hay buscador, tabs de filtro ni paginación en OrganizationsSection

---

## 3. Crear organización

### Campos del formulario (`OrgCreateModal.tsx`)

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `legalName` | text | ✅ | placeholder "ej. PreRescate S.A." |
| `organizationType` | select | — | Opciones: industrial, logistica, construccion, seguridad, educacion, salud, otro |
| `ownerEmail` | email | ✅ | type="email" |
| `contactPhone` | tel | — | placeholder "+507 000-0000" |
| `maxChips` | number | ✅ | default 30, label "Cant. Máxima Empleados" |
| `ownerPassword` | password | ✅ | minLength 8 (validación en backend) |
| `displayName` | auto | — | Si no se envía, usa `legalName` |
| `contactEmail` | auto | — | Si no se envía, usa `ownerEmail` |

### Payload enviado (`orgsService.createOrganization`)

```json
{
  "legalName": "...",
  "displayName": "...",
  "contactEmail": "...",
  "maxChips": 30,
  "ownerEmail": "...",
  "ownerPassword": "...",
  "organizationType": "industrial",
  "contactPhone": "..."
}
```

### Endpoint: `POST /api/admin/organizations`

| Propiedad | Valor |
|-----------|-------|
| **Roles** | `GENERAL_ADMIN_ROLES` (admin, superadmin) |
| **Método** | POST |
| **Transacción** | ✅ `prisma.$transaction` con timeout 30s |

### Efecto en BD (dentro de transacción)

1. Busca `Package` con slug `combo-corporativo` (o `data.packageId`)
2. Crea `Account` con `accountType: "company"`, `packageId: pkg.id`, `maxChipsAllocated: chipCount`
3. Crea `User` owner con `email`, `passwordHash`, `accountId`, `role: "owner"`
4. Actualiza `Account.ownerUserId`
5. Crea `Profile` blank para owner (`firstName: displayName || legalName`, `bloodType: "Pendiente"`)
6. Crea `Organization` con `accountId`, `companyCode` generado/normalizado
7. Crea **N chips** en lote (`chipCount`, default 30) con estado `inventory`
8. Crea chipClaimToken por cada chip (válido 1 año)

### Errores posibles

| Error | HTTP | Causa |
|-------|------|-------|
| Email requerido | 400 | `ownerEmail` vacío |
| Password < 8 chars | 400 | `ownerPassword` muy corta |
| Email duplicado | 400 | Ya existe usuario con ese email |
| Paquete corporativo inválido | 400 | Package slug `combo-corporativo` no encontrado, inactivo o no es de tipo company |
| Código empresa duplicado | 409 | `companyCode` ya existe |
| Error transacción | 500 | Timeout 30s, colisión de códigos únicos |

---

## 4. Detalle de organización

### Archivo: `OrgDetail.tsx` (256 líneas)

### Secciones

| Sección | Contenido | Datos |
|---------|-----------|-------|
| **Header** | Nombre legal, tipo organización, fecha registro, email, teléfono, dirección | `org.legalName`, `org.organizationType`, `org.contactEmail`, `org.contactPhone`, `org.address` |
| **Botones header** | "Editar Información" (sin función real), "Dar de Baja Entidad" (`onDeleteOrg`) | Solo UI |
| **Cuotas de Hardware** | Chips asignados / Capacidad total, barra de progreso | `chips.length / maxChips` |
| **Vinculación por Código** | Input shortCode + botón OK | `onAssignChip` |
| **Asignación Masiva** | Input número + botón Transferir | `onBulkAssign` |
| **Equipo de Trabajo** | Tabla: Información Personal, Nivel Acceso, Acciones | `org.account.users` |
| **Parque Tecnológico** | Grid chips: serial, shortCode, status, propietario | `org.account.chips` |

### Tabla de miembros

| Columna | Contenido |
|---------|-----------|
| Información Personal | Avatar + email + nombre perfil |
| Nivel Acceso | "Admin Corporativo" (role=owner) o "Miembro" |
| Acciones | Trash2 → `onDeleteMember(member.id, member.email)` |

### Chips listados

| Info | Fuente |
|------|--------|
| Status badge | `statusColor(chip.status)` |
| Serial | `chip.serialPublic` |
| Código corto | `chip.shortCode` |
| Propietario | `chip.assignedProfile?.firstName \|\| "Sin Propietario"` |

### Estados vacíos

| Sección | Mensaje |
|---------|---------|
| Miembros | "No hay miembros registrados todavía." |
| Chips | "Sin inventario asignado" (borde dashed) |

### Acciones disponibles en detalle

| Acción | Botón | Endpoint |
|--------|-------|----------|
| Editar Información | "Editar Información" | **NO IMPLEMENTADO** — solo visual |
| Dar de Baja | "Dar de Baja Entidad" | `DELETE /api/admin/organizations/[id]` |
| Asignar chip por code | Input + OK | `POST /api/admin/organizations/[id]/assign-chip` |
| Asignación masiva | Input + "Transferir" | `POST /api/admin/organizations/[id]/assign-bulk` |
| Crear Lote | "Crear Lote" | `POST /api/admin/organizations/[id]/batch` |
| Invitar Miembro | "Invitar Miembro" | `POST /api/admin/organizations/[id]/users` |
| Eliminar miembro | Trash2 | — (en hook: `deleteMember` no implementado) |

**`onDeleteMember` no tiene handler real en `useAdminOrgs.ts`. Solo existe en props pero no hay función que lo implemente.**

---

## 5. Acciones admin

| Acción | Botón | Método | Endpoint | Roles | Efecto en BD | AuditLog |
|--------|-------|--------|----------|-------|-------------|----------|
| **Listar organizaciones** | — | GET | `/api/admin/organizations` | admin, superadmin | Consulta | **NO** |
| **Crear empresa** | "Nueva Empresa" | POST | `/api/admin/organizations` | admin, superadmin | Crea Account + User + Profile + Organization + N chips + N tokens | **NO** |
| **Ver detalle** | Click card | GET | `/api/admin/organizations/[orgId]` | admin, superadmin | Consulta | **NO** |
| **Eliminar empresa** | Trash2 / "Dar de Baja" | DELETE | `/api/admin/organizations/[id]` | admin, superadmin | Elimina org (cascade?) | **NO** |
| **Asignar chip** | OK (input code) | POST | `/api/admin/organizations/[id]/assign-chip` | admin, superadmin | Asigna chip a cuenta | **NO** |
| **Asignación masiva** | "Transferir" | POST | `/api/admin/organizations/[id]/assign-bulk` | admin, superadmin | Transfiere N chips | **NO** |
| **Crear lote** | "Crear Lote" | POST | `/api/admin/organizations/[id]/batch` | admin, superadmin | Crea chips nuevos | **NO** |
| **Invitar miembro** | "Invitar Miembro" | POST | `/api/admin/organizations/[id]/users` | admin, superadmin | Agrega user a org | **NO** |
| **Eliminar miembro** | Trash2 | — | **NO IMPLEMENTADO** | — | — | **NO** |

---

## 6. Estados corporativos

### Organization

| Campo | Valores | Default |
|-------|---------|---------|
| `Organization.status` | `"active"`, otros? | `"active"` |
| `Organization.organizationType` | `"company"`, `"school"`, `"port"`, `"industrial"`, etc. | `"company"` |

**NO SE ENCONTRÓ `Organization.corporateStatus` en schema.prisma.**

### OrganizationMember

| Campo | Valores |
|-------|---------|
| `OrganizationMember.corporateStatus` | NO ENCONTRADO EN SCHEMA — solo `corporateProfileId` y campos ocupacionales |

### CorporateProductRequest

| Campo | Valores posibles | Default |
|-------|-----------------|---------|
| `status` | `"pending_company_approval"`, otros? | `"pending_company_approval"` |

**NO SE ENCONTRARON más valores en el schema para este campo.**

### CorporateOrder
**NO ENCONTRADO COMO MODELO EN SCHEMA PRISMA.** El archivo `corporate-orders/route.ts` existe en API pero no hay modelo `CorporateOrder`.

### Payment status
**NO ENCONTRADO** en el contexto de corporativo directamente.

---

## 7. Relación con panel cliente

| Cliente hace | API Cliente | Admin ve/controla |
|-------------|-------------|-------------------|
| Ingresa código empresarial | `POST /api/organizations/join-request` | Solicitud pendiente en empresa |
| Solicita producto corporativo | `POST /api/organizations/product-requests` | Pendiente de aprobación admin (NO IMPLEMENTADO en admin) |
| Ve miembros/equipo | `GET /api/organizations/members` | Admin ve lista en OrgDetail |
| Ve estado | `GET /api/organizations/my-status` | Admin ve estado de org |
| Realiza pedido corporativo | `POST /api/organizations/corporate-orders` | No visible en admin actual |

**Flujo típico:**
1. Admin crea empresa → se genera `companyCode`
2. Empleado ingresa `companyCode` en su dashboard → `POST /api/organizations/join-request`
3. (Sin implementar en admin) Admin aprueba/rechaza solicitud
4. (Sin implementar en admin) Admin gestiona solicitudes de productos corporativos
5. Admin puede asignar chips manualmente desde OrgDetail

---

## 8. Seguridad

| Aspecto | Estado |
|---------|--------|
| **requireRole** | ✅ `GENERAL_ADMIN_ROLES = ["admin", "superadmin"]` en GET y POST |
| **OrgId validación** | ✅ Se usa en rutas parametrizadas |
| **Ownership** | Parcial — no se verifica que el admin pertenezca a la org (es admin general) |
| **Rate limiting** | **NO ENCONTRADO** |
| **AuditLog** | **NO ENCONTRADO** — ninguna acción corporativa registra auditoría |
| **Transacción** | ✅ Creación usa `$transaction` con timeout 30s |
| **Password hash** | ✅ bcrypt con salt 10 |
| **Códigos únicos** | ✅ `getUniqueShortCode`, `getUniqueSerialPublic`, `getUniqueActivationCode` |

---

## 9. Problemas encontrados

### P0 — Críticos

| # | Archivo | Problema | Impacto | Recomendación |
|---|---------|----------|---------|---------------|
| 1 | `OrgDetail.tsx` L80 | Botón "Editar Información" no tiene handler | Admin cree que puede editar pero no funciona | Implementar o deshabilitar |
| 2 | `useAdminOrgs.ts` | `deleteMember` no implementado | Botón Trash2 en miembros no hace nada | Implementar handler |
| 3 | API routes | `corporate-orders/route.ts` existe pero no hay modelo `CorporateOrder` en schema | Inconsistencia código/DB | Revisar si se usa |

### P1 — UX

| # | Archivo | Problema | Impacto | Recomendación |
|---|---------|----------|---------|---------------|
| 4 | `OrganizationsSection.tsx` | Sin buscador ni filtros | Admin no puede buscar empresas por nombre/código | Agregar input search similar a UsersSection |
| 5 | `OrganizationsSection.tsx` | Sin paginación | Muchas cards en grid | Agregar paginación básica |
| 6 | `OrganizationsSection.tsx` L123 | Botón eliminar solo en hover | En móvil no se ve | Hacer siempre visible |
| 7 | `OrgDetail.tsx` | No muestra `CompanyCode` en header | Admin tiene que ir al listado para verlo | Agregar a header |
| 8 | `OrgDetail.tsx` | "Invitar Miembro" no tiene modal | No hay UI para ingreso de datos | Falta modal/form |

### P2 — Seguridad

| # | Archivo | Problema | Impacto | Recomendación |
|---|---------|----------|---------|---------------|
| 9 | API routes | Sin rate limiting | Posible abuso en creación de orgs | Agregar rate limit |
| 10 | API routes | Sin AuditLog | No hay trazabilidad de cambios | Agregar auditoría |

### P3 — Técnicos

| # | Archivo | Problema | Impacto | Recomendación |
|---|---------|----------|---------|---------------|
| 11 | `organizations/route.ts` L46 | `include: { chips: true }` en listado | Carga todos los chips de todas las orgs (N+1) | Usar `_count` o limit |
| 12 | `organizations/route.ts` L186-210 | Batch chip creation en loop | 30 inserts secuenciales dentro de transacción | Usar `createMany` si es posible |
| 13 | `OrgCreateModal.tsx` L95 | Label "Cant. Máxima Empleados" pero campo es `maxChips` | Confusión semántica | Renombrar a "Cant. Máxima Chips" |

---

## 10. Recomendación de mejora

### Mejorar ahora (prioridad alta)

1. **Implementar botón "Editar Información"** — mínimo que funcione o quitarlo
2. **Implementar `deleteMember` en hook** — botón Trash2 actualmente no funciona
3. **Hacer botón eliminar siempre visible** — igual que se hizo en UsersSection
4. **Agregar buscador** — input search para filtrar por nombre/código

### Mejorar después (prioridad media)

5. **Agregar modal para "Invitar Miembro"** — actualmente no hay UI
6. **Reducir N+1 en listado** — evitar `chips: true` en GET all organizations
7. **Agregar paginación** — útil cuando hay muchas empresas

### Backlog (no urgente)

8. **Editar organización** — formulario completo
9. **Aprobación de solicitudes** — flujo join-request
10. **Solicitudes de productos corporativos** — gestión admin
11. **AuditLog** — trazabilidad de acciones admin
12. **Rate limiting** — seguridad

### ¿La sección está lista funcionalmente?

**Parcialmente.** Las funciones core funcionan:
- ✅ Crear empresa (con chips batch)
- ✅ Ver listado de empresas
- ✅ Ver detalle con miembros y chips
- ✅ Asignar chips individual y masivo
- ✅ Eliminar empresa

**No funciona:**
- ❌ Editar empresa (botón sin handler)
- ❌ Eliminar miembro (botón sin handler)
- ❌ Invitar miembro (no hay modal)
- ❌ Buscar/filtrar empresas

---
*Originalmente en: docs/audit/*