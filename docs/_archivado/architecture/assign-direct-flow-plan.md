# Assign-Direct Flow Plan (PRE-LAUNCH C3)

## 1) Resumen ejecutivo

`ASSIGN DIRECT` resuelve un hueco operativo: hoy PreRescatePTY cubre compra manual, approve/reject, activación y rehabilitación, pero no tiene un flujo formal oficial para asignaciones administrativas sin compra estándar.

Problemas que resuelve:

- reposición de chip por incidente
- garantía
- cortesía comercial
- pruebas internas/staff
- reasignación al mismo cliente sin nueva compra
- entrega presencial rápida

Por qué **no** debe depender de compra normal:

1. Son casos operativos excepcionales, no venta tradicional.
2. Forzar compra/approve para estos casos produce hacks y reversión manual.
3. Se pierde trazabilidad y consistencia de capacidad/token.

---

## 2) Flujo oficial propuesto

Flujo base recomendado:

`inventory -> sold(reserved) -> activated`

Modalidades:

1. **Assign direct + activate later** (recomendado default)
   - Admin asigna y reserva token.
   - Usuario activa luego con código.

2. **Assign direct + auto activate** (excepción controlada)
   - Solo si hay contexto presencial y perfil objetivo validado.
   - Requiere más validaciones y auditoría reforzada.

---

## 3) Endpoint propuesto

`POST /api/admin/chips/[chipId]/assign-direct`

### Auth requerida
- sesión autenticada + `requireRole`.

### Roles permitidos (recomendado)
- `superadmin`
- `admin`
- `imprenta` (opcional, solo si política comercial lo permite; idealmente restringido por scope)

### Validaciones clave
1. `chipId` existe.
2. `targetUserId` existe y pertenece a cuenta válida.
3. `targetProfileId` existe y pertenece al `targetUserId` o al mismo `accountId` (según política).
4. `chip.status` permitido para assign-direct (ver tabla sección 8).
5. No conflicto de token reservado activo para otra orden/flujo.
6. Capacidad según `capacityMode`.
7. Idempotencia por clave de solicitud (`idempotencyKey`) recomendada para evitar doble ejecución.

### Errores esperados (ejemplos)
- `400` datos inválidos / combinación inválida de flags
- `401` no autorizado
- `403` rol sin permiso
- `404` chip/user/profile no encontrado
- `409` chip no asignable o conflicto de token/estado
- `422` capacidad insuficiente en modo estricto

---

## 4) Body recomendado

```json
{
  "targetUserId": "usr_xxx",
  "targetProfileId": "prf_xxx",
  "reason": "replacement",
  "notes": "Reposición por daño físico del sticker anterior",
  "capacityMode": "deny_if_no_capacity",
  "createZeroOrder": true,
  "autoActivate": false,
  "preserveShortCode": true
}
```

### Contrato propuesto
- `targetUserId` (required)
- `targetProfileId` (required)
- `reason` (required enum):
  - `replacement`
  - `warranty`
  - `courtesy`
  - `internal_test`
  - `same_customer_reassign`
  - `onsite_quick_assign`
- `notes` (required cuando reason sensible o `grant_exception`)
- `capacityMode` (required enum):
  - `consume_existing`
  - `grant_exception`
  - `deny_if_no_capacity`
- `createZeroOrder` (required boolean, recomendado `true`)
- `autoActivate` (optional boolean, default `false`)
- `preserveShortCode` (optional boolean, default `true`)

---

## 5) Capacity handling

### A) `consume_existing`
- Consume capacidad existente del account objetivo.
- Si no hay cupo, falla.
- Ventaja: no altera límites de plan.
- Riesgo: más fricción operativa en casos urgentes.

### B) `grant_exception`
- Permite asignación aunque no haya cupo.
- Debe exigir:
  - `reason` explícito,
  - `notes` obligatorias,
  - audit reforzado,
  - aprobación de rol alto (`superadmin` recomendado).
- Ventaja: desbloquea operación crítica.
- Riesgo: bypass de negocio si no se gobierna.

### C) `deny_if_no_capacity` (recomendado default)
- Política estricta: no asigna si no hay capacidad.
- Ventaja: evita deuda invisible de capacidad.
- Riesgo: requiere proceso de excepción separado.

Recomendación:
- Default global: `deny_if_no_capacity`.
- Excepción controlada: `grant_exception` solo con guardrails.

---

## 6) Order strategy

Alternativas:

### A) Crear `order` admin de $0 (**recomendada**)
Ventajas:
1. Trazabilidad consistente con flujos existentes.
2. Reutiliza vínculo token/order y reportes futuros.
3. Facilita auditoría e investigación de incidentes.

Sugerencia:
- `provider = "manual_admin"` (o equivalente acordado)
- `amount = 0`
- estados administrativos cerrados
- item descriptivo tipo `ASSIGN_DIRECT`

### B) No crear order
Ventaja:
- menos writes/modelado inicial.

Riesgos:
- pérdida de trazabilidad uniforme
- mayor complejidad en analytics y auditoría

**Decisión recomendada:** Sí crear `order` admin `$0`.

---

## 7) Token strategy

Recomendación oficial:

1. **Token nuevo obligatorio** para assign-direct (salvo caso idempotente exacto).
2. Invalidar/neutralizar token activo previo que pueda causar ambigüedad.
3. Expiración explícita (ej. 30–60 días) para token reservado.
4. Idempotencia por `chipId + target + requestKey`.

Reglas de seguridad:
- nunca reutilizar token usado.
- nunca dejar 2 tokens activos utilizables simultáneos para un mismo chip.
- registrar sufijo de token (no token completo) en audit.

Riesgos mitigados:
- activación por código viejo
- doble asignación accidental
- secuestro de token por colisión de flujo

---

## 8) Chip status transitions (propuesta)

| Before | Action | After |
|---|---|---|
| `inventory` | assign-direct (activate later) | `sold` (reservado) |
| `inventory` | assign-direct + `autoActivate=true` | `activated` |
| `sold` (misma asignación y contexto idempotente) | reintento seguro | `sold` |
| `sold` (reservado a otro contexto) | assign-direct | **error 409** |
| `activated` (mismo cliente reasignación lógica) | requiere política explícita (probable no-op o error) | `activated` / error |
| `inventory` con historial returned | assign-direct | `sold` |
| `inventory` tras rehabilitación | assign-direct | `sold` o `activated` (si autoActivate) |

Notas:
- `returned` hoy es vista heurística, no estado DB; operativamente parte de `inventory`.
- `preserveShortCode=true` recomendado para continuidad del identificador público.

---

## 9) Audit requirements

Cada assign-direct debe guardar (mínimo):

- actor (`actorUserId`, rol)
- target (`targetUserId`, `targetProfileId`, `accountId`)
- motivo (`reason`) + `notes`
- capacidad antes/después
- token antes/después (IDs + sufijo del activationCode)
- chip status before/after
- orderId administrativo generado (si aplica)
- `autoActivate` aplicado o no
- timestamp + correlación request

---

## 10) UI admin propuesta

En `InventorySection`:

1. Botón: **Assign Direct** (solo roles permitidos).
2. Modal con:
   - selector de usuario
   - selector de perfil
   - reason
   - notes
   - capacityMode
   - toggle `createZeroOrder`
   - toggle `autoActivate`
3. Warning explícito:
   - impacto en capacidad
   - implicación de trazabilidad
   - confirmación irreversible operativa
4. Confirmación final con resumen.

---

## 11) Riesgos

1. bypass de capacidad
2. doble asignación
3. token activo viejo reutilizable
4. error humano en operación presencial
5. fraude interno por asignaciones sin gobernanza
6. pérdida de trazabilidad si no hay order/audit robusto

Mitigación:
- RBAC estricto
- idempotencia
- token único activo
- orden admin $0
- audit fuerte

---

## 12) QA obligatorio antes de implementar

1. reposición mismo cliente
2. asignación sin capacidad (`deny_if_no_capacity`)
3. `grant_exception` con permisos correctos
4. `autoActivate=true` con perfil completo
5. token viejo inválido tras assign-direct
6. assign-direct sobre chip rehabilitado
7. rollback transaccional ante error intermedio
8. reintento idempotente (no duplicar order/token)

---

## 13) Recomendación final de arquitectura

Recomendación oficial para C3/C4:

1. Implementar assign-direct en capa de dominio (`OrderFulfillmentService` + helper especializado).
2. Crear `order` administrativo `$0` como anchor de trazabilidad.
3. Generar token nuevo obligatorio (con neutralización previa cuando aplique).
4. Audit reforzado de extremo a extremo.
5. Prohibir bypass silencioso de capacidad.

En síntesis:
- **Arquitectura recomendada:** dominio centralizado en service + endpoint delgado.
- **Capacidad recomendada:** default `deny_if_no_capacity`; excepción gobernada.
- **Token recomendado:** nuevo token obligatorio e idempotencia estricta.
- **Order $0:** **sí**, recomendado.
