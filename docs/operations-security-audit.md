# Auditoria de seguridad del Centro de Operaciones

Fecha: 2026-06-30

Base revisada: `fd653c5 feat(operations): add real module metrics`

## Alcance

Se revisaron los endpoints bajo `app/api/admin/operations` para:

- Materiales
- Produccion
- QC
- Empaque
- Inventario PT
- Despacho
- Comercial
- Garantias
- Reemplazos
- Devoluciones
- Dashboard de operaciones

Tambien se revisaron las secciones principales del Centro de Operaciones para detectar mocks, referencias visuales a stock como fuente de verdad y acciones operativas deshabilitadas dentro del flujo ya implementado.

## Hallazgos

- Todos los `route.ts` bajo `app/api/admin/operations` usan `requireRole(GENERAL_ADMIN_ROLES)`.
- No se encontraron endpoints publicos dentro de `app/api/admin/operations`.
- No se encontraron handlers `PUT`, `PATCH` o `DELETE` en los endpoints operativos revisados.
- No se encontraron operaciones `update` o `delete` sobre tablas de eventos operativos.
- No se encontro uso de `stock` como fuente de verdad dentro de `app/api/admin/operations`.
- Los balances de Inventario PT se calculan por eventos/movimientos.
- Los flujos de QC, Empaque, Despacho, Reemplazos y Devoluciones ya bloquean eventos sobre estados terminales segun sus reglas.
- Se corrigio Produccion para bloquear nuevos eventos cuando la orden ya esta `completed` o `cancelled`.

## Cambio aplicado

- `app/api/admin/operations/production-orders/[id]/events/route.ts`
  - Agrega validacion de estado terminal antes de crear eventos.
  - Devuelve `400` si se intenta registrar un evento sobre una orden `completed` o `cancelled`.
  - Mantiene los eventos append-only; no edita ni borra eventos existentes.

## Riesgos y notas

- La autorizacion actual es por roles administrativos generales (`GENERAL_ADMIN_ROLES`). No hay permisos granulares por modulo o accion dentro del Centro de Operaciones.
- No se modifico Prisma ni migraciones.
- No se tocaron checkout legacy, `Order` legacy ni `Product` legacy.
- Se detectaron textos con la palabra `stock` en secciones legacy o fuera del backend operativo; quedaron fuera de alcance porque no son fuente de verdad del Centro de Operaciones ya conectado.

## Verificacion esperada

- `npx prisma migrate status`
- `npx prisma validate`
- `npx prisma generate`
- `npm run typecheck`
- `npm run build`
- `git diff --check`
