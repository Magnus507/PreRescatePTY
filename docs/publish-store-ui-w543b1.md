# W5.43B.1 - Publicar en Tienda y visibilidad pública

## Causa del reflejo visual
- La fila de Inventario identificaba el producto publicado solo por el marcador en `description`.
- No exigía que `Product.isActive` fuera `true`.
- Eso dejaba la UI dependiente de un match textual que podía existir aunque el producto siguiera inactivo.

## Causa de la visibilidad pública
- `/api/products` devuelve productos con `isActive: true`.
- Si el producto de tienda queda inactivo, no aparece en la tienda aunque conserve el marcador.
- El stock cero no debe ocultarlo: solo debe mostrarlo como agotado.

## Contrato recomendado
- Marker exacto: `[operationsProductCode:CODE]`.
- `Product.isActive` define visibilidad.
- `OperationFinishedGood` es el producto operativo.
- `Product` es el catálogo público.

## Regla visual
- Si hay marker exacto y `isActive: true`, el botón debe decir `Dejar de publicar`.
- Si hay marker exacto pero `isActive: false`, el botón debe decir `Publicar en Tienda`.
- Si no hay marker exacto, no considerar publicado.

## Regla pública
- Producto publicado con stock `0` debe seguir visible como agotado.
- No debe aparecer el marcador técnico en la descripción pública.

## Seguridad operativa
- No se crean unidades.
- No se crean pedidos.
- No se toca activación.
- No se toca QR/NFC.
- No se toca `shortCode` ni `internalLabel`.
