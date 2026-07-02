# Auditoria visual de taxonomia del Centro de Operaciones

## W5.37X - Resumen

- Se reviso la barra de navegacion del Centro de Operaciones y se redujo la cantidad de tabs principales visibles.
- `Recursos digitales` dejo de ser tab principal y paso a vivir dentro de `Inventario`.
- `Garantias`, `Reemplazos` y `Devoluciones` quedaron agrupadas dentro de `Postventa`.
- `Produccion`, `Empaque` y la referencia a lotes quedaron agrupadas dentro de `Produccion`.
- No se cambio backend, endpoints, payloads, modelos ni reglas operativas.
- No se toco Prisma.
- No se crearon migraciones.
- No se uso `prisma db push`.
- No se uso `prisma migrate reset`.
- No se toco checkout legacy.
- No se toco `Order` / `Product` legacy.

## Tabs anteriores

- `Panel operativo` -> resumen general del flujo.
- `Pedidos` -> vista comercial.
- `Inventario` -> inventario fisico.
- `Recursos digitales` -> lote digital QR+link.
- `Imprenta` -> ordenes a proveedor.
- `Unidades` -> unidades terminadas trazables.
- `Produccion` -> cola de produccion.
- `Lotes` -> lote operativo / batch creation.
- `Produccion / Empaque` -> empaque.
- `Calidad / QA` -> control de calidad.
- `Despacho` -> entregas y reservas.
- `Garantias` -> postventa de garantia.
- `Reemplazos` -> postventa de reemplazo.
- `Devoluciones` -> postventa de devolucion.
- `Movimientos` -> historial consolidado de eventos.
- `Historial` -> timeline por entidad.

## Tabs nuevos

- `Panel operativo`
- `Pedidos`
- `Inventario`
- `Imprenta`
- `Produccion`
- `Calidad / QA`
- `Despacho`
- `Postventa`
- `Movimientos`
- `Historial`

## Agrupaciones realizadas

- `Inventario` ahora contiene subtabs para `Resumen inventario`, `Unidades`, `Recursos digitales` y `Productos base`.
- `Produccion` ahora contiene subtabs para `Ordenes`, `Ensamblaje` y `Empaque / Lotes`.
- `Postventa` ahora contiene subtabs para `Garantias`, `Reemplazos` y `Devoluciones`.
- La taxonomia visual refleja mejor el flujo real sin eliminar funcionalidades.

## Verificacion de alcance

- Los mismos componentes siguen montando los mismos endpoints existentes.
- No se modificaron nombres de endpoints.
- No se modificaron payloads.
- No se modificaron modelos.
- No hubo migracion de base de datos.
- No hubo cambios en legacy.
