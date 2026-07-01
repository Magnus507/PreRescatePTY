# W5.37V — Smoke test operativo completo

- Fecha: 2026-07-01
- Prefijo usado: `W537V_SMOKE_20260701T22564`
- Estado: ejecutado y limpiado

## Flujo cubierto

- Materiales base verificados por reutilización
- Producto terminado base reutilizado
- Lote digital QR+link
- Orden a imprenta
- Ensamblaje de unidades
- QA formal
- Pedido comercial operativo
- Reserva de unidades
- Despacho físico
- Entrega
- Activación operativa
- Garantía
- Reemplazo
- Devolución
- Movimientos automáticos
- Historial general

## Limpieza

- La limpieza queda restringida al prefijo `W537V_SMOKE`
- No borra datos base ni datos legacy
- No toca usuarios, perfiles médicos ni chips reales

## Resultados

- Digital batches creados: 1
- Digital batch items creados: 3
- Print orders creados: 1
- Print order items creados: 3
- Production orders creadas: 1
- Units creadas: 3
- Commercial orders creados: 1
- Dispatches creados: 1
- Warranty records creados: 1
- Replacement records creados: 1
- Return records creados: 1
- Movements detectados: 28
- Timeline de historial: 10 eventos
- Remaining smoke records: 0
- Cleanup ejecutado: si

## Validaciones esperadas

- No queda data smoke al final
- No se usa `prisma db push`
- No se usa `prisma migrate reset`
- No se toca checkout legacy
- No se toca `Order` / `Product` legacy
- No se reescribe activación legacy
