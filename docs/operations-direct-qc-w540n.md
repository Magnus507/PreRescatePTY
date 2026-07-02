# W5.40N - QC directo dentro de Produccion

## Objetivo

Eliminar el lenguaje de cierre ambiguo y dejar QC como una etapa directa sobre la unidad trazable real.

## Cambio aplicado

- QC se presenta como etapa de revision dentro de Produccion.
- `Pass QC` y `Fail QC` operan sobre `OperationFinishedGoodUnit.id`.
- La tarjeta de QC muestra la trazabilidad real de la unidad, incluyendo `id`, `internalLabel`, `shortCode`, `qaStatus`, `inventoryStatus`, `activationStatus` y `reservedOrderId`.
- El estado `qa_pending` se interpreta como listo para revision QC.
- Cuando falta trazabilidad real, la UI explica que el ensamblaje fisico debe cerrarse antes de QC.
- La accion de Ensamblaje que genera la unidad trazable es `Marcar lista para QC`.

## Resultado esperado

- Pedido interno con `Pass QC`:
  - `qaStatus = passed`
  - `status = available`
- Pedido comercial/empresa con `Pass QC`:
  - `qaStatus = passed`
  - `status = reserved`
- `Fail QC`:
  - `qaStatus = failed`
  - `status = qa_failed`
- No se asigna usuario final desde Operaciones.
- No se activa desde Operaciones.
- No se crea despacho automatico.

## Alcance excluido

- No se toco checkout legacy.
- No se toco `Order` / `Product` legacy.
- No se toco activacion legacy.
- No se uso `prisma db push`.
- No se uso `prisma migrate reset`.
