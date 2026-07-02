# W5.40O.3 - Sincronizacion real de unidad trazable

## Problema

`Sincronizar unidad trazable` mostraba un toast de exito, pero la vista no se refrescaba con el estado real de la orden.

## Correccion

- El endpoint `repair-traceable-units` ahora devuelve `success`, `repairedCount`, `units` y `errors`.
- La UI refresca la orden completa despues de sincronizar.
- Solo se muestra exito si la unidad reparada devuelve `finishedGoodUnitId` real.
- Si no se puede vincular la unidad, la UI muestra error real.

## Resultado

- QC deja de quedar atascado en `pendiente de sincronizar unidad trazable`.
- PASS/FAIL QC se habilitan al refrescar con la unidad real.
