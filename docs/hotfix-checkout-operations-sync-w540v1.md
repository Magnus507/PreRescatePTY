# Hotfix checkout cliente / sync a Operaciones

## W5.40V.1

- Se corrigio el punto donde la sincronizacion a Operaciones podia romper la compra real del cliente.
- El pedido real ahora se crea primero y la sincronizacion operativa pasa a ser no bloqueante.
- Si el sync falla, se registra warning y log, pero la compra no se revierte.
- El webhook de pago sigue procesando el pago principal y solo intenta sincronizar Operaciones en segundo plano.

## Alcance

- No se toco activacion legacy.
- No se toco QR/link/NFC.
- No se cambio shortCode.
- No se asigna usuario final desde Operaciones.
- No se activa desde Operaciones.
- No se uso `prisma db push`.
- No se uso `prisma migrate reset`.
- No se modificaron migraciones historicas.

## Nota

- Los combos siguen mapeandose hacia stock operativo cuando hay datos suficientes.
- Si el mapeo queda incompleto, la compra no se bloquea y el pedido operativo queda marcado para revision.
