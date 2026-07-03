# Unificacion Tienda Admin / Inventario

## W5.40W

- `Tienda Admin` queda como catalogo comercial de productos.
- `Inventario` queda como la vista fisica/operativa de stock trazable y materiales.
- `Movimientos` deja de ser pestaña principal del Centro de Operaciones.
- La navegacion principal de `Inventario` se simplifica para priorizar el stock fisico y los materiales.
- `Recursos digitales` y `Productos base` quedan como soporte interno de Produccion, no como superficie principal diaria.

## Alcance

- No se toca Prisma.
- No se usan `prisma db push` ni `prisma migrate reset`.
- No se modifica checkout legacy.
- No se rompe `Order` / `Product` legacy.
- No se modifica activacion.
- No se asigna usuario final desde Operaciones.
- No se cambia QR, link, NFC ni `shortCode`.

## Nota operativa

- Esta unificacion es visual y de taxonomia operativa.
- El backend de movimientos y la trazabilidad historica se conservan.
- El stock operativo real debe seguir tratandose como fuente de verdad separada del catalogo comercial.
