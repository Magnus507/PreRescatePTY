# W5.39M - Reporte pre-push del flujo operativo real

## Estado de la rama

- Rama: `feature/operations-real-flow-w539a`
- `origin/master` sin commits adelantados respecto de la rama.
- Workspace limpio al cierre.

## Validaciones ejecutadas

- `npx prisma migrate status` OK
- `npx prisma validate` OK
- `npx prisma generate` OK
- `npm run typecheck` OK
- `npm run build` OK
- `git diff --check` OK

## Resultado funcional auditado

- Pedidos es el origen del flujo operativo.
- Pedido sin stock derivó en producción.
- Pedido interno fabricó inventario y no creó despacho.
- Producción conectó preparación digital, imprenta, ensamblaje y QC.
- QC Pass movió unidades a `available` o `reserved` según origen.
- QC Fail dejó unidades en `qa_failed`.
- Despacho usó unidades QC aprobadas y no activó usuario final.
- Inventario visual separa unidades físicas, materiales, recursos digitales y productos base.
- Historial y movimientos reconstruyen el flujo real.
- Operaciones no asigna usuario final.

## W5.39L

- Smoke ejecutado y validado previamente con prefijo `W539L_SMOKE_20260702T16063`.
- Escenario interno: unidades `available`, sin despacho.
- Escenario cliente/empresa: unidades `reserved`, despacho creado, entrega con `activationStatus = not_activated`.
- QC Fail validado con `qa_failed`.
- Limpieza confirmada con `remainingSmokeRecords = 0`.

## Warnings conocidos

- Persisten warnings preexistentes de `@next/next/no-img-element` y `react-hooks/exhaustive-deps`.
- No bloquearon build ni typecheck.

## Confirmación final

- No se usó `prisma db push`.
- No se usó `prisma migrate reset`.
- No se modificaron migraciones históricas.
- No se tocó checkout legacy.
- No se tocó `Order` / `Product` legacy.
- No se reescribió activación legacy.
- No se asignó usuario final.
