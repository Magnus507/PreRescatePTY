# Admin Orders PATCH Legacy Reduction Plan (C10)

## 1) Resumen ejecutivo

- `PATCH /api/admin/orders` **sigue operativo** y actualmente soporta parte del flujo admin en producción.
- A la vez, es un **legacy parcial** porque mezcla transiciones de estado, fulfillment, tokenización, capacidad y notificaciones en un solo handler.
- **No debe eliminarse aún**: todavía puede sostener comportamiento de UI/admin existente y órdenes no-manual/legacy.

---

## 2) Mapa de responsabilidades actuales de PATCH

Archivo auditado: `app/api/admin/orders/route.ts`.

Dentro de `PATCH`, hoy existen estas ramas/responsabilidades:

1. **Auth/admin guard**
   - Verifica rol admin/superadmin.

2. **Carga de orden + contexto**
   - Busca `order` con `items` y `user.account`.

3. **Normalización y validaciones iniciales**
   - `calculatePurchasedChips(order.items)`
   - `normalizeAssignedChipIds(assignedChipIds)`
   - límite de chips asignables por pedido.

4. **Guard para órdenes manuales**
   - Si `provider === manual`, bloquea cambios de `orderStatus/paymentStatus` e instruye usar `/approve` o `/reject`.

5. **Actualización directa de estado (`orderStatus` / `paymentStatus`)**
   - `prisma.order.update(...)` dentro del propio PATCH.

6. **Rama fulfillment por `generateTokens` o estado fulfilling (`shipped/completed`)**
   - Cálculo local de `totalChips/totalProfiles` por tipo de item.
   - Conteo de tokens existentes por orden.

7. **Rama assignedChipIds (reserva explícita)**
   - Usa `OrderFulfillmentService.reserveAssignedChipsForOrder(...)` en transacción.

8. **Rama auto-generación fallback de chip+token**
   - Crea chips nuevos (`status=inventory`) + `ChipClaimToken` con `ACT-...`.

9. **Rama incremento de capacidad para non-manual**
   - Si `existingTokens === 0` y `provider !== manual`: incrementa `maxChipsAllocated/maxProfilesAllocated`.
   - Invalida caché de `AccountStateService`.

10. **Rama transición de stock (`inventory -> sold`)**
    - Si fulfilling, mueve chips vinculados por token a `sold`.

11. **Rama notificaciones**
    - `completed`: `notifyPaymentValidated`
    - `shipped`: `notifyOrderShipped`

12. **Respuesta final / manejo genérico de error**

---

## 3) Qué ya fue migrado al service

En `domains/orders/services/order-fulfillment.service.ts` ya están centralizadas estas piezas:

- `normalizeAssignedChipIds`
- `calculatePurchasedChips`
- `reserveAssignedChipsForOrder`

Y además ya existen helpers listos para mayor adopción:

- `calculateCapacityIncrement`
- `wasOrderAlreadyApproved`
- `applyCapacityIfFirstApproval`

---

## 4) Qué sigue duplicado o riesgoso

1. **Capacidad para providers no-manual**
   - Sigue en PATCH con condición local (`existingTokens === 0`) y no en política de dominio única.

2. **Transición de estados order/payment**
   - Se aplica inline y potencialmente en paralelo a rutas dedicadas según tipo de provider.

3. **Auto-generación de tokens/chips**
   - Lógica fallback embebida en route handler con reglas no centralizadas.

4. **Fulfillment no-manual**
   - Mezcla cálculo de productos, tokenización y stock transition dentro del endpoint.

5. **Notificaciones acopladas a cambios de estado**
   - Side-effects incrustados en PATCH en vez de capa orquestadora clara.

6. **Mezcla de concerns**
   - Auth, dominio, persistencia, notificaciones y caché en un mismo bloque.

---

## 5) Clasificación por prioridad

| Rama | Riesgo | Frecuencia probable | ¿Mover a service? | ¿Marcar legacy? | ¿QA previo obligatorio? |
|---|---|---|---|---|---|
| Update `orderStatus/paymentStatus` inline | Alto | Alta | Sí | Sí | Sí |
| Guard manual approve/reject | Medio (si se rompe) | Alta | Parcial (helper de transición) | No (es protección) | Sí |
| `generateTokens` + fallback auto chip/token | Alto | Media | Sí | Sí | Sí |
| `assignedChipIds` + reserveAssignedChipsForOrder | Medio | Media/Alta | Ya parcial | No | Sí |
| Incremento capacidad non-manual | Alto | Media | Sí | Sí | Sí |
| Stock transition inventory->sold | Medio/Alto | Media | Sí | Sí | Sí |
| Notificaciones por estado | Medio | Media | Sí (event helper) | Parcial | Sí |
| Cache invalidation | Medio | Media | Sí (post-action orchestrator) | Parcial | Sí |

---

## 6) Plan de reducción por commits futuros

### C10A — Guardrails + documentación operativa
- Añadir comentarios estructurados y guardas explícitas de alcance de PATCH (sin cambiar comportamiento).
- Checklist QA manual baseline para orders manual/non-manual.

#### C10A guardrails added

Se agregaron guardrails documentales en `app/api/admin/orders/route.ts` (sin cambios de lógica) para dejar explícito:

- PATCH es **legacy partial orchestrator**.
- Ruta canónica para aprobación manual: `/api/admin/orders/[id]/approve` (y `/reject`).
- Reserva/asignación de chips/tokens debe mantenerse en `OrderFulfillmentService`.
- No reintroducir incrementos de capacidad para órdenes manuales dentro de PATCH.
- Señalización de bloques legacy: estado/pago, generateTokens, assignedChipIds, capacidad non-manual y side-effects de notificación/cache.

#### C6C guardrails adicionales (hardening aplicado)

Se reforzó `app/api/admin/orders/route.ts` para blindar interferencia con flujo oficial:

1. **PATCH bloquea completamente órdenes `provider=manual`**
   - Ya no permite ningún camino legacy para manual.
   - Mensaje explícito obliga usar:
     - `POST /api/admin/orders/[id]/approve`
     - `POST /api/admin/orders/[id]/reject`

2. **DELETE masivo deshabilitado** (`bulk=cancelled`)
   - Se bloquea eliminación masiva por trazabilidad.

3. **DELETE individual endurecido**
   - Solo `orderStatus=cancelled` (regla existente).
   - Bloquea eliminación de órdenes manuales canceladas.
   - Bloquea eliminación si existen `ChipClaimToken` vinculados.

Resultado: PATCH/DELETE legacy conserva utilidad operativa acotada para casos no-manual, pero sin posibilidad de alterar ni destruir trazabilidad del flujo manual oficial.

### C10B — Extraer helper de transición de estados
- Crear helper de dominio para validar y aplicar transición `orderStatus/paymentStatus` por provider.
- PATCH pasa a invocar helper en lugar de reglas inline.

### C10C — Extraer helper de capacidad non-manual
- Mover incremento de capacidad y su condición de idempotencia a helper de dominio.
- Unificar con política documentada.

### C10D — Mover auto token generation a service
- Sacar fallback de generación chip/token de PATCH a `OrderFulfillmentService`.
- Exponer API clara: reserve existing vs create fallback.

### C10E — Dejar PATCH como router/orquestador
- PATCH conserva auth/parse/response.
- Lógica de dominio en services.
- Side-effects (notificación/cache) encapsulados por pasos explícitos.

---

## 7) Qué NO tocar todavía

- `POST /api/admin/orders/[id]/approve` (manual oficial)
- `POST /api/admin/orders/[id]/reject` (manual oficial)
- `POST /api/chips/activate`
- ficha pública (`/api/public/[shortCode]` + UI pública)
- tabs de inventario (`/api/admin/chips?view=`)
- `prisma/schema.prisma`

---

## 8) Riesgos de tocar PATCH

1. Romper flujos actuales del admin UI.
2. Duplicar capacidad por reintentos o caminos paralelos.
3. Perder assignment/token linkage de órdenes.
4. Romper órdenes no-manual/legacy aún activas.
5. Desalinear notificaciones con estado real de orden.

---

## 9) Recomendación final

- **No eliminar PATCH todavía**.
- Reducirlo **por fases pequeñas** (C10A→C10E).
- En cada fase exigir:
  - `npm run typecheck`
  - `npm run build`
  - QA manual mínimo de regresión de órdenes/chips/capacidad.

---

## Referencias auditadas

- `app/api/admin/orders/route.ts`
- `app/api/admin/orders/[id]/approve/route.ts`
- `app/api/admin/orders/[id]/reject/route.ts`
- `domains/orders/services/order-fulfillment.service.ts`
- `docs/official/chip-token-order-state-machine.md`