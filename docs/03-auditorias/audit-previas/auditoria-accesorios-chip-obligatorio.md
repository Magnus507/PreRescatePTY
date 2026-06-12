# Auditoría — Accesorios personalizados con chip obligatorio

> **Documento:** Auditoría profunda del flujo de accesorios personalizados
> **Fecha:** 6 de octubre 2026
> **Propósito:** Validar que ningún accesorio pueda comprarse, fabricarse o aprobarse sin estar asociado a un chip activo real
> **Regla:** NO modificar código, NO hacer commit

---

## 1. TIENDA / CARRITO

### Archivo: `app/(app)/dashboard/tienda/page.tsx`

#### Productos considerados accesorios

Se determina por el campo `requiresPersonalization: boolean` en el modelo `Product`. En la UI:

- Línea 303: `{p.requiresPersonalization && ( ... )}` — muestra badge "Requiere personalización"
- Línea 79: `if (!target?.requiresPersonalization) return;` — solo carga perfiles si requiere personalización

Los productTypes visibles en la UI tienen estos badges de color:
- `sticker` → azul
- `llavero` → ámbar
- `tarjeta` → púrpura  
- `brazalete` → esmeralda
- `combo` → rosa

#### Cómo se agregan al carrito

No hay carrito como tal. Es compra directa de un producto:
1. Usuario hace clic en "Solicitar" (línea 316) → `handleOpenCheckout(p)`
2. Se abre checkout inline o modal (según mobile/desktop)
3. Formulario único: datos de envío + (si personalizado) selector de perfil
4. Botón "Confirmar Pedido" → `handleCreateOrder`

#### ¿Se exige seleccionar un chip?

**NO.** Se exige seleccionar un **perfil** (profileId), pero no un chip:

- Línea 94: `const withChip = profiles.find(p => p.assignedChips && p.assignedChips.length > 0);` — intenta auto-seleccionar un perfil con chip
- Línea 95: `setSelectedProfileId(withChip?.id || profiles[0]?.id || "");` — **fallback al primer perfil aunque no tenga chip**

#### ¿Se exige seleccionar un perfil?

**SÍ, condicionalmente:** Si `requiresPersonalization = true`:
- Líneas 122-127: Si no hay `selectedProfileId`, muestra error y cancela
- Pero el `selectedProfileId` se auto-selecciona en línea 95

#### ¿Qué ocurre si el usuario no tiene chips activos?

**El sistema permite continuar con advertencia:**

Líneas 130-138:
```typescript
const hasChip = !!selectedProfile?.assignedChips?.[0];
if (!hasChip) {
  const ok = confirm("Este perfil todavía no tiene un chip/QR activo asociado. "
    + "Puedes continuar, pero el accesorio quedará pendiente de vinculación de QR "
    + "antes de fabricarse. ¿Deseas continuar?");
  if (!ok) { setCreatingOrder(false); return; }
}
```

**Esto es un confirm() de JavaScript.** El usuario puede ignorarlo y continuar. El accesorio se crea sin chip vinculado.

### Veredicto Tienda

| Pregunta | Respuesta |
|----------|-----------|
| ¿Exige chip? | ❌ NO — solo advertencia soft con `confirm()` |
| ¿Exige profileId? | ✅ SÍ — si `requiresPersonalization` |
| ¿Auto-selecciona perfil? | ✅ SÍ — pero prefiere perfil sin chip si es el primero |
| ¿Se puede crear orden sin chip? | ✅ SÍ — `confirm()` es evitable |

---

## 2. CREACIÓN DE ÓRDENES

### Archivo: `app/api/orders/route.ts`

#### Flujo de validación para accesorios

Líneas 82-118:
```typescript
if (storeProduct.requiresPersonalization) {
  const profileId = itemAny.profileId as string | undefined;
  if (!profileId) {
    throw new Error(`El producto "${storeProduct.name}" requiere seleccionar un perfil médico.`);
  }

  const profile = await tx.profile.findFirst({
    where: {
      id: profileId,
      accountId: user.accountId || undefined,
      profileType: { not: "corporate" },
    },
    include: {
      assignedChips: {
        where: { status: { in: ["activated", "sold", "assigned_reserved"] } },
        take: 1,
        select: { id: true, shortCode: true },
      },
    },
  });

  if (!profile) {
    throw new Error(`El perfil seleccionado no es válido o es corporativo.`);
  }

  const chip = profile.assignedChips[0] || null;  // ← PERMITE NULL
  return {
    ...item,
    profileId,
    chipId: chip?.id || null,  // ← chipId PUEDE SER NULL
    productType: storeProduct.name,
    unitPrice: storeProduct.price,
  };
}
```

#### Respuestas clave

| Pregunta | Respuesta | Evidencia |
|----------|-----------|-----------|
| ¿Puede crearse orden de accesorio sin chip? | ✅ **SÍ** | Línea 110: `const chip = profile.assignedChips[0] || null;` |
| ¿Puede crearse sin profileId? | ❌ **NO** | Línea 86: `if (!profileId) throw Error(...)` |
| ¿Puede crearse con chipId null? | ✅ **SÍ** | Línea 111: `chipId: chip?.id || null` |
| ¿Puede crearse con profileId null? | ❌ **NO** | Validación estricta en línea 86 |
| Validaciones existentes hoy | Solo profileId obligatorio, chipId es opcional |

---

## 3. APROBACIÓN DE PEDIDOS

### Archivo: `app/api/admin/orders/[id]/approve/route.ts`

#### Cómo identifica el sistema que es un accesorio

Líneas 144-147:
```typescript
const isPersonalizedAccessoryOrder =
  !order.packageId &&
  order.items.length > 0 &&
  order.items.every((item) => item.profileId || item.chipId);
```

**⚠️ PROBLEMA:** Si el accesorio se creó sin `chipId` (porque no se validó), la condición `item.profileId || item.chipId` puede ser `false` si `chipId = null` y `profileId = null`. Pero `profileId` es obligatorio, así que `item.profileId` siempre será truthy.

**✅ Conclusión:** La detección de accesorio funciona aunque `chipId = null`, porque `profileId` está presente.

#### ¿Qué pasa cuando se aprueba un accesorio?

Líneas 149-187:
```typescript
if (isPersonalizedAccessoryOrder) {
  // Aprobar orden de accesorio personalizado SIN picking ni capacity
  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: {
        paymentStatus: "paid",
        orderStatus: "completed",
        adminReviewStatus: "approved",
        ...
      },
    });
  });
}
```

- ✅ Se salta el picking de chips físicos
- ✅ Se salta el incremento de capacidad (`maxChipsAllocated`)
- ✅ No se requiere `packageId`
- ✅ Se marca como `completed` directamente

#### ¿Qué ocurre si el accesorio no tiene chip asociado?

**Nada se rompe.** La orden se aprueba igual, se marca como completada. Queda registrada con `chipId = null` en `OrderItem`.

**Pero:** En el panel Admin (líneas 1076-1202 de PedidosSection), cuando se ve el detalle:

```typescript
{chip ? (
  // Muestra QR, shortCode, etc.
) : (
  // Muestra warning: "Perfil seleccionado sin chip asignado"
  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
    <div className="flex items-center gap-2">
      <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
      <p className="text-[10px] font-bold text-amber-700">
        Perfil seleccionado sin chip asignado. Verifica antes de fabricar este accesorio.
      </p>
    </div>
  </div>
)}
```

El Admin **ve** que falta chip, pero **no hay bloqueo**. Puede fabricar igual.

### Veredicto Aprobación

| Pregunta | Respuesta |
|----------|-----------|
| ¿Detecta accesorios correctamente? | ✅ SÍ (por profileId) |
| ¿Se salta picking? | ✅ SÍ |
| ¿Se salta capacity? | ✅ SÍ |
| ¿Se puede aprobar sin chipId? | ✅ SÍ — pero queda warning en UI |
| ¿Se rompe algo? | ❌ No se rompe, pero el accesorio se fabrica sin saber a qué chip vincularlo |

---

## 4. PANEL ADMIN

### Archivo: `app/(admin)/admin/_components/sections/PedidosSection.tsx`

#### Información mostrada actualmente

| Dato | ¿Se muestra? | Detalle |
|------|-------------|---------|
| Perfil asociado | ✅ SÍ | Nombre, tipo (principal/familiar), alias |
| Chip asociado | ✅ SÍ (condicional) | Si existe: shortCode + QR + status |
| ¿Sin chip? | ✅ SÍ | Warning ámbar "sin chip asignado" |
| Dueño del chip | ❌ NO | No se muestra a qué usuario pertenece el chip |
| Teléfono del perfil | ❌ NO | No se muestra contacto del perfil asociado |
| ¿Es accesorio o chip nuevo? | ⚠️ IMPLÍCITO | Por la presencia de profileId en el item |

#### Información faltante

- ❌ El Admin no puede ver si el usuario que compró el accesorio tiene chips activos
- ❌ No se muestra el `chipId` real (solo el shortCode si existe)
- ❌ No se muestra el `userId` o `ownerUserId` del chip al que se vincula
- ❌ No hay acción "Vincular chip a este accesorio" desde Admin

---

## 5. MODELOS PRISMA

### Relaciones actuales en `OrderItem`

```prisma
model OrderItem {
  id          String   @id @default(cuid())
  orderId     String
  productType String
  quantity    Int      @default(1)
  unitPrice   Float
  totalPrice  Float
  profileId   String?   // ← OPCIONAL
  chipId      String?   // ← OPCIONAL
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  order   Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  profile Profile? @relation("OrderItemProfile", fields: [profileId], references: [id])
  chip    Chip?    @relation("OrderItemChip", fields: [chipId], references: [id])
}
```

#### Relación real usada hoy

| Escenario | profileId | chipId |
|-----------|-----------|--------|
| Compra de paquete (chips nuevos) | ❌ null | ❌ null |
| Accesorio personalizado CON chip | ✅ set | ✅ set |
| Accesorio personalizado SIN chip | ✅ set | ❌ null |
| Accesorio corporativo | ✅ set | ✅ set (vía CorporateOrderEmployeeItem) |

#### ¿Hay campos redundantes?

- `chipId` en `OrderItem` y `chipId` en `CorporateOrderEmployeeItem` — ambos se usan, no son redundantes pero hay duplicación conceptual.
- `profileId` en `OrderItem` y `profileId` en `OrganizationMember` — diferentes contextos.

#### ¿Hay relaciones no utilizadas?

- La relación `OrderItemChip` (chip ← OrderItem) se usa solo para accesorios. Para chips comprados como producto principal, no hay `OrderItemChip`, se gestionan vía `ChipClaimToken`.
- La relación `OrderItemProfile` se usa solo para accesorios.

---

## 6. FLUJO CORPORATIVO

### ¿Un empleado corporativo puede pedir accesorios?

**SÍ, a través de `CorporateProductRequest`.** El modelo existe:

```prisma
model CorporateProductRequest {
  id                   String
  organizationId       String
  organizationMemberId String
  requestedByUserId    String
  // ...
  items              CorporateProductRequestItem[]
}

model CorporateProductRequestItem {
  id         String
  requestId  String
  productId  String
  quantity   Int
  // ...
}
```

#### ¿Cómo se vinculan?

Los accesorios corporativos se vinculan a través de:
- `CorporateProductRequestItem.productId` → `Product`
- `CorporateOrderEmployeeItem.chipId` → `Chip`

#### Validación existente

**NO hay validación** de chip activo. Un empleado puede solicitar un accesorio sin tener un chip corporativo asignado.

### Veredicto Corporativo

| Pregunta | Respuesta |
|----------|-----------|
| ¿Empleado puede pedir accesorios? | ✅ SÍ |
| ¿Usan chipId? | ✅ SÍ (en CorporateOrderEmployeeItem) |
| ¿Usan profileId? | ✅ SÍ (a través de OrganizationMember → Profile) |
| ¿Existe validación de chip activo? | ❌ NO |

---

## 7. PROPUESTA DE CAMBIO MÍNIMO

### Objetivo final

1. **No se puede comprar un accesorio sin tener al menos un chip activo.**
2. **La UI obliga a seleccionar un chip.**
3. **El chip seleccionado queda guardado en la orden** (`OrderItem.chipId`).
4. **Admin ve claramente:** chip asociado, perfil asociado, dueño del chip.
5. **La fabricación siempre sabe para qué chip se está produciendo.**

### P0 — Crítico (bloquea venta de accesorios sin chip)

#### 1. Backend: Validar chip existente en `POST /api/orders`

**Archivo:** `app/api/orders/route.ts`

Después de la línea 107 (`if (!profile) throw...`), agregar:

```typescript
const chip = profile.assignedChips[0] || null;

// NUEVO: Rechazar si no hay chip activo
if (!chip) {
  throw new Error(
    `El perfil "${profile.firstName} ${profile.lastName}" no tiene un chip activo. ` +
    `Debes tener al menos un chip activo para personalizar accesorios.`
  );
}
```

**Líneas:** +4 (son 4 líneas nuevas)
**Riesgo:** Bajo — solo afecta órdenes personalizadas sin chip

#### 2. Frontend: Remover `confirm()` y mostrar error duro

**Archivo:** `app/(app)/dashboard/tienda/page.tsx`

Reemplazar líneas 129-138 (el `confirm()`) con:

```typescript
const hasChip = !!selectedProfile?.assignedChips?.[0];
if (!hasChip) {
  toast.error("Este perfil no tiene un chip activo. " +
    "Debes vincular un chip al perfil antes de solicitar accesorios personalizados.");
  setCreatingOrder(false);
  return;
}
```

**Líneas:** ~8 (reemplazar bloque de confirm)
**Riesgo:** Bajo — cambia de soft warning a error duro

#### 3. Backend: Aprobar accesorio solo si tiene `chipId`

**Archivo:** `app/api/admin/orders/[id]/approve/route.ts`

Dentro del bloque `isPersonalizedAccessoryOrder` (línea 149), antes de aprobar:

```typescript
// Verificar que todos los items tengan chipId
const itemsWithoutChip = order.items.filter(item => !item.chipId);
if (itemsWithoutChip.length > 0) {
  const names = itemsWithoutChip.map(i => i.productType).join(", ");
  throw new Error(
    `No se puede aprobar: los siguientes accesorios no tienen chip vinculado: ${names}. ` +
    `Asigna un chip antes de aprobar.`
  );
}
```

**Líneas:** ~8
**Riesgo:** Medio — Admin no podrá aprobar accesorios huérfanos existentes

### P1 — Alta prioridad (mejora UX y Admin)

#### 4. UI Tienda: Mostrar chips disponibles para selección explícita

**Archivo:** `app/(app)/dashboard/tienda/page.tsx`

- En lugar de solo seleccionar perfil, agregar paso de selección de chip
- Si el perfil tiene varios chips, mostrar lista
- Si no tiene chips, deshabilitar compra y mostrar mensaje + link a `/dashboard/chips`

**Líneas:** ~40-60 (nuevo selector de chips)
**Riesgo:** Medio — cambios en UI de checkout

#### 5. Admin: Mostrar dueño del chip

**Archivo:** `app/(admin)/admin/_components/sections/PedidosSection.tsx`

En el bloque de personalización (líneas 1076-1202), cuando se muestra el chip:

```typescript
// Agregar: nombre del dueño del chip / perfil al que pertenece
<div className="text-[9px] text-muted-foreground">
  Dueño: {profile.firstName} {profile.lastName}
  {chip && <> · Chip: /e/{chip.shortCode} ({chip.status})</>}
</div>
```

**Líneas:** ~5
**Riesgo:** Bajo — solo UI

#### 6. Admin: Botón "Vincular chip a este accesorio"

**Archivo:** `app/(admin)/admin/_components/sections/PedidosSection.tsx`

- Cuando el accesorio no tiene `chipId`, mostrar botón "Vincular chip"
- Abre selector de chips disponibles (del inventory)
- Al seleccionar, actualiza `OrderItem.chipId`
- Nuevo endpoint: `PATCH /api/admin/orders/[id]/items/[itemId]/link-chip`

**Líneas:** ~80 (UI + nuevo endpoint)
**Riesgo:** Medio — nueva funcionalidad
**Dependencia:** Nuevo endpoint

### P2 — Baja prioridad (mejora futura)

#### 7. Ficha pública: mostrar accesorios vinculados al chip

**Archivo:** `app/(public)/e/[shortCode]/page.tsx`

Si el perfil tiene accesorios personalizados vinculados, mostrar en ficha pública:

```
🎨 Accesorios vinculados: Sticker personalizado, Llavero
```

**Líneas:** ~15
**Riesgo:** Bajo

#### 8. Historial de accesorios por chip en dashboard

**Archivo:** `app/(app)/dashboard/chips/page.tsx`

En el detalle de cada chip, listar accesorios vinculados.

**Líneas:** ~20
**Riesgo:** Bajo

---

## 8. RIESGOS

### Riesgos de implementar

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Órdenes existentes con chipId=null no podrán aprobarse | ALTA (si hay datos históricos) | ALTO | Agregar migración de datos: backfill chipId para órdenes existentes |
| Usuarios sin chip bloqueados de comprar accesorios | ALTA | MEDIO | Mostrar mensaje claro + link a cómo obtener chip |
| Admin no puede aprobar accesorio sin chip incluso con justificación | MEDIA | MEDIO | Agregar opción "Forzar aprobación" para Admin |
| Productos marcados como `requiresPersonalization` que no son accesorios | BAJA | ALTO | Revisar catálogo de productos antes de implementar |

### Riesgos de NO implementar

| Riesgo | Impacto |
|--------|---------|
| Accesorio fabricado sin chip → no se puede activar | ALTO — pérdida de material |
| Cliente paga accesorio que no sirve hasta tener chip | ALTO — mala experiencia |
| Admin no sabe a quién entregar el accesorio fabricado | MEDIO — logística |
| Inventario de accesorios sin control de vinculación | MEDIO |

---

## 9. ARCHIVOS EXACTOS A MODIFICAR

| Archivo | Prioridad | Cambio | Líneas |
|---------|-----------|--------|--------|
| `app/api/orders/route.ts` (línea 107) | P0 | Validar `chip` no null | +4 |
| `app/(app)/dashboard/tienda/page.tsx` (líneas 129-138) | P0 | Reemplazar `confirm()` por error duro | ~8 |
| `app/api/admin/orders/[id]/approve/route.ts` (línea 149) | P0 | Validar `chipId` en items antes de aprobar | +8 |
| `app/(app)/dashboard/tienda/page.tsx` (selector) | P1 | Agregar selección explícita de chip | ~50 |
| `app/(admin)/admin/_components/sections/PedidosSection.tsx` (personalización) | P1 | Mostrar dueño del chip | +5 |
| `app/(admin)/admin/_components/sections/PedidosSection.tsx` + nuevo endpoint | P1 | Botón "Vincular chip" | ~80 |
| `app/(public)/e/[shortCode]/page.tsx` | P2 | Mostrar accesorios vinculados | ~15 |
| `app/(app)/dashboard/chips/page.tsx` | P2 | Historial de accesorios por chip | ~20 |

---

## 10. ESTIMACIÓN

| Prioridad | Tarea | Tiempo estimado |
|-----------|-------|----------------|
| P0 | Validar chip en backend (orders/route) | 10 min |
| P0 | Reemplazar confirm() por error duro (tienda) | 10 min |
| P0 | Validar chipId en approve (admin) | 15 min |
| **P0 Total** | | **~35 min** |
| P1 | Selector explícito de chips en tienda | 1-2h |
| P1 | Mostrar dueño en Admin | 15 min |
| P1 | Botón "Vincular chip" + endpoint | 2-3h |
| **P1 Total** | | **~4-5h** |
| P2 | Ficha pública + dashboard | 2-3h |
| **P2 Total** | | **~2-3h** |
| **Total general** | | **~7-9h** |

---

## 11. PROMPT RECOMENDADO PARA IMPLEMENTAR P0

```
Implementar validación de chip activo para accesorios personalizados.

No crear migraciones. No hacer commit.

Cambios:

1. En app/api/orders/route.ts, en el bloque requiresPersonalization,
   después de validar que el perfil existe (línea ~107),
   agregar: si profile.assignedChips[0] es null, lanzar error:
   "El perfil {firstName} {lastName} no tiene un chip activo.
   Debes tener al least un chip activo para personalizar accesorios."

2. En app/(app)/dashboard/tienda/page.tsx, reemplazar el bloque
   confirm() de las líneas 129-138 con un toast.error() que
   detenga el flujo: "Este perfil no tiene un chip activo.
   Vincula un chip antes de solicitar accesorios personalizados."

3. En app/api/admin/orders/[id]/approve/route.ts, dentro del bloque
   isPersonalizedAccessoryOrder (línea 149), antes de aprobar,
   verificar que todos los items tengan chipId. Si alguno no tiene,
   lanzar error con los nombres de los productos afectados.
```

---

*Documento generado el 6 de octubre 2026*
*Basado en: docs/audit/auditoria-redisenio-flujos-pre-rescue.md y docs/audit/validacion-p0-p1-fases.md*
*Próximo paso: Implementar P0 (35 min)*

---
*Originalmente en: docs/audit/*