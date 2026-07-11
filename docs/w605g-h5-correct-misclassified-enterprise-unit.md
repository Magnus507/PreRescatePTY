# W6.05G-H5 Correct Misclassified Enterprise Unit Stock

## Resumen ejecutivo

Se corrigieron de forma controlada dos unidades históricas empresariales que estaban clasificadas con `productType = PRP-FG-STICKER-EMP` pero `productCode = PRP-FG-STICKER`. El stock empresarial no subía porque el inventario real agrupa por `productCode`.

## Causa del problema

- El flujo futuro ya fue corregido en H4.
- La data histórica quedó con el `productCode` normal aunque la unidad era empresarial.
- Eso hizo que el inventario empresarial siguiera en cero y el normal se contaminara.

## Unidades afectadas

### `PROD-INT-0005-0001`

- id: `cmrfmn7jf000pky0arx8a2ly2`
- `productCode` antes: `PRP-FG-STICKER`
- `productCode` después: `PRP-FG-STICKER-EMP`
- `productType`: `PRP-FG-STICKER-EMP`
- `status`: `available`
- `qaStatus`: `passed`
- `activationStatus`: `not_activated`
- sin reserva
- sin despacho
- sin entrega
- sin activación
- sin conflicto con pedido cliente

### `PROD-INT-0006-0001`

- id: `cmrfnb5d8000iky0a0bgj7j9f`
- `productCode` antes: `PRP-FG-STICKER`
- `productCode` después: `PRP-FG-STICKER-EMP`
- `productType`: `PRP-FG-STICKER-EMP`
- `status`: `available`
- `qaStatus`: `passed`
- `activationStatus`: `not_activated`
- sin reserva
- sin despacho
- sin entrega
- sin activación
- sin conflicto con pedido cliente

## Criterios de seguridad aplicados

Solo se corrigieron unidades que cumplieron todas estas condiciones:

- `productType = PRP-FG-STICKER-EMP`
- `productCode = PRP-FG-STICKER`
- `status = available`
- `qaStatus = passed`
- `activationStatus = not_activated`
- sin reserva
- sin despacho
- sin entrega
- sin activación
- sin usuario final
- sin asignación de perfil
- producción con `outputType = PRP-FG-STICKER-EMP`
- batch y print order empresariales

## Corrección aplicada

Se cambió únicamente:

- `productCode: PRP-FG-STICKER -> PRP-FG-STICKER-EMP`

No se modificó:

- `internalLabel`
- `status`
- `qaStatus`
- `activationStatus`
- `productionOrderId`
- `digitalBatchId`
- `digitalBatchItemId`
- `printOrderId`
- reservas
- despacho
- entrega
- activación
- chips
- perfiles
- pedidos cliente
- pagos

## Before / After

### Antes

- `PRP-FG-STICKER`: 3
- `PRP-FG-STICKER-EMP`: 0

### Después

- `PRP-FG-STICKER`: 1
- `PRP-FG-STICKER-EMP`: 2

## Script controlado

Se agregó un script idempotente y auditable:

- [`scripts/fix-w605g-h5-misclassified-enterprise-units.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/scripts/fix-w605g-h5-misclassified-enterprise-units.ts)

Comportamiento:

- audita candidatas;
- valida seguridad;
- aborta si encuentra ambigüedad;
- corrige solo con `APPLY_W605G_H5=YES_APPLY_W605G_H5`;
- imprime before/after;
- no crea ni borra registros.

## Qué no se tocó

- no se modificó `schema.prisma`;
- no se hicieron migraciones;
- no se ejecutó `prisma db push`;
- no se ejecutó `prisma migrate dev`;
- no se ejecutó `prisma migrate reset`;
- no se crearon unidades nuevas;
- no se borraron unidades;
- no se tocaron pedidos cliente;
- no se tocaron pagos;
- no se tocaron chips;
- no se tocaron reservas, despachos o entregas.

## Validaciones

- `git status --short`
- `git diff`
- `git diff --check`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`

## Riesgos mitigados

- No hubo escritura destructiva.
- La corrección fue atómica.
- Se corrigieron solo unidades verificadas como seguras.
- La lógica futura ya estaba arreglada en H4, así que la corrección histórica no reabrió el bug.

## Conclusión

La unidad empresarial histórica quedó correctamente reasignada al stock empresarial real. El inventario quedó alineado con la realidad operativa y con el flujo corregido de producción a inventario.
