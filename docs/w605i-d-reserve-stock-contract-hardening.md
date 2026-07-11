# W6.05I-D Reserve Stock Contract Hardening

## Resumen ejecutivo

Se endureció el contrato del endpoint `reserve-stock` sin cambiar la lógica funcional de reserva. La mejora agrega dos campos explícitos de respuesta y un filtro técnico faltante para dejar más claro el estado del inventario candidato al momento de reservar.

La reserva sigue siendo idempotente, sigue usando la misma política de pago y sigue sin tocar producción, despacho, entrega o activación.

## Matices detectados en I-C

- el contrato no exponía `availableQty` ni `targetReservationQty`;
- la selección de candidatas no filtraba `dispatchId = null` de forma explícita;
- funcionalmente la acción seguía siendo segura, pero el contrato podía ser más claro para auditoría y soporte.

## Cambio aplicado

### Filtro explícito

Se agregó el equivalente relacional a `dispatchId: null` en la selección de unidades candidatas para reserva:

- `dispatchItems: { none: {} }`

La unidad candidata ahora debe cumplir:

- `status = available`;
- `qaStatus = passed`;
- `activationStatus = not_activated`;
- `productCode` correcto;
- `reservedOrderId = null`;
- sin despacho asociado.

### Campos de respuesta

Se añadieron estos campos al response:

- `availableQty`;
- `targetReservationQty`.

## Qué significan los nuevos campos

- `availableQty`: cantidad de unidades candidatas disponibles al momento de la acción;
- `targetReservationQty`: cantidad que el endpoint intentó reservar en esta llamada después de aplicar el límite por cantidad pedida y por lo ya reservado;
- `newlyReservedQty`: cuántas unidades se reservaron efectivamente;
- `requestedQty`: cantidad objetivo del pedido en esta acción.

## Qué no cambió

- no se tocó `schema.prisma`;
- no se hicieron migraciones;
- no se modificó la política de `paymentStatus`;
- no se cambió la idempotencia;
- no se cambió la lógica de pedidos mixtos;
- no se cambió el FIFO;
- no se cambió `release-reservation`;
- no se tocaron producción, despacho, entrega o activación;
- no se reservaron ni liberaron unidades en pruebas.

## Validaciones

- `git status --short`
- `git diff`
- `git diff --check`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`

## Skills usadas

- `prerescate-rules`
- `verification-loop`
- `api-design`
- `backend-patterns`
- `security-review`
- `error-handling`
- `coding-standards`

## Conclusión

El endpoint quedó más explícito para auditoría y soporte, sin alterar su comportamiento operativo principal. El hardening reduce ambigüedad en el contrato y deja más clara la ventana real de stock reservable.
