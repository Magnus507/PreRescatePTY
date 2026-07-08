# Orders Actions Map W5.42G.2

| Acción UI | Endpoint real | Método | Fuente | Modifica | No toca | Nota |
| --- | --- | --- | --- | --- | --- | --- |
| Crear pedido interno | `/api/admin/operations/commercial-orders` | `POST` | `PedidosSection` | `operationCommercialOrder`, `operationCommercialOrderItem`, `operationProductionOrder` | Schema, activación, QR/NFC, shortCode, internalLabel | Crea pedido interno/comercial para reposición. |
| Actualizar | `/api/admin/orders` y `/api/admin/operations/commercial-orders` | `GET` | `PedidosSection` | Lectura de pedidos y pedidos internos | Datos operativos | Refresca ambas fuentes. |
| Aprobar pago | `/api/admin/orders/[id]/approve` | `POST` | `PedidosSection` | Estado de pedido y revisión | Activación, QR/NFC, shortCode, internalLabel | Flujo manual o corporativo según backend. |
| Rechazar pago | `/api/admin/orders/[id]/reject` | `POST` | `PedidosSection` | Estado de pedido y revisión | Activación, QR/NFC, shortCode, internalLabel | Rechazo con motivo. |
| Reservar etiqueta interna | `/api/admin/operations/commercial-orders/[id]/reserve-units` | `POST` | `PedidosSection` | `operationFinishedGoodUnit`, eventos de unidad, estado comercial | Activación, QR/NFC, shortCode, internalLabel | La ruta exacta `orders/[id]/reserve-units` no existe. |
| Enviar a despacho | `/api/admin/orders/[id]/send-to-dispatch` | `POST` | `PedidosSection` | `operationDispatch`, estado del pedido, eventos de despacho | Activación, QR/NFC, shortCode, internalLabel | Para pedidos con unidades reservadas. |
| Ver despacho | `/api/admin/operations/dispatches` | `GET` | `PedidosSection` | Lectura | Datos operativos | La UI enlaza al contexto de despacho. |
| Ver producción | `/api/admin/operations/production-orders` | `GET` | `PedidosSection` | Lectura | Datos operativos | Refleja producción vinculada. |
| Cancelar / ocultar | `/api/admin/orders/[id]/delete` | `POST` | `PedidosSection` | `orderStatus`, `paymentStatus`, `auditLog` | Unidades físicas, producción, despacho, activación, QR/NFC, shortCode, internalLabel | No existe una ruta dedicada `archive`; el texto UI debe decir la verdad. |
| Eliminar permanentemente | `/api/admin/orders/[id]/permanent-delete` | `POST` | `PedidosSection` | `order`, `orderItem`, `auditLog` | Activación, QR/NFC, shortCode, internalLabel | Solo superadmin y con bloqueos de trazabilidad. |

## Notas operativas
- No existe `/api/admin/orders/[id]/reserve-units`.
- No existe `/api/admin/orders/[id]/archive`.
- La reserva real vive bajo `operations/commercial-orders`.
- Pedidos no activa chips.
- Pedidos no asigna usuario final.
- Pedidos no toca QR/NFC, shortCode ni internalLabel.
