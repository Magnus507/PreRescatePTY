# Auditoría — Stock físico en puntos de venta externos

> **Objetivo**: Auditar si el sistema actual permite representar stock separado por punto de venta externo (ej: "Casa mamá") para venta física sin integración al sistema.
> **Estado**: Solo análisis — No implementar, no hacer commit.

---

## 1. Flujo deseado

```
Admin Central                        Punto de Venta (externo)        Cliente Final
     │                                      │                            │
     │ 1. Crea chips en inventario          │                            │
     │    (status: inventory)               │                            │
     │                                      │                            │
     │ 2. Separa N paquetes                 │                            │
     │    Los entrega físicamente           │                            │
     │ ─────────────────────────────────►   │                            │
     │    [transfiere propiedad]            │                            │
     │                                      │ 3. Cliente compra          │
     │                                      │    en mostrador            │
     │                                      │ ◄────────────────────────  │
     │                                      │                            │
     │                                      │ 4. Entrega paquete físico  │
     │                                      │    con código activación   │
     │                                      │ ────────────────────────►  │
     │                                      │                            │
     │                                      │                            │ 5. Activa en casa
     │                                      │                            │    POST /api/chips/activate
     │                                      │                            │ ◄── activationCode
     │                                      │                            │
     │                                      │                            │ 6. Chip → activated
     │                                      │                            │    Vinculado a su cuenta
```

### Diferencias con Commit 1 (retail/sell)

El endpoint `POST /api/admin/retail/sell` creado en Commit 1 asume que:
- El admin **vende directamente** en el mostrador de la empresa
- La venta se registra **en el momento** en el sistema
- Se genera Order + ChipClaimToken inmediatamente

El flujo real es diferente:
- El admin **no está presente** en el punto de venta externo
- El punto de venta **no usa el sistema**
- Los chips salen físicamente de bodega **antes** de venderse
- La venta real puede ocurrir días/semanas después
- No hay registro de venta en el momento (solo al activar el cliente)

---

## 2. Estado actual del inventario

### Modelo Chip (campos relevantes)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `status` | `string` | `inventory`, `sold`, `activated`, `suspended`, `damaged`, `lost` |
| `isPhysical` | `boolean` | true = sticker/tag físico, false = digital creado en order |
| `batchId` | `string?` | Identificador de lote de fabricación (ej: "BATCH-XXXX") |
| `internalLabel` | `string?` (unique) | Etiqueta interna editable (ej: "Caja 00042") |
| `ownerUserId` | `string?` | Se asigna en activación (null antes) |
| `assignedProfileId` | `string?` | Se asigna en activación (null antes) |
| `chipUidInternal` | `string` (unique) | ID interno del chip |
| `serialPublic` | `string` (unique) | Serial visible |
| `shortCode` | `string` (unique) | Código corto público |

### Estados actuales

```
inventory ──► sold ──► activated
                 │          │
                 │    suspended
                 │          │
                 │    (reactivate → activated)
                 │
           damaged / lost
```

### UI Admin existente: InventorySection

La sección "Almacén Central" (`InventorySection.tsx`) tiene tabs:
- **Disponibles** — chips status=inventory, sin token activo
- **Vendidos/Reservados** — chips status=sold o con token reservado
- **Activados** — chips status=activated
- **Revertidos/Devueltos** — chips inventory con token histórico
- **Dañados/Perdidos (opcional)** — chips damaged/lost

Y filtros: Todos / Físicos / Digitales

### Creación de chips (POST /api/admin/chips)

Crea lote de N chips en una transacción:
- Genera `shortCode`, `serialPublic`, `activationCode` únicos por chip
- Crea Chip + ChipClaimToken
- `status: "inventory"`
- `isPhysical: false` por defecto (se puede togglear manualmente)
- No hay campo de ubicación física

---

## 3. Qué puede hacerse sin migración (Opción A)

### Usar internalLabel como ubicación

`internalLabel` es un string libre, editable desde UI (input inline en InventorySection, tabla "Disponibles").

**Cómo funcionaría**:
1. Admin crea lote de chips (todos status=inventory, con token)
2. Admin edita `internalLabel` de cada chip a mano o por lote → ej: "CASA MAMA"
3. Los chips siguen en `inventory` — no cambia su estado
4. Visualmente se pueden **filtrar/buscar** por `internalLabel` en el buscador (el GET /api/admin/chips ya busca en `internalLabel`)
5. Al venderse en el punto externo, se usa `POST /api/admin/retail/sell` (Commit 1) para marcarlos como sold y generar código final

**Problemas**:
- No hay reporte agregado de stock por ubicación (solo búsqueda manual)
- No hay control transaccional: se puede "perder" un chip sin que el sistema lo sepa
- `internalLabel` ya se usa para otro propósito (etiqueta de caja/número de serie interno)
- No hay trazabilidad de cuándo se movió a un punto de venta
- No hay protección: un chip en "CASA MAMA" sigue apareciendo como disponible en el inventario general a menos que se filtre manualmente
- **Si se marca como sold prematuramente**, el chip no puede venderse si se pierde antes

### Usar batchId como punto de venta

`batchId` actualmente se usa para agrupar chips creados juntos (lote de fabricación). Se podría reutilizar para identificar un punto de venta, pero:
- Ya tiene un propósito diferente (identificar lote de producción)
- Un lote puede ir a múltiples puntos de venta
- No resuelve la visibilidad de stock por punto

### No usar token hasta la venta real

Actualmente `POST /api/admin/chips` ya crea un `ChipClaimToken` con `activationCode` **en el momento de creación**. Esto significa:
- El código de activación existe desde que se fabrica el chip
- Si el código se expone, el chip puede activarse sin venderse
- Si se entrega a un tercero, el tercero tiene acceso al código de activación

✅ **Ventaja**: El chip se puede activar sin pasar por retail/sell (el código ya existe)
❌ **Riesgo**: El código existe antes de la venta → puede filtrarse

### Resumen Opción A

| Aspecto | ¿Posible? | Limitación |
|---------|-----------|------------|
| Separar chips por punto de venta | ⚠️ Con internalLabel como tag | Manual, sin reportes |
| Ver stock por punto | ⚠️ Por búsqueda en GET chips | No hay agregación |
| Mover chips a punto | ✅ Editar internalLabel | Manual, sin timestamp |
| Vender y generar código | ✅ Usar retail/sell endpoint | Requiere que admin registre |
| Activar después | ✅ Ya funciona (sold es activable) | Sin cambios |
| Perder paquete | ❌ No hay estado intermedio | El chip sigue inventory |
| Reportar stock por punto | ❌ No existe | Requiere lógica externa |

---

## 4. Qué requeriría migración (Opción B)

### Modelo propuesto: PointOfSale

```prisma
model PointOfSale {
  id          String   @id @default(cuid())
  name        String   // "Casa mamá", "Tienda Centro", etc.
  address     String?
  contactName String?
  contactPhone String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  chips Chip[]
}

model Chip {
  // ... campos existentes ...
  pointOfSaleId String?  // NUEVO
  pointOfSale   PointOfSale? @relation(fields: [pointOfSaleId], references: [id])
  consignedAt   DateTime?    // NUEVO — cuándo salió de bodega central
}
```

### Nuevo estado: `consigned`

Agregar un estado intermedio entre `inventory` y `sold`:

```typescript
CHIP_STATUS = {
  INVENTORY: "inventory",
  CONSIGNED: "consigned",    // NUEVO — en punto de venta externo, no vendido
  SOLD: "sold",
  ACTIVATED: "activated",
  SUSPENDED: "suspended",
  DAMAGED: "damaged",
  LOST: "lost",
}
```

### ¿Conviene crear estado nuevo?

**Sí, si el volumen lo justifica.** El estado `consigned` resuelve:

| Problema | Solución |
|----------|----------|
| Saber qué chips están en punto de venta vs bodega | Filtro por status=consigned |
| Chip perdido antes de venderse | Marcar consigned→lost (trazabilidad) |
| Stock disponible real en bodega | inventory excluye consigned automáticamente |
| Stock en punto de venta | consigned + pointOfSaleId |
| Activar desde punto de venta | consigned debe agregarse a ACTIVATABLE_CHIP_STATUSES |

### Migraciones necesarias

| Migración | Tabla | Campos | ¿Obligatorio? |
|-----------|-------|--------|---------------|
| 1 | `PointOfSale` | Nueva tabla | ✅ Sí |
| 2 | `Chip` | `pointOfSaleId`, `consignedAt` | ✅ Sí |
| 3 | `chip-lifecycle.constants.ts` | `CHIP_STATUS.CONSIGNED` | ✅ Sí |
| 4 | `chip-lifecycle.constants.ts` | Agregar `consigned` a `ACTIVATABLE_CHIP_STATUSES` | ✅ Sí |
| 5 | GET /api/admin/chips | Agregar view="consigned" | ⚠️ Post-migración |
| 6 | UI InventorySection | Agregar tab "En punto de venta" | ⚠️ Post-migración |

---

## 5. Estados recomendados

### Propuesta de estados finales

```
inventory ──► consigned ──► sold ──► activated
  │               │            │         │
  │               │            │   suspended
  │               │            │         │
  │               │       damaged/lost   │
  │               │                      │
  │         damaged/lost           (reactivate → activated)
  │
  └──► damaged/lost
```

### Constantes actualizadas

```typescript
ACTIVATABLE_CHIP_STATUSES = [
  CHIP_STATUS.INVENTORY,
  CHIP_STATUS.CONSIGNED,   // ← NUEVO
  CHIP_STATUS.SOLD,
] as const;

USED_CAPACITY_CHIP_STATUSES = [
  CHIP_STATUS.ACTIVATED,
  CHIP_STATUS.SUSPENDED,
] as const;
```

**Nota**: `consigned` NO consume cupo del plan, igual que `inventory` y `sold`.

### ¿Debe tener ChipClaimToken al consignar?

**Opción A (sin token hasta vender)**: El chip sale de bodega sin token activo.
- ✅ El código de activación no existe → no puede filtrarse
- ❌ Cuando se vende, admin debe generar token (paso extra en retail/sell)
- ❌ Si el punto de venta no reporta la venta, no hay código

**Opción B (token desde creación, actual)**: El chip ya tiene token al crearse.
- ✅ El código existe impreso en el paquete → el cliente activa directo
- ✅ No necesita intervención admin para generar código al vender
- ❌ El código puede filtrarse si el paquete se pierde en tránsito
- ❌ El token podría activarse sin pasar por retail/sell

### Recomendación

**Mantener el token desde creación** (comportamiento actual). El riesgo de filtración se mitiga con:
- Reporte de chips `consigned > 60 días sin activar` (posible extravío)
- Política de seguridad física de los paquetes
- El código está impreso dentro del empaque sellado

Si se quisiera máxima seguridad, el token se generaría al marcar `consigned→sold` (Opción A), pero agrega complejidad operativa.

---

## 6. Activación desde punto de venta

### Estado actual

`POST /api/chips/activate` requiere:
```typescript
ACTIVATABLE_CHIP_STATUSES.includes(chip.status)  // ["inventory", "sold"]
```

### Con estado consigned

Si se agrega `consigned` a `ACTIVATABLE_CHIP_STATUSES`:

```typescript
ACTIVATABLE_CHIP_STATUSES = ["inventory", "consigned", "sold"]
```

La activación funciona **sin ningún otro cambio**. El chip:
1. Sale de bodega → `consigned` (tiene token desde creación)
2. Se entrega al cliente en punto de venta
3. Cliente activa en casa → `activated`
4. Se vincula automáticamente al usuario, su perfil y su cuenta

**La activación es idempotente respecto al estado del chip.** Solo valida que esté en la lista de activables.

### ¿Qué pasa si el chip está consigned y se activa?

La transacción de activación:
1. Consume `ChipClaimToken`
2. Marca chip → `status: "activated"`, `ownerUserId`, `accountId`, `assignedProfileId`
3. Auto-completa la orden retail si `token.orderId` existe
4. Audit log

**Resultado**: El chip pasa de `consigned` directamente a `activated`, saltándose `sold`. Esto es correcto porque:
- Ya se vendió físicamente en el punto de venta
- El pago se recibió en el punto de venta (fuera del sistema)
- No necesita una orden retail intermedia
- La activación es el registro de salida definitivo

### Problema: ¿Cómo saber que un chip consigned se vendió realmente?

El sistema **no lo sabe** hasta que se activa. El punto de venta externo no reporta ventas. Esto es inherente al modelo de consignación.

**Mitigaciones**:
- Reportes de conciliación periódica: chips `consigned > X días` deben investigarse
- Si el chip nunca se activa, se marca como `lost` después de N días
- El punto de venta paga solo por chips activados (modelo de comisión)

---

## 7. Riesgos

| # | Riesgo | Gravedad | Mitigación |
|---|--------|----------|------------|
| 1 | **Chips perdidos en punto de venta** — Paquetes se extravían, roban, dañan | Alta | Estado `lost` disponible. Reporte de `consigned > 60 días sin activar`. Política de responsabilidad con el punto de venta |
| 2 | **Código de activación filtrado** — Alguien activa el chip antes de venderse | Media | El código está impreso dentro del empaque sellado. Si se abre, es detectable. Reporte de activaciones sin orden retail asociada |
| 3 | **Stock duplicado** — Se vende un chip que ya se perdió | Media | Un chip solo puede activarse una vez. El token es de un solo uso. El chip perdido debe marcarse `lost` explícitamente |
| 4 | **Punto de venta no devuelve chips no vendidos** — Se quedan con el stock | Baja | Política de negocio, no técnica. El sistema registra qué chips están en qué punto de venta |
| 5 | **Estado consigned no implementado** — chips en punto aparecen como disponibles en bodega | Alta | Sin el estado, no hay diferenciación. Solución: implementar migración |
| 6 | **Activación sin registro de venta** — Chip se activa pero no hay orden retail | Baja | No es un problema técnico. La activación es el registro. Para contabilidad, ver punto 9 |
| 7 | **Concurrencia en consignación** — Dos puntos reclaman el mismo chip | Baja | Un chip solo puede estar en un pointOfSaleId a la vez. Asignación exclusiva en transacción |
| 8 | **Token expira mientras está en punto de venta** — chip no puede activarse después de 365 días | Media | Los chips físicos deben tener `expiresAt: null` o muy largo (10 años). Actualmente el POST /api/admin/chips crea token con 365 días |

---

## 8. Plan recomendado

### Fase 1 — Sin migración (ahora)

Usar `internalLabel` para etiquetar chips por punto de venta.
- No requiere cambios en BD
- El admin escribe "CASA MAMA" en internalLabel
- Se busca por internalLabel en el buscador
- Se usa retail/sell endpoint para registrar venta
- **Limitación**: no hay estado intermedio, ni reportes, ni control

**Duración**: 0 horas (usar lo que ya existe)

### Fase 2 — Migración mínima

Agregar solo `PointOfSale` y `Chip.pointOfSaleId` (sin nuevo estado).
- Los chips siguen en `inventory`
- Pero se sabe dónde están físicamente
- Reporte de stock por punto de venta
- endpoint `POST /api/admin/consign` para mover chips a punto

**Duración**: ~4-6 horas (migración + endpoint + UI)

### Fase 3 — Estado consigned (recomendado)

Agregar estado `consigned` y flujo completo.
1. Migración Prisma: `PointOfSale` + `Chip.pointOfSaleId` + `Chip.consignedAt`
2. `chip-lifecycle.constants.ts`: agregar `CONSIGNED` y a `ACTIVATABLE_CHIP_STATUSES`
3. Endpoint `POST /api/admin/consign`: mueve chips de inventory → consigned
4. Endpoint `POST /api/admin/consign/return`: devuelve chips consigned → inventory
5. Endpoint `POST /api/admin/consign/report-loss`: marca chips consigned → lost
6. Modificar `GET /api/admin/chips`: agregar view=`consigned`
7. Modificar `InventorySection`: agregar tab "En punto de venta"
8. Reportes: stock por punto, chips no activados, antigüedad de consignación

**Duración**: ~12-16 horas (migración + endpoints + UI + reportes)

---

## 9. Veredicto

### Opción A — Sin migración (🟡 Factibilidad: MEDIA)

| Pro | Contra |
|-----|--------|
| Sin cambios en BD | No hay estado intermedio |
| Usa retail/sell existente | Stock en punto de venta confundido con bodega |
| internalLabel es editable desde UI | Sin reportes |
| Búsqueda funcional | Sin control transaccional |
| Horas de implementación: 0 | Riesgo alto de errores de inventario |

**Recomendación**: Solo para POC/volumen muy bajo.

### Opción B — Con migración (🟢 Factibilidad: ALTA)

| Pro | Contra |
|-----|--------|
| Estado intermedio claro | Requiere migración |
| Stock diferenciado por punto de venta | ~4-6 horas para Fase 2 |
| Reportes de conciliación | ~12-16 horas para Fase 3 completa |
| Trazabilidad de pérdidas | |
| Activación sin cambios | |
| Punto de venta no necesita sistema | |

**Recomendación**: ✅ **Ir por Fase 2 (PointOfSale) como mínimo, Fase 3 (consigned) como ideal.**

### ¿Hace falta migración para...?

| Pregunta | Respuesta |
|----------|-----------|
| `retailLocation`? | ✅ Sí, agregar como `pointOfSaleId` |
| `stockLocation`? | ❌ No, usar `pointOfSaleId` |
| `pointOfSaleName`? | ❌ No, es atributo del modelo PointOfSale |
| `consignedAt`? | ✅ Sí, para trazabilidad |
| ¿Nuevo modelo? | ✅ `PointOfSale` con name, address, contact |

### Resumen de respuestas a preguntas originales

| # | Pregunta | Respuesta |
|---|----------|-----------|
| 1 | ¿Existe concepto de punto de venta? | ❌ No |
| 2 | ¿Campo para ubicación física? | ❌ No (internalLabel no es suficiente) |
| 3 | ¿Usar internalLabel/batchId sin migración? | ⚠️ internalLabel como tag manual, pero no recomendado |
| 4 | ¿Estado para chip fuera de bodega? | `consigned` es el estado ideal |
| 5 | ¿Conviene crear estado nuevo? | ✅ Sí, `consigned` resuelve múltiples problemas |
| 6 | ¿Hace falta migración? | ✅ Sí, PointOfSale + pointOfSaleId + consignedAt |
| 7 | ¿Activación permite chip en consigned? | ✅ Si se agrega a ACTIVATABLE_CHIP_STATUSES |
| 8 | ¿Paquete perdido antes de activar? | Se marca como `lost` desde consigned |
| 9 | ¿Reportes? | inventory: bodega, consigned: punto, sold/activated: vendidos, lost: perdidos |
| 10 | ¿UI mínima? | Tab "En punto de venta" en InventorySection + modal Consignar/Devolver |

---
*Originalmente en: docs/audit/*