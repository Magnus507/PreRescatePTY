# W5.40P - Checklist obligatorio de PASS QC dentro de Produccion

## Problema

`PASS QC` llegaba al endpoint correcto, pero fallaba con el mensaje de controles obligatorios incompletos porque Produccion no estaba enviando el checklist canónico que exige QC.

## Correccion

- Produccion ahora envía el checklist QA obligatorio con los nombres reales que valida el backend.
- La tarjeta QC muestra el checklist antes de aprobar.
- El boton `Pass QC` deja de depender de la pestaña Calidad/QA como fuente operativa.
- La aprobacion sigue requiriendo unidad trazable real, shortCode real, imprenta recibida, ensamblaje y empaque completos.

## Resultado esperado

- `PASS QC` aprueba desde Produccion cuando la unidad ya completó todos los controles previos.
- Pedido interno -> `available`.
- Pedido comercial/empresa -> `reserved`.
- `FAIL QC` sigue marcando `qa_failed`.
- No se asigna usuario final.
- No se activa desde Operaciones.
- No se crea despacho automaticamente.

## Inventario trazable

- QC deja la unidad lista para Inventario como unidad fisica trazable.
- `available` es reserva habilitada, no activacion.
- `reserved` sigue siendo una reserva operativa, no usuario final.
- `delivered` con `not_activated` sigue siendo una alerta operativa visible.
