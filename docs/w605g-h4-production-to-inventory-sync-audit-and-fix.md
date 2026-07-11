# W6.05G-H4 Production to Inventory Sync Audit and Fix

## Resumen ejecutivo

Se auditó el flujo Producción -> Unidad trazable -> Inventario real para entender por qué el inventario empresarial seguía en cero después de completar una producción empresarial. La causa real fue un fallback duro a `PRP-FG-STICKER` en el flujo de completado de unidad trazable, que dejó una unidad empresarial con `productType` correcto pero `productCode` normal.

## Problema detectado

- `PRP-FG-STICKER` mostraba balance 3.
- `PRP-FG-STICKER-EMP` mostraba balance 0.
- `PROD-INT-0006` estaba completada con salida empresarial.
- La unidad de esa producción sí existía, pero quedó clasificada con `productCode = PRP-FG-STICKER`.
- Eso hizo que el balance empresarial no subiera, porque el stock real se agrupa por `productCode`.

## Data real encontrada

### Finished goods base

- `PRP-FG-STICKER`
  - estado: `active`
  - producto base normal
- `PRP-FG-STICKER-EMP`
  - estado: `active`
  - producto base empresarial

### Producción reciente

- `PROD-INT-0006`
  - `outputType = PRP-FG-STICKER-EMP`
  - `status = completed`
  - `plannedQuantity = 1`
  - `producedQuantity = 1`

### Unidad trazable de `PROD-INT-0006`

- `internalLabel = PROD-INT-0006-0001`
- `productType = PRP-FG-STICKER-EMP`
- `productCode = PRP-FG-STICKER`
- `status = available`
- `qaStatus = passed`
- `activationStatus = not_activated`
- `digitalBatchItemId` enlazado correctamente

### Inventario real por `productCode`

- `PRP-FG-STICKER`: 3 unidades
- `PRP-FG-STICKER-EMP`: 0 unidades

## Qué hace el botón "Sincronizar unidad trazable"

- El botón llama a `POST /api/admin/operations/production-orders/[id]/repair-traceable-units`.
- Busca items del batch listos para QC.
- Si falta la unidad trazable, la crea o la enlaza.
- Si ya existe la unidad, la actualiza para completar vínculo, `digitalBatchId`, `digitalBatchItemId`, `printOrderId` y metadatos de producto.
- No despacha, no activa, no reserva y no entrega.

## Causa raíz

La ruta de completado de unidad trazable todavía usaba fallback duro a `PRP-FG-STICKER` al crear o reparar una unidad completada. Eso rompía la coherencia entre:

- `outputType`
- `productType`
- `productCode`

Como el inventario real se agrupa por `productCode`, la unidad empresarial terminó sumando al inventario normal.

## Fix aplicado

Se corrigió el flujo futuro para que:

- `unit-assembly/.../complete` derive `productCode` y `productName` desde `getProductMetadata(item.batch.productType)`;
- `repair-traceable-units` reescriba `productCode`, `productName` y `productType` con el metadato canónico del batch en lugar de conservar el valor incorrecto;
- la unidad empresarial no caiga más en `PRP-FG-STICKER` por fallback;
- el balance empresarial suba cuando la unidad empresarial quede `available` y `qaStatus = passed`.

## Qué no se tocó

- no se modificó `schema.prisma`;
- no se hicieron migraciones;
- no se ejecutó `prisma db push`;
- no se ejecutó `prisma migrate dev`;
- no se ejecutó `prisma migrate reset`;
- no se borró ninguna entidad;
- no se crearon unidades desde script;
- no se corrigió data histórica directamente;
- no se tocaron pedidos cliente;
- no se tocaron pagos;
- no se tocaron chips;
- no se tocaron reservas, despachos ni entregas.

## Plan histórico H5

La corrección histórica queda pendiente y debe hacerse con autorización explícita. El caso a revisar es una unidad empresarial ya existente con:

- `productType = PRP-FG-STICKER-EMP`
- `productCode = PRP-FG-STICKER`

Plan propuesto para H5:

1. Identificar unidades empresariales mal clasificadas.
2. Confirmar que no tengan reserva, despacho, activación ni vínculo conflictivo con pedido cliente.
3. Corregir solo el `productCode` a `PRP-FG-STICKER-EMP`.
4. Verificar que el balance empresarial suba y el normal no cambie.

## Validaciones

- `git status --short`
- `git diff`
- `git diff --check`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`

## Conclusión

El inventario empresarial no subía por una clasificación incorrecta de `productCode`, no por ausencia de unidad. El flujo futuro ya quedó alineado para usar el código empresarial correcto, y la data histórica queda documentada para una corrección posterior y controlada.
