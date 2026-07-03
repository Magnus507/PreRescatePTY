# W5.42A - Prueba operativa end-to-end controlada

## Objetivo

Validar de forma controlada el flujo operativo completo:

pedido, pago aprobado, reserva de unidad, despacho, separación, preparación, envío, entrega y activación separada.

## Reglas

- No borrar automáticamente el pedido test.
- No tocar pedidos reales.
- No tocar unidades reales fuera del pedido test.
- No activar chips desde Operaciones.
- No usar `db push`.
- No usar `migrate reset`.
- No cambiar `shortCode`.

## Pedido test

- Marcador: `W5.42A`
- `customerName`: `QA Operaciones W5.42A`
- `customerEmail`: `qa+w542a@prerescate.test`
- `safeToDelete`: `true`

## Checklist manual

### Centro > Pedidos

- [ ] Pedido test W5.42A visible.
- [ ] Estado final `Pedido entregado`.
- [ ] Ver despacho.
- [ ] Unidad reservada visible.
- [ ] No activación.

### Centro > Inventario

- [ ] Unidad `internalLabel` ya no `available`.
- [ ] Estado `dispatched` o `delivered` según el modelo.
- [ ] `activationStatus` `not_activated`.

### Centro > Despacho

- [ ] Dispatch visible.
- [ ] Unidad picked.
- [ ] Estado entregado.
- [ ] Cliente/dirección visibles.

### Cliente > Pedidos

- [ ] Pedido enviado/entregado según paso.
- [ ] Al final `Pedido entregado`.

### Cliente > Chips

- [ ] No chip activo por entrega.
- [ ] Mensaje de activar con código.

## Limpieza segura

El pedido queda marcado como `safeToDelete`.

No se borra en este bloque para preservar evidencia de la prueba.

## Plan futuro W5.42A.1

Si se decide limpiar el pedido test:

- usar un bloque separado y explícito
- borrar solo el pedido test marcado `safeToDelete`
- no tocar pedidos reales
- no tocar inventario real
- no tocar activación
