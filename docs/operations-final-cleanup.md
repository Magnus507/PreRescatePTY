# Limpieza final del Centro de Operaciones

Fecha: 2026-06-30

Commit base: `48159cd test(operations): add full erp smoke test`

## Terminos buscados

- Proximamente / Próximamente
- Datos reales pendientes
- Pendiente de backend
- Pendiente de modelo operativo
- Mock / mock
- Demo / demo
- Placeholder / placeholder
- TODO / FIXME
- hardcoded
- Ruta stock normal / stock normal
- fabricacion legacy / fabricación legacy / legacy manufacturing
- disabled
- coming soon / pending backend / pending real data

## Archivos revisados

- `app/(admin)/admin/_components/sections/OperationsCenterSection.tsx`
- `app/(admin)/admin/_components/sections/MaterialsWorkflowSection.tsx`
- `app/(admin)/admin/_components/sections/ProductionQueueSection.tsx`
- `app/(admin)/admin/_components/sections/ProductionWorkflowSection.tsx`
- `app/(admin)/admin/_components/sections/QualitySection.tsx`
- `app/(admin)/admin/_components/sections/PackingSection.tsx`
- `app/(admin)/admin/_components/sections/FinishedGoodsSection.tsx`
- `app/(admin)/admin/_components/sections/DispatchSection.tsx`
- `app/(admin)/admin/_components/sections/CommercialSection.tsx`
- `app/(admin)/admin/_components/sections/WarrantySection.tsx`
- `app/(admin)/admin/_components/sections/ReplacementSection.tsx`
- `app/(admin)/admin/_components/sections/ReturnSection.tsx`
- `app/api/admin/operations`
- `docs`

## Cambios aplicados

- `ProductionWorkflowSection.tsx`
  - Se elimino un bloque de botones deshabilitados de acciones visibles del operador que todavia decia que se activaria con el modulo ERP.
  - Se mantuvo la vista informativa de flujo y estados operativos.

- `PackingSection.tsx`
  - Se reemplazaron textos "Pendiente de backend" y "Se activara con Prisma ERP" por descripciones operativas neutrales.
  - Se cambio el encabezado a "Controles complementarios".

- `FinishedGoodsSection.tsx`
  - Se cambio "Acciones pendientes" por "Rutas complementarias".
  - Se cambio "Pendiente de despacho" por "Gestionar desde Despacho o Comercial".

## Hallazgos dejados intencionalmente

- Los atributos `placeholder` de inputs se mantienen porque son ejemplos de formulario, no datos mock ni mensajes de maqueta.
- Los botones `disabled` por `refreshing`, `saving`, `savingEventKey`, validacion de formularios o prevencion de doble click se mantienen.
- Los controles complementarios de Empaque se mantienen deshabilitados porque no tienen handler propio y no forman parte de los eventos reales ya probados.
- La ruta a punto de venta en Inventario PT se mantiene como ruta complementaria, derivada a Despacho o Comercial.
- Las menciones en documentos historicos, auditorias archivadas, demo publica o legacy quedaron fuera de alcance porque no son texto visible del Centro de Operaciones.

## Confirmaciones

- No se modifico Prisma.
- No se modificaron migraciones.
- No se toco checkout legacy.
- No se tocaron modelos o flujos legacy `Order` / `Product`.
- No se cambio logica backend.
- No se cambio logica de inventario.
- No se cambio logica de eventos append-only.
- No se usó `stock` como fuente de verdad.
