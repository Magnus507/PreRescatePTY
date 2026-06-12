# Plan final de reorganización de carpetas — PreRescatePTY

## 1. Resumen ejecutivo

Este documento consolida los resultados del tablero `prerescatepty-reorg`, cuyo propósito fue planificar una reorganización segura del repositorio sin ejecutar cambios todavía. El tablero se diseñó para separar claramente el análisis de estructura, la propuesta de arquitectura objetivo, el riesgo por carpeta y los planes específicos para documentación, componentes, scripts, tests, helpers y ejecución por fases.

La base del proyecto ya estaba estabilizada antes de esta fase: último commit estable `a41946a`, Vercel Ready, `typecheck` PASS, `build` PASS y tests base PASS. Además, existe una auditoría final previa documentada en `docs/03-auditorias/estructura-repo/auditoria-final-post-estabilizacion-prerescatepty.md`.

El resultado del tablero confirma que la reorganización puede planificarse con bajo riesgo si se respeta el orden correcto: primero docs y planos de estructura, luego tests y scripts, después helpers compartidos, después componentes, y solo al final cualquier posible intervención en `app/` o `app/api/`, siempre con cobertura y aprobación humana suficiente.

## 2. Estado base confirmado

Hechos confirmados por contexto y evidencia previa:

- Último commit estable: `a41946a`
- Vercel Ready
- `typecheck`: PASS
- `build`: PASS
- `tests base`: PASS
- Auditoría final existente: `docs/03-auditorias/estructura-repo/auditoria-final-post-estabilizacion-prerescatepty.md`

Lectura operativa:
- El proyecto parte desde una línea base funcional.
- La reorganización propuesta debe ser conservadora y por fases.
- No existe justificación para tocar código productivo antes de cerrar la planificación y las validaciones previas.

## 3. Tareas usadas como fuente

Se usaron como fuente las siguientes tareas del tablero:

- `t_399d36d4` — Inventario actual de estructura
- `t_3c41a8ec` — Propuesta de estructura objetivo
- `t_9325e9ea` — Análisis de riesgo por carpeta
- `t_804de107` — Plan de migración documental
- `t_a3821e93` — Plan de reorganización de componentes
- `t_b5b17113` — Plan de reorganización de scripts
- `t_0ed2b28a` — Plan de reorganización de tests
- `t_4d584d68` — Plan de reorganización de lib/helpers
- `t_1f1d9bd5` — Plan de ejecución por fases
- `t_686648a3` — Checklist de seguridad antes de ejecutar

## 4. Inventario actual del repositorio

### Hallazgos reales reportados por el inventario

El inventario completo del repo reportó:

- ~290 archivos fuente
- 68 handlers API
- 150+ documentos
- 11 carpetas de código
- 7 ítems legacy detectados

### Ítems legacy detectados

Según la tarea de inventario:

- `src/lib/request-ip.ts` duplicado
- `docs/analysis/` heredado
- `docs/aud/` vacía
- 5 archivos `.md` en raíz
- `setup-storage.ts` duplicado
- 29 auditorías históricas

### Lectura del estado actual

La estructura actual ya permite identificar capas claras, pero todavía mezcla:

- código productivo
- documentación finalizada
- documentación histórica/legacy
- scripts operativos y sensibles
- carpetas de apoyo que aún no tienen rol completamente definido

La conclusión es que el repo es funcional, pero necesita una organización más explícita por dominios y por criticidad de movimiento.

## 5. Estructura objetivo propuesta

### Árbol recomendado de carpetas

```text
app/                      # capa de rutas Next.js; se conserva como shell de navegación y entrada
  (publico)/
  (auth)/
  (cliente)/
  (admin)/
  api/                    # acople alto: contrato HTTP, validaciones, auth, observabilidad

features/                 # mapa del producto por dominio; lectura humana del negocio
  fichas-medicas/
  chips/
  admin/
  cliente/
  organizaciones/
  ordenes-pagos/
  website/
  notificaciones/

components/               # UI reutilizable; agnóstico de dominio salvo subcarpetas explícitas
  ui/
  shared/
  layout/
  forms/
  domains/

lib/                      # lógica compartida y utilidades transversales
  auth/
  db/
  api/
  validation/
  formatting/
  permissions/
  observability/
  env/
  security/

docs/                     # documentación viva + arquitectura + decisiones + migración
  architecture/
  decisions/
  migration/
  glossary.md

scripts/                  # automatizaciones operativas y tareas de mantenimiento
  db/
  maintenance/
  import/
  export/

tests/                    # pruebas por capa y por dominio
  unit/
  integration/
  e2e/
  factories/
  fixtures/
  domains/

prisma/                   # zona de acople de datos; se mantiene centralizada
  schema.prisma
  migrations/
  seed.ts

reportes/                 # reportes y entregables operativos o de auditoría, si se mantiene como carpeta
assets/                   # si aplica para material estático no ejecutable
```

### Lectura de acoples principales

- `app/` → acople técnico máximo; debe limitarse a composición de ruta y wiring.
- `app/api/` → frontera HTTP; cambios aquí impactan frontend y backend a la vez.
- `components/` → acople visual; evitar lógica de negocio.
- `lib/` → acople transversal; solo lógica realmente compartida.
- `prisma/` → acople de datos; cambios aquí requieren coordinación por dominio.
- `docs/` y `features/` → capa de claridad; no deben contener lógica ejecutable.
- `tests/` → espejo de dominios y contratos críticos.

## 6. Riesgo por carpeta

| Carpeta | Riesgo | Razón | Se puede mover | Validación requerida |
|---|---|---|---|---|
| `app/` | No tocar | Es la capa de rutas y entrada de Next.js | No tocar todavía | Cobertura suficiente + aprobación humana |
| `app/api/` | No tocar | Contratos HTTP y frontera de seguridad | No tocar todavía | Cobertura y revisión RBAC |
| `app/(admin)/` | No tocar | Hay trabajo paralelo de otra IA y alto acople | No tocar todavía | Aprobación explícita |
| `app/(app)/dashboard/` | Alto | Área crítica del MVP con acople funcional | Después | Tests de flujo y checklist Go/No-Go |
| `middleware.ts` | No tocar | Seguridad y routing global | No tocar todavía | Aprobación humana |
| `prisma/` | No tocar / alto | Acople de datos y migraciones | Solo después | Checklist de migración y validación |
| `package.json` | No tocar | Scripts y configuración base | No tocar todavía | Ninguna sin aprobación |
| `package-lock.json` | No tocar | Integridad de dependencias | No tocar todavía | `npm audit` y revisión humana |
| `next.config.ts` | No tocar | Configuración crítica de build/deploy | No tocar todavía | Aprobación explícita |
| `components/` | Alto | Reorganización por dominio puede afectar UI compartida | Después | Mapa de dependencias visuales |
| `lib/` | Alto | Helpers compartidos afectan auth, db y validación | Después | Tests + revisión de acoples |
| `scripts/` | Medio-Alto | Puede incluir scripts sensibles/destructivos | Después | Política de scripts + aprobación |
| `tests/` | Medio | Reorganización de estructura, bajo riesgo funcional | Después | Vitest y estructura objetivo |
| `docs/` | Bajo | Reorganización documental segura | Ahora / primero | Verificación de enlaces |
| `docs/aud` | Bajo | Legacy documental / vacío | Ahora / primero | Validar si se consolida o se archiva |
| `features/` | Bajo-Medio | Carpeta untracked y de definición de dominio | Después | Decisión humana + mapa de dominio |
| `reportes/` | Bajo | Carpeta de entregables/documentos | Ahora / primero | Navegación y referencias |

## 7. Plan documental

La documentación es el área con mayor potencial de avance seguro en la primera fase.

### Qué hacer con cada bloque

#### `docs/`
- Mantener como base documental principal.
- Preservar el índice maestro.
- Evitar duplicar auditorías ya consolidadas.
- Normalizar referencias cruzadas entre índices, arquitectura y auditorías.

#### `docs/aud`
- Tratar como legacy o carpeta de transición.
- Revisar si debe consolidarse en `docs/03-auditorias/` o mantenerse como histórico aislado.
- No mover sin confirmar todos los enlaces dependientes.

#### `Revisión`
- Revisar como documento o carpeta legacy de soporte.
- Clasificar si pertenece a reportes, auditorías o documentación de planificación.
- No mover hasta confirmar referencia cruzada.

#### `reportes/`
- Mantener como zona de entregables visibles si sigue siendo útil para decisiones humanas.
- Si se consolida, debe hacerse sin perder trazabilidad de auditorías finales.

#### Documentación legacy
La evidencia del inventario mostró:
- `docs/analysis/` heredado
- `docs/aud/` vacío
- múltiples auditorías históricas
- archivos `.md` sueltos en raíz

La recomendación es consolidar, indexar y archivar con criterio, no borrar.

#### Auditorías finales
Las auditorías finales deben quedar visibles y enlazadas desde el índice maestro y desde cualquier plan de reorganización futuro.

## 8. Plan de componentes

### Propuesta sin ejecución

La tarea de componentes propuso una reorganización por dominios sin mover nada todavía:

#### Shell público compartido
- `components/Navbar.tsx`
- `components/Footer.tsx`

#### Public / marketing
- `components/home/StickerDesign.tsx`
- `components/home/BentoBenefits.tsx`
- `components/home/VisualHowItWorks.tsx`
- `components/home/TrustSection.tsx`
- `components/home/PricingSection.tsx`

#### Dashboard / fichas médicas
- `components/forms/MedicalProfileForm.tsx`
- `components/ui/BirthDatePicker.tsx`

#### Orders / fulfillment
- `components/orders/OrderStatusBadge.tsx`

### Lectura de reorganización

- El repo mezcla hoy componentes por tipo visual con componentes por dominio.
- La separación más limpia sería:
  - shared/shell
  - marketing público
  - fichas médicas
  - pedidos/restringido

### Zonas futuras sugeridas

- `components/shared/`
- `components/public/` o `components/marketing/`
- `components/dashboard/medical-profiles/`
- `components/dashboard/orders/`
- `components/restricted/admin/`

## 9. Plan de scripts

### Clasificación real reportada

La tarea de scripts entregó esta clasificación:

#### Scripts seguros / operativos
- `scripts/seed-structural-data.ts` → seed idempotente

#### Scripts sensibles
- `scripts/create-initial-superadmin.ts` → operativo sensible

#### Scripts peligrosos / destructivos
- `scripts/reset-all-test-data.sql` → destructivo crítico

#### Archivo de documentación / runbook
- `PLAN_RESET_TOTAL_SUPERADMIN.md` → documentación / runbook

### Recomendación de ubicación

- Aislar scripts destructivos en una subcarpeta dedicada.
- Mover documentación fuera de `scripts/` si no ejecuta nada.
- Mantener confirmación explícita antes de ejecutar cualquier script de alto impacto.

### Política operativa sugerida

- **Seguro:** seed idempotente y scripts de diagnóstico sin mutación peligrosa.
- **Sensibles:** scripts que requieren confirmación humana, entorno correcto y propósito explícito.
- **Peligrosos:** scripts de reset total o cualquier SQL que pueda borrar o reescribir datos.
- **No ejecutar sin aprobación:** `create-initial-superadmin.ts`, `reset-all-test-data.sql`, `seed-structural-data.ts` en contexto de producción o datos reales.

## 10. Plan de tests

### Evidencia real reportada

La tarea de tests indicó:

- 3 tests base actuales
- 18 libs utilitarias
- 60+ rutas API
- 3 grandes superficies UI:
  - admin
  - public
  - dashboard

### Estructura recomendada

```text
tests/
  unit/
  integration/
  e2e/
  factories/
  fixtures/
  domains/
    fichas-medicas/
    chips/
    admin/
    auth/
    payments/
    public/
```

### Prioridades

1. auth / RBAC / rate limit
2. flujos médicos
3. chips / QR
4. pagos
5. admin y dashboard
6. utilidades críticas y validaciones

### Objetivo práctico

No mover la estructura de tests antes de tener claro qué dominio cubre cada prueba, para no perder trazabilidad entre carpetas y casos reales del MVP.

## 11. Plan de lib/helpers

### Archivos revisados por la tarea
- `lib/requireAuth.ts`
- `lib/auth.ts`
- `lib/rbac.ts`
- `lib/rateLimit.ts`
- `lib/request-ip.ts`
- `lib/prisma.ts`
- `lib/validations.ts`

### Propuesta sin implementación

#### auth/
- `lib/auth.ts`
- `lib/requireAuth.ts`
- `lib/rbac.ts`

#### security/
- `lib/rateLimit.ts`
- `lib/request-ip.ts`
- `lib/encryption.ts` (si aplica)

#### db/
- `lib/prisma.ts`

#### validations/
- `lib/validations.ts`

### Observación importante

`lib/requireAuth.ts` está acoplado al flujo de auth actual y no debe moverse de forma aislada sin revisar sus dependencias. La tarea recomendó dejarlo como guard central hasta que exista una estrategia de migración por re-exports o wrapper común.

### Regla de cautela

- No tocar `middleware.ts` ni `app/api/*` todavía.
- No cambiar imports ahora.
- Primero diseñar estructura y compatibilidad.

## 12. Plan de ejecución por fases

### Fase 0 — Rama de trabajo y respaldo

**Objetivo:** preparar un espacio seguro antes de cualquier movimiento real.

**Archivos/carpetas:**
- ninguna modificación aún

**Riesgo:** bajo

**Validaciones:**
- estado limpio del workspace
- respaldo o rama dedicada

**Commit sugerido:**
- `chore: prepare safe restructuring branch`

**Rollback:**
- volver a la rama anterior sin cambios

---

### Fase 1 — docs/reportes

**Objetivo:** normalizar documentación, índices y reportes visibles.

**Archivos/carpetas:**
- `docs/`
- `docs/aud`
- `Revisión`
- `reportes/`
- auditorías finales

**Riesgo:** bajo

**Validaciones:**
- `npm run typecheck`
- `npm run build`
- `npx vitest run`
- enlaces internos revisados

**Commit sugerido:**
- `docs: consolidate repository documentation`

**Rollback:**
- restaurar referencias y rutas documentales previas

---

### Fase 2 — tests

**Objetivo:** ordenar la estructura de pruebas por dominio antes de mover lógica más sensible.

**Archivos/carpetas:**
- `tests/`
- `vitest.config.ts` solo si fuese estrictamente necesario y aprobado

**Riesgo:** medio

**Validaciones:**
- `npm run typecheck`
- `npm run build`
- `npx vitest run`

**Commit sugerido:**
- `test: reorganize test structure by domain`

**Rollback:**
- restaurar estructura previa sin tocar lógica de producción

---

### Fase 3 — scripts

**Objetivo:** separar scripts seguros, sensibles y peligrosos.

**Archivos/carpetas:**
- `scripts/`
- `PLAN_RESET_TOTAL_SUPERADMIN.md`
- `scripts/create-initial-superadmin.ts`
- `scripts/reset-all-test-data.sql`
- `scripts/seed-structural-data.ts`

**Riesgo:** medio-alto

**Validaciones:**
- revisión humana explícita
- `npm run typecheck`
- `npm run build`
- `npx vitest run`

**Commit sugerido:**
- `chore: classify and isolate operational scripts`

**Rollback:**
- volver a la ubicación anterior de los scripts documentales/operativos

---

### Fase 4 — lib/helpers

**Objetivo:** separar auth, security, db y validations sin romper imports.

**Archivos/carpetas:**
- `lib/`
- `lib/requireAuth.ts`
- `lib/auth.ts`
- `lib/rbac.ts`
- `lib/rateLimit.ts`
- `lib/request-ip.ts`
- `lib/prisma.ts`
- `lib/validations.ts`

**Riesgo:** alto

**Validaciones:**
- `npm run typecheck`
- `npm run build`
- `npx vitest run`
- revisión de acoples y contratos

**Commit sugerido:**
- `refactor: organize shared helpers by responsibility`

**Rollback:**
- revertir la fase entera si se rompe auth, rate limit o acceso a datos

---

### Fase 5 — components

**Objetivo:** reorganizar UI por dominio sin perder reutilización.

**Archivos/carpetas:**
- `components/`

**Riesgo:** alto

**Validaciones:**
- `npm run typecheck`
- `npm run build`
- `npx vitest run`
- revisión visual/manual de rutas críticas

**Commit sugerido:**
- `refactor: group components by domain`

**Rollback:**
- restaurar imports y ubicación anterior de componentes

---

### Fase 6 — app/API solo si hay cobertura suficiente

**Objetivo:** tocar rutas y API únicamente si ya existe cobertura suficiente y aprobación explícita.

**Archivos/carpetas:**
- `app/`
- `app/api/`
- `app/(app)/dashboard/`
- `app/(admin)/` solo si deja de estar bloqueado por otro trabajo

**Riesgo:** muy alto

**Validaciones:**
- `npm run typecheck`
- `npm run build`
- `npx vitest run`
- checklist Go/No-Go completado
- revisión humana previa

**Commit sugerido:**
- `refactor: update route structure after coverage` *(solo si se autoriza)*

**Rollback:**
- revertir por lotes pequeños y no mezclar con cambios de datos o scripts

## 13. Checklist Go/No-Go

Antes de autorizar movimientos reales, confirmar:

- [ ] La rama de trabajo está separada de `master`
- [ ] Hay backup / plan de rollback
- [ ] `npm run typecheck` pasa antes de mover
- [ ] `npm run build` pasa antes de mover
- [ ] `npx vitest run` pasa antes de mover
- [ ] `app/` sigue sin tocarse salvo aprobación explícita
- [ ] `app/api/` sigue sin tocarse salvo aprobación explícita
- [ ] `app/(admin)/` no se modifica mientras otra IA trabaje allí
- [ ] `middleware.ts` no se toca
- [ ] `prisma/` no se toca sin checklist de base de datos
- [ ] `package.json` y `package-lock.json` permanecen intactos
- [ ] Los scripts sensibles están clasificados y aprobados
- [ ] Los archivos untracked pendientes están decididos por humanos
- [ ] Los enlaces de documentación siguen funcionando

## 14. Archivos/carpetas que NO deben tocarse todavía

- `app/`
- `app/api/`
- `app/(admin)/`
- `app/(app)/dashboard/`
- `middleware.ts`
- `prisma/`
- `package.json`
- `package-lock.json`
- `next.config.ts`
- `scripts/reset-all-test-data.sql`
- `scripts/create-initial-superadmin.ts`
- `scripts/seed-structural-data.ts` sin aprobación humana
- `PLAN_RESET_TOTAL_SUPERADMIN.md` sin decisión de ubicación
- `features/` hasta decidir su rol real
- `reportes/` hasta decidir si se consolida o se conserva

## 15. Decisiones humanas requeridas

Antes de ejecutar cualquier reorganización real, el equipo debe decidir:

- si `features/` se mantiene como carpeta de dominios o se deja como documentación/idea
- si `reportes/` queda como carpeta visible de entregables
- si `docs/aud` se consolida o se archiva
- si `Revisión` es documentación viva o histórico
- si `scripts/create-initial-superadmin.ts` debe quedar dentro del repo principal
- si `scripts/reset-all-test-data.sql` debe mantenerse en el repo o moverse fuera de producción
- si `scripts/seed-structural-data.ts` será parte del flujo formal o solo herramienta local
- si `lib/requireAuth.ts` sigue como guard central o se migra en una fase posterior
- si se autoriza tocar `components/` antes o después de aumentar cobertura
- si `app/` y `app/api/` quedan completamente congelados hasta nueva aprobación

## 16. Próximos commits sugeridos

Sugerencias de commits futuros, no ejecutados:

- `docs: consolidate repo documentation and audits`
- `docs: finalize repository structure plan`
- `chore: classify operational scripts`
- `test: reorganize tests by domain`
- `refactor: organize shared helpers by responsibility`
- `refactor: group components by domain`

No se recomienda proponer commits sobre scripts peligrosos sin revisión humana explícita.

## 17. Veredicto

### Qué se puede reorganizar primero
- `docs/`
- `docs/aud`
- `Revisión`
- `reportes/` si se confirma su rol documental
- el plan documental y el índice maestro

### Qué no se debe mover todavía
- `app/`
- `app/api/`
- `app/(admin)/`
- `app/(app)/dashboard/`
- `middleware.ts`
- `prisma/`
- `package.json`
- `package-lock.json`
- `next.config.ts`
- scripts sensibles

### Cuándo sería seguro tocar código
- cuando la reorganización documental esté cerrada
- cuando exista cobertura suficiente en tests
- cuando RBAC, scripts sensibles y helpers compartidos estén clasificados con claridad
- cuando haya aprobación humana para las fases de mayor acople

### Validaciones obligatorias
- `npm run typecheck`
- `npm run build`
- `npx vitest run`
- revisión de enlaces y rutas documentales
- checklist Go/No-Go completo

---

Generado a partir de task `t_1f1d9bd5` y consolidado del tablero `prerescatepty-reorg`