# Auditoría — Código muerto PedidosSection post Fase 1B

**Fecha:** 2026-10-06
**Objetivo:** Identificar código que puede eliminarse en Fase 2 tras ocultar UI legacy de asignación manual de chips.
**Regla:** NO modificar código. Solo auditar.

---

## 1. Resumen

La Fase 1B (`82357b5`) ocultó la UI legacy de picking manual, asignación corporativa y fulfillment individual. Sin embargo, el código subyacente (estados, handlers, imports, ~160 líneas en bloques `false &&`) permanece en el archivo.

**Hallazgos clave:**
- **5 estados locales muertos** (pueden eliminarse)
- **2 handlers muertos** (pueden eliminarse)
- **1 import muerto** (PackageSearch)
- **~160 líneas en bloques `false &&`** (pueden eliminarse)
- **handleStatusChange debe simplificarse** (aún envía assignedChipIds al backend sin que la UI lo seleccione)
- **handleReviewAction también envía assignedChipIds** (aunque siempre será `[]`)

---

## 2. Estados locales muertos

Los siguientes estados pueden eliminarse porque solo eran utilizados por UI que ahora está oculta:

| Estado | Tipo | Línea | ¿Sigue vivo? | ¿Dónde se usa todavía? |
|---|---|---|---|---|
| `assignedChipIds` | `string[]` | 118 | Parcialmente | Solo en handleStatusChange y handleReviewAction. Ya no se renderiza en UI. |
| `searchInventory` | `string` | 119 | **MUERTO** | Solo se usaba en el input de picking físico, que fue eliminado. |
| `selectedChipForItem` | `Record<string, string>` | 123 | **MUERTO** | Solo usado dentro del bloque `{false &&}` de corporate assign. |
| `selectedChipForMember` | `Record<string, string>` | 124 | **MUERTO** | Solo usado dentro del bloque `{false &&}` de corporate assign. |
| `corporateDeliveryStatus` | `string` | 125 | Parcialmente | Se setea en useEffect (línea 201) pero UI está en `{false &&}` |
| `deliveryEstimatedDate` | `string` | 126 | Parcialmente | Se setea en useEffect (línea 202) pero UI está en `{false &&}` |
| `deliveryNote` | `string` | 127 | Parcialmente | Se setea en useEffect (línea 203) pero UI está en `{false &&}` |

**Conclusión:** 4 estados pueden eliminarse completamente, 3 pueden simplificarse.

---

## 3. Handlers muertos

| Handler | ¿Sigue siendo llamado? | ¿Se puede eliminar? |
|---|---|---|
| `handleCorporateAssign` | Solo desde bloques `{false &&}` | SÍ |
| `handleSaveCorporateDelivery` | Solo desde bloque `{false &&}` | SÍ |
| `loadAvailableChips` | Se ejecuta en useEffect (línea 162-165) cuando hay orden corporativa | Parcialmente — la data aún es referenciada en bloques ocultos |
| `loadAvailableChipsRef` | Solo para cleanup | Puede eliminarse junto con loadAvailableChips |

---

## 4. Imports muertos

| Import | Línea | ¿Sigue siendo usado? |
|---|---|---|
| `PackageSearch` | 5 | **MUERTO** — Solo se usaba en el input de búsqueda del picking físico. Ya no se referencia en JSX. |

**Nota:** `QRCodeCanvas` sigue siendo usado en la sección de personalización de accesorios y en corporate QR tracking. NO eliminarlo.

---

## 5. Props/componentes muertos

No aplica (PedidosSection es un componente funcional sin props externas más que las que recibe de `admin/page.tsx` — y esas no se modificaron).

Sin embargo, existen **~160 líneas en 2 bloques `{false &&}`** que contienen:

1. **Corporate Chip Assignment Section** (~90 líneas, líneas ~1280-1370):
   - Selector de chips para asignación
   - Botones "Fabricación", "Listo", "Entregar"
   - Selector "Asignar chip"

2. **Corporate Delivery Tracking** (~70 líneas, líneas ~1380-1440):
   - Selector de estado de entrega
   - Input de fecha estimada
   - Textarea de nota de entrega
   - Botón "Guardar entrega"

Todo este código es muerto mientras `{false &&}` esté presente.

---

## 6. handleStatusChange — Análisis detallado

### Estado actual (post Fase 1B):

```typescript
const handleStatusChange = async (id: string, newStatus: string, actionText: string) => {
    const isCompleted = newStatus === "completed";
    const needed = selectedOrder ? calculateNeededChips(selectedOrder) : 0;

    // ✗ Esta validación ya no tiene sentido — assignedChipIds siempre será []
    if (isCompleted && assignedChipIds.length !== needed && needed > 0) {
       if (!confirm(`Has seleccionado ${assignedChipIds.length} chips...`)) return;
    } else {
       if (!confirm(...)) return;
    }
    
    ...
    // ✗ Todavía envía assignedChipIds al backend aunque siempre será []
    body: JSON.stringify({ 
       id, 
       orderStatus: newStatus,
       paymentStatus: isCompleted ? "paid" : undefined,
       generateTokens: isCompleted,
       assignedChipIds: isCompleted ? assignedChipIds : undefined  // ← MUERTO
    }),
```

### Lo que puede eliminarse:
1. Validación `assignedChipIds.length !== needed` — siempre será true (0 !== needed), forcing confirm dialog
2. Envío de `assignedChipIds` al backend — siempre será `[]`
3. Envío de `generateTokens` — los tokens se generan en la activación, no aquí
4. `setAssignedChipIds([])` — ya no tiene efecto porque assignedChipIds siempre es []

### Lo que debe mantenerse:
1. Cambio de `orderStatus` a "completed", "shipped", "cancelled"
2. Cambio de `paymentStatus` a "paid" cuando completed
3. El confirm dialog genérico

---

## 7. handleReviewAction — Análisis detallado

```typescript
const shouldSendAssignedChips =
    action === "approve" &&
    selectedOrder &&
    assignedChipIds.length > 0;  // ← Siempre false
```

Este bloque siempre envía `assignedChipIds: undefined` porque `assignedChipIds` siempre es `[]`. Es código muerto.

### Lo que puede eliminarse:
1. La variable `shouldSendAssignedChips` y su lógica
2. El campo `assignedChipIds` en el body

---

## 8. Endpoints ya no llamados desde UI

| Endpoint | ¿Sigue siendo llamado? | ¿Se puede eliminar? |
|---|---|---|
| `POST /api/admin/chips/inventory` | SÍ — `loadInventory()` aún se ejecuta | Simplificar: solo llamarlo desde el mount, no desde handlers |
| `POST /api/admin/chips/available` | SÍ — `loadAvailableChips()` se ejecuta al seleccionar orden corporativa | Puede eliminarse si corporate-assign también se elimina |
| `POST /api/admin/orders/{id}/corporate-assign` | Solo desde `{false &&}` | Puede eliminarse de UI pero endpoint NO (activate/route.ts depende) |
| `PATCH /api/admin/orders/{id}/corporate-items/{itemId}/fulfillment` | Solo desde `{false &&}` | Puede eliminarse de UI. Endpoint puede permanecer para accesorios físicos. |
| `PATCH /api/admin/orders/{id}/corporate-delivery` | Solo desde `{false &&}` | Puede eliminarse de UI. |

---

## 9. Limpieza segura inmediata

### Puede eliminarse AHORA (sin tocar backend):

| Elemento | Tipo | Líneas |
|---|---|---|
| `searchInventory` | Estado | ~119 |
| `selectedChipForItem` | Estado | ~123 |
| `selectedChipForMember` | Estado | ~124 |
| `handleCorporateAssign` | Handler | ~274-300 |
| `handleSaveCorporateDelivery` | Handler | ~302-327 |
| `loadAvailableChips` | Función (si corporate UI se elimina) | ~152-159 |
| `loadAvailableChipsRef` | Ref | ~130 |
| `PackageSearch` | Import | ~5 |
| Bloque Corporate Chip Assignment | JSX | ~160 líneas en `{false &&}` |
| Bloque Corporate Delivery Tracking | JSX | ~70 líneas en `{false &&}` |

### Puede simplificarse AHORA:

| Elemento | Acción |
|---|---|
| `assignedChipIds` | Eliminar estado + toda lógica de set/read |
| `handleStatusChange` | Eliminar validación de assignedChipIds, generateTokens, envío de assignedChipIds |
| `handleReviewAction` | Eliminar shouldSendAssignedChips |

### NO debe eliminarse todavía:

| Elemento | Razón |
|---|---|
| `corporate-assign` endpoint | activate/route.ts depende de CorporateOrderEmployeeItem.chipId |
| `fulfillment route` | Necesario para accesorios físicos corporativos |
| `loadInventory` | Aún llamada desde mount + window focus. Podría moverse a otro lugar. |
| `calculateNeededChips` | Aún usado en handleStatusChange (hasta que se simplifique) |

---

## 10. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Eliminar `loadAvailableChips` rompe future corporate flow | Baja | Medio | Mantener hasta Fase 3 donde se refactoriza flujo corporativo completo |
| Eliminar `loadInventory` de window focus afecta refresh automático | Media | Bajo | Mover a useEffect específico, no eliminarlo |
| Simplificar `handleStatusChange` sin verificar backend | Baja | Medio | El backend PATCH recibe assignedChipIds opcional. Si no se envía, el backend usa su propia lógica. Verificar backend. |
| Eliminar `corporateDeliveryStatus` set en useEffect | Baja | Bajo | Si UI está oculta, no importa su valor |

---

## 11. Prompt recomendado para Fase 2

Completar Fase 2: Eliminar código muerto en PedidosSection.

Archivo permitido:
app/(admin)/admin/_components/sections/PedidosSection.tsx

Eliminar:

1. Estados:
   - searchInventory
   - selectedChipForItem
   - selectedChipForMember
   - availableChips (opcional, verificar dependencias)
   - assignedChipIds (completo)

2. Imports:
   - PackageSearch (si no se usa en ningún otro lado)

3. Bloques {false &&}:
   - Corporate Chip Assignment (~160 líneas)
   - Corporate Delivery Tracking (~70 líneas)

4. Handlers:
   - handleCorporateAssign (completo)
   - handleSaveCorporateDelivery (completo)
   - loadAvailableChips (completo, incluyendo ref y useEffect)

5. Simplificar handleStatusChange:
   - Eliminar validación de assignedChipIds
   - Eliminar envío de assignedChipIds al body
   - Eliminar generateTokens
   - Eliminar setAssignedChipIds([])

6. Simplificar handleReviewAction:
   - Eliminar shouldSendAssignedChips
   - Eliminar assignedChipIds del body

7. Limpiar useEffects:
   - Eliminar loadAvailableChipsRef
   - Simplificar useEffects que ya no aplican

No tocar:
- Backend (endpoints)
- handleStatusChange para estados shipped/cancelled
- calculateNeededChips (aún referenciado)
- corporate-delivery endpoint
- corporate-assign endpoint
- fulfillment endpoint

---
*Originalmente en: docs/audit/*