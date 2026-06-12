# Auditoría — Editar Información Organización

**Fecha:** 2026-06-09  
**Objetivo:** Determinar si implementar, quitar o reemplazar el botón "Editar Información" en el detalle de Cuentas Corporativas.  
**No se modificó código. No se hizo commit.**

---

## 1. Estado actual del botón

| Propiedad | Valor |
|-----------|-------|
| **Archivo** | `app/(admin)/admin/_components/details/OrgDetail.tsx` L80 |
| **Texto** | "Editar Información" |
| **Estilo** | `px-6 py-3 bg-white text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest` |
| **Handler** | **NINGUNO** — no tiene `onClick` |
| **Funcionalidad** | **Solo visual** — al hacer click no hace nada |

El botón está en el header del detalle de organización, junto a "Dar de Baja Entidad" (que sí tiene handler).

---

## 2. Endpoint PATCH existente

### `PATCH /api/admin/organizations/[orgId]`

**Archivo:** `app/api/admin/organizations/[orgId]/route.ts` L68-133

| Propiedad | Valor |
|-----------|-------|
| **Roles** | `GENERAL_ADMIN_ROLES` (admin, superadmin) |
| **Método** | PATCH |
| **Validación de orgId** | ✅ Usa params.orgId |
| **AuditLog** | **NO** |
| **Rate limit** | **NO** |

### Campos aceptados por el endpoint

| Campo | Tipo | Validación |
|-------|------|------------|
| `legalName` | string | Sin validación especial |
| `displayName` | string | Sin validación especial |
| `contactEmail` | string | Sin validación de formato |
| `contactPhone` | string | Sin validación |
| `taxId` | string | Sin validación |
| `address` | string | Sin validación |
| `status` | string | Solo `"active"`, `"suspended"`, `"archived"` |
| `companyCode` | string | Normalizado (UPPER, alphanumeric, max 16), verificación de unicidad |
| `packageId` | string | Validación de Package activo y accountType "company" |
| `maxChips` | string/number | Se parsea a int, se actualiza `maxChipsAllocated` en Account |

### Efecto en BD

1. Actualiza `Organization` con los campos proporcionados
2. Si se envía `packageId` o `maxChips`, también actualiza `Account`:
   - `packageId` → nuevo paquete
   - `accountType` → del paquete
   - `maxChipsAllocated` → nuevo límite

---

## 3. Campos editables disponibles

### Seguros para editar desde admin

| Campo | Endpoint lo soporta | OrgDetail lo muestra | Seguro editar |
|-------|--------------------|--------------------|---------------|
| `legalName` | ✅ | ✅ L66 | ✅ SÍ |
| `displayName` | ✅ | No visible directamente | ✅ SÍ |
| `contactEmail` | ✅ | ✅ L72 | ✅ SÍ |
| `contactPhone` | ✅ | ✅ L73 | ✅ SÍ |
| `address` | ✅ | ✅ L74 | ✅ SÍ |
| `taxId` | ✅ | ✅ L49 ("Persona Natural") | ✅ SÍ |
| `status` | ✅ | ✅ L100 | ⚠️ Con cuidado |
| `organizationType` | **NO** | ✅ L68 | ❌ No soportado por PATCH |
| `companyCode` | ✅ | No visible en header | ⚠️ Con cuidado |
| `maxChips` (capacidad) | ✅ (en Account) | ✅ L103-104 | ⚠️ Con cuidado |
| `packageId` | ✅ | No visible | ⚠️ Solo admin |

---

## 4. Campos que no conviene tocar

| Campo | Razón |
|-------|-------|
| `accountId` | Relación FK — no debe cambiarse manualmente |
| `id` | Identificador único — nunca editar |
| `createdAt` / `updatedAt` | Automáticos — no editar |
| `emergencyButton*` | Configuración especial de emergencia — mejor en panel empresa |
| `organizationType` | No soportado por endpoint PATCH actual |

---

## 5. Propuesta mínima de implementación

### Opción recomendada: **Modal simple**

**Por qué modal y no inline/drawer:**
- Ya existe `OrgCreateModal.tsx` como patrón
- Los campos son pocos (5-6)
- Modal es consistente con el resto del admin
- No complica el layout de OrgDetail

### Campos a incluir en el modal

| Campo | Tipo | Requerido | Default |
|-------|------|-----------|---------|
| `legalName` | text | ✅ | org.legalName |
| `contactEmail` | email | — | org.contactEmail |
| `contactPhone` | tel | — | org.contactPhone |
| `address` | text | — | org.address |
| `taxId` | text | — | org.taxId |
| `status` | select | — | org.status |

### Campos NO incluir en el modal

| Campo | Razón |
|-------|-------|
| `companyCode` | Requiere validación especial, mejor en sección separada |
| `maxChips` | Es capacidad de Account, no de Organization |
| `packageId` | Requiere selector de paquetes, mejor en sección separada |
| `displayName` | Se deriva de legalName |

### Flujo

1. Admin hace click en "Editar Información"
2. Se abre modal con campos prellenados
3. Admin edita y guarda
4. Se llama `PATCH /api/admin/organizations/[orgId]`
5. Se recarga el detalle de la organización
6. Toast de éxito/error

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `OrgDetail.tsx` | Agregar `onClick` al botón, pasar handler |
| `useAdminOrgs.ts` | Agregar función `updateOrg` |
| `orgs.service.ts` | Agregar método `updateOrganization` |
| Nuevo: `OrgEditModal.tsx` | Modal de edición (similar a OrgCreateModal) |

---

## 6. Riesgos

| Riesgo | Nivel | Mitigación |
|--------|-------|------------|
| Endpoint PATCH no tiene rate limiting | Bajo | Ya existe el endpoint, solo se conecta UI |
| Sin AuditLog | Bajo | Mejora futura, no bloqueante |
| Cambiar `status` sin confirmación | Medio | Agregar confirmación antes de cambiar a "suspended"/"archived" |
| Cambiar `companyCode` puede romper flujos de empleados | Medio | No incluir en modal, o mostrar advertencia |
| `organizationType` no soportado por PATCH | Bajo | No incluir en modal |

---

## 7. Recomendación final

**Implementar edición mínima (Opción A).**

### Por qué implementar y no deshabilitar:

1. El endpoint PATCH **ya existe y funciona** — solo falta conectar la UI
2. Los campos son pocos y seguros (legalName, contactEmail, contactPhone, address, taxId)
3. Es una mejora de UX de alto valor para el admin
4. El riesgo es bajo — no se toca Prisma, no se crea migración, no se modifica backend

### Implementación estimada:

- **OrgEditModal.tsx** — ~100 líneas (similar a OrgCreateModal)
- **useAdminOrgs.ts** — +15 líneas (función updateOrg)
- **orgs.service.ts** — +5 líneas (método PATCH)
- **OrgDetail.tsx** — +5 líneas (onClick handler)

**Total: ~125 líneas nuevas, riesgo bajo.**

### No incluir en esta fase:

- `companyCode` (requiere flujo separado)
- `maxChips` (requiere lógica de capacidad)
- `packageId` (requiere selector de paquetes)
- `organizationType` (no soportado por PATCH)

**No se modificó código. No se hizo commit.**

---
*Originalmente en: docs/audit/*