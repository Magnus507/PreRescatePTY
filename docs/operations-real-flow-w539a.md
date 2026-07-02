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

## W5.39I-J-K — Despacho nuevo flujo, Inventario visual final y Movimientos/Historial

Despacho conectado al flujo real:

- solo se crea desde pedidos cliente/empresa con unidades QC aprobadas y reservadas;
- usa unidades reales por `internalLabel`;
- crea eventos `DISPATCH_CREATED` y `UNIT_ASSIGNED_TO_DISPATCH`;
- entrega deja la unidad en `delivered` con `activationStatus = not_activated`;
- no asigna usuario final.

Inventario visual final:

- las unidades son el inventario físico real;
- `available`, `reserved`, `qa_failed`, `dispatched`, `delivered`, `activated` y `delivered_pending_activation` se muestran como estados humanos;
- materiales, productos base y recursos digitales quedan como vistas separadas;
- el encabezado deja claro que el inventario real vive en unidades físicas trazables y que la entrega no asigna usuario final.

Movimientos / Historial:

- el feed consolida producción, imprenta, QC, inventario y despacho;
- el historial de una unidad puede reconstruir su vida completa por `internalLabel`;
- no expone PII ni datos médicos;
- no reescribe activación legacy ni checkout legacy.

Pendiente para W5.39L:

- smoke completo del flujo end-to-end.

## W5.39J - Inventario visual final por unidad trazable

- Se ajustaron los labels y subtítulos del bloque de Inventario para leer como flujo operativo real.
- `Unidades` pasó a `Unidades físicas`, con foco en etiqueta interna, QC, reserva, despacho y activación.
- `Recursos digitales` quedó explicitado como identidad QR/link/shortCode, no como stock físico.
- `Productos base` quedó explicitado como catálogo operativo, no como unidades disponibles.
- Se reforzó el mensaje de que la entrega no asigna usuario final y que la activación ocurre después, fuera de Operaciones.
- No se cambió backend.
- No se cambiaron endpoints.
- No se cambiaron payloads.
- No se tocaron migraciones.
- No se tocó Prisma schema.
- No se usó `prisma db push`.
- No se usó `prisma migrate reset`.
- No se tocó checkout legacy.
- No se tocó `Order` / `Product` legacy.
- No se tocó activación legacy.
- No se hizo push.

## W5.39L — Smoke completo punta a punta

Prefijo usado:

- `W539L_SMOKE_20260702T16063`

Escenario A:

- pedido interno creado
- producción creada
- QC Pass ejecutado
- 2 unidades quedaron `available`
- no se creó despacho

Escenario B:

- pedido cliente/empresa creado
- producción creada
- QC Pass ejecutado
- 2 unidades quedaron `reserved`
- despacho creado
- entrega ejecutada
- unidades quedaron `delivered` con `activationStatus = not_activated`

Escenario C:

- QC Fail validado en una unidad separada
- unidad quedó `qa_failed`
- no quedó `available`
- no quedó `reserved`

Limpieza:

- ejecutada automáticamente por el script
- `remainingSmokeRecords = 0`

Confirmaciones:

- no usuario final
- no activación desde operaciones
- no inventario sin QC Pass
- no despacho sin unidades reservadas y aprobadas
- no checkout legacy
- no Order/Product legacy
- no `db push` / `migrate reset`

Pendiente de siguiente bloque:

- W5.39M como auditoría final y pre-push.
