# Chip-Token-Order State Machine (Canónica Oficial)

## 1) Estado ejecutivo

- **Ficha médica oficial**: OK (normal e industrial).
- **Privacidad**: OK (whitelist pública y toggles en extras médicos).
- **Inventario operativo**: OK (tabs y filtros activos en administración).
- **Mayor deuda**: coexistencia de rutas legacy/parciales en órdenes/capacidad (especialmente `PATCH /api/admin/orders` junto a flujo dedicado de aprobación manual).

---

## 2) Principios oficiales

1. `isPhysical` describe **logística física** del chip, no su estado de activación.
2. `chip.status` representa el **ciclo de vida comercial/operativo**.
3. `activationCode` es un **secreto operativo** (token de claim), no identificador público.
4. `shortCode` es el **identificador público estable** del enlace de emergencia.
5. Un chip debe tener **un solo token vigente usable** a la vez.
6. Tokens viejos **no se borran**; se neutralizan por uso, expiración o desvinculación lógica.

---

## 3) Estados oficiales de Chip

| Estado | Significado | Cuándo entra | Cuándo sale | Endpoint/Service autorizado | Tab inventario |
|---|---|---|---|---|---|
| `inventory` | Chip en inventario, no activado | Creación lote; reversión/devolución; rehabilitación | Reserva/venta, activación directa operativa, marcado daño/pérdida | `POST /api/admin/chips`, lógica de reversión/rehabilitación | Disponibles o Revertidos/Devueltos (según token histórico) |
| `sold` | Chip reservado/vendido comercialmente | Aprobación manual o reserva por orden | Activación, devolución/reversión, daño/pérdida | `OrderFulfillmentService.reserveAssignedChipsForOrder`, rutas admin órdenes | Vendidos/Reservados |
| `activated` | Chip activado y vinculado a perfil | `POST /api/chips/activate` | Suspensión, reversión/devolución, daño/pérdida | `POST /api/chips/activate`, acciones dashboard/admin | Activados |
| `suspended` | Chip pausado operativamente | Acción de suspensión | Reactivación o baja administrativa | `PATCH /api/chips/dashboard` (acción suspend/reactivate) | Operativo (no tab separado fijo) |
| `damaged` | Chip dañado | Acción administrativa | Rehabilitación o reemplazo | Rutas admin chips | Dañados/Perdidos |
| `lost` | Chip perdido | Acción administrativa | Rehabilitación o reemplazo | Rutas admin chips | Dañados/Perdidos |

> Nota: en la UI actual el tab “Revertidos/Devueltos” se deriva de `status=inventory` + señales de token histórico.

---

## 4) Estados conceptuales de Token

Los tokens (`ChipClaimToken`) se interpretan por combinación de `orderId`, `usedAt`, `expiresAt`:

| Estado conceptual | Condición |
|---|---|
| `available` | `orderId = null` AND `usedAt = null` AND `expiresAt > now` |
| `reserved` | `orderId != null` AND `usedAt = null` AND `expiresAt > now` |
| `used` | `usedAt != null` |
| `expired` | `expiresAt <= now` |
| `historical/neutralized` | usado o expirado o ligado históricamente a orden |

Helpers canónicos actuales:
- `TOKEN_AVAILABLE_WHERE()`
- `TOKEN_RESERVED_WHERE()`
- `TOKEN_HISTORICAL_WHERE()`

Archivo: `domains/chips/token-lifecycle.helpers.ts`.

---

## 5) Estados de Order relevantes

### paymentStatus
- `pending`
- `under_review` (equivalente conceptual a “pending_review”)
- `paid`
- `rejected`
- `cancelled`

### orderStatus
- `pending`
- `processing`
- `completed`
- `shipped` (operativo/logístico vigente)
- `cancelled`

### adminReviewStatus
- `pending`
- `approved`
- `rejected`

### Diferencia oficial
- `paymentStatus`: estado del dinero/comprobante.
- `orderStatus`: estado operativo/logístico.
- `adminReviewStatus`: decisión de revisión manual.

---

## 6) Transiciones oficiales

| Transición | Precondición | Efecto chip | Efecto token | Efecto order | Efecto capacity | Audit esperado | Endpoint/Service oficial |
|---|---|---|---|---|---|---|---|
| digital created -> inventory | creación de lote | chip nuevo en `inventory` | token inicial `available` | N/A | N/A | creación lote/chip | `POST /api/admin/chips` |
| inventory digital -> inventory physical | marcación logística | mantiene `inventory`, cambia `isPhysical` | sin cambio funcional | N/A | N/A | acción admin logística | rutas admin chips |
| inventory -> sold | orden aprobada / reserva | `sold` | token pasa a `reserved` (orderId) | manual: paid/completed | capacidad incrementa en primera aprobación | `order_approved` + reserva | `POST /api/admin/orders/[id]/approve` + `OrderFulfillmentService` |
| sold -> activated | cliente activa con código válido | `activated`, owner/account/profile asignados | token `used` (`usedAt`) | orden vinculada puede cerrarse | consume cupo operativo | acción `activate` | `POST /api/chips/activate` |
| activated -> suspended | pausa operativa | `suspended` | no requiere cambio | N/A | cuenta como uso según regla actual | acción `suspend` | `PATCH /api/chips/dashboard` |
| activated/sold/inventory -> damaged/lost | evento administrativo | `damaged` o `lost` | token puede quedar histórico | N/A | ajuste formal pendiente | log admin esperado | rutas admin chips |
| activated -> returned/inventory (heurístico) | devolución/reversión manual | `inventory` | tokens previos quedan históricos/neutralizados | puede desacoplar orden | decremento formal pendiente | log reversión | flujo operativo actual (no 100% formalizado) |
| returned/inventory -> rehabilitated/inventory with new token | rehabilitación admin | `inventory` | nuevo token usable; viejos históricos | N/A | N/A | acción rehabilitación | `/api/admin/chips/[chipId]/rehabilitate` |
| sold -> returned/inventory | devolución antes de activar | vuelve a `inventory` | token reservado neutralizado/expira | orden puede cancelarse/rechazarse | decremento formal pendiente | log devolución | operación admin/manual |

---

## 7) Flujos oficiales actuales

1. **Compra manual + approve (oficial)**
   - Orden manual entra a revisión.
   - Admin aprueba por endpoint dedicado.
   - Se incrementa capacidad una sola vez (guardas de aprobación previa).
   - Se reservan chips/tokens por orden.

2. **PATCH admin orders (legacy parcial operativo)**
   - Mantiene compatibilidad logística.
   - Convive con flujo dedicado de approve/reject.
   - Debe reducirse progresivamente.

3. **Activación cliente (oficial)**
   - Código único válido.
   - Transacción atómica.
   - Vinculación a perfil y cuenta.

4. **Rehabilitación (oficial)**
   - Reactiva disponibilidad del chip para reuso seguro.

5. **Inventario tabs (oficial)**
   - Basado en filtros por `chip.status` + ciclo de token.

6. **Ficha pública (oficial)**
   - Usa `shortCode` y whitelist médica pública con toggles.

---

## 8) Rutas oficiales vs legacy

| Ruta | Estado |
|---|---|
| `/api/admin/orders/[id]/approve` | **Oficial** para aprobación manual |
| `/api/admin/orders` (PATCH) | Operativo, **legacy parcial**, pendiente de reducción |
| `/api/chips/activate` | **Oficial** activación cliente |
| `/api/admin/chips/[chipId]/rehabilitate` | **Oficial** rehabilitación |
| `/api/admin/chips?view=` | **Oficial** inventario por tabs |
| `/api/admin/chips/inventory` | **Oficial** picking físico disponible |

---

## 9) Reglas de capacidad

1. Compra manual aprobada suma chips/perfiles (primera aprobación efectiva).
2. Reintentos de aprobación no deben duplicar capacidad.
3. Estados `sold`, `suspended`, `activated` cuentan como uso en la regla operativa vigente.
4. Reversión/decremento formal de capacidad está **pendiente de modelado explícito**.

---

## 10) Reglas de privacidad/ficha médica

### Whitelist pública
Se expone en pública solo lo permitido en `publicProfile` + `publicMedicalExtras`.

### Campos nunca públicos
- `nationalId`
- `insurancePolicyNumber`
- `insuranceEmergencyPhone`

### Toggled fields
- `insuranceProvider` solo si `showInsuranceProviderPublic`
- `preferredHospital` solo si `showPreferredHospitalPublic`
- `primaryDoctorName` solo si `showPrimaryDoctorPublic`
- `primaryDoctorPhone` solo si `showPrimaryDoctorPhonePublic`
- `additionalNotes` como `emergencyInstructions` solo si `showAdditionalNotesPublic`

---

## 11) Pendientes declarados

1. `assign-direct` sin compra (flujo formal y límites).
2. Reversión formal (no heurística) con efectos explícitos.
3. `ChipHistory` / `InventoryMovement` canónicos.
4. Capacity ledger auditable (increment/decrement event-sourced).
5. Reducir/eliminar dependencia de `PATCH /api/admin/orders` para transiciones manuales.
6. Enums DB futuros para estados críticos.
7. Revisión futura de default/semántica `serviceStatus`.

---

## 12) QA mínimo obligatorio antes de tocar rutas legacy

1. Aprobar orden manual con chips asignados.
2. Reintentar approve y verificar no duplicidad de capacidad.
3. Activar chip con token válido y con token inválido/usado/expirado.
4. Rehabilitar chip y validar nuevo token usable.
5. Simular reventa/control de transición sold->activated.
6. Verificar tabs de inventario sin duplicados cruzados.
7. Verificar privacidad pública (campos prohibidos nunca expuestos).

---

## Referencias de implementación actuales

- `app/api/chips/activate/route.ts`
- `app/api/admin/orders/[id]/approve/route.ts`
- `app/api/admin/orders/route.ts`
- `app/api/admin/chips/route.ts`
- `app/api/admin/chips/inventory/route.ts`
- `domains/orders/services/order-fulfillment.service.ts`
- `domains/chips/token-lifecycle.helpers.ts`
- `app/api/public/[shortCode]/route.ts`