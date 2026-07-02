# W5.40K - shortCode real en preparacion digital

## Objetivo

Corregir la preparacion digital para que cada unidad nueva nazca con `shortCode` real, QR canónico y NFC canónico.

## Cambio aplicado

- Se agrego un generador seguro de `shortCode` opaco.
- La preparacion digital ya escribe `shortCode` real al crear unidades nuevas.
- Las unidades existentes sin `shortCode` y sin estar enviadas a imprenta se reparan con identidad canónica real.
- `qrUrl`, `nfcUrl` y `qrPayload` vuelven a apuntar a `/e/<shortCode>`.
- La ruta auxiliar `/activar/<internalLabel>` sigue como fallback, no como identidad principal.
- Se agrego unicidad real en Prisma para `OperationDigitalBatchItem.shortCode`.

## Alcance excluido

- No se uso `prisma db push`.
- No se uso `prisma migrate reset`.
- No se tocaron migraciones historicas.
- No se toco checkout legacy.
- No se toco `Order` / `Product` legacy.
- No se toco activacion legacy.
- No se asigno usuario final desde Operaciones.
- No se activo desde Operaciones.

