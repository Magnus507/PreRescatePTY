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

## W5.40O.2 - Sincronizacion canonica de empaque y lista para QC

- Se unifico la lectura de ensamblaje con `lib/operations/production-assembly-state.ts`.
- `Marcar lista para QC` ahora valida con la misma logica que la UI y acepta solo una unidad realmente lista.
- `packaging-completed` y `complete` usan una fuente de verdad compartida para evitar el falso positivo de `Lista para QC: sí`.
- Se agrego `repair-traceable-units` para sincronizar unidades trazables faltantes sin duplicar registros.
- La UI de Produccion ahora muestra `Empaque etiquetado` y `Lista para QC` usando la misma logica canonica del backend.
