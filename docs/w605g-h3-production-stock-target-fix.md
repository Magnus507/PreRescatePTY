# W6.05G-H3 Production Stock Target Fix

## Resumen

Se corrigió la ruta que estaba haciendo que una reposición empresarial terminara impactando el inventario normal.

## Problema detectado

Desde Admin -> Centro de Operaciones -> Pedidos / Reposición de inventario:

- la reposición normal `PRP-FG-STICKER` funcionó como esperado;
- la reposición empresarial `PRP-FG-STICKER-EMP` terminó generando unidades que sumaban al producto normal;
- el modal de reposición seguía cortado y ocultaba los botones inferiores.

## Causa raíz

El problema no estaba en el pedido interno en sí, sino en la forma en que se resolvía el producto físico al crear o reparar unidades.

Hallazgos:

- `OperationFinishedGoodUnit` no tiene `finishedGoodId`.
- la clasificación real depende de `productCode` y del `digitalBatchItem.batch.productType`.
- `PROD-INT-0005` quedó vinculado a un batch empresarial, pero la unidad fue creada con `productCode = PRP-FG-STICKER`.
- el flujo de ensamblado/reparación tenía fallback duro a `PRP-FG-STICKER`.
- el endpoint de producción interna también estaba mezclando `productType` lógico con código operativo.

## Datos reales encontrados

Se confirmó en lectura:

- `PRP-FG-STICKER` existe como finished good normal.
- `PRP-FG-STICKER-EMP` existe como finished good empresarial.
- `INT-0001` generó `PROD-INT-0004`.
- `INT-0002` generó `PROD-INT-0005`.
- la unidad reciente asociada a `PROD-INT-0005` tiene:
  - `productType = PRP-FG-STICKER-EMP`
  - `productCode = PRP-FG-STICKER`

Eso explica por qué el balance visible se fue al inventario normal.

## Qué se corrigió

### 1. Resolución de producto correcta

Se normalizó la función de metadata de finished goods para que reconozca ambos códigos operativos:

- `PRP-FG-STICKER`
- `PRP-FG-STICKER-EMP`

Archivo:

- `app/api/admin/operations/finished-good-units/finished-good-units.helpers.ts`

### 2. Ensamblado de unidades

El endpoint de ensamblado ya no usa un fallback fijo al producto normal.
Ahora resuelve el producto desde el tipo/código correcto del batch.

Archivo:

- `app/api/admin/operations/production-orders/[id]/assemble-units/route.ts`

### 3. Reparación de unidades trazables

El endpoint de reparación también dejó de forzar `PRP-FG-STICKER` como fallback.

Archivo:

- `app/api/admin/operations/production-orders/[id]/repair-traceable-units/route.ts`

### 4. Producción interna

El endpoint de envío a producción quedó alineado para usar el código operativo correcto como `outputType`, no un tipo lógico ambiguo.

Archivo:

- `app/api/admin/operations/commercial-orders/[id]/send-to-production/route.ts`

### 5. Modal de reposición

El modal se movió a un portal y se mantiene fuera del árbol que lo recorta.
Además conserva scroll completo con overlay de pantalla completa.

Archivo:

- `app/(admin)/admin/_components/sections/PedidosSection.tsx`

## Qué NO se tocó

- No se borraron órdenes.
- No se borraron unidades.
- No se borraron productos.
- No se corrigió la data existente manualmente.
- No se hicieron migraciones.
- No se tocó `schema.prisma`.
- No se creó stock desde script.
- No se reservaron unidades.
- No se despachó nada.
- No se activaron chips.
- No se asignaron chips.

## Unidades potencialmente mal clasificadas

Existe al menos una unidad reciente asociada a `PROD-INT-0005` con `productType` empresarial y `productCode` normal.

Eso indica que el código anterior sí pudo dejar data mal clasificada.

No se corrigió la data en esta fase; quedó documentado para una fase separada si hace falta.

## Validaciones

- `npx prisma validate`: OK
- `npm run typecheck`: OK
- `npm run build`: OK
- `git diff --check`: OK

## Recomendación para H4

Si se decide corregir la data histórica, hacerlo en una fase separada y controlada:

- primero identificar todas las unidades mal clasificadas;
- luego corregir solo `productCode`/relaciones necesarias;
- nunca borrar ni recrear lotes de forma destructiva.
