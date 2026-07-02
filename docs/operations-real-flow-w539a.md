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
## W5.39C-D-E-F — Imprenta, recepción, ensamblaje físico y envío a QC

- `POST /api/admin/operations/production-orders/[id]/send-to-print`
- `POST /api/admin/operations/production-orders/[id]/mark-print-received`
- `POST /api/admin/operations/production-orders/[id]/unit-assembly/[preparationId]/assembled`
- `POST /api/admin/operations/production-orders/[id]/unit-assembly/[preparationId]/packaging-completed`
- `POST /api/admin/operations/production-orders/[id]/unit-assembly/[preparationId]/complete`
- `POST /api/admin/operations/production-orders/[id]/send-to-qa`

Reglas vigentes:

- No se crea inventario `available` todavía.
- No se asigna usuario final.
- No se ejecuta QC Pass en este bloque.
- No se hace despacho.

Estados operativos usados:

- `sent_to_print`
- `print_received`
- `qa_pending`

Observación:

- El flujo deja las unidades listas para revisión de calidad. El paso de aprobación final queda para W5.39G.

## W5.39G — QC Pass / Fail y salida final a Inventario / Reserva

Este bloque cerró QC dentro de Producción.

Endpoints:

- `POST /api/admin/operations/production-orders/[id]/qa/[unitId]/pass`
- `POST /api/admin/operations/production-orders/[id]/qa/[unitId]/fail`

Checklist QC:

- NFC lee correctamente.
- QR abre pantalla correcta.
- etiqueta interna coincide.
- sticker correcto.
- empaque correcto.
- unidad sellada/lista.

Reglas:

- `QC Pass` es la única puerta hacia inventario operativo.
- Si la producción viene de un pedido interno, la unidad pasa a `available`.
- Si la producción viene de un pedido cliente/empresa, la unidad pasa a `reserved` y conserva `reservedOrderId`.
- `QC Fail` deja la unidad en `qa_failed`.
- No se crea despacho automáticamente.
- No se asigna usuario final.
- No se toca activación legacy.

Eventos:

- `QA_PASSED`
- `QA_FAILED`
- `INVENTORY_AVAILABLE`
- `UNIT_RESERVED_FOR_ORDER`
- `PRODUCTION_COMPLETED`

Pendiente para W5.39H:

- conectar despacho al flujo nuevo de QC.
