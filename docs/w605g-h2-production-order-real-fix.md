# W6.05G-H2 Production Order Real Fix

## Resumen

Este cierre documenta el fix real aplicado al flujo de reposición interna y al modal de creación de pedido interno en Admin.

## Por qué H no bastó

El fix anterior corregía parcialmente la generación de código, pero seguía mezclando dos secuencias distintas:

- `OperationCommercialOrder.code` para el pedido interno comercial.
- `OperationProductionOrder.code` para la orden de producción derivada.

El problema visual también persistía porque el modal seguía limitado por una altura rígida.

## Causa real

La colisión real ocurría en `OperationProductionOrder.code`, no en el pedido comercial.

Durante la creación de un pedido interno:

- el pedido comercial se generaba como `INT-####`;
- la orden de producción se generaba como `PROD-INT-####`;
- ya existían `PROD-INT-0001`, `PROD-INT-0002` y `PROD-INT-0003`;
- por tanto, el siguiente código seguro era `PROD-INT-0004`.

## Códigos existentes

Se auditó el data existente en modo lectura y se confirmó:

- `PROD-INT-0001`
- `PROD-INT-0002`
- `PROD-INT-0003`

No se borró ni modificó ningún registro.

## Nuevo helper

Se agregó `lib/operations/order-code.ts` para centralizar la generación secuencial por prefijo y modelo.

Características:

- calcula el máximo real por prefijo;
- valida existencia antes de crear;
- usa retry controlado con backoff;
- diferencia entre modelo comercial y modelo de producción;
- evita mezclar secuencias como `INT-####` y `PROD-INT-####`.

## Endpoints modificados

- `app/api/admin/operations/commercial-orders/route.ts`
- `app/api/admin/operations/commercial-orders/[id]/send-to-production/route.ts`

Cambios:

- el pedido interno comercial ahora usa el helper de secuencia segura;
- la producción interna ya no deriva el código con concatenación directa;
- ambos flujos usan prefijos correctos por modelo;
- la colisión de `P2002` se maneja con retry controlado;
- si la secuencia no puede resolverse, responde `409` con mensaje claro.

## Fix del modal cortado

Se corrigió el modal de reposición para que no quede cortado verticalmente:

- overlay `fixed inset-0`;
- `overflow-y-auto` en el overlay;
- padding vertical del contenedor;
- margen superior e inferior (`my-6`);
- el footer ya no queda fuera de pantalla;
- el modal funciona mejor en viewport bajos y móviles.

Archivo tocado:

- `app/(admin)/admin/_components/sections/PedidosSection.tsx`

## Garantías de seguridad operativa

- No se borró nada.
- No se creó stock desde script.
- No se hicieron migraciones.
- No se tocó `schema.prisma`.
- No se ejecutó `prisma db push`.
- No se ejecutó `prisma migrate reset`.
- No se crearon pedidos de prueba.

## Validaciones

Se ejecutó y confirmó:

- `git diff --check`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build` intentado; el entorno falló por `ENOSPC` al escribir cache de webpack

## Estado esperado

Con los datos actuales, el siguiente código seguro para producción interna es:

- `PROD-INT-0004`
