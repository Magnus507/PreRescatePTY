# Stock real Tienda Admin / Inventario

## W5.40X

- `Tienda Admin` queda alimentada por stock operativo real cuando el producto comercial está vinculado a Inventario.
- `Inventario` publica productos al catálogo comercial sin migraciones.
- El stock agregado se calcula desde `OperationFinishedGoodUnit`.
- Los combos siguen siendo paquetes comerciales sobre el producto fisico principal `Sticker PreRescatePTY`.

## Sin migracion

- Se reutilizan campos existentes de `Product`.
- El vínculo se codifica de forma no destructiva.
- Si un producto no está vinculado, Tienda muestra aviso y no inventa stock real.

## Alcance

- No se toca activación.
- No se toca QR/link/NFC.
- No se cambia shortCode.
- No se asigna usuario final desde Operaciones.
- No se usa `prisma db push`.
- No se usa `prisma migrate reset`.
