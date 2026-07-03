# Reconexion UI Pedidos / pago con comprobante

## W5.40V.2

- La UI de `Pedidos` vuelve a leer el código visible del cliente como principal.
- La referencia operativa `OP-CLI` se muestra como referencia secundaria.
- Cuando existe comprobante, el pedido deja de mostrarse como "Pago pendiente" y pasa a "Pago en revisión".
- El comprobante se puede abrir desde Operaciones.
- La accion visible pasa a ser `Archivar pedido` en lugar de un borrado destructivo.
- El item muestra el flujo comercial y el flujo operativo por separado.

## Alcance

- No se toca checkout cliente.
- No se toca activacion legacy.
- No se toca QR/link/NFC.
- No se regenera shortCode.
- No se usa `prisma db push`.
- No se usa `prisma migrate reset`.
- No se hace hard delete de pedidos reales con historial.
