# W6.05G-H — Fix: Código duplicado de pedido interno y modal cortado

## 1. Problema detectado

Al crear una “Reposición de inventario” desde Admin → Centro de Operaciones → Pedidos, ocurrían dos fallos:

1. **Código duplicado**: el sistema intentaba generar `INT-0001`, pero ya existían órdenes `PROD-INT-0001`, `PROD-INT-0002`, `PROD-INT-0003`. El flujo interno crea primero un `OperationCommercialOrder` con código `INT-XXXX` y luego una `OperationProductionOrder` con código `PROD-INT-XXXX`. Si la generación del código interno se basaba en un cálculo frágil, podía chocar con códigos ya usados o con la propia secuencia interna.
2. **Modal cortado**: el modal “Reposición de inventario” quedaba con la parte inferior fuera de pantalla en algunos viewports, imposibilitando usar los botones.

## 2. Causa raíz

### Código duplicado
- La generación del código de `OperationCommercialOrder` para pedidos internos se apoyaba en un helper que buscaba códigos existentes y sumaba 1, pero sin validar colisiones en la misma transacción y sin retry.
- Al ya existir `INT-0001`/`PROD-INT-0001`…, un nuevo cálculo podía repetir secuencia o perder sincronización con la tabla, derivando en `P2002` (unique constraint) o en un código duplicado.

### Modal cortado
- El modal usaba `max-h-[calc(100vh-48px)]` con un overlay de `p-6`. En viewports chicos o con zoom/scroll, el contenido real del modal se desbordaba y los botones quedaban ocultos.
- Otros modales del admin ya usan un patrón más seguro: `max-h-[92vh]` + `p-4` en el overlay.

## 3. Fix aplicado

### Backend — generación segura de código interno
Archivo: `app/api/admin/operations/commercial-orders/route.ts`

Cambios:
- Se envolvió la generación del código en un loop de hasta 5 intentos.
- Cada intento:
  1. Recalcula el máximo secuencial existente para el prefijo `INT-`.
  2. Propone el siguiente código.
  3. Verifica con `findUnique` que no exista antes de continuar.
  4. Si existe, espera 50ms/100ms/150ms… y reintenta.
- Si después de 5 intentos hay colisión, lanza `COMMERCIAL_ORDER_CODE_COLLISION`.
- Se agregó manejo explícito de ese error en el `catch` del `POST`, retornando `409` con mensaje claro: “No se pudo generar un código interno único. Intenta nuevamente.”

Por qué este fix:
- Evita hardcodear valores.
- No resetea secuencias.
- No borra datos.
- Es robusto frente a condiciones de carrera.
- Mantiene el formato `INT-0001`, `INT-0002`, etc.

### Frontend — modal de reposición de inventario
Archivo: `app/(admin)/admin/_components/sections/PedidosSection.tsx`

Cambios:
- Overlay: de `p-6` a `p-4`.
- Contenedor del modal: de `max-h-[calc(100vh-48px)]` a `max-h-[92vh]`.
- Se mantiene `overflow-y-auto` para permitir scroll interno sin cortar botones.

Por qué este fix:
- Hace que el modal sea utilizable en desktop y mobile.
- Sigue el patrón usado por otros modales del admin.
- No altera la lógica del formulario ni del flujo.

## 4. Qué NO se tocó

- `schema.prisma`
- migraciones
- `Product`
- `ProductOperationalMapping`
- `OperationFinishedGood`
- `OperationFinishedGoodUnit`
- endpoints de tienda
- flujos de activación
- pedidos de cliente
- pagos
- stock/órdenes existentes

## 5. Validaciones

- `git status --short`: solo archivos editados intencionalmente.
- `git diff`: cambios aislados en backend y frontend.
- `git diff --check`: sin errores de whitespace.
- `npx prisma validate`: schema válido.
- `npm run typecheck`: typecheck pasa.
- `npm run build`: build exitoso.

## 6. Archivos modificados

- `app/api/admin/operations/commercial-orders/route.ts`
- `app/(admin)/admin/_components/sections/PedidosSection.tsx`

## 7. Reporte final

| Aspecto | Resultado |
|---|---|
| Backend tocado | Sí |
| Frontend tocado | Sí |
| Prisma modificado | No |
| Migraciones | No |
| Endpoints modificados | `POST /api/admin/operations/commercial-orders` |
| Causa INT-0001 duplicado | Generación sin retry/validación de colisión |
| Cómo se corrige código | Loop 5 intentos + `findUnique` + backoff + error 409 |
| Cómo se corrige modal | `max-h-[92vh]` + overlay `p-4` |
| Se borraron órdenes | No |
| Se creó stock desde script | No |
| Validaciones | prisma/typecheck/build OK |
| Estado Git | Workspace limpio salvo cambios controlados |
| Commit | `W6.05G-H fix internal production order code and modal` |
| Push | Sí |