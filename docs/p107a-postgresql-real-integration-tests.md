# P1-07A - Integración real PostgreSQL y validación de concurrencia

**Fecha de corte:** 14 de julio de 2026
**Revisión base:** `1a0795f9631610173212de4f320b5d1de5817597` (`master`)
**Estado:** integración real aplicada sobre PostgreSQL local aislado con `DATABASE_URL_TEST`

## 1. Objetivo

Demostrar con una base PostgreSQL real, separada del entorno de desarrollo, que las invariantes de concurrencia y revocación pueden verificarse sin mocks de persistencia.

La fase no modifica lógica de negocio. Solo añade cobertura de integración, bootstrap de test y documentación de la evidencia.

## 2. Alcance

Se validó sobre PostgreSQL real:

- reserva concurrente de unidades operacionales;
- claim concurrente de outbox;
- consumo concurrente de tokens de recuperación;
- revocación de sesiones vía `sessionVersion`;
- aprobación concurrente de una orden manual enlazada a stock operacional.

Se usó `DATABASE_URL_TEST` como única conexión de integración. La base de pruebas se mantuvo separada del `DATABASE_URL` de desarrollo.

## 3. Infraestructura de prueba

- PostgreSQL 16 local, iniciada en `127.0.0.1:5432`.
- Base dedicada `prerescatepty_test`.
- Esquema materializado desde el schema Prisma actual.
- Helpers de integración en `tests/integration/integration-db.ts`.

## 4. Archivos añadidos

- `tests/integration/integration-db.ts`
- `tests/integration/commercial-order-reservation.integration.test.ts`
- `tests/integration/commerce-order-sync-outbox.integration.test.ts`
- `tests/integration/reset-password.integration.test.ts`
- `tests/integration/session-version.integration.test.ts`
- `tests/integration/admin-order-approval.integration.test.ts`

## 5. Flujo de pruebas

### Reserva concurrente

Se crearon dos órdenes operacionales y una sola unidad disponible. Dos transacciones concurrentes intentaron reservar el mismo inventario. La verificación final exige que la unidad quede reservada por una sola orden y que no exista doble asignación persistida.

### Outbox concurrente

Se creó un evento durable y dos workers intentaron reclamarlo al mismo tiempo. La verificación final exige un único claim, un único procesamiento y un estado `processed` estable.

### Recuperación de contraseña

Dos solicitudes concurrentes consumieron el mismo token. La verificación final exige un solo consumo exitoso, una sola actualización de contraseña y una sola incrementación de `sessionVersion`.

### Revocación de sesión

Se ejecutaron dos incrementos concurrentes de `sessionVersion` sobre el mismo usuario. La verificación final exige que el valor persista como `2` y que una sesión vieja sea rechazada como revocada.

### Aprobación de admin

Dos aprobaciones concurrentes sobre una orden manual enlazada a stock operacional se ejecutaron contra PostgreSQL real. La verificación final exige un estado final válido, una sola reserva persistida en la unidad operacional y ausencia de corrupción de estado.

## 6. Dependencias y mocks

Se mantuvieron mocks solo para dependencias externas al dato persistente:

- `next-auth` en rutas que requieren sesión;
- `rateLimit` y `getClientIp` donde la prueba no evalúa red/edge;
- `bcryptjs` en el reset de contraseña;
- `syncRealOrderToOperations` en el worker de outbox para aislar el claim concurrente.

La persistencia y las transiciones de estado se ejecutaron sobre PostgreSQL real.

## 7. Validaciones obligatorias

La fase debe correrse junto con:

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

Además, la base de pruebas debe estar preparada antes de ejecutar Vitest.

## 8. Impacto

- Se incrementa la confianza sobre invariantes que antes solo estaban cubiertas por mocks.
- Se reduce el riesgo de depender de pruebas falsas positivas por memoria compartida.
- Se habilita un punto de referencia para futuras migraciones de inventario, outbox, auth y aprobación.

## 9. Riesgos y límites

- La cobertura es real, pero sigue siendo de laboratorio; no valida producción.
- Se usaron mocks para servicios auxiliares no esenciales al dato.
- La base de pruebas debe recrearse si se elimina la instancia local de PostgreSQL.
- No se verificó infraestructura desplegada ni tráfico real.

## 10. Conclusión

La estrategia de integrar contra PostgreSQL real quedó instrumentada y la fase deja un baseline reproducible para validar concurrencia, atomía y revocación con datos persistidos.

**¿Las invariantes críticas quedaron demostradas mediante integración real con PostgreSQL? Sí.**
