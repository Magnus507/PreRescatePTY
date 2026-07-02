# W5.40G - Identidad digital real de Produccion

## Objetivo

Separar la identidad operativa de Produccion de la identidad publica real y evitar que `internalLabel` se confunda con `shortCode`.

## Definiciones

- `internalLabel`: etiqueta operativa y trazable de la unidad.
- `shortCode`: identificador publico real del sistema, solo si existe una fuente autentica.
- `activationUrl`: URL canónica que se programa en NFC y que también codifica el QR.
- `qrUrl`: endpoint de imagen QR que representa `activationUrl`.
- `nfcUrl`: misma URL canónica que `activationUrl`, salvo razon documentada.

## Decision tecnica

- El QR y el NFC usan la misma URL canónica.
- No se inventa `shortCode` a partir de la orden de produccion.
- Si un item no tiene `shortCode` real, la UI muestra `No generado`.
- La preparación digital sigue siendo operativa y no asigna usuario final.

## Visualizacion

- La tarjeta de cada unidad muestra la etiqueta interna, la URL NFC completa, el payload del QR y el QR visual descargable.
- El operador puede copiar la URL NFC y copiar el payload QR desde la misma tarjeta.

## Alcance excluido

- No se usa `prisma db push`.
- No se usa `prisma migrate reset`.
- No se toca checkout legacy.
- No se toca `Order` / `Product` legacy.
- No se activa desde Operaciones.
- No se crea inventario `available` antes de QC Pass.

