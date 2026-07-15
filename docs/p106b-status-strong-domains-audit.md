# P1-06B - Estados fuertes por dominio

**Fecha de corte:** 14 de julio de 2026
**Revisión base:** `44abdd6` (`master`)
**Estado:** auditoría y fortalecimiento parcial aplicado al primer lote seguro

## 1. Objetivo

Reducir estados arbitrarios en dominios críticos sin convertir todo el schema a enums de golpe.

La regla aplicada fue:

- conjunto cerrado y estable -> enum Prisma;
- conjunto interno pero aún evolutivo -> String + validación obligatoria;
- valor externo o proveedor -> String preservado.

## 2. Alcance auditado

Se revisaron:

- `prisma/schema.prisma`
- migraciones activas
- rutas y helpers de transición
- view models
- tests
- documentación de flujos
- auditarías previas W6.05G-L, W6.08 y P0/P1 previos

Se buscaron:

- `status`
- `state`
- `paymentStatus`
- `orderStatus`
- `adminReviewStatus`
- `corporateDeliveryStatus`
- `serviceStatus`
- `inventoryStatus`
- `qaStatus`
- `activationStatus`
- `productionStatus`
- `dispatchStatus`
- `deliveryStatus`
- `notificationStatus`
- `memberStatus`
- `corporateStatus`
- `CommerceOrderSyncOutbox.status`
- comparaciones por string
- `switch`
- arrays de estados
- `as const`
- validaciones Zod
- defaults Prisma
- updates Prisma

## 3. Conclusión de auditoría

El lote seguro existe para:

- `Order.paymentStatus`
- `Order.orderStatus`
- `Order.adminReviewStatus`
- `CommerceOrderSyncOutbox.status`
- `OperationFinishedGoodUnit.status`
- `OperationFinishedGoodUnit.qaStatus`
- `OperationFinishedGoodUnit.activationStatus`

Estos campos muestran conjuntos cerrados, usos consistentes y una semántica estable en rutas, helpers, tests y scripts.

No se incluyeron en esta fase:

- `Chip.status`
- `Chip.serviceStatus`
- `OrganizationMember.memberStatus`
- `OrganizationMember.corporateStatus`
- `ScanEvent.notificationStatus`
- `corporateDeliveryStatus`
- `productionStatus`
- `dispatchStatus`
- `deliveryStatus`

Motivo: aunque algunos patrones se repiten, todavía hay más ambigüedad histórica, más aliases de lectura o más acoplamiento con documentación vieja y scripts de análisis.

## 4. Inventario resumido

| Modelo | Campo | Valores encontrados en schema | Valores encontrados en código | Valores encontrados en tests | Valores legacy | Transiciones observadas | Criticidad | Candidato a enum | Mantener String | Razón |
|---|---|---|---|---|---|---|---|---|---|---|
| `Order` | `paymentStatus` | `pending`, `under_review`, `paid`, `rejected`, `cancelled` | mismos 5 valores; alias de lectura: `payment_review`, `pending_review` | mismos 5 valores | `payment_review`, `pending_review` solo como compatibilidad de lectura | `pending -> under_review -> paid/rejected/cancelled`; `pending -> paid` en rutas admin; `under_review -> rejected` en rechazo | Alta | Sí | No | Conjunto cerrado y estable; ya existía en helpers y flujos manuales. |
| `Order` | `orderStatus` | `pending`, `processing`, `shipped`, `completed`, `cancelled` | mismos 5 valores; `approved` aparece solo en test legacy | mismos 5 valores + `approved` en factory | `approved` en fixture antiguo | `pending -> processing -> shipped -> completed/cancelled` | Alta | Sí | No | Conjunto estable de ciclo de vida comercial. |
| `Order` | `adminReviewStatus` | `pending`, `approved`, `rejected` | mismos 3 valores | mismos 3 valores | ninguno persistente identificado | `pending -> approved/rejected` | Alta | Sí | No | Revisión humana de conjunto pequeño y cerrado. |
| `CommerceOrderSyncOutbox` | `status` | `pending`, `processing`, `processed`, `retrying`, `failed` | mismos 5 valores | mismos 5 valores | ninguno identificado | `pending -> processing -> processed`; `pending -> processing -> retrying/failed` | Alta | Sí | No | Cola durable con estado terminal explícito. |
| `OperationFinishedGoodUnit` | `status` | `assembled`, `qa_pending`, `available`, `reserved`, `qa_failed`, `dispatched`, `delivered`, `activated`, `discarded`, `cancelled` | mismos valores en inventario, reserva, QA, despacho, activación y limpieza | mismos valores | ninguno persistente identificado | `assembled -> qa_pending -> available/reserved -> dispatched/delivered -> activated`; `qa_failed`, `discarded`, `cancelled` como terminales o de excepción | Alta | Sí | No | Inventario operacional central con semántica repetida y acotada. |
| `OperationFinishedGoodUnit` | `qaStatus` | `pending`, `passed`, `failed` o null | mismos 3 valores; `null` como legado/incompleto | mismos 3 valores | `null` aún aparece en lectura | `pending -> passed/failed`; `null` solo en registros incompletos | Alta | Sí, nullable | No | Es un ciclo cerrado, y nullable permite compatibilidad temporal. |
| `OperationFinishedGoodUnit` | `activationStatus` | `not_activated`, `activated` | mismos 2 valores | mismos 2 valores | ninguno identificado | `not_activated -> activated` | Alta | Sí | No | Bifurcación simple y estable, ideal para enum. |

## 5. Valores y aliases relevantes

### Order

- Escrito hoy: `pending`, `under_review`, `paid`, `rejected`, `cancelled`
- Leído como compatibilidad: `payment_review`, `pending_review`
- Orden comercial: `pending`, `processing`, `shipped`, `completed`, `cancelled`
- Revisión admin: `pending`, `approved`, `rejected`

### Outbox

- `pending`
- `processing`
- `processed`
- `retrying`
- `failed`

### OperationFinishedGoodUnit

- `assembled`
- Inventario: `qa_pending`, `available`, `reserved`, `qa_failed`, `dispatched`, `delivered`, `activated`, `discarded`, `cancelled`
- QA: `pending`, `passed`, `failed`
- Activación: `not_activated`, `activated`

## 6. Qué cambió en esta fase

- `Order.paymentStatus` pasó a enum Prisma.
- `Order.orderStatus` pasó a enum Prisma.
- `Order.adminReviewStatus` pasó a enum Prisma.
- `CommerceOrderSyncOutbox.status` pasó a enum Prisma.
- `OperationFinishedGoodUnit.status` pasó a enum Prisma.
- `OperationFinishedGoodUnit.qaStatus` pasó a enum Prisma nullable.
- `OperationFinishedGoodUnit.activationStatus` pasó a enum Prisma.
- Se corrigió un test legacy que seguía usando `approved` como `orderStatus`.

## 7. Qué no cambió

- `Chip.status`
- `Chip.serviceStatus`
- `OrganizationMember.memberStatus`
- `OrganizationMember.corporateStatus`
- `ScanEvent.notificationStatus`
- `corporateDeliveryStatus`
- `productionStatus`
- `dispatchStatus`
- `deliveryStatus`

Tampoco se tocaron:

- `paymentStatus` de `OperationCommercialOrder`
- `fulfillmentStatus`
- `serviceStatus` de chips
- `memberStatus` / `corporateStatus`
- estados de notificaciones o flujo de alertas

## 8. Compatibilidad

- Se mantuvieron los nombres de campo.
- La serialización de API no cambia para consumidores JSON.
- Los writers siguen emitiendo los mismos literales permitidos.
- Los aliases de lectura de `payment_review` y `pending_review` quedan como compatibilidad semántica en view models, no como persistencia.

## 9. Migración

- Se introdujeron enums Prisma para los campos del lote 1.
- La migración debe ser revisada antes de aplicarse en entornos con datos históricos.
- No se asumió que los datos de prueba permitan truncado silencioso.
- No se ejecutó despliegue en producción.

## 10. Pruebas

Se mantuvieron las pruebas existentes de:

- pago manual
- aprobación / rechazo admin
- reserva de stock
- sincronización operacional
- inventario y activación

Además, se ajustó un test de fábrica para usar `processing` en vez de `approved` como `orderStatus`.

## 11. Validaciones

- `git diff`
- `git diff --check`
- `git status --short`
- `npx prisma validate`
- `npx prisma generate`
- `npm run lint`
- `npm run typecheck`
- `npx vitest run`
- `npm run test:coverage -- --run`
- `npm run build`
- `npm audit --omit=dev`

## 12. Plan pendiente

La fase siguiente debe evaluar por separado:

- `Chip.status`
- `Chip.serviceStatus`
- `OrganizationMember.memberStatus`
- `OrganizationMember.corporateStatus`
- `ScanEvent.notificationStatus`
- `corporateDeliveryStatus`
- `productionStatus`
- `dispatchStatus`
- `deliveryStatus`

## 13. Conclusión

Los estados críticos del primer lote quedaron alineados con enums Prisma y siguen un contrato más fuerte para writers, tests y migración.

**¿Persisten String en estados críticos cubiertos por esta fase? No.**
