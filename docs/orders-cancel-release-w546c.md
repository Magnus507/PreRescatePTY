# W5.46C - Cancelados y liberación segura de reservas

## Pestaña Cancelados

La sección de Admin > Pedidos ahora incluye un filtro `Cancelados` para revisar pedidos con estado cancelado o rechazo de pago tratado como cancelación operativa.

La vista principal no mezcla pedidos cancelados con el resto del flujo operativo.

## Regla de liberación

Cuando se cancela un pedido, las unidades reservadas solo se liberan si siguen en reserva simple.

Una unidad es elegible si:

- `reservedOrderId` coincide con el pedido
- `status === "reserved"`
- `dispatchId` no existe
- `dispatchedAt` es nulo
- `deliveredAt` es nulo
- `activatedAt` es nulo
- `activationStatus !== "activated"`

Al liberar:

- `status` pasa a `available`
- `reservedOrderId` pasa a `null`
- `reservedAt` pasa a `null`

No se modifica:

- `internalLabel`
- `shortCode`
- `qaStatus`
- `activationStatus`
- `digitalBatchId`
- `digitalBatchItemId`
- `printOrderId`
- activación
- QR/NFC

## Unidades bloqueadas

No se liberan unidades que ya avanzaron a:

- despacho
- entrega
- activación

Si existen unidades bloqueadas, la cancelación normal se rechaza con revisión manual.

## Auditoría y dry-run

Lectura:

```bash
npx tsx scripts/audit-cancel-order-release-w546c.ts --code PR-2026-000261
```

Simulación:

```bash
npx tsx scripts/audit-cancel-order-release-w546c.ts --code PR-2026-000261 --dry-run-cancel
```

Ejecución controlada:

```bash
npx tsx scripts/audit-cancel-order-release-w546c.ts --code PR-2026-000261 --execute-cancel --confirm CANCEL_RELEASE_W546C
```

La ejecución controlada solo debe usarse con autorización explícita del operador.
