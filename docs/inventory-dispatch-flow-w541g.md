# W5.41G - Inventario real por producto y despacho desde unidades reservadas

## Objetivo

Hacer visible el inventario físico real por producto y trabajar el despacho sobre unidades reservadas, sin activar chips ni asignar usuario final desde Operaciones.

## Inventario

- Cada producto terminado muestra su stock real.
- El detalle se consulta por `productCode`.
- La vista por producto expone unidades físicas por `internalLabel`.
- Los estados visibles son:
  - `available`
  - `reserved`
  - `qa_pending`
  - `qa_failed`
  - `dispatched`
  - `delivered`
  - `activated`
- `available` requiere `qaStatus=passed`, `inventoryStatus=available`, `activationStatus=not_activated` y sin `reservedOrderId`.
- `reserved` requiere `inventoryStatus=reserved` con `reservedOrderId`.
- `dispatched` y `delivered` no activan chips.

## Unidades

Cada unidad muestra:

- `internalLabel`
- `shortCode`
- `qaStatus`
- `inventoryStatus`
- `activationStatus`
- `reservedOrderId`
- `dispatchId`

## Reglas operativas

- Reservar resta de inventario disponible.
- Despacho trabaja sobre unidades ya reservadas.
- Preparación y salida usan la trazabilidad física por etiqueta interna.
- Entregar no activa chips.
- Entregar no asigna usuario final.

## Auditoría

Script de solo lectura:

```bash
npx tsx scripts/audit-inventory-dispatch-flow-w541g.ts
```

## Notas

- No se usa `prisma db push`.
- No se usa `prisma migrate reset`.
- No se modifican migraciones históricas.
- No se toca activación.
- No se toca QR/link/NFC.
