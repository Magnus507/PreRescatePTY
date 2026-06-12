# Auditoría — Endpoints legacy sin UI

**Fecha:** 2026-10-06
**Objetivo:** Identificar endpoints que quedaron sin uso real desde la UI tras la limpieza de las Fases 1A, 1B y 2.
**Regla:** NO modificar código. No eliminar endpoints todavía.

---

## 1. Resumen ejecutivo

Tras eliminar el código muerto en `PedidosSection.tsx` (`bc87ff8`) y ocultar la UI legacy en `OrgDetail.tsx` (`f538276`), quedan **5 endpoints** que ya no tienen UI visible que los invoque directamente. Sin embargo, algunos todavía tienen dependencias downstream o son llamados desde hooks/services que siguen activos.

**Estado por endpoint:**

| Endpoint | UI visible | Llamado desde hook/service | Dependencia downstream | Puede eliminarse |
|---|---|---|---|---|
| assign-bulk (organizaciones) | ❌ (oculto) | ✅ (useAdminOrgs) | ❌ | No aún |
| batch (organizaciones) | ❌ (oculto) | ✅ (useAdminChips) | ❌ | No aún |
| corporate-delivery | ❌ (eliminado) | ✅ (useEffect oculto) | ❌ | Sí* |
| corporate-items/[id]/fulfillment | ❌ (eliminado) | ❌ | ❌ | Sí* |
| corporate-assign | ❌ (eliminado) | ❌ | ✅ (activate/route.ts) | NO |

\* Siempre que también se limpien los hooks/useEffects correspondientes.

---

## 2. Endpoints analizados

### 2.1 `POST /api/admin/organizations/[orgId]/assign-bulk`
**Ruta:** `app/api/admin/organizations/[orgId]/assign-bulk/route.ts`
**Propósito:** Crear chips en lote y asignarlos a una organización.
**Crea:** Chips físicos vinculados a una organización.
**Estado:** **Sin UI visible** (botón en OrgDetail ocultado desde f538276).

### 2.2 `POST /api/admin/organizations/[orgId]/batch`
**Ruta:** `app/api/admin/organizations/[orgId]/batch/route.ts`
**Propósito:** Crear usuarios/empleados en lote para una organización.
**Crea:** OrganizationMember.users.
**Estado:** **Sin UI visible** (botón Crear Lote en OrgDetail ocultado desde f538276).

### 2.3 `POST /api/admin/orders/[id]/corporate-delivery`
**Ruta:** `app/api/admin/orders/[id]/corporate-delivery/route.ts`
**Propósito:** Actualizar estado de entrega corporativa.
**Estado:** **Código eliminado** de PedidosSection.tsx (Fase 2, bc87ff8).

### 2.4 `PATCH /api/admin/orders/[id]/corporate-items/[itemId]/fulfillment`
**Ruta:** `app/api/admin/orders/[id]/corporate-items/[itemId]/fulfillment/route.ts`
**Propósito:** Cambiar fulfillmentStatus de un ítem corporativo.
**Estado:** **Código eliminado** de PedidosSection.tsx (Fase 2, bc87ff8).

### 2.5 `POST /api/admin/orders/[id]/corporate-assign`
**Ruta:** `app/api/admin/orders/[id]/corporate-assign/route.ts`
**Propósito:** Asignar chip a un CorporateOrderEmployeeItem.
**Dependencia crítica:** `app/api/chips/activate/route.ts` línea 145 busca chips corporativos por CorporateOrderEmployeeItem.chipId.
**Estado:** **Código eliminado** de PedidosSection.tsx, pero **NO puede eliminarse** sin refactorizar activate.

---

## 3. Endpoints sin UI visible

### Confirmados sin UI:

| Endpoint | UI anterior | UI ahora | Lo ocultó |
|---|---|---|---|
| assign-bulk | Botón en OrgDetail | Oculto (`{false &&}`) | f538276 |
| batch | Botón Crear Lote en OrgDetail | Oculto (`{false &&}`) | f538276 |
| corporate-delivery | Sección en PedidosSection detail | Eliminado | bc87ff8 |
| corporate-items/fulfillment | Botones por item en PedidosSection | Eliminado | bc87ff8 |
| corporate-assign | Selector + botón en PedidosSection | Eliminado | bc87ff8 |

---

## 4. Hooks y services legacy

### `app/(admin)/admin/_hooks/useAdminOrgs.ts`

| Función | Llamada desde UI | Endpoint | Legacy |
|---|---|---|---|
| `assignBulkChips` | `admin/page.tsx:236` (onBulkAssign) | `assign-bulk` | ✅ Sí (botón oculto) |
| `assignChipByShortCode` | `admin/page.tsx:231` (onAssignChip) | organizaciones PATCH | ✅ Sí (botón oculto) |
| `onDeleteMember` | `admin/page.tsx:229` | delete-user via handleAdminAction | ❌ No (miembros visibles) |

### `app/(admin)/admin/_hooks/useAdminChips.ts`

| Función | Llamada desde UI | Endpoint | Legacy |
|---|---|---|---|
| `createBatch` | `admin/page.tsx:387-388` | `batch` | ✅ Sí (botón oculto) |

### `app/(admin)/admin/_services/domains/orgs.service.ts`

| Método | Endpoint | Legacy |
|---|---|---|
| `assignBulkChips()` | `assign-bulk` | ✅ Sí |
| `assignChipByShortCode()` | organizaciones PATCH | ✅ Sí |

### `app/(admin)/admin/_services/domains/chips.service.ts`

| Método | Endpoint | Legacy |
|---|---|---|
| `createBatch()` | `batch` | ✅ Sí |

### Conclusión:

Los hooks y services contienen funciones legacy que **ya no se activan desde UI visible**. Pueden eliminarse en Fase 3.

---

## 5. Props legacy en OrgDetail

| Prop | Usada en render | Legacy | Se puede eliminar |
|---|---|---|---|
| `onCreateBatch` | Sí (línea 153, oculto tras `{false &&}`) | ✅ | Sí |
| `onDeleteMember` | Sí (línea 192, visible) | ❌ | No (miembros visibles) |
| `onAssignChip` | Sí (línea 126, oculto tras `{false &&}`) | ✅ | Sí |
| `onBulkAssign` | Sí (línea 140, oculto tras `{false &&}`) | ✅ | Sí |
| `assignShortCode` | Sí (input oculto) | ✅ | Sí |
| `setAssignShortCode` | Solo en input oculto | ✅ | Sí |
| `bulkAssignCount` | Solo en input oculto | ✅ | Sí |
| `setBulkAssignCount` | Solo en input oculto | ✅ | Sí |

Se puede simplificar OrgDetail eliminando estas props legacy en Fase 3.

---

## 6. Dependencias críticas

### **NO ELIMINAR: `corporate-assign`**

`activate/route.ts` (líneas 143-145, 270, 303) depende de `CorporateOrderEmployeeItem.chipId`:

```
143: // Detect if this is a corporate chip by checking CorporateOrderEmployeeItem
145:   where: { chipId: claimToken.chipId },
270:   id: claimToken.chipId,
303:   where: { chipId: claimToken.chipId },
```

Si se elimina el endpoint `corporate-assign`, no se podrá crear `CorporateOrderEmployeeItem.chipId` y activate fallará al detectar chips corporativos.

**Mitigación:** Refactorizar activate/route.ts para no depender de CorporateOrderEmployeeItem. Por ejemplo:
- Usar OrganizationMember.corporateStatus + chip.shortCode para detectar chips corporativos
- Eliminar CorporateOrderEmployeeItem del schema

### **PUEDEN ELIMINARSE CON PRECAUCIÓN:**

- `corporate-items/fulfillment`: Sin dependencias downstream. Solo actualiza `fulfillmentStatus`.
- `corporate-delivery`: Sin dependencias downstream. Solo actualiza metadatos de orden.
- `assign-bulk`: Crea chips. Si no se usa UI, se pueden gestionar desde inventario.
- `batch`: Crea miembros. Si no se usa UI, se pueden crear manualmente.

---

## 7. Qué puede eliminarse ya

### En Fase 3 (próximo commit):

**Archivos de ruta que pueden eliminarse:**

1. `app/api/admin/organizations/[orgId]/assign-bulk/route.ts` — sin UI, sin dependencias downstream
2. `app/api/admin/organizations/[orgId]/batch/route.ts` — sin UI, sin dependencias downstream
3. `app/api/admin/orders/[id]/corporate-delivery/route.ts` — código muerto
4. `app/api/admin/orders/[id]/corporate-items/[itemId]/fulfillment/route.ts` — código muerto

**NO eliminar:**
5. `app/api/admin/orders/[id]/corporate-assign/route.ts` — activate/route.ts depende

### Archivos UI que pueden limpiarse:

- `app/(admin)/admin/_services/domains/orgs.service.ts`: eliminar `assignBulkChips()`, `assignChipByShortCode()`
- `app/(admin)/admin/_hooks/useAdminOrgs.ts`: eliminar `assignBulkChips`, `assignChipByShortCode`
- `app/(admin)/admin/_hooks/useAdminChips.ts`: eliminar `createBatch`
- `app/(admin)/admin/_components/sections/CreateBatchSection.tsx`: archivo completo si ya no se importa
- `app/(admin)/admin/_components/details/OrgDetail.tsx`: eliminar props legacy y bloques `{false &&}`

---

## 8. Qué debe conservarse

| Elemento | Razón |
|---|---|
| `corporate-assign` endpoint | activate/route.ts necesita CorporateOrderEmployeeItem.chipId |
| `OrderFulfillmentService` (dominio) | Usado por approve, corporate-assign, assign-direct, orders PATCH |
| `onDeleteMember` prop en OrgDetail | Miembros visibles en UI |
| `handleAdminAction("delete-user")` en admin/page.tsx | Necesario para eliminar miembros |
| `CorporateEmployeeItem.chipId` en Prisma schema | activate lo consulta |

---

## 9. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Eliminar `corporate-assign` endpoint rompe activate | Media | Alto | Refactorizar activate antes de eliminar |
| Eliminar `assign-bulk` sin migrar chips existentes | Baja | Bajo | Chips gestionables desde inventario |
| Eliminar `CreateBatchSection.tsx` sin verificar imports | Media | Baja | Verificar imports antes de eliminar |
| Eliminar functions de `orgs.service.ts` sin verificar tests | Baja | Medio | Eliminar funciones una por una |

---

## 10. Plan de limpieza por commits

### Commit 1: Limpiar OrgDetail props legacy
- Archivos: `app/(admin)/admin/_components/details/OrgDetail.tsx`
- Eliminar: props `onCreateBatch`, `onAssignChip`, `onBulkAssign`, `assignShortCode`, `setAssignShortCode`, `bulkAssignCount`, `setBulkAssignCount`
- Eliminar: JSX oculto que las usaba
- Eliminar: import de `CreateBatchSection` si ya no se usa

### Commit 2: Limpiar admin/page.tsx handles legacy
- Archivos: `app/(admin)/admin/page.tsx`
- Eliminar: states `assignShortCode`, `setAssignShortCode`, `bulkAssignCount`, `setBulkAssignCount`, `showBatchModal`
- Eliminar: referencias a `admin.orgs.assignBulkChips`, `admin.orgs.assignChipByShortCode`, `admin.chips.createBatch`
- Eliminar: import de `CreateBatchModal` / `CreateBatchSection`

### Commit 3: Eliminar hooks y services legacy
- Archivos:
  - `app/(admin)/admin/_hooks/useAdminOrgs.ts`: eliminar `assignBulkChips`, `assignChipByShortCode`
  - `app/(admin)/admin/_hooks/useAdminChips.ts`: eliminar `createBatch`
  - `app/(admin)/admin/_services/domains/orgs.service.ts`: eliminar `assignBulkChips()`, `assignChipByShortCode()`
  - `app/(admin)/admin/_services/domains/chips.service.ts`: eliminar `createBatch()`

### Commit 4: Eliminar endpoints legacy
- Archivos (4 rutas):
  - `app/api/admin/organizations/[orgId]/assign-bulk/route.ts`
  - `app/api/admin/organizations/[orgId]/batch/route.ts`
  - `app/api/admin/orders/[id]/corporate-delivery/route.ts`
  - `app/api/admin/orders/[id]/corporate-items/[itemId]/fulfillment/route.ts`

### Commit 5 (futuro): Refactorizar activate + eliminar corporate-assign
- Archivos:
  - `app/api/chips/activate/route.ts`
  - `app/api/admin/orders/[id]/corporate-assign/route.ts`
  - Prisma schema (CorporateOrderEmployeeItem.chipId)

---

## Apéndice A: Referencia cruzada completa

| Elemento | UI visible | Hook | Service | Endpoint | Downstream |
|---|---|---|---|---|---|
| `onCreateBatch`/`createBatch` | ❌ (OrgDetail) | ✅ useAdminChips | ✅ chipsService | ✅ batch | ❌ |
| `onAssignChip`/`assignChipByShortCode` | ❌ (OrgDetail) | ✅ useAdminOrgs | ✅ orgsService | ❌ (PATCH org) | ❌ |
| `onBulkAssign`/`assignBulkChips` | ❌ (OrgDetail) | ✅ useAdminOrgs | ✅ orgsService | ✅ assign-bulk | ❌ |
| `handleCorporateAssign` | ❌ (eliminado) | ❌ | ❌ | ✅ corporate-assign | ✅ activate |
| `handleSaveCorporateDelivery` | ❌ (eliminado) | ❌ | ❌ | ✅ corporate-delivery | ❌ |
| `corporate-items/fulfillment` | ❌ (eliminado) | ❌ | ❌ | ✅ fulfillment | ❌ |
| `onDeleteMember` | ✅ (OrgDetail) | ✅ (admin.orgs) | ❌ | ❌ (dep admin) | ❌ |

## Apéndice B: Archivos mencionados en esta auditoría

```
app/api/admin/organizations/[orgId]/assign-bulk/route.ts   # Endpoint legacy 1
app/api/admin/organizations/[orgId]/batch/route.ts          # Endpoint legacy 2
app/api/admin/orders/[id]/corporate-delivery/route.ts       # Endpoint legacy 3
app/api/admin/orders/[id]/corporate-items/[itemId]/fulfillment/route.ts  # Endpoint legacy 4
app/api/admin/orders/[id]/corporate-assign/route.ts         # Endpoint legacy 5 — NO ELIMINAR
app/api/chips/activate/route.ts                             # Dependencia crítica de corporate-assign
app/(admin)/admin/_hooks/useAdminOrgs.ts                    # Hook legacy
app/(admin)/admin/_hooks/useAdminChips.ts                   # Hook legacy
app/(admin)/admin/_services/domains/orgs.service.ts         # Service legacy
app/(admin)/admin/_services/domains/chips.service.ts        # Service legacy
app/(admin)/admin/_components/details/OrgDetail.tsx         # Props legacy
app/(admin)/admin/page.tsx                                  # Handlers legacy
domains/orders/services/order-fulfillment.service.ts        # Dominio — mantener

---
*Originalmente en: docs/audit/*