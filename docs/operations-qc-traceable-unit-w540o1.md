# W5.40O.1 - Fix definitivo de unidad trazable para QC

## Problema resuelto

Se eliminó la inconsistencia donde una unidad podía figurar como `Lista para QC: sí` sin que QC tuviera un `OperationFinishedGoodUnit.id` usable.

## Cambio aplicado

- `Marcar lista para QC` ahora crea o encuentra la unidad trazable real.
- La respuesta del endpoint devuelve `finishedGoodUnitId`.
- La UI de QC usa `finishedGoodUnitId` como referencia principal.
- Si una orden vieja quedó marcada como lista pero no tenía unidad trazable, la UI ofrece `Sincronizar unidad trazable`.

## Resultado esperado

- No se puede mostrar una unidad lista para QC sin trazabilidad.
- QC Pass/Fail opera sobre `OperationFinishedGoodUnit.id`.
- No se duplica la unidad trazable al reintentar la acción.

