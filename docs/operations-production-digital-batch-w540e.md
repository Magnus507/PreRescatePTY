# W5.40E - Generacion de lote digital desde Produccion

## Objetivo

Hacer que la orden de produccion pueda generar su lote digital operativo desde el flujo de Produccion, sin semantica de venta, reserva o despacho comercial.

## Cambio aplicado

- `POST /api/admin/operations/production-orders/[id]/prepare-digital-items` ahora crea o reutiliza el lote digital necesario cuando faltan items.
- Los items nuevos quedan vinculados a la orden con `productionOrderId`.
- Cada item se crea con:
  - `internalLabel`
  - `shortCode`
  - `qrUrl`
  - `nfcUrl`
  - `activationUrl`
  - `nfcProgrammed = false`
  - `qrPrepared = false`
- La pantalla de Produccion ahora muestra el estado del lote como:
  - `Generar QR/link de produccion`
  - `Actualizar preparacion digital`
- El CTA `Enviar a imprenta` sigue bloqueado hasta que todas las lineas esten completas.

## Alcance excluido

- No se uso `prisma db push`.
- No se uso `prisma migrate reset`.
- No se tocaron migraciones historicas.
- No se toco checkout legacy.
- No se tocaron `Order` / `Product` legacy.
- No se toco activacion legacy.

