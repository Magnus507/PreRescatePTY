# Notas post-produccion del Centro de Operaciones

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
