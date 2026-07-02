# W5.40R-S - Inventario trazable profesional

## Principio

Inventario real = `OperationFinishedGoodUnit`.

## Lectura operativa

- `available` significa disponible para reserva de pedido.
- `reserved` significa reservado para pedido.
- `qa_pending` significa pendiente de QC.
- `qa_failed` significa fallida en QC.
- `delivered` con `not_activated` significa entregada, pendiente de activacion.
- `activated` ocurre fuera de Operaciones.

## Capas

- Materiales: insumos.
- Recursos digitales: identidad QR / shortCode / NFC.
- Productos base: catalogo.
- Unidades fisicas: stock real trazable.

## Reglas

- No editar QR, link o NFC desde Inventario.
- No asignar usuario final desde Operaciones.
- No activar desde Operaciones.
- Pedidos reservara solo unidades `available` con `qaStatus = passed` y `activationStatus = not_activated`.
