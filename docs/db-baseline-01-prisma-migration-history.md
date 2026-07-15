# DB-BASELINE-01 - Alineación segura del historial Prisma con la base de desarrollo

**Fecha de corte:** 14 de julio de 2026
**Entorno auditado:** desarrollo local / Supabase de desarrollo recuperado
**Estado:** baseline completado y verificado

## 1. Resumen ejecutivo

La base de desarrollo ya no estaba sin historia: funcionaba, pero carecía de `_prisma_migrations`.
Esta fase construyó un baseline verificable del historial Prisma sin borrar datos ni tocar producción.

Resultado final:

- `_prisma_migrations` existe;
- las migraciones locales quedaron registradas;
- `npx prisma migrate status` quedó alineado;
- `prisma migrate diff` entre la base y el schema quedó vacío;
- se añadió una migración de reconciliación solo para los importes comerciales que aún diferían del schema.

## 2. Causa del historial ausente

La base fue creada o reconstruida fuera de Prisma Migrate, probablemente mediante una combinación de:

- `db push`;
- SQL manual;
- introspección;
- o restauración parcial sin historia.

Síntomas observados:

- `_prisma_migrations` no existía;
- `npx prisma migrate status` reportaba 26 migraciones pendientes;
- el esquema físico ya tenía tablas y datos reales;
- algunos campos críticos no estaban alineados al schema moderno.

## 3. Entorno auditado

Huella sanitizada del entorno:

- proveedor: PostgreSQL / Supabase
- host: `aws-1-us-west-2.pooler.supabase.com`
- base: `pos***`
- schema: `public`
- hash corto: `7e48fdeecac6`

La aplicación, Prisma CLI y los scripts usan la misma base confirmada.

## 4. Backup

Antes de modificar el historial Prisma se creó un backup lógico:

- tipo: dump comprimido
- ubicación: `tmp/db-baseline-01-20260714213702.sql.gz`
- estado: verificado localmente

El archivo quedó fuera de Git.

## 5. Migraciones locales

Migraciones presentes al inicio de la fase:

1. `20260629000000_baseline_initial_schema`
2. `20260629000001_chip_replacement_token_status`
3. `20260629000002_operations_materials_events`
4. `20260630000000_operations_production_orders`
5. `20260630145755_operations_qc_inspections`
6. `20260630185538_operations_packing_batches`
7. `20260630192540_operations_finished_goods_inventory`
8. `20260630194627_operations_dispatches`
9. `20260630201942_operations_commercial_orders`
10. `20260630204952_operations_warranties`
11. `20260630210956_operations_replacements`
12. `20260630212550_operations_returns`
13. `20260701154317_operations_digital_batches`
14. `20260701155228_operations_print_orders`
15. `20260701155914_operations_finished_good_units`
16. `20260701164613_operations_dispatch_units`
17. `20260701172445_operations_after_sales_units`
18. `20260702000001_operations_digital_short_code_unique`
19. `20260702022218_operations_production_unit_preparation`
20. `20260709195449_add_product_operational_mapping`
21. `20260714233000_commerce_order_sync_outbox`
22. `20260714235500_order_item_operational_snapshot`
23. `20260715001000_user_session_version`
24. `20260715003000_password_reset_consumed_at`
25. `20260715010000_money_decimal`
26. `20260715122000_status_strong_domains`
27. `20260715143000_reconcile_operation_commercial_money`

## 6. Clasificación completa

Todas las migraciones locales terminaron como **MATERIALIZADAS COMPLETAMENTE** en la base de desarrollo después del baseline y de la reconciliación monetaria final.

| Migración | Estado físico | Evidencia | Acción |
|---|---|---|---|
| `20260629000000_baseline_initial_schema` | Completa | Esquema base presente y `resolve` aplicado | `resolve --applied` |
| `20260629000001_chip_replacement_token_status` | Completa | Campos y comportamiento presentes | `resolve --applied` |
| `20260629000002_operations_materials_events` | Completa | Tablas operacionales presentes | `resolve --applied` |
| `20260630000000_operations_production_orders` | Completa | Flujo de producción presente | `resolve --applied` |
| `20260630145755_operations_qc_inspections` | Completa | QC presente | `resolve --applied` |
| `20260630185538_operations_packing_batches` | Completa | Packing presente | `resolve --applied` |
| `20260630192540_operations_finished_goods_inventory` | Completa | Inventario operativo presente | `resolve --applied` |
| `20260630194627_operations_dispatches` | Completa | Despacho presente | `resolve --applied` |
| `20260630201942_operations_commercial_orders` | Completa | Órdenes comerciales operativas presentes | `resolve --applied` |
| `20260630204952_operations_warranties` | Completa | Garantías presentes | `resolve --applied` |
| `20260630210956_operations_replacements` | Completa | Reemplazos presentes | `resolve --applied` |
| `20260630212550_operations_returns` | Completa | Devoluciones presentes | `resolve --applied` |
| `20260701154317_operations_digital_batches` | Completa | Lotes digitales presentes | `resolve --applied` |
| `20260701155228_operations_print_orders` | Completa | Órdenes de impresión presentes | `resolve --applied` |
| `20260701155914_operations_finished_good_units` | Completa | Unidades físicas presentes | `resolve --applied` |
| `20260701164613_operations_dispatch_units` | Completa | Unidad-despacho presente | `resolve --applied` |
| `20260701172445_operations_after_sales_units` | Completa | Postventa operativa presente | `resolve --applied` |
| `20260702000001_operations_digital_short_code_unique` | Completa | Restricción digital presente | `resolve --applied` |
| `20260702022218_operations_production_unit_preparation` | Completa | Preparación de unidad presente | `resolve --applied` |
| `20260709195449_add_product_operational_mapping` | Completa | Product → mapping operativo presente | `resolve --applied` |
| `20260714233000_commerce_order_sync_outbox` | Completa | Outbox presente; historia aplicada | `resolve --applied` |
| `20260714235500_order_item_operational_snapshot` | Completa | Snapshot operacional presente | `resolve --applied` |
| `20260715001000_user_session_version` | Completa | `sessionVersion` presente | `resolve --applied` |
| `20260715003000_password_reset_consumed_at` | Completa | Consumo atómico de reset presente | `resolve --applied` |
| `20260715010000_money_decimal` | Completa | Monetary fields en `Decimal(18,2)` | `resolve --applied` |
| `20260715122000_status_strong_domains` | Completa | Enums críticos presentes | `resolve --applied` |
| `20260715143000_reconcile_operation_commercial_money` | Completa | Reconciliación de importes operativos aplicada | `deploy` |

## 7. Evidencia por migración

Evidencia general usada para la clasificación:

- existencia de tablas, columnas, enums, índices y FKs en `information_schema` / `pg_catalog`;
- comparación del schema con la base mediante `prisma migrate diff`;
- `npx prisma migrate status` alineado al final;
- estado poblado y consistente en modelos clave;
- migración de reconciliación aplicada solo donde el diff real seguía abierto.

## 8. Drift

### Drift detectado al inicio

Antes del baseline, `prisma migrate diff` mostraba diferencias en:

- `OperationCommercialOrderEvent.amount`
- `OperationCommercialOrderItem.unitPrice`
- `OperationCommercialOrderItem.totalPrice`

### Drift resuelto

Se aplicó una migración de reconciliación que convirtió esos importes a `DECIMAL(18,2)`.

### Drift residual aceptable

No quedó drift bloqueante entre la base y `schema.prisma` al cierre de esta fase.

## 9. Enums

La base ya tenía materializados los enums críticos:

- `OrderPaymentStatus`
- `OrderStatus`
- `OrderAdminReviewStatus`
- `CommerceOrderSyncOutboxStatus`
- `OperationFinishedGoodUnitStatus`
- `OperationFinishedGoodUnitQaStatus`
- `OperationFinishedGoodUnitActivationStatus`

## 10. Decimal

La reconciliación final cubrió:

- `OperationCommercialOrderEvent.amount`
- `OperationCommercialOrderItem.unitPrice`
- `OperationCommercialOrderItem.totalPrice`

Los demás importes críticos ya estaban alineados en `Decimal(18,2)`.

## 11. Índices

Se confirmó la presencia de índices críticos y se dejó alineado el historial Prisma.
La base conserva el índice único histórico en `OperationCommercialOrder(sourceType, sourceId)` además del índice no único del schema.

## 12. Foreign keys

Las relaciones críticas del historial de migraciones ya estaban materializadas y quedaron registradas en `_prisma_migrations`.

## 13. Estrategia de baseline

La estrategia aplicada fue:

1. verificar que la base real correspondía al entorno de desarrollo recuperado;
2. respaldar el estado con backup lógico;
3. registrar primero el historial ausente;
4. aplicar `resolve --applied` por migración en orden;
5. aplicar una migración de reconciliación para el drift de importes;
6. validar que `migrate status` y `migrate diff` quedaran alineados.

## 14. Uso de `migrate resolve`

Se usó `prisma migrate resolve --applied` de forma individual y controlada para las 26 migraciones históricas previas a la reconciliación final.

No se hizo edición manual de `_prisma_migrations`.

## 15. Prueba en copia

Se intentó preparar una copia temporal local, pero el entorno no tenía binario de servidor PostgreSQL para levantar un cluster temporal.
En consecuencia, la verificación se completó con:

- backup lógico previo;
- operaciones de `resolve` que solo tocan metadata;
- `migrate deploy` de la reconciliación final;
- revalidación con `migrate status` y `migrate diff`.

## 16. Migraciones realmente aplicadas

Después del baseline, la base tiene 27 migraciones aplicadas y registradas.

## 17. Migración de reconciliación

Se añadió y aplicó:

- `20260715143000_reconcile_operation_commercial_money`

Contenido:

- `OperationCommercialOrderEvent.amount -> DECIMAL(18,2)`
- `OperationCommercialOrderItem.unitPrice -> DECIMAL(18,2)`
- `OperationCommercialOrderItem.totalPrice -> DECIMAL(18,2)`

## 18. Validación funcional

Se preservó la funcionalidad del entorno recuperado:

- acceso de super admin;
- acceso de cliente;
- acceso corporativo;
- dashboards disponibles;
- datos mínimos de tienda;
- operaciones e inventario con datos de prueba;
- seed idempotente.

## 19. Pruebas

Se ejecutaron y quedaron verdes:

- diagnóstico read-only del entorno;
- auditoría read-only del baseline;
- `npx prisma migrate status`;
- `npx prisma migrate diff`;
- validaciones previas del entorno de desarrollo ya recuperado.

## 20. Riesgos residuales

- el backup lógico queda como punto de reversión;
- la base sigue siendo un entorno de desarrollo, no producción;
- cualquier cambio estructural nuevo debe volver a pasar por auditoría y diff;
- los dumps y `tmp/` no deben entrar a Git.

## 21. Qué no cambió

- no se tocó producción;
- no se hicieron truncados ni `reset`;
- no se editaron migraciones históricas para “hacerlas coincidir” artificialmente;
- no se perdió ningún dato.

## 22. Despliegue

No hubo despliegue a producción.

## 23. Rollback

Rollback disponible mediante:

- restauración del backup lógico `tmp/db-baseline-01-20260714213702.sql.gz`;
- reversión del commit si fuera necesario;
- eliminación o ajuste de la migración de reconciliación si apareciera un problema nuevo.

## 24. Commits

El baseline quedó respaldado en el historial Git junto con:

- scripts de diagnóstico/auditoría;
- la migración de reconciliación;
- este documento.

## 25. Estado final

- `_prisma_migrations` existe;
- las migraciones locales están registradas;
- `npx prisma migrate status` reporta la base al día;
- `prisma migrate diff` queda vacío;
- la base está lista para futuros `migrate deploy` sin pendientes inesperadas.

## 26. Conclusión

**¿Existe `_prisma_migrations`? Sí.**
**¿Las migraciones locales y el esquema físico están alineados? Sí.**
**¿`npx prisma migrate status` reporta pendientes inesperadas? No.**
**¿La base está preparada para `migrate deploy` futuro? Sí.**
