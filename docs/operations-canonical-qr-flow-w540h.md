# W5.40H - QR/NFC canonico por shortCode

## Objetivo

Cerrar la identidad digital publica de Produccion usando una URL canonica real y no una etiqueta operativa inventada.

## Cambio aplicado

- `shortCode` es la unica base para construir el QR y el NFC canonicos.
- `internalLabel` sigue siendo una etiqueta interna de trazabilidad.
- `activationUrl`, `qrUrl` y `nfcUrl` apuntan a la misma identidad publica real cuando existe `shortCode`.
- La preparacion digital ya no inventa identidad publica a partir de la orden de produccion.
- La vista de Produccion muestra:
  - URL canonica
  - ruta auxiliar de activacion
  - payload QR
  - URL NFC
  - imagen QR descargable
- El envio a imprenta queda bloqueado si falta un `shortCode` real.

## Alcance excluido

- No se uso `prisma db push`.
- No se uso `prisma migrate reset`.
- No se toco checkout legacy.
- No se toco `Order` / `Product` legacy.
- No se toco activacion legacy.
- No se asigno usuario final.
- No se creo inventario final.

