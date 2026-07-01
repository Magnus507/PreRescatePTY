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
