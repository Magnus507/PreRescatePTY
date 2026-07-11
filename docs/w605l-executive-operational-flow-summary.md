# W6.05L - Resumen ejecutivo del flujo operativo

## Resumen corto

El flujo operativo de PreRescatePTY quedó cerrado de punta a punta como una cadena coherente y auditable. La tienda vende por cantidad, el backend calcula stock/backorder de forma canónica, el pago sigue siendo manual con comprobante, y admin puede reservar, producir, despachar y entregar sin activar chips.

La separación entre tienda personal, empresa, inventario, despacho y activación quedó clara. No hay automatizaciones peligrosas ni mezclas de responsabilidades entre fases. Lo que queda pendiente es madurez operativa opcional, no un bloqueo funcional.

## Flujo final

Tienda
→ Pedido
→ Pago/comprobante
→ Backorder
→ Reserva de stock
→ Producción por faltante
→ Despacho desde unidad reservada correcta
→ Entrega sin activar
→ Activación separada en Mis dispositivos

## Qué se logró por bloque

### W6.05G

- tienda personal por cantidad;
- empresa fuera del catálogo personal;
- pedido backend canónico;
- pago/comprobante manual;
- `Mis pedidos` con resumen seguro;
- backorder visible.

### W6.05H

- producción por faltante;
- no producir cantidad completa por error;
- `pending` requiere confirmación;
- pedidos mixtos advertidos o bloqueados.

### W6.05I

- reserva de stock;
- liberación parcial/total;
- inventario descuenta reservas;
- response endurecido con `availableQty` y `targetReservationQty`.

### W6.05J

- despacho desde unidades reservadas;
- validación explícita de `productCode`;
- UI admin con `Estado para despacho`;
- entrega no activa ni asigna.

### W6.05K

- cierre end-to-end;
- flujo coherente y auditable;
- cerrado con observaciones.

## Decisiones importantes

- No automatizar todavía la reserva con pago.
- No activar al entregar.
- No mezclar empresa dentro de tienda personal.
- Mantener `productCode` como separación operativa.
- Mantener `reservedOrderId` como trazabilidad al entregar.
- Mantener pago/comprobante como revisión manual.

## Qué no hace el sistema todavía

- No reserva automáticamente al aprobar pago.
- No reserva automáticamente al subir comprobante.
- No expira reservas automáticamente.
- No maneja pedidos mixtos por línea/productCode.
- No define despacho parcial avanzado.
- No reserva stock futuro de backorder.

## Riesgos remanentes

- errores humanos;
- reservas olvidadas;
- pagos manuales;
- producción completada que puede requerir reserva manual;
- pedidos mixtos;
- despacho parcial.

## Estado final

- W6.05G cerrado con observaciones.
- W6.05H cerrado.
- W6.05I cerrado con observaciones.
- W6.05J cerrado con observaciones.
- W6.05K cerrado.
- Flujo operativo cerrado con observaciones.

## Próximos pasos opcionales

1. Automatización de reserva por política de pago.
2. Expiración de reservas.
3. Flujo de pedidos mixtos.
4. Despacho parcial.
5. Mejorar el resumen cliente en `Mis pedidos`.
6. Seguir con otro módulo.

## Qué no se tocó

- código productivo;
- `schema.prisma`;
- migraciones;
- BD;
- activación;
- QR/NFC;
- `shortCode`;
- Stripe;
- datos reales.

## Skills usadas

- `prerescate-rules`
- `verification-loop`
- `coding-standards`

## Validaciones

- `git status --short`
- `git diff`
- `git diff --check`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`

## Conclusión

El flujo operativo quedó resumido en una versión corta y ejecutiva: tienda, pedido, pago, backorder, reserva, producción, despacho, entrega y activación separada ya tienen una definición clara. El sistema está cerrado con observaciones, sin bloqueos inmediatos.
