# Chip History Ledger Plan (PRE-LAUNCH C5A)

## 1) Problema actual

Hoy el sistema opera, pero el historial de lifecycle está fragmentado:

- `AuditLog` captura eventos administrativos, pero no es un ledger de transiciones de chip.
- No hay contrato único para todos los cambios de estado (`inventory/sold/activated/...`).
- La pestaña **Revertidos/Devueltos** usa heurística (`status=inventory` + señales de token histórico), lo que limita trazabilidad exacta.
- Soporte y auditoría forense requieren reconstrucciones manuales combinando múltiples fuentes (`Chip`, `ChipClaimToken`, `Order`, `AuditLog`).

---

## 2) Objetivos

Diseñar un registro formal que responda siempre:

1. **Quién** hizo el cambio (`actorUserId` o sistema).
2. **Qué** evento ocurrió (`eventType`).
3. **Cuándo** ocurrió (`createdAt`).
4. **Qué estado cambió** (`fromStatus` -> `toStatus`).
5. **Qué orden** participó (`orderId`).
6. **Qué token** participó (`tokenId`).
7. **Qué cuenta/perfil** afectó (`fromAccountId/toAccountId`, `fromProfileId/toProfileId`).
8. **Por qué** (`reasonCode`, `notes`, `metadataJson`).

---

## 3) Evaluación de alternativas

### A) `ChipHistory`
- Enfoque orientado al lifecycle integral del chip.
- Pros: lenguaje de dominio claro, buen acople con state machine.
- Contras: puede quedar “amplio” para movimientos puramente logísticos.

### B) `InventoryMovement`
- Enfoque logístico de inventario.
- Pros: intuitivo para almacén.
- Contras: corto para eventos no estrictamente de inventario (ej. `capacity_exception`, `assign_direct`, `token rotation`).

### C) **Tabla única Ledger** (recomendada)
- Un único journal append-only para lifecycle + logística + excepciones.
- Pros:
  - fuente de verdad única de transiciones,
  - simplifica auditoría/soporte,
  - elimina lógica heurística futura,
  - flexible vía `eventType` + `metadataJson`.
- Contras:
  - requiere disciplina fuerte de escritura por endpoint.

**Recomendación C5A:** usar modelo **único tipo Ledger**, con nombre de tabla sugerido `ChipHistoryLedger` (o `ChipHistory`).

---

## 4) Modelo recomendado

Campos propuestos:

- `id` (required)
- `chipId` (required)
- `eventType` (required)
- `fromStatus` (optional)
- `toStatus` (optional)
- `fromAccountId` (optional)
- `toAccountId` (optional)
- `fromProfileId` (optional)
- `toProfileId` (optional)
- `orderId` (optional)
- `tokenId` (optional)
- `reasonCode` (optional)
- `notes` (optional)
- `actorUserId` (optional, null para sistema/cron)
- `metadataJson` (optional)
- `createdAt` (required)

### Reglas mínimas de obligatoriedad operacional

1. Siempre: `chipId`, `eventType`, `createdAt`.
2. Si hay transición de estado: `fromStatus`, `toStatus` obligatorios.
3. Si el evento viene de orden/token: `orderId` y/o `tokenId` obligatorios según aplique.
4. Si hay excepción administrativa (`grant_exception`, fraude, corrección): `reasonCode` y `notes` obligatorios.

---

## 5) Taxonomía oficial de eventos

Lista objetivo:

- `created`
- `packaged`
- `inventory_available`
- `reserved`
- `sold`
- `activated`
- `suspended`
- `reverted`
- `rehabilitated`
- `assign_direct`
- `damaged`
- `lost`
- `returned`
- `capacity_exception`

### Día 1 (MVP obligatorio)

Implementar primero:

- `reserved`
- `sold`
- `activated`
- `reverted`
- `rehabilitated`
- `assign_direct`
- `damaged`
- `lost`
- `capacity_exception`

---

## 6) Endpoints que deben escribir historial

| Endpoint | Evento(s) | Momento de escritura | Datos mínimos |
|---|---|---|---|
| `POST /api/admin/chips` | `created`, `inventory_available` | al crear chip/lote | `chipId`, `toStatus=inventory`, `actorUserId` |
| `POST /api/admin/orders/[id]/approve` | `reserved` / `sold` | al reservar chip por orden | `chipId`, `fromStatus`, `toStatus=sold`, `orderId`, `tokenId`, `actorUserId` |
| `PATCH /api/admin/orders` (mientras exista) | `reserved` / `sold` | cuando haga fulfillment | mismos campos de arriba |
| `POST /api/chips/activate` | `activated` | al consumir token y activar | `chipId`, `tokenId`, `orderId?`, `fromStatus`, `toStatus=activated`, `toAccountId`, `toProfileId`, `actorUserId=user` |
| `POST /api/admin/chips/[chipId]/rehabilitate` | `rehabilitated` | al crear token nuevo y reset operativo | `chipId`, `tokenId(new)`, `fromStatus`, `toStatus=inventory`, `actorUserId`, `reasonCode` |
| `POST /api/admin/chips/[chipId]/assign-direct` | `assign_direct`, `reserved/sold`, `capacity_exception?` | al generar order $0 + token + reserva | `chipId`, `orderId`, `tokenId`, `fromStatus`, `toStatus=sold`, `actorUserId`, `reasonCode`, `notes` |
| rutas admin chips (dañado/perdido) | `damaged`/`lost` | al cambio de estado | `chipId`, `fromStatus`, `toStatus`, `actorUserId`, `reasonCode?` |

---

## 7) Estrategia de transición

### Chips/órdenes/tokens viejos
- Mantener íntegros sin reescritura destructiva.
- Ledger empieza como **source of truth hacia adelante** tras despliegue C5C.

### ¿Backfill?
**Recomendación:** backfill **parcial** (no total) y en fase separada.

- **No** reconstrucción forense completa de todo el pasado (alto costo/riesgo de inferencia incorrecta).
- **Sí** snapshot inicial por chip al momento de habilitar ledger (`bootstrap` event) para punto de partida consistente.

---

## 8) Reemplazo de heurística `returned`

Con ledger:

1. `returned` real se determina por evento explícito `returned`/`reverted`.
2. `rehabilitated` real por evento explícito `rehabilitated`.
3. La tab deja de inferir por combinaciones de token y pasa a filtrar eventos canónicos.

Resultado:
- elimina ambigüedad de “inventory con historial histórico difuso”.
- separa claramente: devuelto vs rehabilitado vs disponible nuevo.

---

## 9) Impacto en inventario admin

Simplificaciones futuras:

- Tabs “Revertidos/Devueltos” y “Rehabilitados” pueden derivarse por consulta directa al ledger.
- Menos reglas heurísticas en `GET /api/admin/chips?view=returned`.
- Mejor trazabilidad por fila (último evento + actor + motivo).

---

## 10) Impacto en soporte

Casos mejorados:

1. **Garantía**: evidencia exacta del ciclo del chip.
2. **Reposición**: rastro de `assign_direct` y token nuevo.
3. **Fraude interno**: actor/motivo/tiempo correlacionables.
4. **Auditoría**: secuencia temporal íntegra por chip.
5. **Incidentes**: reconstrucción rápida sin depender de heurísticas.

---

## 11) Riesgos

1. Escrituras incompletas si un endpoint no registra evento.
2. Doble escritura por retries sin idempotencia.
3. Divergencia entre estado actual de chip y último evento si no se mantiene disciplina transaccional.
4. Crecimiento de volumen (necesita índices y política de consulta eficiente).

Mitigación:
- write del ledger dentro de la misma transacción del cambio de estado,
- convenciones de idempotencia por endpoint,
- checklist QA de consistencia estado-vs-evento.

---

## 12) Recomendación final

Adoptar **tabla única de ledger de lifecycle de chip** (modelo `ChipHistoryLedger`), con:

- taxonomía de eventos canónica,
- escritura transaccional en endpoints críticos,
- sustitución progresiva de heurísticas de inventario,
- coexistencia temporal con `AuditLog` (AuditLog no se elimina de inmediato).

---

## 13) Plan de implementación futuro

### C5B — Migración
- Crear tabla ledger + índices clave (`chipId`, `eventType`, `createdAt`, `orderId`, `tokenId`).

### C5C — Writes
- Integrar escritura en endpoints críticos (approve/patch, activate, rehabilitate, assign-direct, cambios dañados/perdidos).

### C5D — Inventario
- Refactor de vistas admin para usar ledger en returned/rehabilitated y reducir heurística.

### C5E — QA
- Regresión E2E + consistencia estado chip vs última transición ledger + casos de soporte.
