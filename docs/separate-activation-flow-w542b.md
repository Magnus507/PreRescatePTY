# W5.42B - Activación separada con código del producto después de entrega

## Objetivo

Validar que la entrega física no activa el chip y que la activación solo ocurre con el código del producto desde la cuenta del cliente.

## Reglas

- No activar desde Operaciones.
- No cambiar `shortCode`.
- No regenerar QR.
- No regenerar NFC.
- No cambiar `internalLabel`.
- No borrar pedidos.
- No borrar unidades.
- No usar `db push`.
- No usar `migrate reset`.

## Hallazgo operativo

El flujo real de activación usa:

- `activationCode` de `ChipClaimToken`
- endpoint `POST /api/chips/activate`
- entrada pública `dashboard/chips?activate=true`

La pantalla pública `/activar/[internalLabel]` solo redirige/expone el estado operativo.

## Estado del test W5.42A

- Pedido: `PR-2026-001415`
- Unidad: `PROD-INT-0013-0001`
- Dispatch: `DSP-PR-2026-001415`
- Estado de unidad: `delivered`
- `activationStatus`: `not_activated`

## Resultado de auditoría

La activación separada no está lista para ejecución real en este momento porque el pedido test W5.42A no tiene `ChipClaimToken` asociado y no existe un chip vinculado al `internalLabel` test.

## Dry-run

El script `scripts/e2e-separate-activation-flow-w542b.ts` corre en dry-run por defecto y deja trazado:

- endpoint que usaría
- código enmascarado
- bloqueos de seguridad
- cambios esperados

## Validación del endpoint

Se endureció `POST /api/chips/activate` para exigir que el producto asociado esté listo para activación:

- `activationStatus = not_activated`
- estado `dispatched` o `delivered`

Así se evita activar algo que todavía no pasó por la entrega física.

## Resultado final

Con la evidencia actual, W5.42B queda como revisión protegida y dry-run listo.
La activación real queda bloqueada hasta tener un token/cuenta de cliente válidos para el test.
