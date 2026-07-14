# P1-01 - Sincronización durable Commerce -> Operations

**Fecha de corte:** 14 de julio de 2026

**Commit base auditado:** `da07444` y estado de trabajo posterior a la fase P0-06

**Alcance:** caller moderno de `/api/orders`, caller corporativo de órdenes, cola durable, worker de sincronización, reconciliación, pruebas y documentación.

**Fuera de alcance:** `schema.prisma` de negocio no relacionado, migraciones de otros dominios, inventario, producción, QA, despacho, activación, alertas de emergencia, Stripe, flujos legacy manuales y limpieza general.

**Tipo:** implementación incremental con evidencia local; no modifica el contrato funcional del flujo legacy.

## 1. Resumen ejecutivo

La sincronización Commerce -> Operations dejó de depender de una llamada best-effort posterior al commit para los callers modernos. Ahora los pedidos modernos generan una intención durable en una outbox transaccional y un worker separado ejecuta la sincronización con retry y reconciliación.

La decisión de diseño es conservadora: preservar el flujo legacy manual y de paquetes sin mezclarlo con esta fase. El objetivo es evitar que una falla transitoria deje una orden moderna sin rastro durable de sincronización.

## 2. Problema previo

Antes de esta fase, los callers modernos creaban la orden comercial y luego intentaban sincronizar en la misma request, pero fuera del propósito durable:

- si la request terminaba después del commit, no había reintento automático;
- si la sincronización fallaba, el caller solo podía registrar o propagar el error;
- `OrderItem` no transporta identidad operacional suficiente para reconstruir por retry el contexto original;
- el marcador de idempotencia vivía dentro de `notes`, mezclando dato humano con clave técnica.

## 3. Contrato expandido del sync

El sync ahora tiene tres capas:

1. **Intención durable**: la request crea un registro en `CommerceOrderSyncOutbox` dentro de la misma transacción que la `Order`.
2. **Ejecución asíncrona**: un worker de cron toma lotes pendientes o reintentables y ejecuta `syncRealOrderToOperations`.
3. **Reconciliación**: una ruta de cron expone un resumen para detectar pendientes, atascos, fallas y pares fuente duplicados.

El contrato ya no es “sincronizar inmediatamente o fallar”; ahora es “registrar durablemente la intención, sincronizar en background y reintentar hasta resolver o marcar falla permanente”.

## 4. Tabla de caller auditados

| Archivo | Responsabilidad | Runtime | Legacy | Histórico | Puede eliminarse | Debe mantenerse |
|---|---|---|---|---|---|---|
| `app/api/orders/route.ts` | Compra personal moderna | Sí | No | No | No | Sí |
| `app/api/organizations/corporate-orders/route.ts` | Compra corporativa moderna | Sí | No | No | No | Sí |
| `app/api/organizations/corporate-orders/from-requests/route.ts` | Compra corporativa desde requests | Sí | No | No | No | Sí |
| `app/api/orders/manual/route.ts` | Flujo manual/legacy | Sí | Sí | No | No en esta fase | Sí, separado |
| `app/api/cron/commerce-order-sync/route.ts` | Worker y reconciliación | Sí | No | No | No | Sí |
| `lib/operations/sync-real-order-to-operations.ts` | Materialización operacional | Sí | No | No | No | Sí |
| `lib/operations/commerce-order-sync-outbox.ts` | Outbox, claim, retry | Sí | No | No | No | Sí |
| `tests/lib/commerce-order-sync-outbox.test.ts` | Cobertura del worker y outbox | Sí | No | No | No | Sí |
| `tests/routes/orders-outbox.test.ts` | Cobertura de caller moderno | Sí | No | No | No | Sí |

## 5. Dependencias

El flujo durable depende de:

- `prisma` y `prisma migrate` para persistir outbox y fuente operacional;
- `next` routes para registrar intención y exponer el worker;
- `vitest` para verificar en unidad la cola y el caller;
- `logger` para observabilidad del worker;
- el helper de sincronización operacional existente.

No introduce dependencia nueva de proveedor externo para el mecanismo durable. La sincronización ya no depende de Stripe ni de un sistema de colas externo para cumplir el contrato mínimo.

## 6. Variables y configuración

Variables relevantes para esta fase:

- `CRON_SECRET` para autorizar la ruta del worker;
- `DATABASE_URL` para Prisma;
- variables ya existentes del runtime Next/Prisma.

No se agregó nueva variable de proveedor de pagos. No se modificó la configuración de frontend.

## 7. SDK y webhooks

No se agregó ni se eliminó SDK de pagos en esta fase.

La sincronización durable tampoco depende de webhooks de pago. El flujo robusto ahora es interno al producto:

- el pedido se crea;
- la outbox guarda la intención;
- el worker ejecuta la materialización en Operations.

## 8. Checkout y órdenes

### `/api/orders`

El caller moderno ahora:

- crea la `Order`;
- registra una intención durable en `CommerceOrderSyncOutbox` en la misma transacción;
- responde con `operationsSyncStatus: "queued"`.

### Órdenes corporativas

Los dos callers corporativos modernos siguen el mismo patrón durable:

- `app/api/organizations/corporate-orders/route.ts`
- `app/api/organizations/corporate-orders/from-requests/route.ts`

Ambos persisten la intención dentro de la transacción de la orden y no vuelven a depender del sync best-effort inmediato.

### Legacy manual

El flujo manual legacy no fue fusionado con esta fase. Sigue siendo un camino separado por compatibilidad histórica y por riesgo funcional.

## 9. Outbox

### Modelo

Se agregó `CommerceOrderSyncOutbox` como tabla durable con:

- `eventType`
- `sourceType`
- `sourceId`
- `deduplicationKey`
- `payloadVersion`
- `payloadJson`
- `status`
- `attempts`
- `availableAt`
- `lockedAt`
- `lockedBy`
- `processedAt`
- `lastErrorCode`
- `lastErrorMessage`

### Idempotencia

La unicidad de la outbox se apoya en `deduplicationKey`, que combina:

- tipo de evento;
- tipo de fuente;
- id de fuente;
- versión del payload.

Esto evita que una misma intención se inserte más de una vez por el mismo origen.

### Payload

El payload transporta el `SyncRealOrderToOperationsInput` completo, incluidos:

- `sourceType`
- `sourceId`
- `sourceCode`
- `orderType`
- `paymentStatus`
- `paymentReference`
- `organizationId` cuando aplica
- items con identidad operacional resuelta

## 10. Worker

La ruta `app/api/cron/commerce-order-sync/route.ts` cumple dos funciones:

1. `POST` procesa un lote de eventos outbox.
2. `GET` devuelve un resumen de reconciliación.

### Claim

El claim selecciona eventos `pending` o `retrying` cuya ventana ya esté disponible y los marca como `processing` con `lockedAt`, `lockedBy` y contador de intentos incrementado.

### Retry

Los errores temporales vuelven a estado `retrying` con backoff exponencial acotado.

### Falla permanente

Los errores clasificados como permanentes se marcan `failed` y quedan visibles para revisión operativa.

## 11. Reconciliación

La reconciliación reporta:

- pendientes;
- procesando;
- reintentando;
- fallidos;
- atascados;
- órdenes sin intención durable visible;
- órdenes operacionales sin fuente completa;
- pares fuente duplicados.

Esto permite detectar:

- pérdidas de outbox;
- locks viejos;
- eventos huérfanos;
- duplicación por fuente.

## 12. Comportamiento por caller

### Compra personal

Sí genera intención durable y sí alimenta Operations en background.

### Compra corporativa

Sí genera intención durable y sí alimenta Operations en background.

### Pedidos manuales

No se migraron en esta fase. Deben evaluarse aparte.

### Pedidos legacy

No se migraron en esta fase. Permanecen separados.

### Packages

No se fusionaron con el nuevo contrato durable.

### Sync operaciones

Sí continúa existiendo, pero ahora es consumido por el worker durable.

### Producción, despacho y activación

No cambiaron en esta fase.

### Admin, dashboard cliente y dashboard empresa

Solo cambió el punto de escritura del pedido moderno; no se alteró el resto de los paneles.

### Notificaciones y emails

No cambiaron.

## 13. Qué puede eliminarse

No se elimina nada en esta fase.

A futuro podrían revisarse:

- la llamada best-effort de los callers modernos;
- el uso técnico de `notes` como marcador de sync;
- lógica de recuperación ad hoc si la outbox demuestra suficiente estabilidad.

## 14. Qué debe mantenerse

- el flujo legacy manual como camino separado;
- los datos de `Order` y `OperationCommercialOrder`;
- el snapshot operativo dentro del payload durable;
- la reconciliación y observabilidad del worker;
- la separación entre intención durable y ejecución.

## 15. Limitaciones

- `OrderItem` todavía no guarda `productId` ni snapshot operacional completo.
- No se resolvió todavía el problema más amplio de legacy package.
- El worker depende de cron/auth por secreto; no hay cola externa dedicada.
- El reintento es robusto, pero sigue siendo un mecanismo de aplicación, no de infraestructura administrada.

## 16. Validaciones

Validaciones previstas para la fase:

- `git diff`
- `git diff --check`
- `git status --short`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`

La suite de pruebas dirigida a esta fase debe incluir:

- tests de outbox;
- tests de caller moderno;
- verificación de claim/retry/reconciliation.

## 17. Plan de retirada gradual

1. Mantener la outbox activa en callers modernos.
2. Medir estabilidad de worker y tasa de retry.
3. Evaluar si el caller manual legacy necesita un bridge separado.
4. Definir si el marcador técnico de notas puede retirarse en una fase posterior.
5. Solo después decidir qué código puede ser eliminado.

## 18. Impacto

Impacto funcional:

- reduce el riesgo de pérdida de sincronización posterior al commit;
- mejora trazabilidad operativa;
- permite observación de colas y fallas.

Impacto técnico:

- agrega una tabla durable;
- agrega un worker;
- agrega reconciliación;
- agrega pruebas y contrato explícito.

## 19. Commit y push

Este documento debe cerrarse junto con el commit de la fase P1-01 y publicarse en `origin/master`.

## 20. Conclusión explícita

La sincronización moderna ya no depende de un best-effort posterior al commit. La intención se registra durablemente y el worker puede reintentar hasta resolverla.

**¿Puede una Order quedar creada sin una intención durable de sync? No, para los callers modernos migrados en esta fase.**

**¿Debe el flujo legacy seguir separado? Sí.**
