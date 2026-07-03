# W5.41H - Consistencia de estados operativos

## Pedidos

| Estado | Label |
| --- | --- |
| `pending` | Pago pendiente |
| `under_review` | Pago en revisión |
| `paid` | Pago aprobado |
| `processing` | Preparando pedido / en despacho |
| `shipped` | Pedido enviado |
| `completed` | Pedido entregado |

## Despacho

| Estado | Label |
| --- | --- |
| `pending_pick` / `pending_preparation` | Pendiente de preparación |
| `prepared` | Pedido preparado |
| `sent` / `shipped` / `dispatched` | Pedido enviado |
| `delivered` | Pedido entregado |

## Inventario

| Condición | Conteo |
| --- | --- |
| `available` | `qaStatus=passed`, `inventoryStatus=available`, `activationStatus=not_activated`, sin `reservedOrderId` |
| `reserved` | `inventoryStatus=reserved`, con `reservedOrderId`, `activationStatus=not_activated` |
| `dispatched` | `inventoryStatus=dispatched` |
| `delivered` | `inventoryStatus=delivered` si existe, o despacho entregado |
| `activated` | `activationStatus=activated` |
| `qa_pending` | `qaStatus=pending` |
| `qa_failed` | `qaStatus=failed` |

## Reglas

- La entrega física no activa chip.
- `userId` preexistente reportado por auditoría no implica activación desde Operaciones.
- El estado `completed` solo se usa cuando la entrega ya fue confirmada.
