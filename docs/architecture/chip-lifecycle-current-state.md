# Chip Lifecycle — Current State (Pre-Refactor Baseline)

## 1. Resumen ejecutivo

El sistema actual de PreRescatePTY **funciona en producción** para venta, reserva, activación, reversión operativa y vistas de inventario; sin embargo, la lógica de lifecycle de chips/tokens/órdenes/capacidad está distribuida en múltiples endpoints con reglas parcialmente duplicadas.

Este documento fija la foto oficial del comportamiento actual antes del Stabilization Sprint para poder refactorizar por fases pequeñas y seguras (sin cambios destructivos, sin migraciones y sin romper flujos existentes).

Objetivo del sprint de estabilización:

- Centralizar reglas en servicios de dominio.
- Reducir duplicación entre `approve` y `PATCH orders`.
- Unificar semántica de token disponible/reservado/usado.
- Formalizar reversión/rehabilitación y su trazabilidad.

---

## 2. Estados actuales de Chip

| Estado | Significado actual | Quién lo setea | Endpoint/Ruta principal | UI donde aparece |
|---|---|---|---|---|
| `inventory` | Chip en stock físico/digital disponible para asignación o activación (si no está reservado por token activo de orden). | Creación de lote, rehabilitación, reversión/limpieza | `POST /api/admin/chips`, `POST /api/admin/chips/[chipId]/rehabilitate`, actualizaciones de reversión | Admin > Inventario > **Disponibles**; también base para vista **Revertidos/Devueltos** |
| `sold` | Chip vendido/reservado comercialmente para una orden, pendiente de activación final por usuario. | Aprobación manual o fulfillment en patch de órdenes | `POST /api/admin/orders/[id]/approve`, `PATCH /api/admin/orders` | Admin > Inventario > **Vendidos / Reservados** |
| `activated` | Chip activado y vinculado a owner/account/profile, con servicio activo/inactivo/expirado según fechas. | Activación de cliente | `POST /api/chips/activate` | Admin > Inventario > **Activados**; Dashboard de cliente |
| `suspended` | Chip operativamente suspendido (aún cuenta como ocupado para capacidad). | Flujos administrativos/operativos (semántica definida en docs) | Semántica documentada; no es foco del C1 de endpoints revisados | Puede reflejarse en vistas operativas y cálculo de capacidad |
| `damaged` | Chip dañado (no utilizable). | Operación admin | Endpoints admin de chip (gestión operativa) | Admin > Inventario > **Dañados / Perdidos** |
| `lost` | Chip perdido (no utilizable). | Operación admin | Endpoints admin de chip (gestión operativa) | Admin > Inventario > **Dañados / Perdidos** |

Notas clave:

- `serviceStatus` (`active/inactive/expired/suspended`) es semántica separada de `chip.status`.
- Un chip `inventory` puede quedar fuera de “disponible” si tiene token activo reservado a orden (`orderId != null`, `usedAt = null`, `expiresAt vigente`).

---

## 3. Estados de Token (modelo conceptual actual)

| Estado conceptual | Condiciones observables actuales |
|---|---|
| **Disponible** | `orderId = null` AND `usedAt = null` AND `expiresAt > now` |
| **Reservado** | `orderId != null` AND `usedAt = null` (usualmente con `expiresAt` renovado) |
| **Usado** | `usedAt != null` |
| **Expirado** | `expiresAt <= now` (con o sin `orderId`) |
| **Histórico / neutralizado** | Típicamente tokens antiguos en rehabilitación: `orderId = null` y `expiresAt = now/pasado`, o tokens con `usedAt != null` mantenidos por auditoría |

Observaciones de implementación:

- En `approve`, si existe token reusable (`orderId = null`) se vincula a la orden; si no existe, se crea token nuevo.
- En `activate`, el consumo es atómico con `updateMany` (`usedAt` pasa a `now` si sigue vigente y no usado).
- En `rehabilitate`, tokens históricos con orden/uso previo se neutralizan (`orderId -> null`, `expiresAt -> now`) y se crea token nuevo limpio.

---

## 4. Flujo de compra manual actual

Secuencia observada:

1. Se crea orden manual (`pending/pending/pending`).
2. Admin revisa y aprueba por endpoint dedicado.
3. Se actualiza orden a `paymentStatus=paid`, `orderStatus=completed`, `adminReviewStatus=approved`.
4. Se actualiza capacidad de cuenta (hoy con incremento acumulativo al aprobar, protegido por bandera de no reaplicar si ya estaba aprobada).
5. Se asignan chips (`assignedChipIds`) validando conflictos de token/orden.
6. Chip pasa `inventory -> sold` (reserva atómica).
7. Se crea/vincula token a la orden y se extiende expiración (60 días en flujo approve).
8. Cliente luego activa usando activation code.

Endpoint principal: `POST /api/admin/orders/[id]/approve`.

---

## 5. Flujo de activación actual

Endpoint: `POST /api/chips/activate`.

Pasos efectivos:

1. Validación de `activationCode` (schema).
2. Búsqueda de token + chip asociado.
3. Validación token: existe, no usado (`usedAt null`), no expirado (`expiresAt > now`).
4. Validación de estado chip activable: solo `inventory` o `sold`.
5. Carga de estado de cuenta (AccountStateService) y validación de perfil médico completo del usuario.
6. Validación de capacidad en transacción: conteo chips ocupando slot (`activated/suspended/sold`) < `maxChipsAllocated`.
7. Consumo atómico del token (`usedAt = now`).
8. Asignación chip: `status=activated`, `ownerUserId`, `accountId`, `assignedProfileId`, fechas de servicio y `serviceStatus=active`.
9. Si token estaba ligado a orden, auto-confirma orden (`completed/paid`).
10. Audit log + invalidación de caché de estado de cuenta.

---

## 6. Flujo de reversión/rehabilitación actual

### Reversión / devueltos (estado actual)

- La vista **returned** en inventario es **heurística**:
  - Base: chips `status=inventory`.
  - Evidencia histórica: tokens con `orderId != null` o `usedAt != null`.
  - Exclusión: no tener token actualmente “limpio y vigente” (`orderId=null`, `usedAt=null`, `expiresAt>now`).

Esto funciona para operación, pero no es un ledger formal de devolución.

### Rehabilitación

Endpoint: `POST /api/admin/chips/[chipId]/rehabilitate`.

Reglas observadas:

1. Solo roles admin/superadmin.
2. Solo chips en `inventory`.
3. Debe existir historial (algún token con `orderId != null` o `usedAt != null`).
4. Neutraliza tokens históricos (limpia `orderId`, expira inmediatamente).
5. Resetea vínculo del chip (`owner/account/profile/fechas/serviceStatus`).
6. Crea **nuevo activationCode** con vigencia amplia (1 año).
7. Registra audit log de rehabilitación para stock.

---

## 7. Inventario admin actual

Tabs actuales en UI (`InventorySection`):

1. **Disponibles** (`view=available`)
2. **Vendidos / Reservados** (`view=reserved`)
3. **Activados** (`view=activated`)
4. **Revertidos / Devueltos** (`view=returned`)
5. **Dañados / Perdidos** (`view=damaged`)

Resolución principal de vistas en `GET /api/admin/chips` por query param `view`.

Nota operativa explícita en UI: la pestaña de revertidos/devueltos es una estimación heurística.

---

## 8. Riesgos actuales

1. **Duplicación de lógica** entre `POST /approve` y `PATCH /api/admin/orders`.
2. **Definiciones no idénticas** de token activo/disponible según endpoint.
3. **Returned heurístico** (sin evento canónico de reversión).
4. **Posible confusión status vs serviceStatus**, incluyendo interpretación de “active”.
5. **Ausencia de ledger formal** para reserva/reversión/rehabilitación.
6. **Estados y reglas dispersas** (falta capa única con enums y transiciones oficiales).

---

## 9. Reglas objetivo del refactor

Dirección objetivo para fases siguientes:

- Rutas HTTP delgadas, delegando reglas a servicios.
- `ChipLifecycleService`: transiciones de chip y guardas de estado.
- `TokenService`: reglas unificadas de token (disponible/reservado/usado/expirado/neutralizado).
- `OrderFulfillmentService`: aprobación/cumplimiento sin duplicación.
- `CapacityService`: capacidad y consumo de slots en una sola política.
- Centralizar constantes/enums y precondiciones por transición.

---

## 10. Próximas fases sugeridas

- **C2**: Helpers compartidos token/chip (predicados de disponibilidad, reserva y validez).
- **C3**: Centralizar fulfillment (approve + patch) en un único flujo de dominio.
- **C4**: Formalizar reversal/assign-direct con eventos/ledger explícito.
- **C5**: QA funcional y regresión end-to-end (inventario, órdenes manuales, activación, rehabilitación).

---

## Referencias de código revisadas para este baseline

- `app/api/admin/orders/[id]/approve/route.ts`
- `app/api/admin/orders/route.ts`
- `app/api/chips/activate/route.ts`
- `app/api/admin/chips/route.ts`
- `app/api/admin/chips/inventory/route.ts`
- `app/api/admin/chips/[chipId]/rehabilitate/route.ts`
- `app/(admin)/admin/_components/sections/InventorySection.tsx`
- `docs/logic/chip-states.md`
- `docs/logic/chip-status-semantics.md`
- `docs/logic/order-state-machine.md`
- `docs/logic/account-capacity-policy.md`