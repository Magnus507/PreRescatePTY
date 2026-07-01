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
