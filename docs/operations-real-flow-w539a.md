# W5.39A — Flujo operativo real Pedidos → Producción → Inventario

Este bloque alinea el flujo operativo para que Pedidos sea el origen del movimiento hacia Producción cuando no hay stock suficiente.

## Flujo real

Pedidos → Producción → preparación digital → imprenta → recepción → ensamblaje → QC → inventario terminado → despacho → activación final por usuario.

## Alcance aplicado

- Se añadió la acción operativa para enviar un pedido comercial a producción.
- Se reutilizaron las entidades de Producción existentes.
- Se evitó tocar Prisma, migraciones y legacy fuera del alcance operativo actual.

## Regla clave

- Solo la activación final asigna usuario.
- Operaciones no asigna usuario final.

## Endpoint agregado

- `POST /api/admin/operations/commercial-orders/[id]/send-to-production`

## UI ajustada

- Pedidos ahora puede disparar el envío a producción cuando detecta faltante de stock.

## W5.39B - Preparación digital por orden de producción

- Se reutilizó `OperationDigitalBatchItem` como lista de preparación por orden de producción.
- Se agregaron campos puente para la preparación digital: `productionOrderId`, `nfcProgrammed`, `qrPrepared`, `preparedAt` y `preparedBy`.
- Se creó `POST /api/admin/operations/production-orders/[id]/prepare-digital-items`.
- Se creó `POST /api/admin/operations/production-orders/[id]/unit-preparation/[preparationId]/nfc-programmed`.
- Se creó `POST /api/admin/operations/production-orders/[id]/unit-preparation/[preparationId]/qr-prepared`.
- Cada línea muestra etiqueta interna, `shortCode` y link de activación cuando ya está vinculada.
- La preparación queda lista para imprenta solo cuando NFC y QR están completos en todas las líneas.
- No se crea inventario disponible.
- No se asigna usuario final.
- No se envía a imprenta todavía en este bloque.

## Nota

Este documento complementa la auditoría visual y las notas post-producción previas.
