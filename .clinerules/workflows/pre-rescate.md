# PreRescatePTY Workflow

## Regla principal

Antes de cualquier trabajo, aplicar:

- `.agents/skills/prerescate-rules/SKILL.md`

Y según el tipo de tarea, aplicar también:

- backend/API: `backend-patterns`, `api-design`, `security-review`, `error-handling`
- frontend/UI: `frontend-patterns`, `frontend-a11y`, `design-system`, `dashboard-builder`
- Prisma/migraciones: `database-migrations`
- verificación: `verification-loop`, `coding-standards`

---

## Auditoría

Cuando el usuario pida auditoría:

1. Leer archivos relevantes.
2. Identificar flujo actual.
3. Identificar riesgos.
4. Proponer fases.
5. NO modificar código.
6. NO commit.
7. NO push.

Reporte:

- archivos revisados
- hallazgos
- riesgos
- recomendación
- siguiente fase

---

## Implementación

Cuando el usuario autorice implementar:

1. Revisar el alcance.
2. Modificar solo archivos permitidos.
3. No tocar Prisma salvo autorización explícita.
4. No crear migraciones salvo autorización explícita.
5. No tocar flujos no relacionados.
6. Ejecutar validaciones.

Validaciones:

```bash
git status --short
git diff
git diff --check
npm run typecheck
npm run build
```

---

## Commit

Antes de commit:

1. Confirmar archivos modificados.
2. Confirmar que validaciones pasaron.
3. Usar staging explícito.
4. Nunca usar `git add .`.

Ejemplo:

```bash
git add app/api/example/route.ts
git commit -m "fix(enterprise): describe change"
```

---

## Push

Solo hacer push si el usuario lo autoriza.

Antes del push:

```bash
git status
git log origin/master..HEAD --oneline
```

Después del push:

```bash
git status
git log origin/master..HEAD --oneline
git log --oneline -5
```

Nunca usar:

- force push
- amend
- rebase
- squash

---

## Prisma recovery

Si Prisma muestra:

- drift
- checksum mismatch
- P3006
- P1014
- reset prompt

Detener implementación.

NO ejecutar:

```bash
npx prisma migrate reset
npx prisma db push
npx prisma migrate resolve
```

Primero auditar:

- `schema.prisma`
- `prisma/migrations`
- `_prisma_migrations`
- BD real

Si el historial está roto, proponer baseline controlado antes de crear nuevas migraciones.

---

## Reporte final

Siempre terminar con:

- archivos modificados
- qué se implementó
- qué NO se tocó
- validaciones ejecutadas
- estado git
- commit
- push sí/no