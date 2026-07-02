# W5.39A — Flujo operativo real Pedidos → Producción → Inventario

Este bloque alinea el flujo operativo para que Pedidos sea el origen del movimiento hacia Producción cuando no hay stock suficiente.

## Flujo real

Pedidos → Producción → preparación digital → imprenta → recepción → ensamblaje → QC → inventario terminado → despacho → activación final por usuario.

## Alcance aplicado

- Se añadió la acción operativa para enviar un pedido comercial a producción.
- Se reutilizaron las entidades de Producción existentes.
- Se evitó tocar Prisma, migraciones y legacy fuera del alcance operativo actual.

## Regla clave

- Solo la activación final asigna usuario.
- Operaciones no asigna usuario final.

## Endpoint agregado

- `POST /api/admin/operations/commercial-orders/[id]/send-to-production`

## UI ajustada

- Pedidos ahora puede disparar el envío a producción cuando detecta faltante de stock.

## Nota

Este documento complementa la auditoría visual y las notas post-producción previas.
