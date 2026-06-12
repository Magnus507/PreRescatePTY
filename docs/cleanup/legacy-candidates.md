# Legacy Cleanup Candidates Catalog — PreRescatePTY (PRE-LAUNCH C2)

## 1) Resumen ejecutivo

- Este documento **no elimina nada**; solo cataloga limpieza futura controlada.
- No se debe borrar ningún componente/ruta crítica antes de completar QA E2E final.
- Objetivo: separar explícitamente qué es oficial, qué es legacy operativo y qué podría limpiarse después.

---

## 2) Clasificación oficial de este catálogo

- **OFFICIAL**: fuente de verdad actual, usada por flujos productivos.
- **LEGACY OPERATIVE**: sigue en uso, pero con deuda técnica y plan de reducción.
- **CLEANUP CANDIDATE**: candidato a remover o reemplazar luego de validaciones.
- **DO NOT TOUCH YET**: no tocar por riesgo alto o dependencia productiva fuerte.
- **DEPRECATED DOC**: documentación histórica/duplicada que debe consolidarse.

---

## 3) Tabla de candidatos

| Path / Ruta | Categoría | Uso actual | Riesgo de borrar | Condición para eliminar | Reemplazo oficial | Prioridad |
|---|---|---|---|---|---|---|
| `app/api/admin/orders/route.ts` (`PATCH /api/admin/orders`) | LEGACY OPERATIVE | Orquesta estados/order fulfillment parcial + notificaciones | **Alto** | Completar C10B..C10E + QA E2E verde | `/api/admin/orders/[id]/approve` + services de dominio | Alta |
| Fallback inline en PATCH: auto chip/token generation (`prisma.chip.create` + `chipClaimToken.create`) | CLEANUP CANDIDATE | Backward compatibility cuando no hay `assignedChipIds` | **Alto** | Extraído a `OrderFulfillmentService` + pruebas de equivalencia | `OrderFulfillmentService` (método formal) | Alta |
| Lógica de capacidad non-manual inline en PATCH | CLEANUP CANDIDATE | Incremento condicional (`existingTokens===0`) | **Alto** | Política de capacidad unificada en service + QA capacidad acumulativa | Servicio de capacidad / policy única | Alta |
| `app/api/admin/orders/[id]/approve/route.ts` | OFFICIAL | Camino canónico de aprobación manual | Alto (si se toca mal) | N/A (no eliminar) | N/A | Crítica |
| `app/api/admin/orders/[id]/reject/route.ts` | OFFICIAL | Camino canónico de rechazo manual + rate limit | Alto | N/A (no eliminar) | N/A | Crítica |
| Fast-track demo en `app/api/public/[shortCode]/route.ts` (`DEMO-ADMIN-VIP`, `44R6DBNQ`, etc.) | LEGACY OPERATIVE | Soporte demo comercial y showcase | **Medio** | Mover a feature flag/config controlada + QA pública | Ruta pública con flag/entorno | Media |
| `app/(admin)/admin/inventario/lotes/page.tsx` | CLEANUP CANDIDATE | Página con data hardcoded/mock de lotes | **Bajo/Medio** | Confirmar no dependencia de navegación productiva y reemplazo real | Integración con API real de lotes | Media |
| `docs/logic/chip-states.md` | DEPRECATED DOC | Puede solaparse con canónica oficial | Bajo | Consolidar en `docs/official/chip-token-order-state-machine.md` | Documento oficial canónico | Media |
| `docs/logic/chip-status-semantics.md` | DEPRECATED DOC | Semántica parcial/histórica | Bajo | Consolidar y dejar puntero a documento oficial | Documento oficial canónico | Media |
| `docs/logic/order-state-machine.md` | DEPRECATED DOC | Máquina de estados histórica/parcial | Bajo | Validar coherencia con official + archivar deprecado | `docs/official/chip-token-order-state-machine.md` | Media |
| `docs/architecture/chip-lifecycle-current-state.md` | DO NOT TOUCH YET | Documento de apoyo arquitectónico vigente | Medio | Solo deprecable cuando official cubra 100% decisiones y pendientes | Official + QA runbooks | Baja |
| `app/(public)/e/[shortCode]/page.tsx` | OFFICIAL | Vista pública compacta/triage + estados unactivated/error | Alto | N/A (no eliminar) | N/A | Crítica |
| `app/(public)/e/[shortCode]/_components/IndustrialProfileView.tsx` | OFFICIAL | Vista pública industrial en producción | Alto | N/A (no eliminar) | N/A | Crítica |
| `app/(admin)/admin/_components/sections/InventorySection.tsx` | OFFICIAL | UI real de tabs de inventario (“Almacén Central”) | Alto | N/A (no eliminar) | N/A | Crítica |
| `docs/_archivado/architecture/order-fulfillment-refactor-plan.md` (secciones C4..C7 históricas) | ✅ Archivado | Historial de estabilización y decisiones | Bajo | Archivado en D2B | Plan C10 consolidado + changelog | Baja |

---

## 4) Notas específicas requeridas

### 4.1 PATCH `/api/admin/orders`
- Clasificado como **LEGACY OPERATIVE** por mezcla de responsabilidades (estado/pago, fallback, capacidad, notificaciones).
- No remover hasta cerrar transición por fases pequeñas.

### 4.2 Auto token generation fallback en PATCH
- Clasificado como **CLEANUP CANDIDATE**.
- Debe migrarse a service antes de cualquier remoción.

### 4.3 Docs viejas de chip states
- `docs/logic/chip-states.md`
- `docs/logic/chip-status-semantics.md`
- `docs/logic/order-state-machine.md`

Propuesta: marcar como **DEPRECATED DOC** al consolidar todo en la canónica oficial.

### 4.4 Fast-track demo API pública
- Presente en `app/api/public/[shortCode]/route.ts`.
- Mantener por ahora (operativo comercial), pero migrar a feature flag controlado por entorno.

### 4.5 Inventario/lotes
- `app/(admin)/admin/inventario/lotes/page.tsx` luce parcial/mock (arreglo local `lotes`).
- Candidato de limpieza o reemplazo con data real.

### 4.6 Componentes públicos viejos / rutas chips viejas
- No se identificó en esta auditoría una ruta pública adicional claramente “vieja” para remover ya.
- Sí hay coexistencia de lógica legacy en órdenes (PATCH), principal foco de limpieza técnica.

---

## 5) Reglas de eliminación futura

1. Eliminar solo después de **QA E2E prelaunch aprobado**.
2. Eliminar solo si no aparece en imports/uso UI/rutas (`grep` + revisión manual).
3. Cada eliminación en **commit separado**.
4. En cada commit de limpieza: `npm run typecheck` + `npm run build`.
5. No eliminar rutas productivas consumidas por UI activa.
6. Si hay duda, degradar primero a “deprecated + warning” antes de borrar.

---

## 6) Próximo paso recomendado

**PRE-LAUNCH C3 — Assign-Direct audit plan**

- Diseñar contrato formal de `POST /api/admin/chips/[chipId]/assign-direct`.
- Definir validaciones, impacto de capacidad, traza audit y comportamiento de token/order.
- Sin implementación en C3; solo diseño validado.
