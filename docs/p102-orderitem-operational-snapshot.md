# P1-02 - Persistencia de identidad operativa en OrderItem

**Fecha de corte:** 14 de julio de 2026

**Commit base auditado:** `228588f`

**Alcance:** persistencia de snapshot operativo en `OrderItem`, callers modernos de pedidos, worker durable P1-01, pruebas y documentación.

**Fuera de alcance:** migraciones destructivas, backfill histórico, cambios en inventario, producción, despacho, activación, alertas, Stripe y refactor del flujo legacy de paquetes.

**Tipo:** cambio de esquema y de escritura de pedido con compatibilidad hacia atrás.

## 1. Resumen ejecutivo

`OrderItem` ahora conserva la identidad operativa mínima necesaria para reconstruir un pedido moderno de forma determinista después del commit original. La fase no copia un `Product` completo; solo persiste snapshot y referencias opcionales suficientes para que el worker y los procesos posteriores no dependan de memoria o de nombres derivados.

## 2. Problema previo

Antes de esta fase, el pedido moderno resolvía en memoria:

- `productId`
- `operationalMappingId`
- `operationalFinishedGoodId`
- `operationalProductCode`
- `operationalProductName`

Pero esa información no quedaba persistida en `OrderItem`, así que:

- un retry futuro podía perder el contexto original;
- un cambio posterior del catálogo podía alterar silenciosamente el significado histórico;
- la outbox P1-01 dependía de datos de request o de inferencias por nombre.

## 3. Diseño de datos

Se agregaron campos opcionales a `OrderItem`:

- `productId`
- `productName`
- `productCode`
- `operationalMappingId`
- `operationalMappingStatus`
- `operationalFinishedGoodId`
- `operationalProductCode`
- `operationalProductName`

### Principio

El item conserva:

1. relación viva al producto cuando existe;
2. snapshot operativo histórico;
3. estado unmapped cuando no hay mapping válido.

### Compatibilidad

Los campos son opcionales para no romper órdenes históricas ni flujos legacy que no tienen `Product` real.

## 4. Relación y seguridad

Se agregó relación opcional hacia `Product` con `onDelete: SetNull`.

No se agregaron cascadas destructivas para preservar legibilidad histórica del pedido.

No se creó relación forzada hacia mapping o finished good porque la prioridad es la sobrevivencia del snapshot histórico incluso si el catálogo cambia o desaparece.

## 5. Migración

La migración es no destructiva:

- añade columnas nuevas;
- crea índices para consultas por `productId` y campos operativos;
- no backfillea automáticamente datos históricos;
- no fuerza `NOT NULL`.

El backfill, si se decide, debe hacerse en fase separada y con reglas explícitas, no por inferencia de nombres.

## 6. Callers modernos actualizados

Se actualizó la escritura de `OrderItem` en:

- `/api/orders`
- `app/api/organizations/corporate-orders/route.ts`
- `app/api/organizations/corporate-orders/from-requests/route.ts`

Cada uno persiste snapshot operacional al momento de crear el pedido.

## 7. Legacy mantenido separado

No se alteró el flujo manual legacy de paquetes.

Los flujos legacy pueden seguir escribiendo `OrderItem` sin snapshot operativo completo. En esos casos los nuevos campos quedan `null`.

## 8. Unmapped

Cuando un item no tiene mapping operativo válido:

- se puede conservar `productId` si existe;
- los campos operativos quedan `null` o con estado derivable;
- el pedido no inventa un finished good falso;
- la outbox lo clasifica como error permanente o corrección manual, no como retry infinito.

## 9. Worker durable

El worker P1-01 deja de depender del payload en memoria para reconstruir el sync.

Ahora:

- busca la orden;
- lee `OrderItem` persistido;
- reconstruye el `SyncRealOrderToOperationsInput`;
- rechaza items unmapped;
- materializa Operations solo desde snapshot persistido.

## 10. Qué cambió

- El pedido moderno conserva identidad operativa histórica.
- Los retries ya no dependen de la request original.
- Cambios futuros del catálogo no alteran pedidos viejos.

## 11. Qué no cambió

- No se convirtió `OrderItem` en copia completa de `Product`.
- No se tocó el flujo legacy manual.
- No se eliminó el outbox P1-01.
- No se hizo backfill destructivo.

## 12. Validaciones

Validaciones previstas:

- `git diff`
- `git diff --check`
- `git status --short`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`
- pruebas focalizadas del worker y del caller moderno

## 13. Impacto

Impacto funcional:

- pedido histórico más estable;
- reconstrucción determinista del sync;
- menor riesgo de drift por cambios de catálogo.

Impacto técnico:

- cambios en schema;
- migración no destructiva;
- escritura de items más rica en callers modernos;
- worker más robusto.

## 14. Conclusión explícita

**¿Un OrderItem moderno conserva suficiente identidad operativa para reconstruir su sync original? Sí.**

**¿Se mantiene el flujo legacy separado? Sí.**
