# W6.05G-G — Auditoría y Plan Operativo de Stock para Tienda

## 1. Resumen ejecutivo

La tienda `/dashboard/tienda` muestra correctamente 2 productos:
- **Sticker PreRescatePTY** en "Combos personales"
- **Sticker PreRescatePTY Empresarial** en "Para empresas"

Ambos aparecen como **"Agotado temporalmente"** porque no existen unidades en `OperationFinishedGoodUnit`. El modelo de stock operativo está completo (Product → ProductOperationalMapping → OperationFinishedGood → OperationFinishedGoodUnit), pero **no se ha producido ni registrado ninguna unidad física o digital**.

El admin ya cuenta con UI y endpoints para crear productos terminados, producir unidades, gestionar stock y ver inventario. La solución no requiere código nuevo, solo **ejecutar el flujo operativo correcto** desde el panel admin.

## 2. Modelo de stock actual

### Modelos involucrados

```
Product (catálogo comercial)
  │
  └── ProductOperationalMapping (puente tienda ↔ operaciones)
        │  storeSection, deviceType, purchaseFlow, isPublished
        │  productCode, finishedGoodId
        │
        └── OperationFinishedGood (producto terminado)
              │  code, name, productType, status
              │
              └── OperationFinishedGoodUnit (unidad trazable)
                    internalLabel, productCode, status, qaStatus,
                    activationStatus, reservedOrderId
```

### Campos relevantes de `OperationFinishedGoodUnit`

| Campo | Tipo | Propósito |
|---|---|---|
| `internalLabel` | String (unique) | Identificador único de la unidad física |
| `productCode` | String | Código del producto terminado (ej: PRP-FG-STICKER) |
| `status` | String | Estado actual: `qa_pending`, `available`, `reserved`, `dispatched`, `delivered` |
| `qaStatus` | String? | `passed`, `failed`, `pending` |
| `activationStatus` | String | `not_activated`, `activated` |
| `reservedOrderId` | String? | ID de orden que reservó la unidad |
| `digitalBatchItemId` | String? | Relación con ítem digital (shortCode, QR, NFC) |

### Estados posibles de una unidad

| status | qaStatus | activationStatus | reservedOrderId | ¿Vendible? |
|---|---|---|---|---|
| `qa_pending` | `pending` o null | `not_activated` | null | ❌ |
| `available` | `passed` | `not_activated` | null | ✅ |
| `available` | `passed` | `not_activated` | set | ❌ (reservada) |
| `reserved` | `passed` | `not_activated` | set | ❌ |
| `dispatched` | `passed` | `not_activated` | set | ❌ |
| `delivered` | `passed` | `not_activated` | set | ❌ |
| cualquier | cualquier | `activated` | cualquiera | ❌ |

### Cómo se calcula `availableStock`

La función `loadInventoryStockRows()` en `lib/operations/inventory-stock.ts` (línea 119) cuenta una unidad como disponible **solo si cumple TODAS** estas condiciones:

```typescript
unit.status === "available"
&& unit.qaStatus === "passed"
&& unit.activationStatus === "not_activated"
&& !unit.reservedOrderId
```

### `Product.stock` — secundario

La columna `stock` en `Product` (actualmente 0 para ambos stickers) **no se usa como fuente primaria**. El endpoint `/api/products` calcula `availableStock` desde `loadInventoryStockRows()` y lo asigna a `stock` en la respuesta. `Product.stock` en DB es un campo legacy que no afecta la tienda.

## 3. Data actual (read-only)

### OperationFinishedGood

| Código | Nombre | Status |
|---|---|---|
| `PRP-FG-STICKER` | Sticker PreRescatePTY | `active` |
| `PRP-FG-STICKER-EMP` | Sticker PreRescatePTY Empresarial | `active` |

### OperationFinishedGoodUnit

**0 unidades** para ambos códigos.

### ProductOperationalMapping

| Producto | storeSection | productCode | finishedGoodId | isPublished |
|---|---|---|---|---|
| Sticker PreRescatePTY | `personal_devices` | `PRP-FG-STICKER` | ✅ set | `true` |
| Sticker PreRescatePTY Empresarial | `business_devices` | `PRP-FG-STICKER-EMP` | ✅ set | `true` |

### Product.stock

Ambos productos tienen `stock = 0` en la columna de DB, pero esto es irrelevante porque la tienda usa `availableStock` desde inventario operativo.

## 4. Admin/endpoints existentes para gestión de stock

### UI Admin (Stock & Fábrica)

El panel admin ya cuenta con secciones completas:

| Sección | Archivo | Función |
|---|---|---|
| **Productos Terminados** | `FinishedGoodsSection.tsx` | Listar, crear, editar, publicar a tienda, ver balance |
| **Unidades PT** | `FinishedGoodUnitsSection.tsx` | Listar, crear, ver detalle, eventos, filtrar por estado |
| **Órdenes de Producción** | `ProductionQueueSection.tsx` | Crear orden, preparar ítems digitales, QC, empaque |
| **Lotes Digitales** | `CreateBatchSection.tsx` | Crear lote digital con shortCodes, QR, NFC |
| **Inventario** | `InventorySection.tsx` | Ver stock agregado por producto |
| **Stock** | `TiendaSection.tsx` | Ver stock operativo y relación con tienda |

### Endpoints API

| Método | Ruta | Función |
|---|---|---|
| `GET` | `/api/admin/operations/finished-goods` | Listar productos terminados |
| `POST` | `/api/admin/operations/finished-goods` | Crear producto terminado |
| `PATCH` | `/api/admin/operations/finished-goods/[id]` | Editar producto terminado |
| `POST` | `/api/admin/operations/finished-goods/[id]/publish-to-store` | Publicar a tienda (crea/actualiza Product + mapping) |
| `POST` | `/api/admin/operations/finished-goods/[id]/events` | Registrar evento en FG |
| `GET` | `/api/admin/operations/finished-good-units` | Listar unidades |
| `POST` | `/api/admin/operations/finished-good-units` | Crear unidad individual |
| `POST` | `/api/admin/operations/finished-good-units/[id]/events` | Registrar evento en unidad |
| `GET` | `/api/admin/operations/inventory/stock` | Ver stock agregado |
| `GET` | `/api/admin/operations/inventory/units` | Ver detalle de unidades |
| `POST` | `/api/admin/operations/digital-batches` | Crear lote digital |
| `POST` | `/api/admin/operations/production-orders` | Crear orden de producción |
| Varios | `/api/admin/operations/production-orders/[id]/*` | Flujo completo de producción |

### Conclusión

**No hace falta crear nuevo código.** El admin ya tiene todo lo necesario para:
1. Crear unidades manualmente (POST finished-good-units)
2. Producir unidades vía órdenes de producción (flujo completo)
3. Ver stock en tiempo real
4. Publicar a tienda

## 5. Causa de "Agotado temporalmente"

**Causa raíz única:** `OperationFinishedGoodUnit` tiene 0 registros para los códigos `PRP-FG-STICKER` y `PRP-FG-STICKER-EMP`.

No hay unidades porque:
- No se ha ejecutado el flujo de producción (orden de producción → lote digital → QC → disponible)
- No se han creado unidades manualmente desde el admin
- No hay seed de datos para stock inicial

El mapping, el producto terminado y la publicación están correctos. Solo faltan las unidades.

## 6. Plan recomendado para W6.05G-H

### Opción A — Crear unidades desde Admin/Stock & Fábrica (recomendada)

**Pasos:**

1. **Acceder a Admin → Stock & Fábrica → Productos Terminados**
   - Verificar que `PRP-FG-STICKER` y `PRP-FG-STICKER-EMP` existen y están `active`
   - Verificar que ambos están publicados a tienda (columna "Tienda")

2. **Crear unidades manualmente** desde Admin → Stock & Fábrica → Unidades PT → "Crear unidad"
   - Para cada unidad, especificar:
     - `productCode`: `PRP-FG-STICKER` o `PRP-FG-STICKER-EMP`
     - `internalLabel`: identificador único (ej: `STK-PERSONAL-001`, `STK-EMPRESARIAL-001`)
     - `status`: `available`
     - `qaStatus`: `passed`
     - `activationStatus`: `not_activated`
   - Esto crea la unidad directamente como vendible

3. **Verificar stock** en Admin → Stock & Fábrica → Inventario
   - Confirmar que `availableCount > 0` para ambos códigos

4. **Verificar tienda** en `/dashboard/tienda`
   - Ambos productos deben aparecer como "Disponible"

### Opción B — Usar flujo de producción completo

Si se requiere trazabilidad completa desde fábrica:

1. Crear orden de producción en Admin → Stock & Fábrica → Producción
2. Preparar ítems digitales (shortCodes, QR, NFC)
3. Enviar a QC
4. Aprobar QC → unidades pasan a `available`
5. Verificar stock en tienda

### Opción C — Script de seed controlado

Crear un script en `prisma/scripts/` o `scripts/` que:
- Use `prisma.operationFinishedGoodUnit.createMany()`
- Cree N unidades para cada producto
- Asigne `internalLabel` secuencial
- No toque activación, perfiles, ni pedidos

**Recomendación:** Usar **Opción A** para las primeras unidades (rápido, controlado, desde UI admin). Si se necesita volumen, usar **Opción C** con script seed.

### Campos mínimos que debe tener una unidad vendible

```
internalLabel:    "STK-PERSONAL-001" (único)
productCode:      "PRP-FG-STICKER"
productName:      "Sticker PreRescatePTY"
productType:      "sticker_prerescatepty"
status:           "available"
qaStatus:         "passed"
activationStatus: "not_activated"
```

### Status inicial para ser vendible

`available` + `qaStatus=passed` + `activationStatus=not_activated` + sin `reservedOrderId`

## 7. Separación personal vs empresarial

| Producto | finishedGood | productCode | storeSection |
|---|---|---|---|
| Sticker PreRescatePTY | `cmrbeppki0000dffm48g1dbxh` | `PRP-FG-STICKER` | `personal_devices` |
| Sticker PreRescatePTY Empresarial | `cmrbepqoy0001dffmzr66uo9f` | `PRP-FG-STICKER-EMP` | `business_devices` |

**Reglas para no mezclar:**
- Cada unidad debe usar el `productCode` correcto según su tipo
- `PRP-FG-STICKER` → solo unidades personales
- `PRP-FG-STICKER-EMP` → solo unidades empresariales
- No crear unidades de un tipo bajo el productCode del otro
- El mapping ya separa por `storeSection` y `deviceType`

## 8. Riesgos de crear unidades

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Crear unidades sin `internalLabel` único | Error de BD (unique constraint) | Usar secuencia o timestamp |
| Duplicar códigos internos | Inconsistencia de trazabilidad | Validar unicidad antes de crear |
| Saltarse fábrica/QC | Unidades sin garantía de calidad | Usar `qaStatus=passed` solo si hay certeza |
| Crear unidades con `activationStatus=activated` | Imposibilita activación real | Siempre usar `not_activated` |
| Asignar `reservedOrderId` sin orden real | Bloquea unidad sin motivo | Dejar `reservedOrderId` en null |
| Mezclar productCode personal/empresarial | Producto incorrecto en tienda | Validar contra mapping |
| Crear unidades sin publicar a tienda | Stock existe pero no se ve | Verificar `isPublished=true` en mapping |
| Usar `Product.stock` manual como fuente | Desincronización con inventario real | No tocar `Product.stock` directamente |

## 9. Qué NO hacer

- ❌ No usar `Product.stock` manual como fuente única si `OperationFinishedGoodUnit` manda
- ❌ No crear unidades desde la tienda (frontend cliente)
- ❌ No crear unidades desde scripts sin autorización explícita
- ❌ No tocar pedidos/pagos al crear stock
- ❌ No activar chips al crear unidades de stock
- ❌ No generar shortCode de activación final si eso pertenece al flujo de activación
- ❌ No asignar perfiles a unidades de stock
- ❌ No modificar `schema.prisma`
- ❌ No crear migraciones
- ❌ No ejecutar `prisma db push` ni `prisma migrate`
- ❌ No modificar `ProductOperationalMapping`
- ❌ No modificar `Product`
- ❌ No modificar `OperationFinishedGood`

## 10. Skills usadas

- `prerescate-rules`: reglas del proyecto
- `verification-loop`: verificación sistemática
- `backend-patterns`: patrones backend
- `api-design`: diseño de API
- `security-review`: revisión de seguridad
- `error-handling`: manejo de errores
- `dashboard-builder`: estructura de dashboard
- `coding-standards`: estándares de código

## 11. Validaciones ejecutadas

- `git status --short`: solo archivos tocados
- `git diff`: cambios solo en nuevo doc
- `git diff --check`: sin whitespace errors
- `npx prisma validate`: schema válido ✅
- `npm run typecheck`: typecheck pasa ✅
- `npm run build`: build exitoso ✅

## 12. Archivos revisados

- `prisma/schema.prisma` — modelos Product, ProductOperationalMapping, OperationFinishedGood, OperationFinishedGoodUnit
- `app/api/products/route.ts` — endpoint público de catálogo
- `app/(app)/dashboard/tienda/page.tsx` — tienda cliente
- `lib/operations/inventory-stock.ts` — cálculo de availableStock
- `app/api/admin/operations/finished-goods/route.ts` — CRUD de productos terminados
- `app/api/admin/operations/finished-good-units/route.ts` — CRUD de unidades
- `app/api/admin/operations/inventory/stock/route.ts` — stock agregado
- `app/(admin)/admin/_components/sections/FinishedGoodsSection.tsx` — UI admin PT
- `app/(admin)/admin/_components/sections/FinishedGoodUnitsSection.tsx` — UI admin unidades
- `docs/w605g-a-client-store-audit.md` — auditoría previa
- `docs/w605g-f-store-business-classification-fix.md` — fix clasificación

## 13. Archivo creado

- `docs/w605g-g-store-stock-operational-plan.md`

## 14. Reporte final

| Aspecto | Resultado |
|---|---|
| Backend tocado | No |
| Frontend tocado | No |
| Prisma modificado | No |
| Migraciones | No |
| Endpoints modificados/creados | No |
| Data actual de stock | 0 unidades para PRP-FG-STICKER y PRP-FG-STICKER-EMP |
| Causa de agotado | No existen OperationFinishedGoodUnit |
| Plan recomendado | Opción A: crear unidades desde Admin UI (rápido y controlado) |
| Riesgos documentados | 10 riesgos con mitigaciones |
| Qué NO se tocó | Todo lo especificado en reglas críticas |

## 15. Estado Git

- HEAD = `5696972` (origin/master)
- Workspace limpio salvo `tmp/`
- Archivo staged: `docs/w605g-g-store-stock-operational-plan.md`

## 16. Commit

```
W6.05G-G audit store stock operational plan
```

## 17. Push

Push normal a origin/master después de validaciones.