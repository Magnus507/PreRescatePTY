# Auditoría — Dependencias Legacy Admin Post-Activación

**Fecha:** 2026-10-06
**Objetivo:** Verificar dependencias críticas antes de eliminar código legacy del panel Admin.

---

## 1. Resumen Ejecutivo

Tras la migración a activación automática, 6 funcionalidades legacy fueron marcadas como P0/P1. Esta auditoría verifica dependencias para determinar si pueden eliminarse SIN romper el flujo actual.

**Conclusión principal:**
- `assignedChipIds` y `handleStatusChange` tienen **dependencia directa** entre sí
- `handleStatusChange` también es usado para estados NO legacy (cancelled, shipped, completed sin chips)
- `corporate-assign` endpoint solo depende del UI en PedidosSection (esencialmente huérfano)
- `assign-bulk`/`assign-chip` solo existen en el flujo OrgDetail (ya sin sentido desde commit cfed26e)
- El picking físico **ya no existe como vinculación**, solo como control de inventario

---

## 2. assignedChipIds

### Dónde se declara
**Archivo:** `app/(admin)/admin/_components/sections/PedidosSection.tsx`, línea 118
```tsx
const [assignedChipIds, setAssignedChipIds] = useState<string[]>([]);
```

### Dónde se setea
- Línea 937–940: `setAssignedChipIds(prev => prev.filter(id => id !== chip.id))` (deseleccionar)
- Línea 938–939: `setAssignedChipIds(prev => [...prev, chip.id])` (seleccionar)
- Línea 261: `setAssignedChipIds([])` (limpiar post-status-change)
- Línea 360: `setAssignedChipIds([])` (limpiar post-review-action)

### Dónde se lee
- Línea 237: `assignedChipIds.length !== needed` (validación en handleStatusChange)
- Línea 239: `assignedChipIds.length` (mensaje confirmación)
- Líneas 253–254: `assignedChipIds: isCompleted ? assignedChipIds : undefined` (enviado PATCH)
- Línea 346: `assignedChipIds.length > 0` (validación en handleReviewAction)
- Línea 353: `assignedChipIds` (enviado en POST approve)
- Línea 927: `assignedChipIds.includes(chip.id)` (UI picking)
- Línea 928: `assignedChipIds.length < neededCount` (UI picking)
- Línea 964: `assignedChipIds.length` (UI contador)
- Línea 969: `assignedChipIds.length` (UI contador)
- Línea 1482: `assignedChipIds.length < calculateNeededChips(selectedOrder)` (disabled botón "Completado")
- Línea 1490: `assignedChipIds.length < calculateNeededChips(selectedOrder)` (disabled botón "Completado" alternativo)

### Si handleStatusChange depende de eso
**SÍ, directamente.** Líneas 237–238:
```tsx
if (isCompleted && assignedChipIds.length !== needed && needed > 0) {
   if (!confirm(...)) return;
}
```
Y línea 253–254 envía `assignedChipIds` al PATCH.

### Qué se rompe si se elimina
1. **Botón "Completado"** dejaría de enviar chips → perdería la generación de tokens de activación
2. **PATCH /api/admin/orders** dejaría de recibir `assignedChipIds`
3. **handleStatusChange** fallaría porque `assignedChipIds.length` sería 0 siempre

### Si se puede reemplazar por flujo de activación
**SÍ.** El flujo de activación (`activate/route.ts`) ya genera tokens mediante `chipClaimToken` y vincula chips automáticamente. La generación de tokens en `handleStatusChange` mediante `generateTokens: true` es código muerto porque los tokens ya se crean en la activación.

**Conclusión:** assignedChipIds es legacy puro. Depende de handleStatusChange y viceversa. Ambos deben eliminarse juntos.

---

## 3. handleStatusChange

### Qué estados cambia
- `completed` — línea 1484, 1494 (2 botones)
- `shipped` — línea 1476
- `cancelled` — línea 1466

### Qué endpoints llama
**Archivo:** `PedidosSection.tsx`, línea 244–255
```tsx
const res = await fetch(`/api/admin/orders`, {
  method: "PATCH",
  body: JSON.stringify({ 
     id, 
     orderStatus: newStatus,
     paymentStatus: isCompleted ? "paid" : undefined,
     generateTokens: isCompleted,
     assignedChipIds: isCompleted ? assignedChipIds : undefined
  }),
});
```

### Si solo cambia orderStatus o también chips
Ambos:
- `orderStatus` siempre se envía
- `paymentStatus` solo si `isCompleted`
- `assignedChipIds` solo si `isCompleted`
- `generateTokens` solo si `isCompleted`

### Si depende de chips seleccionados
**SÍ para "completed":** línea 1482 y 1490:
```tsx
disabled={updating || assignedChipIds.length < calculateNeededChips(selectedOrder)}
```

**NO para "shipped" y "cancelled"** — no tienen validación de assignedChipIds.

### Qué parte sigue siendo necesaria
- Cambiar estado a `shipped` y `cancelled` SÍ sigue siendo necesario
- Cambiar estado a `completed` debe **existir** pero **sin depender de assignedChipIds** → el completado debe ocurrir automáticamente cuando el usuario activa (activate/route.ts línea 290–297 ya hace esto: si `claimToken.orderId`, marca la orden como `completed`)

**Conclusión:** handleStatusChange para "completed" con assignedChipIds es legacy. La activación automática ya completa órdenes. Pero shipped y cancelled aún se usan.

---

## 4. corporate-assign

### Si se llama desde UI actualmente
**SÍ.** Desde `PedidosSection.tsx` línea 274–300 (`handleCorporateAssign`).

### Qué botón lo llama
Líneas 785–794: Botón **"Asignar chip principal"** en vista corporativa.

### Qué hace exactamente
1. Llama `POST /api/admin/orders/{id}/corporate-assign` con `corporateOrderItemId` y `chipId`
2. El endpoint (166 líneas) reserva el chip via `OrderFulfillmentService.reserveAssignedChipsForOrder`
3. Actualiza `CorporateOrderEmployeeItem.chipId` y `fulfillmentStatus = "assigned_reserved"`
4. Setea `chip.assignedProfileId` al perfil corporativo

### Si sigue siendo necesario con activación automática
**NO.** El flujo de activación en `activate/route.ts` (líneas 144–222 para flujo corporativo) ya:
1. Detecta si el chip es corporativo por `CorporateOrderEmployeeItem`
2. Verifica que el empleado esté `paid_active`
3. Asigna `assignedProfileId` al perfil corporativo
4. Marca fulfillmentStatus como "activated"

El problema es que **corporate-assign crea la vinculación inicial chip → CorporateOrderEmployeeItem**, y activate la consume. Sin corporate-assign, activate no tendría `chipId` en CorporateOrderEmployeeItem.

### Si se puede ocultar primero y borrar después
**SÍ, pero con cuidado.** corporate-assign solo asigna chips a items pendientes. Si el flujo corporativo cambia para que el chip se asigne directamente en la orden sin pasar por corporate-assign (por ejemplo, creando el chipClaimToken directamente), entonces corporate-assign puede eliminarse.

**Dependencia aguas abajo:**
- `activate/route.ts` línea 301: `corporateOrderEmployeeItem.updateMany({ where: { chipId } })` — si corporate-assign no setea chipId, activate no actualiza nada
- `PedidosSection.tsx` búsqueda de `mainChip` (línea 657) depende de `corporate-assign` para existir

**Conclusión:** corporate-assign NO puede eliminarse hasta que el flujo de activación corporativa cree la relación chip→item automáticamente. Pero PUEDE ocultarse de UI (P1) sin riesgo.

---

## 5. assign-bulk / assign-chip

### Si se llama desde OrgDetail
**SÍ.** Ambos están en `OrgDetail.tsx`:
- `assign-chip` (Vinculación por Código): línea 135–144
- `assign-bulk` (Asignación Masiva): línea 147–159

### Si depende de chips creados en la empresa
**NO.** Ambos endpoints transfieren chips desde el inventario general a la organización. No dependen de chips pre-creados.

### Si quedó huérfano después de commit cfed26e
**SÍ.** El commit `cfed26e` ("Stop auto creating corporate chips") eliminó la creación automática de chips para empresas. Estos endpoints son remanentes de ese flujo.

### Si puede ocultarse de UI
**SÍ — inmediatamente (P1).** No hay dependencia aguas abajo de estos endpoints para el nuevo flujo corporativo.

### Si puede eliminarse endpoint después
**SÍ.** Pero verificar:
- No hay scripts externos que llamen estos endpoints
- No hay lógica en `app/api/organizations/actions/route.ts` (líneas 121 y 154) que pueda verse afectada — ese archivo es LEGACY de usuario, no admin

**Conclusión:** Ambos pueden ocultarse de UI inmediatamente. Los endpoints pueden eliminarse después de verificar que no hay dependencias en domains.

---

## 6. Picking Físico vs Picking de Vinculación

### A) Picking físico necesario (control de inventario)
Saber qué chip/paquete salió del almacén. Actualmente NO existe como concepto separado en el código. La sección "Picking Físico" en PedidosSection (líneas 899–971) mezcla ambos conceptos.

### B) Picking de vinculación obsoleto
Asignar chip a usuario/perfil antes de activación. Esto es EXACTAMENTE lo que hace `assignedChipIds` + `handleStatusChange("completed")`. Es legacy.

### ¿Cuál existe hoy en código?
**Ambos, mezclados.** La UI de "Picking Físico" permite:
1. Escanear/buscar chips físicos (útil para imprenta)
2. Seleccionarlos para vincularlos a la orden (obsoleto — la activación debiera hacer esto)

**Conclusión:** 
- El concepto de **picking físico** (saber qué salió del almacén) debe mantenerse pero **moverse a InventorySection**
- El concepto de **picking de vinculación** (selectedChipIds → orden) debe **eliminarse**

---

## 7. Fulfillment Corporativo Individual

### Qué botones lo usan
En `PedidosSection.tsx`:
- "Marcar listo" (líneas 728, 738, 745) → PATCH fulfillmentStatus = "ready_for_assignment"
- "Marcar entregado" (líneas 747, 755, 762) → PATCH fulfillmentStatus = "delivered"

### Qué endpoints toca
`PATCH /api/admin/orders/{id}/corporate-items/{itemId}/fulfillment` (101 líneas)

### Si aún aporta valor
**PARCIALMENTE.** Para productos físicos (llaveros, stickers) que requieren fabricación y entrega, estos estados son útiles. Para chips digitales, no tienen sentido porque después de "assigned_reserved" sigue "activated" (que ocurre automáticamente cuando el usuario activa).

### Si debe moverse a nivel de orden
**SÍ.** El fulfillment debería gestionarse a nivel de orden, no de item individual. Si una orden tiene 5 chips para 5 empleados, no tiene sentido marcar cada item individualmente.

**Conclusión:** Puede ocultarse para chips. Mantener solo para accesorios físicos.

---

## 8. Qué puede ocultarse YA (sin eliminar código)

| Elemento | Archivo | Acción |
|---|---|---|
| Vinculación por Código | OrgDetail.tsx líneas 133–145 | Ocultar div con `false &&` |
| Asignación Masiva | OrgDetail.tsx líneas 147–159 | Ocultar div con `false &&` |
| Botón "Crear Lote" en Org | OrgDetail.tsx línea 173 | Ocultar button |
| Picking físico (sección completa) | PedidosSection.tsx líneas 899–971 | Ocultar div con `false &&` |
| Botones "Marcar listo/entregado" para chips | PedidosSection.tsx líneas 725–764 | Condicionar a `item.product.productType !== "chip"` |
| Selector de chip principal corporativo | PedidosSection.tsx líneas 772–797 | Ocultar con `false &&` |
| Botón "Invitar Miembro" (vacío) | OrgDetail.tsx línea 176 | Ocultar button |

**Riesgo de ocultar:** CERO. Todo es UI. Los endpoints quedan intactos.

---

## 9. Qué puede eliminarse YA (endpoints + código muerto)

| Elemento | Riesgo | Razón |
|---|---|---|
| `assignedChipIds` state + lógica UI | BAJO | Solo afecta UI de picking. La activación ya genera tokens. |
| `handleStatusChange` para "completed" | BAJO | activate/route.ts ya completa órdenes automáticamente (línea 290–297) |
| Botones shipped + cancelled | NO ELIMINAR | Siguen siendo necesarios para gestión manual de órdenes |
| `assign-bulk` endpoint | BAJO | Solo usado desde OrgDetail. Sin dependencias downstream. |
| `assign-chip` endpoint | BAJO | Solo usado desde OrgDetail. Sin dependencias downstream. |
| `corporate-assign` endpoint | **NO ELIMINAR** | activate/route.ts depende de chipId en CorporateOrderEmployeeItem |
| `loadInventory()` en PedidosSection | BAJO | Solo carga chips para el picking legacy |

---

## 10. Qué NO debe eliminarse todavía

| Elemento | Razón |
|---|---|
| `corporate-assign` endpoint | activate/route.ts depende de que chipId esté seteado en CorporateOrderEmployeeItem |
| `fulfillment route` (PATCH corporate-items) | Necesario para tracking de accesorios físicos corporativos |
| `corporate-delivery route` | Necesario para gestión logística corporativa |
| `handleStatusChange` para shipped/cancelled | Sigue siendo necesario para gestión manual |
| `calculateNeededChips()` helper | La lógica de calcular chips comprados en una orden es útil incluso sin picking |
| Estados `pending_assignment` | Todavía usado por dashboard/empresas (lado cliente corporativo) |
| Estados `assigned_reserved` | Todavía usado por dashboard/empresas + corporate-assign |

---

## 11. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Eliminar assignedChipIds + handleStatusChange(completed) deja órdenes sin completar | Media | Medio | activate/route.ts ya completa órdenes (línea 290–297). Verificar que todas las órdenes tengan claimToken. |
| Eliminar corporate-assign rompe activate corporativo | **ALTA** | **CRÍTICO** | **NO HACER.** activate/route.ts busca chipId en CorporateOrderEmployeeItem (línea 301–305) |
| Ocultar botón "Invitar Miembro" (vacío) | Ninguno | Ninguno | No hace nada actualmente |
| Ocultar picking legacy confunde a imprenta | Baja | Bajo | Imprenta usa InventorySection, no PedidosSection |
| Eliminar assign-bulk sin verificar backfill scripts | Baja | Medio | `scripts/backfill-corporate-chip-profiles.ts` usa `pending_assignment` pero NO assign-bulk |

---

## 12. Plan de Limpieza por Commits

### Fase 1: Ocultar UI legacy (seguro inmediato)
**Commit 1:**
```
git add app/(admin)/admin/_components/details/OrgDetail.tsx
git commit -m "Hide legacy assign-chip UI in OrgDetail"
```
- Ocultar "Vinculación por Código" (`false &&`)
- Ocultar "Asignación Masiva" (`false &&`)
- Ocultar "Crear Lote" button (`false &&`)
- Ocultar "Invitar Miembro" button (`false &&`)
- No borrar props ni endpoints

**Commit 2:**
```
git add app/(admin)/admin/_components/sections/PedidosSection.tsx
git commit -m "Hide legacy picking and corporate-assign UI in orders"
```
- Ocultar sección "Picking Físico" (`false &&`)
- Ocultar "Asignar chip principal" corporativo
- Condicionar botones "Marcar listo/entregado" a tipo producto

### Fase 2: Eliminar estado local y handlers muertos (después de verificar)
**Commit 3:**
- Eliminar `assignedChipIds` state + lógica de selección de chips
- Eliminar dependencia de `assignedChipIds` en botones "Completado"
- Mantener `handleStatusChange` pero sin assignedChipIds

**Commit 4:**
- Eliminar `loadInventory()` y `loadInventoryRef` de PedidosSection
- Eliminar `searchInventory` state
- Eliminar inventario filtrado del picking

### Fase 3: Eliminar endpoints legacy
**Commit 5:**
```
git rm app/api/admin/organizations/[orgId]/assign-bulk/route.ts
git rm app/api/admin/organizations/[orgId]/assign-chip/route.ts
git rm -rf app/api/admin/organizations/[orgId]/
```
- Solo si se confirma que nadie usa estos endpoints externamente

**Commit 6:**
- Eliminar `assignBulkChips` y `assignChipByShortCode` de `useAdminOrgs.ts`
- Eliminar métodos correspondientes de `orgs.service.ts`
- Eliminar props de `OrgDetailView`

### Fase 4: Refactor PedidosSection
**Commit 7:**
- Simplificar `handleStatusChange` (eliminar generateTokens y assignedChipIds)
- Simplificar vista corporativa (remover asignación manual)
- Mover lógica de conteo a helper

**Nota: corporate-assign endpoint NO debe eliminarse hasta que activate/route.ts cree chipId en CorporateOrderEmployeeItem automáticamente.**

---

## 13. Próximo Commit Recomendado

```
git add docs/audit/auditoria-dependencias-legacy-admin.md
git commit -m "Add legacy dependency audit for admin cleanup"
```

**NO modificar código todavía. Solo auditar.**

---
*Originalmente en: docs/audit/*