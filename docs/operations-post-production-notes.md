# Notas post-produccion del Centro de Operaciones

## W5.38A - Auditoria integral Centro de Operaciones

- Se audito el Centro de Operaciones post-W5.37 y post-W5.37X sin tocar codigo funcional.
- El backend operativo sigue consistente y conectado.
- Se detecto una deuda visual fuerte en Produccion por textos y diagramas conceptuales antiguos.
- Se detectaron textos densos o parcialmente crudos en Pedidos, Inventario, QA, Despacho, Postventa y Historial.
- Se documento el mapa actual de tabs, subtabs, hallazgos y un plan propuesto por bloques.
- W5.38B atendio parcialmente el hallazgo de Produccion y reemplazo la narrativa vieja por flujo real de ensamblaje/QA.
- No se toco backend.
- No se tocaron endpoints.
- No se tocaron payloads.
- No se tocaron migraciones.
- No se toco Prisma schema.
- No se uso `prisma db push`.
- No se uso `prisma migrate reset`.
- No se toco checkout legacy.
- No se toco `Order` / `Product` legacy.
- No se toco activacion legacy.
- No se hizo push.

## W5.38C - Limpieza visual Inventario

- Se separo visualmente el inventario en catalogo operativo, recursos digitales y unidades trazables.
- `Productos base` ahora se entienden como catalogo, no como stock disponible.
- `Recursos digitales` se presenta como identidad QR/link previa a la unidad fisica.
- `Unidades` se presenta como inventario real trazable por etiqueta interna y estado operativo.
- Se aclaro que la entrega no asigna usuario final y que `entregado sin activar` es una alerta operativa.
- No se toco backend.
- No se tocaron endpoints.
- No se tocaron payloads.
- No se tocaron migraciones.
- No se toco Prisma schema.
- No se uso `prisma db push`.
- No se uso `prisma migrate reset`.
- No se toco checkout legacy.
- No se toco `Order` / `Product` legacy.
- No se toco activacion legacy.
- No se hizo push.

## W5.37X - Auditoria visual de taxonomia

- Se reorganizo visualmente el Centro de Operaciones para reducir tabs principales y agrupar secciones por flujo real.
- `Recursos digitales` paso a `Inventario` como subtab interna.
- `Unidades` paso a `Inventario` como subtab interna.
- `Garantias`, `Reemplazos` y `Devoluciones` pasaron a `Postventa` como subtabs internas.
- `Produccion` agrupa ahora la vista de ordenes, ensamblaje y empaque/lotes.
- No se cambio backend.
- No se cambiaron endpoints.
- No se cambiaron payloads.
- No se tocaron migraciones.
- No se toco Prisma schema.
- No se uso `prisma db push`.
- No se uso `prisma migrate reset`.
- No se toco checkout legacy.
- No se toco `Order` / `Product` legacy.

## W5.37A - Movimiento / Proximamente

- El placeholder visible estaba en `app/(admin)/admin/_components/sections/InventoryMovementsSection.tsx`.
- Se reemplazo el texto `Proximamente` por una etiqueta neutral: `Se registra por modulo`.
- Se actualizo el estado vacio de la tabla para dejar claro que no existe un historial consolidado aun, pero que los movimientos ya se registran dentro de cada modulo operativo.
- No se creo un endpoint nuevo ni se toco Prisma.
- No se modificaron migraciones.
- No se toco checkout legacy.
- No se toco `Order` / `Product` legacy.
- No se cambio la logica de inventario ni la logica de eventos append-only.

## W5.37B - Limpieza controlada de datos smoke

- Se agrego `scripts/clean-operations-smoke-data.ts` como script destructivo protegido con confirmacion exacta.
- El script corre con `DRY_RUN` por defecto y solo limpia prefijos estrictos `W530D_SMOKE`, `W531D_SMOKE`, `W534C_SMOKE` y `W535D_SMOKE`.
- Se actualizo `scripts/README.md` con el comando exacto, advertencias y alcance.
- No se toco Prisma schema.
- No se tocaron migraciones.
- No se toco checkout legacy.
- No se toco `Order` / `Product` legacy.

## W5.37D - Reorden UI / taxonomia

- Se reordeno la barra de tabs del Centro de Operaciones para que lea como `Pedidos`, `Inventario`, `Recursos digitales`, `Produccion`, `Lotes`, `Produccion / Empaque`, `Calidad / QA`, `Despacho`, `Garantias`, `Reemplazos`, `Devoluciones`, `Movimientos` y `Historial`.
- Se renombro visualmente `Comercial` a `Pedidos`, `Inventario PT` a `Inventario` y `QC` a `Calidad / QA` en los textos principales del panel.
- `Postventa` no quedo agrupada en una sola tab en este bloque; las secciones quedaron ordenadas juntas como `Garantias`, `Reemplazos` y `Devoluciones` para evitar un refactor mas grande.
- `Empaque` quedo como etapa cercana a Produccion, visible como `Produccion / Empaque`.
- No se toco Prisma schema.
- No se tocaron migraciones.
- No se toco backend.
- No se toco checkout legacy.
- No se toco `Order` / `Product` legacy.

## W5.37E - Base real de materiales + edicion basica

- Se agrego `scripts/seed-operations-base-materials.ts` para crear o actualizar la base real de materiales por `code` sin duplicar.
- Materiales definidos:
  - `PRP-MAT-NFC-BLANK` / NFC chip en blanco / Amazon
  - `PRP-MAT-STICKER-BLANK` / Sticker en blanco / PanamaSticker
  - `PRP-MAT-ACTIVATION-CARD` / Tarjeta con codigo de activacion / presentacion / imprenta por definir
  - `PRP-MAT-PACKAGING` / Empaque / presentacion / imprenta por definir
- El QR no se modela como material separado.
- Se agrego edicion basica de material en la UI y endpoint `PATCH /api/admin/operations/materials/[id]`.
- La edicion cubre solo datos descriptivos basicos y no toca eventos, balance ni stock.
- No se tocaron migraciones.
- No se toco Prisma schema.
- No se toco backend de eventos de inventario.
- No se toco checkout legacy.
- No se toco `Order` / `Product` legacy.

## W5.37F - Productos terminados base

- Se agrego `scripts/seed-operations-base-finished-goods.ts` para crear o actualizar la base real de productos terminados por `code` sin duplicar.
- Productos definidos:
  - `PRP-FG-STICKER` / Sticker PreRescatePTY / `sticker_prerescatepty`
  - `PRP-FG-STICKER-EMP` / Sticker PreRescatePTY Empresarial / `sticker_prerescatepty_empresarial`
- El seed no crea stock inicial, no registra eventos y no asigna usuarios finales.
- Se agrego edicion basica de producto terminado en la UI y endpoint `PATCH /api/admin/operations/finished-goods/[id]`.
- La edicion cubre solo datos descriptivos basicos y no toca balance, eventos ni despacho.
- No se tocaron migraciones.
- No se toco Prisma schema.
- No se toco backend de eventos de inventario.
- No se toco checkout legacy.
- No se toco `Order` / `Product` legacy.

## W5.37G - Lote digital QR+link

- Se agrego el modelo Prisma `OperationDigitalBatch` y `OperationDigitalBatchItem` para representar lotes digitales QR+link y sus unidades numeradas.
- Cada lote guarda `productType` normal o empresarial, `finishedGoodCode`, rango numerico, cantidad total y estado operativo.
- Cada unidad guarda `internalLabel`, secuencia, URLs internas provisionales y trazabilidad de consumo.
- Se agregaron endpoints admin para listar, crear y consultar lotes digitales.
- Se agrego una UI basica en `Recursos digitales` para crear y visualizar lotes.
- El flujo sigue desacoplado de chips reales, produccion fisica, orden a imprenta y activacion final.
- No se toco checkout legacy.
- No se toco `Order` / `Product` legacy.
- No se uso stock como fuente de verdad.

## W5.37H - Orden a imprenta

- Se agrego el modelo Prisma `OperationPrintOrder` y `OperationPrintOrderItem` para enviar rangos de lotes digitales a proveedor.
- Cada orden guarda proveedor, rango enviado, producto terminado asociado y trazabilidad de items enviados/recibidos.
- Los items del lote digital pasan a `sent_to_print` al crear la orden y a `printed` al recepcionarla.
- Se agrego una UI basica en `Imprenta` para crear y consultar ordenes.
- El flujo sigue sin crear stock, sin crear producto terminado y sin tocar activacion final.
- No se toco checkout legacy.
- No se toco `Order` / `Product` legacy.
- No se uso stock como fuente de verdad.

## W5.37I - Unidad terminada por etiqueta interna

- Se agrego el modelo Prisma `OperationFinishedGoodUnit` y `OperationFinishedGoodUnitEvent` para representar una pieza operativa trazable.
- La unidad se crea desde `DigitalBatchItem` en estado `printed` y hereda `internalLabel`, producto y tipo.
- Se agrego una UI basica en `Unidades` para crear unidades desde items impresos.
- La entidad queda lista para QA, inventario por unidad y trazabilidad futura sin tocar activacion final.
- No se toco checkout legacy.
- No se toco `Order` / `Product` legacy.
- No se uso stock como fuente de verdad.

## W5.37J - Inventario por unidad / reserva

- Se habilito el listado filtrable de `OperationFinishedGoodUnit` con conteos rapidos por estado operativo.
- Se agrego la ruta `POST /api/admin/operations/finished-good-units/[id]/events` para eventos append-only de QA, reserva, liberacion, descarte y cancelacion.
- La reserva usa `reservedOrderId` y `reservedAt` sin asignar usuario final ni tocar activacion.
- La UI de `Unidades` ahora muestra unidades disponibles y reservadas con acciones basicas operativas.
- No se toco checkout legacy.
- No se toco `Order` / `Product` legacy.
- No se uso stock como fuente de verdad.

## W5.37M - QA obligatorio formal

- Se formalizo QA por unidad terminada con checklist obligatorio en `metadataJson` de `OperationFinishedGoodUnitEvent`.
- `QA_PASSED` exige controles completos y mueve la unidad a `available`.
- `QA_FAILED` deja la unidad en `qa_failed`.
- La produccion sigue creando unidades en `qa_pending`.
- No se crea stock agregado, no se reserva automaticamente, no se crea despacho y no se toca activacion ni usuario final.
- La UI de `Calidad / QA` ya expone la cola de unidades terminadas para aprobar, fallar o descartar.

## W5.37O - Entregado pero no activado

- Se agrego la condicion derivada `entregado, pendiente de activacion` para unidades con `status = delivered` y `activationStatus = not_activated`.
- La alerta se muestra como recordatorio de que la entrega fisica no asigna usuario final.
- Se agregaron conteos y filtro para identificar estas unidades en Inventario / Unidades.
- Se agrego un aviso equivalente en Despacho y un conteo en el dashboard operativo.
- No se toco el flujo de activacion.
- No se toco checkout legacy.
- No se toco `Order` / `Product` legacy.

## W5.37P - Pantalla publica QR antes de activacion

- Se agrego la ruta publica segura `app/(public)/activar/[internalLabel]/page.tsx` para mostrar el estado previo a activacion sin datos sensibles.
- Se ajusto `app/(public)/e/[shortCode]` para que el estado `unactivated` muestre una pantalla informativa y no una ficha medica.
- La pantalla pre-activacion solo expone etiqueta interna, producto y estado operativo.
- No se exponen datos medicos, personales, contactos de emergencia, pedido, despacho, proveedor ni notas internas.
- La activacion real queda pendiente para W5.37Q.
- No se tocaron migraciones, no se uso `prisma db push` y no se uso `prisma migrate reset`.
- No se toco checkout legacy ni `Order` / `Product` legacy.

## W5.37Q - Activacion conecta unidad con usuario final

- Se agrego el helper operativo `markFinishedGoodUnitActivated` en `lib/operations/activate-finished-good-unit.ts`.
- El flujo legacy de activacion de chip llama ese helper despues de activarse con exito.
- La activacion operativa busca la unidad por `internalLabel` o por `shortCode` asociado al lote digital.
- Al activarse, la unidad pasa a `activationStatus = activated`, guarda `activatedAt`, referencia de activacion y crea evento `ACTIVATED`.
- La pantalla publica `/activar/[internalLabel]` ahora muestra `Producto activado` y puede enlazar al perfil publico si existe `shortCode`.
- No se tocaron checkout legacy, `Order` / `Product` legacy ni migraciones.
- No se uso `prisma db push` ni `prisma migrate reset`.

## W5.37R - Postventa por unidad

- Se conectaron Garantias, Reemplazos y Devoluciones con `OperationFinishedGoodUnit`.
- Garantias ahora pueden abrirse contra una unidad real y registran evento `WARRANTY_OPENED` sobre la unidad.
- Reemplazos y devoluciones ya pueden apuntar a la unidad real correspondiente y dejar trazabilidad operativa por pieza.
- La UI de postventa ahora muestra la etiqueta interna de la unidad, su producto y su estado operativo/activacion.
- Se agrego una migracion pequena para los campos puente de postventa por unidad.
- No se toco checkout legacy ni `Order` / `Product` legacy.
- No se uso `prisma db push` ni `prisma migrate reset`.

## W5.37S - Movimientos automaticos unificados

- Se agrego `lib/operations/operation-movements.ts` para consolidar movimientos automaticos desde eventos reales del centro de operaciones.
- Se agrego `GET /api/admin/operations/movements` como fuente de solo lectura para el historial consolidado.
- La tab `Movimientos` dejo de ser un placeholder y ahora muestra eventos normalizados con filtros basicos.
- Se incluyeron en la linea de tiempo lotes digitales, ordenes a imprenta, pedidos comerciales, despachos y postventa, ademas de materiales, produccion, QA, empaque y unidades terminadas.
- El feed no crea stock manual, no reescribe eventos y no toca checkout legacy ni `Order` / `Product` legacy.
- No se tocaron migraciones.
- No se toco Prisma schema.

## W5.37T - Historial general consolidado

- Se agrego `lib/operations/operation-history.ts` para reconstruir historial por entidad sobre eventos y relaciones operativas existentes.
- Se agrego `GET /api/admin/operations/history` con busqueda por etiqueta, pedido, lote, despacho e imprenta.
- La tab `Historial` ahora muestra un timeline real por entidad, con sugerencias cuando la busqueda es ambigua.
- La vista es solo lectura, no permite crear, editar ni borrar eventos, y filtra datos sensibles para no exponer datos medicos ni PII innecesaria.
- No se tocaron migraciones.
- No se toco Prisma schema.

## W5.37V - Smoke test operativo completo

- Se agrego `scripts/smoke-operations-full-flow.ts` para ejecutar un smoke controlado de punta a punta con prefijo `W537V_SMOKE`.
- El smoke cubre lote digital, imprenta, ensamblaje, QA, pedido comercial, reserva, despacho, entrega, activacion operativa y postventa.
- El script incluye modo cleanup estricto por prefijo y no borra datos reales ni bases.
- Se agrego `docs/operations-full-smoke-test.md` para documentar el flujo y la limpieza del smoke.
- El smoke ejecuto correctamente, limpio todos los registros creados y termino con `remainingSmokeRecords = 0`.
- No se toco checkout legacy ni `Order` / `Product` legacy.
- No se uso `prisma db push`.
- No se uso `prisma migrate reset`.

## W5.39A - Flujo operativo real Pedidos → Producción → Inventario

- Se agrego el endpoint `POST /api/admin/operations/commercial-orders/[id]/send-to-production` para crear o vincular una orden de produccion desde Pedidos.
- La UI de Pedidos ahora expone la accion operativa `Enviar a producción` cuando detecta faltante de stock en los items.
- La orden creada se registra con marcador trazable en `notes` para evitar duplicados obvios sin tocar Prisma.
- Se documento el flujo en `docs/operations-real-flow-w539a.md`.
- No se usó `prisma db push`.
- No se usó `prisma migrate reset`.
- No se tocaron migraciones historicas.
- No se toco checkout legacy ni `Order` / `Product` legacy.

## W5.39B - Preparación digital por orden de producción

- Se reutilizo `OperationDigitalBatchItem` como lista de preparación por orden.
- Se agregaron campos puente para preparar recursos digitales por unidad.
- Se agregaron endpoints para crear la preparación y marcar NFC/QR por unidad.
- La UI de Producción ahora muestra preparación NFC / QR dentro de la orden abierta.
- La preparación no crea inventario disponible y no asigna usuario final.
- No se usó `prisma db push`.
- No se usó `prisma migrate reset`.
- No se tocaron migraciones historicas.
