# W5.40R-S - Auditoria de Inventario Trazable

Fecha: 2026-07-02

## Objetivo

Auditar Prisma, BD y backend del flujo operativo posterior a la consolidacion de Produccion, y dejar Inventario centrado en unidades fisicas trazables.

## Alcance

- `OperationFinishedGoodUnit` como fuente principal de inventario real.
- `OperationDigitalBatchItem.shortCode` como identidad publica canónica.
- `Inventario` como vista de unidades fisicas, no como mezcla de catalogo o recursos digitales.
- Lectura y documentacion de rutas, no cambios destructivos de datos.

## Lo confirmado

- `npx prisma migrate status` indica esquema alineado con la base.
- `npx prisma validate` confirma schema valido.
- `OperationDigitalBatchItem.shortCode` mantiene unicidad real en Prisma.
- `OperationFinishedGoodUnit` contiene `internalLabel`, `qaStatus`, `activationStatus`, `reservedOrderId`, `deliveredAt` y relacion a `digitalBatchItem`.
- La asignacion de usuario final sigue fuera de Operaciones.
- La activacion sigue fuera de Operaciones.

## Ajustes aplicados en este bloque

- `FinishedGoodUnitsSection` pasa a presentarse como `Unidades físicas trazables`.
- La vista prioriza:
  - disponibles
  - reservadas
  - pendientes QC
  - fallidas QC
  - entregadas
  - entregadas sin activar
- Se exponen:
  - `internalLabel`
  - `shortCode`
  - referencia a produccion
  - pedido reservado
  - despacho
  - historial reciente
- `OperationsCenterSection` abre Inventario directamente en la subvista de unidades.
- El endpoint de unidades acepta filtros operativos por estado, QC, activacion, produccion, etiqueta interna y shortCode.

## Inconsistencias detectadas

- 5 unidades trazables siguen sin `shortCode` canónico en su lote digital asociado.
- No se encontraron unidades `available` sin `qaStatus = passed`.
- No se encontraron reservas sin `reservedOrderId`.
- No se encontraron `qa_failed` con `inventoryStatus` incoherente.
- No se encontraron duplicados sospechosos por `internalLabel` ni por `shortCode`.

## Resultado del script de auditoria

- `totalUnits`: 16
- `inventoryStatus`: `qa_pending` 15, `available` 1
- `qaStatus`: `pending` 15, `passed` 1
- `activationStatus`: `not_activated` 16
- `missingShortCode`: 5
- `deliveredPendingActivation`: 0
- `duplicateInternalLabel`: 0
- `duplicateShortCode`: 0

## Riesgos

- Confundir inventario fisico con catalogo o recursos digitales.
- Mostrar `available` como asignacion final, cuando en realidad solo significa disponible para reserva.
- Exponer acciones manuales de alto riesgo sin control de evento.
- Reintroducir legado de checkout / `Order` / `Product` en la lectura operativa.

## Pendiente

- Cerrar la auditoria del script `scripts/audit-operations-inventory-w540rs.ts`.
- Completar la prueba manual de filtros y detalle por unidad.
- Decidir si `InventorySection` legacy debe ocultarse o mantenerse solo como acceso de compatibilidad.

## Correccion de este bloque

- Se priorizó `FinishedGoodUnitsSection` como vista principal de inventario trazable.
- Se extendió el endpoint de unidades para filtros operativos adicionales.
- Se documentó la brecha real de `shortCode` faltante en parte del lote digital existente.

## Reglas respetadas

- No se uso `prisma db push`.
- No se uso `prisma migrate reset`.
- No se tocaron migraciones historicas.
- No se toco checkout legacy.
- No se toco `Order` / `Product` legacy.
- No se reescribio activacion legacy.
- No se asigno usuario final desde Operaciones.
- No se activo desde Operaciones.
- No se creo despacho automatico.
