# Order Fulfillment Refactor Plan (Stabilization C4 Baseline)

## Objetivo

Documentar el estado actual de fulfillment de órdenes en PreRescatePTY y establecer un plan de migración por fases pequeñas para eliminar duplicaciones entre:

- `app/api/admin/orders/[id]/approve/route.ts`
- `app/api/admin/orders/route.ts` (PATCH)

En C4 **no** se mueve flujo productivo completo; solo se prepara base segura.

---

## 1) Lógica actual en `approve` (manual)

Ruta: `POST /api/admin/orders/[id]/approve`

Responsabilidades actuales:

1. Validar sesión/rol admin.
2. Validar orden manual y estado aprobable.
3. Resolver cuenta del usuario.
4. Validar paquete (`packageId`, `isActive`).
5. Calcular chips/perfiles comprados.
6. Marcar orden como pagada/completada/aprobada.
7. Actualizar capacidad de cuenta (guardada por `wasAlreadyApproved`).
8. Reservar chips (`inventory -> sold`) y validar conflictos.
9. Crear/vincular token y extender expiración.
10. Crear audit log e invalidar cache de estado de cuenta.

Riesgo: ruta concentra demasiadas responsabilidades transaccionales y de reglas.

---

## 2) Lógica actual en `PATCH /api/admin/orders`

Responsabilidades relevantes:

1. Validar sesión/rol admin.
2. Restringir cambios de estado para órdenes manuales (deben usar approve/reject).
3. Calcular límites de chips por orden.
4. Generar/vincular tokens y reservar chips en ciertos escenarios.
5. Auto-generar chips en fallback.
6. Incrementar capacidad en órdenes no-manuales (condicional).
7. Mover chips vinculados a `sold` al completar/shipping.
8. Disparar notificaciones por cambios de estado.

Riesgo: mezcla operación logística, asignación de chips/tokens y reglas de negocio con duplicación parcial respecto a `approve`.

---

## 3) Duplicaciones detectadas

1. Cálculos de chips comprados / límites por orden.
2. Reglas de asignación/reserva de chips (`inventory -> sold`).
3. Reglas de vinculación/creación de token y extensión de expiración.
4. Reglas de incremento de capacidad (con guardas diferentes según flujo).
5. Transiciones de estado de orden cercanas pero distribuidas.

---

## 4) Riesgos técnicos/operativos

1. Divergencia accidental entre flujos `approve` y `PATCH`.
2. Bugs de idempotencia según ruta usada.
3. Dificultad de testeo por reglas repartidas en handlers HTTP.
4. Mayor costo de mantenimiento para cambios de negocio.
5. Posibles regresiones en inventario/tokens por no tener fuente única.

---

## 5) Resultado de C4

Se crea base inicial de servicio:

- `domains/orders/services/order-fulfillment.service.ts`

Con helpers puros iniciales:

- `calculatePurchasedChips(orderItems)`
- `calculatePurchasedProfiles(pkg)`
- `wasOrderAlreadyApproved(order)`
- `normalizeAssignedChipIds(input)`

Adopción mínima segura realizada en `approve`:

- Reemplazo de cálculos duplicados por helpers del servicio.
- Sin mover transacción completa.
- Sin alterar reglas de reserva/token/capacidad existentes.

---

## 6) Plan de migración por commits futuros

### C5 — mover cálculo de capacidad

- Consolidar en `OrderFulfillmentService` la política de actualización de capacidad.
- Unificar guardas de idempotencia de aprobación/cierre.

### C6 — mover reserva chip/token

- Extraer a servicio la reserva de chip, detección de conflicto y vinculación de token.
- Reusar helpers de lifecycle (chip/token) ya creados en C2/C3.

### C7 — dejar `PATCH` sin duplicados

- Hacer que `PATCH` delegue en el servicio para la porción de fulfillment.
- Mantener `PATCH` como orquestador HTTP + notificaciones.

### C8 — QA

- QA de regresión funcional sobre:
  - aprobación manual,
  - asignación y reserva,
  - tokens,
  - capacidad,
  - inventario por vistas,
  - no regresión de activación/ficha pública.

---

## 7) Criterio de éxito de la migración futura

1. Misma respuesta/contrato HTTP público.
2. Misma semántica funcional en approve/PATCH.
3. Menor duplicación y mayor testabilidad.
4. Reglas de fulfillment centralizadas en una capa de dominio.

---

## 8) Avance C5 — centralización de capacidad (implementado)

Se centralizó el cálculo acumulativo de capacidad para órdenes manuales en `OrderFulfillmentService`, sin mover todavía la parte delicada de reserva de chips/tokens.

Helpers agregados:

- `calculateCapacityIncrement(orderItems, pkg)`
  - `chipsToAdd = calculatePurchasedChips(orderItems)`
  - `profilesToAdd = calculatePurchasedProfiles(pkg)`

- `applyCapacityIfFirstApproval(currentAccount, increment, wasAlreadyApproved)`
  - Si `wasAlreadyApproved = true`: devuelve capacidad actual sin sumar.
  - Si `false`: suma capacidad en modo acumulativo.

Adopción en `app/api/admin/orders/[id]/approve/route.ts`:

- El route ahora usa los helpers para derivar `maxChipsAllocated` y `maxProfilesAllocated`.
- No se cambió la transacción completa.
- No se cambió la lógica de reserva de chips/tokens (queda para C6).
- No se alteraron mensajes ni estados del flujo de aprobación.
