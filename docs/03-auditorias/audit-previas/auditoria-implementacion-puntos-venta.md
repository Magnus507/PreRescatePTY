# Auditoría técnica final — Implementación PointOfSale / Consignación

> **Objetivo**: Validar exactamente cómo implementar Fase 2/3 para puntos de venta externos.
> **Estado**: Solo análisis — No implementar, no hacer commit.

---

## 1. Migración Prisma exacta

### Schema a agregar

```prisma
// ── NUEVO MODELO ──
model PointOfSale {
  id          String   @id @default(cuid())
  name        String   @unique  // "Casa mamá", "Tienda Centro"
  address     String?
  contactName String?
  contactPhone String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  chips Chip[]

  @@index([isActive])
}

// ── CAMPOS NUEVOS EN Chip ──
model Chip {
  // ... campos existentes (sin cambios) ...
  pointOfSaleId String?
  pointOfSale   PointOfSale? @relation(fields: [pointOfSaleId], references: [id], onDelete: SetNull)
  consignedAt   DateTime?

  @@index([pointOfSaleId])  // NUEVO: consulta stock por punto de venta
  @@index([status])         // YA EXISTE
  // ... índices existentes ...
}
```

### Migración SQL manual (correspondiente)

```sql
-- Crear tabla PointOfSale
CREATE TABLE "PointOfSale" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointOfSale_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PointOfSale_name_key" UNIQUE ("name")
);

-- Agregar columnas a Chip
ALTER TABLE "Chip" ADD COLUMN "pointOfSaleId" TEXT;
ALTER TABLE "Chip" ADD COLUMN "consignedAt" TIMESTAMP(3);

-- Foreign key (opcional, onDelete: SetNull)
ALTER TABLE "Chip" ADD CONSTRAINT "Chip_pointOfSaleId_fkey"
    FOREIGN KEY ("pointOfSaleId") REFERENCES "PointOfSale"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Índices
CREATE INDEX "Chip_pointOfSaleId_idx" ON "Chip"("pointOfSaleId");
CREATE INDEX "PointOfSale_isActive_idx" ON "PointOfSale"("isActive");
```

### Impacto en schema.prisma actual

Archivo: `prisma/schema.prisma`
- Líneas a agregar: ~25 (modelo PointOfSale)
- Líneas a modificar en Chip: +4 (pointOfSaleId, pointOfSale, consignedAt, index)
- Líneas existentes en Chip (217-256): sin cambios en campos existentes

---

## 2. Estado nuevo: consigned

### Cambios en `domains/chips/chip-lifecycle.constants.ts`

```typescript
export const CHIP_STATUS = {
  INVENTORY: "inventory",
  CONSIGNED: "consigned",    // ← NUEVO
  SOLD: "sold",
  ACTIVATED: "activated",
  SUSPENDED: "suspended",
  DAMAGED: "damaged",
  LOST: "lost",
} as const;

export const ACTIVATABLE_CHIP_STATUSES = [
  CHIP_STATUS.INVENTORY,
  CHIP_STATUS.CONSIGNED,     // ← AGREGAR
  CHIP_STATUS.SOLD,
] as const;

// USED_CAPACITY_CHIP_STATUSES y los demás: SIN CAMBIOS
// consigned NO consume cupo del plan ✅
```

### Archivos que referencian CHIP_STATUS

| Archivo | Cambio necesario |
|---------|-----------------|
| `domains/chips/chip-lifecycle.constants.ts` | Agregar CONSIGNED + a ACTIVATABLE |
| `app/api/admin/chips/route.ts` (GET) | Agregar view="consigned" |
| `app/api/admin/chips/route.ts` (POST) | Sin cambios (sigue creando inventory) |
| `app/api/admin/chips/inventory/route.ts` | `status: "inventory"` → no se toca |
| `app/api/chips/activate/route.ts` | ✅ Sin cambios (usa ACTIVATABLE_CHIP_STATUSES) |
| `app/(admin)/admin/_components/sections/InventorySection.tsx` | Agregar tab "En punto de venta" |
| `UNAVAILABLE_INVENTORY_STATUSES` | Agregar `consigned` para que no aparezca como disponible |

**Importante**: Agregar `consigned` a `UNAVAILABLE_INVENTORY_STATUSES`:

```typescript
export const UNAVAILABLE_INVENTORY_STATUSES = [
  CHIP_STATUS.SOLD,
  CHIP_STATUS.CONSIGNED,    // ← AGREGAR
  CHIP_STATUS.ACTIVATED,
  CHIP_STATUS.SUSPENDED,
  CHIP_STATUS.DAMAGED,
  CHIP_STATUS.LOST,
] as const;
```

Esto asegura que chips consignados NO aparezcan en `GET /api/admin/chips/available` ni en el inventario "Disponibles".

### ¿Dónde se usa UNAVAILABLE_INVENTORY_STATUSES?

```bash
grep -R "UNAVAILABLE_INVENTORY_STATUSES" --exclude-dir=node_modules .
```

Necesito verificar su uso.

<read_file>
<path>domains/chips/chip-lifecycle.constants.ts</path>
</read_file>

Ya lo tengo: líneas 31-37. Solo agregar `CHIP_STATUS.CONSIGNED`.

---

## 3. Endpoints exactos

### 3.1 `POST /api/admin/points-of-sale` — Crear punto de venta

```
POST /api/admin/points-of-sale
Auth: admin, superadmin (excluir imprenta)
Body: { name, address?, contactName?, contactPhone? }
Response: { id, name, address, contactName, contactPhone, createdAt }

Validaciones:
- name requerido, único
- address opcional
- contactName opcional
- contactPhone opcional
```

**Código**: ~30 líneas (similar a create org pero mínimo)

### 3.2 `GET /api/admin/points-of-sale` — Listar puntos de venta

```
GET /api/admin/points-of-sale
Auth: admin, superadmin, imprenta
Query: ?isActive=true
Response: {
  points: [
    {
      id, name, address, contactName, contactPhone, isActive,
      _count: { chips: number }  // total chips en este punto
    }
  ]
}

Opcional: incluir desglose por estado de chips
_count: { chips: number, consigned: number, sold: number, activated: number, lost: number }
```

**Código**: ~40 líneas

### 3.3 `POST /api/admin/points-of-sale/[id]/consign` — Consignar chips a punto

```
POST /api/admin/points-of-sale/:id/consign
Auth: admin, superadmin
Body: { chipIds: string[] }
Response: { consigned: number, chips: [{ chipId, shortCode, serialPublic }] }

Validaciones:
- PointOfSale existe y isActive
- chipIds requerido, no vacío, sin duplicados
- Cada chip:
  - existe
  - status = "inventory"
  - isPhysical = true
  - ownerUserId = null
  - assignedProfileId = null
  - NO tiene pointOfSaleId (no está ya consignado)
- Si algún chip no cumple → 400 con detalle

Transacción:
- Actualizar chip: status = "consigned", pointOfSaleId = :id, consignedAt = now
- AuditLog: "chip_consigned"
```

**Código**: ~60-70 líneas

**Tema tokens**: Los chips creados por `POST /api/admin/chips` **ya tienen** `ChipClaimToken` con `activationCode` desde su creación. NO se requiere generar nuevos tokens al consignar. El código de activación ya existe impreso en el empaque.

### 3.4 `POST /api/admin/points-of-sale/[id]/return` — Devolver chips a bodega

```
POST /api/admin/points-of-sale/:id/return
Auth: admin, superadmin
Body: { chipIds: string[] }
Response: { returned: number, chips: [{ chipId, shortCode }] }

Validaciones:
- chipIds requerido
- Cada chip: pointOfSaleId = :id, status = "consigned"
- Si algún chip fue vendido/activado → error (debe ir por retail/sell)

Transacción:
- Actualizar chip: status = "inventory", pointOfSaleId = null, consignedAt = null
- AuditLog: "chip_returned_from_consignment"
```

**Código**: ~50 líneas

### 3.5 `POST /api/admin/points-of-sale/[id]/mark-lost` — Reportar pérdida

```
POST /api/admin/points-of-sale/:id/mark-lost
Auth: admin, superadmin
Body: { chipIds: string[], reason?: string }
Response: { lost: number, chips: [{ chipId, shortCode }] }

Validaciones:
- chipIds requerido
- Cada chip: pointOfSaleId = :id, status = "consigned"

Transacción:
- Actualizar chip: status = "lost", pointOfSaleId = null (opcional mantener para trazabilidad)
- AuditLog: "chip_marked_lost", newValuesJson: { reason }
- Nota: el ChipClaimToken NO se elimina (trazabilidad)
```

**Código**: ~50 líneas

### Endpoints que NO se crean (ya existen y funcionan)

| Endpoint | Razón |
|----------|-------|
| `POST /api/admin/retail/sell` | ✅ Ya creado, se mantiene para venta directa |
| `POST /api/chips/activate` | ✅ Sin cambios, consigned es activable |
| `GET /api/admin/chips` | ✅ Modificar para agregar view="consigned" |
| `GET /api/admin/chips/inventory` | ✅ Sin cambios (solo inventory) |

---

## 4. Inventory UI mínima exacta

### Archivo a modificar: `app/(admin)/admin/_components/sections/InventorySection.tsx`

### Cambio 1: Agregar tab "Puntos de venta"

```typescript
type InventoryView = "available" | "reserved" | "activated" | "returned" | "damaged" | "consigned";

const TABS = [
  { key: "available", label: "Disponibles" },
  { key: "consigned", label: "En punto de venta" },  // ← NUEVO (tercero)
  { key: "reserved", label: "Vendidos / Reservados" },
  { key: "activated", label: "Activados" },
  { key: "returned", label: "Revertidos / Devueltos" },
  { key: "damaged", label: "Dañados / Perdidos" },
];
```

### Cambio 2: Agregar card de resumen

```typescript
<Card label="En punto de venta" value={summary.consigned} tone="purple" />
```

### Cambio 3: Nueva vista de tabla

Para `activeView === "consigned"`:
- Columnas: Etiqueta interna, ID público, Serial, Punto de venta, Fecha consignación, Acciones
- Acciones: Devolver, Marcar perdido

### Cambio 4: Botones de acción masiva

Botón "Consignar a punto de venta" en toolbar de la vista "Disponibles":
- Seleccionar chips con checkbox
- Elegir punto de venta (dropdown)
- Confirmar

### Componentes nuevos

| Componente | Archivo | Descripción |
|------------|---------|-------------|
| `ConsignModal` | `app/(admin)/admin/_components/modals/ConsignModal.tsx` | Seleccionar punto + chips + confirmar |
| `ReturnModal` | `app/(admin)/admin/_components/modals/ReturnModal.tsx` | Seleccionar chips a devolver |
| `LostModal` | `app/(admin)/admin/_components/modals/LostModal.tsx` | Marcar chips como perdidos + razón |

### Servicio nuevo

| Archivo | Descripción |
|---------|-------------|
| `app/(admin)/admin/_services/domains/points-of-sale.service.ts` | CRUD puntos de venta + consign/return/lost |

---

## 5. Riesgo con tokens — Confirmación

### Estado actual

`POST /api/admin/chips` (crear lote) hace **en la misma transacción**:

```typescript
const chip = await tx.chip.create({ ... status: "inventory" });
await tx.chipClaimToken.create({
  chipId: chip.id,
  activationCode,
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),  // 365 días
});
```

✅ **Cada chip creado ya tiene ChipClaimToken con activationCode desde su creación**.

### ¿El token sobrevive a la consignación?

Sí. Al marcar `status: "consigned"`, el `ChipClaimToken` existente:
- NO se modifica
- Sigue siendo válido (mientras no haya expirado)
- Puede usarse para activación por el cliente final

### ¿El activationCode expira?

| Escenario | ¿Expira? | Impacto |
|-----------|----------|---------|
| Chip en inventario | ✅ 365 días desde creación | Si no se vende en 1 año, código expira |
| Chip consignado | ✅ 365 días desde creación | Puede expirar mientras está en punto de venta |
| Chip vendido (sold) | ✅ 365 días desde creación | Cliente tiene 1 año para activar |

### Recomendación: extender expiración para chips físicos

**Problema**: Si un chip físico está consignado >365 días (ej: inventario lento en punto de venta rural), el token expira y el cliente no puede activar.

**Solución 1** (sin migración): Al crear lote, usar `expiresAt` más largo para chips físicos:
```typescript
expiresAt: chip.isPhysical
  ? new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000) // 10 años
  : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),       // 1 año
```

**Solución 2** (con migración): Permitir `expiresAt: null` en ChipClaimToken:
- Requiere migración: `expiresAt DateTime?` (cambiar de required a optional)
- Modificar `async function isTokenReservedNow()` en `token-lifecycle.helpers.ts` para tratar `null` como "sin expiración"
- Riesgo: cambios en lógica de expiración de tokens existentes

### Recomendación final

✅ **Usar Solución 1** (cambiar expiresAt en POST /api/admin/chips para chips físicos). No requiere migración, mínimo cambio, resuelve el problema.

---

## 6. Impacto del endpoint retail/sell existente

### Decisión: Mantener ambos flujos

| Flujo | Endpoint | Cuándo usarlo |
|-------|----------|---------------|
| **Venta directa en mostrador** (admin vende) | `POST /api/admin/retail/sell` | Admin vende directamente al cliente |
| **Consignación a punto externo** | `POST /api/admin/points-of-sale/:id/consign` | Chips van a tercero que vende sin sistema |

### No hay interferencia

- `retail/sell` requiere `status: "inventory"` → chips consignados no pasan la validación
- `consign` requiere `status: "inventory"` → chips vendidos no pasan la validación
- La activación (`POST /api/chips/activate`) acepta ambos estados (`consigned` y `sold`)
- Un chip no puede estar en ambos flujos a la vez

### ¿Conviene que retail/sell también pueda vender chips consignados?

**No por ahora.** El flujo de consignación asume que el punto de venta externo vende sin sistema. Si en algún momento se requiere que el admin registre una venta de un chip consignado (reporte manual), se puede modificar `retail/sell` para aceptar también `status: "consigned"`. Pero eso agrega complejidad sin necesidad actual.

---

## 7. Plan por commits exacto

### Commit 1: Migración + estado consigned

Archivos a tocar:

| Archivo | Cambio |
|---------|--------|
| `prisma/schema.prisma` | Agregar modelo PointOfSale + campos Chip |
| `prisma/migrations/20261007000001_add_points_of_sale/migration.sql` | SQL de migración |
| `domains/chips/chip-lifecycle.constants.ts` | Agregar CONSIGNED + ACTIVATABLE + UNAVAILABLE |

```bash
npx prisma generate
npm run typecheck
npm run build
git add -A
git commit -m "Add PointOfSale model and consigned chip status"
```

### Commit 2: Endpoints de puntos de venta

Archivos a crear:

| Archivo | Descripción |
|---------|-------------|
| `app/api/admin/points-of-sale/route.ts` | POST + GET |
| `app/api/admin/points-of-sale/[id]/consign/route.ts` | Consignar chips |
| `app/api/admin/points-of-sale/[id]/return/route.ts` | Devolver chips |
| `app/api/admin/points-of-sale/[id]/mark-lost/route.ts` | Marcar perdido |

Archivos a modificar:

| Archivo | Cambio |
|---------|--------|
| `app/api/admin/chips/route.ts` | Agregar view="consigned" |

```bash
npm run typecheck
npm run build
git add -A
git commit -m "Add consignment endpoints for points of sale"
```

### Commit 3: Service + UI Admin

Archivos a crear:

| Archivo | Descripción |
|---------|-------------|
| `app/(admin)/admin/_services/domains/points-of-sale.service.ts` | Service |
| `app/(admin)/admin/_components/modals/ConsignModal.tsx` | Modal consignar |
| `app/(admin)/admin/_components/modals/ReturnModal.tsx` | Modal devolver |
| `app/(admin)/admin/_components/modals/LostModal.tsx` | Modal marcar perdido |

Archivos a modificar:

| Archivo | Cambio |
|---------|--------|
| `app/(admin)/admin/_components/sections/InventorySection.tsx` | Tab, vista, botones |

```bash
npm run typecheck
npm run build
git add -A
git commit -m "Add consignment UI to inventory section"
```

### Commit 4: Extender expiresAt para chips físicos (post-MVP)

| Archivo | Cambio |
|---------|--------|
| `app/api/admin/chips/route.ts` (POST) | expiresAt = isPhysical ? 10 años : 1 año |

```bash
git commit -m "Extend token expiry for physical chips"
```

---

## 8. Prompt de implementación del Commit 1

> (Para copiar/pegar como instrucción al asistente)

```
Implementar Commit 1 — Migración + estado consigned.

Crear modelo PointOfSale y agregar campos a Chip.
Agregar estado "consigned" a chip-lifecycle.constants.
Agregar a ACTIVATABLE_CHIP_STATUSES.
Agregar a UNAVAILABLE_INVENTORY_STATUSES.
No tocar activación, retail/sell, ni UI.
No hacer commit todavía.

1. Schema Prisma:
   - Modelo PointOfSale con campos: id, name (unique), address?, contactName?, contactPhone?, isActive, createdAt, updatedAt
   - Relación PointOfSale → Chip (hasMany)
   - En Chip: pointOfSaleId String?, pointOfSale PointOfSale? (onDelete: SetNull), consignedAt DateTime?
   - Índice Chip.pointOfSaleId

2. Archivo: domains/chips/chip-lifecycle.constants.ts
   - Agregar CONSIGNED: "consigned" a CHIP_STATUS
   - Agregar CHIP_STATUS.CONSIGNED a ACTIVATABLE_CHIP_STATUSES
   - Agregar CHIP_STATUS.CONSIGNED a UNAVAILABLE_INVENTORY_STATUSES
   - Los demás arrays sin cambios

3. Migración SQL en prisma/migrations/20261007000001_add_points_of_sale/migration.sql

4. Prisma generate y build.

Validar:
   test -f "prisma/schema.prisma"
   grep "CONSIGNED" domains/chips/chip-lifecycle.constants.ts
   grep "consigned" domains/chips/chip-lifecycle.constants.ts
   npm run typecheck
   npm run build
```

---

## 9. Resumen de archivos a tocar (plan completo)

### Nuevos archivos

| # | Archivo | Commits |
|---|---------|---------|
| 1 | `prisma/migrations/20261007000001_add_points_of_sale/migration.sql` | 1 |
| 2 | `app/api/admin/points-of-sale/route.ts` | 2 |
| 3 | `app/api/admin/points-of-sale/[id]/consign/route.ts` | 2 |
| 4 | `app/api/admin/points-of-sale/[id]/return/route.ts` | 2 |
| 5 | `app/api/admin/points-of-sale/[id]/mark-lost/route.ts` | 2 |
| 6 | `app/(admin)/admin/_services/domains/points-of-sale.service.ts` | 3 |
| 7 | `app/(admin)/admin/_components/modals/ConsignModal.tsx` | 3 |
| 8 | `app/(admin)/admin/_components/modals/ReturnModal.tsx` | 3 |
| 9 | `app/(admin)/admin/_components/modals/LostModal.tsx` | 3 |

### Archivos a modificar

| # | Archivo | Cambio | Commits |
|---|---------|--------|---------|
| 1 | `prisma/schema.prisma` | +model PointOfSale, +Chip.pointOfSaleId, +Chip.consignedAt | 1 |
| 2 | `domains/chips/chip-lifecycle.constants.ts` | +CONSIGNED, +ACTIVATABLE, +UNAVAILABLE | 1 |
| 3 | `app/api/admin/chips/route.ts` | +view="consigned" | 2 |
| 4 | `app/(admin)/admin/_components/sections/InventorySection.tsx` | +tab, +vista, +botones | 3 |
| 5 | `app/(admin)/admin/_types/admin.ts` | +PointOfSale type (opcional) | 3 |
| 6 | `app/api/admin/chips/route.ts` (POST) | expiresAt extendido para físicos | 4 |

### Archivos que NO se tocan

| Archivo | Razón |
|---------|-------|
| `app/api/chips/activate/route.ts` | Sin cambios (usa ACTIVATABLE_CHIP_STATUSES) |
| `app/api/admin/retail/sell/route.ts` | Flujo separado, no interfiere |
| `app/api/orders/route.ts` | Solo online |
| `app/api/admin/orders/*` | Solo online |
| `prisma/schema.prisma` (otros modelos) | Sin cambios |
| `lib/identifiers.ts` | Sin cambios |
| `lib/order-number.ts` | Sin cambios |
| `app/(app)/dashboard/*` | Sin cambios |

---
*Originalmente en: docs/audit/*