# W5.38A - Auditoría integral Centro de Operaciones

## Estado general

- El backend operativo está fuerte y consistente: Prisma, rutas admin, endpoints de operaciones, rutas públicas y build pasan validación.
- El flujo operativo completo existe en backend y ya está conectado.
- La UI del Centro de Operaciones necesita depuración fina de taxonomía, textos y piezas conceptuales antiguas.
- La mayor deuda visual está en Producción, donde todavía aparecen diagramas y llamados que no representan el flujo real actual.

## Mapa actual de tabs y componentes

### Tabs principales

- `Panel operativo` -> resumen general dentro de `OperationsCenterSection`.
- `Pedidos` -> `CommercialSection`.
- `Inventario` -> wrapper interno con subtabs.
- `Imprenta` -> `PrintOrdersSection`.
- `Producción` -> wrapper interno con subtabs.
- `Calidad / QA` -> `QualitySection`.
- `Despacho` -> `DispatchSection`.
- `Postventa` -> wrapper interno con subtabs.
- `Movimientos` -> `InventoryMovementsSection`.
- `Historial` -> `HistorySection`.

### Subtabs actuales

- Inventario
  - `Resumen inventario` -> `PhysicalInventorySection`
  - `Unidades` -> `FinishedGoodUnitsSection`
  - `Recursos digitales` -> `DigitalResourcesSection`
  - `Productos base` -> reutiliza `PhysicalInventorySection` como vista resumida
- Producción
  - `Ordenes` -> `ProductionQueueSection`
  - `Ensamblaje` -> `CreateBatchSection`
  - `Empaque / Lotes` -> `PackingSection`
- Postventa
  - `Garantias` -> `WarrantySection`
  - `Reemplazos` -> `ReplacementSection`
  - `Devoluciones` -> `ReturnSection`

## Hallazgos críticos

- Producción todavía muestra una narrativa conceptual antigua con pasos tipo `Crear orden interna`, `Asignar chips`, `Descargar QR / arte` y `Enviar a imprenta`; eso choca con el flujo real actual basado en lote digital, imprenta, ensamblaje, QA, inventario por unidad, reserva, despacho y activación.
- `Pedidos` sigue exponiendo acciones muy operativas de generación de QR, descarga de arte y flujo de distribución que pueden sentirse como parte de Producción o Imprenta, no como un paso aislado del pedido.
- `FinishedGoodsSection` y `PhysicalInventorySection` todavía conviven como si inventario agregado y unidades trazables fueran la misma cosa; el backend ya diferencia la trazabilidad por unidad, pero la UI todavía puede invitar a leerlo como stock tradicional.

## Hallazgos medios

- Hay muchos estados crudos visibles en varias vistas: `draft`, `planned`, `started`, `paused`, `completed`, `cancelled`, `qa_pending`, `available`, `reserved`, `delivered`, `activated`.
- `QualitySection` y `FinishedGoodUnitsSection` ya traducen parte de esos estados, pero aún se observan términos técnicos en selectores, tablas y textos de soporte.
- `DispatchSection` deja claro que la entrega no activa, pero todavía depende de leer varias tarjetas para entender el salto entre despacho y activación.
- `ReplacementSection` y `ReturnSection` siguen mezclando referencias a comercial, producto terminado y despacho, lo cual es correcto operacionalmente, pero visualmente queda denso.
- `HistorySection` e `InventoryMovementsSection` están alineados con el modelo de eventos, aunque su densidad puede ser intimidante para operación diaria.

## Hallazgos menores

- El panel operativo muestra dos diagramas de flujo resumidos que siguen usando lenguaje de negocio generalista; funcionan como orientación, pero son la primera pieza que convendría refinar.
- `Products base` usa una reutilización visual de `PhysicalInventorySection`; es seguro, pero puede confundir si no queda claro que es catálogo y no stock.
- En varias secciones hay textos como `Produccion / Empaque` o `Garantias` sin tildes en labels internos, aunque esto es más de pulido que de flujo.
- La vista pública de empresa conserva lenguaje de vinculación correcto, pero no forma parte del núcleo operativo del Centro de Operaciones.

## Módulos alineados

- `DigitalResourcesSection` está bien alineado con el concepto de lote digital QR+link.
- `PrintOrdersSection` sí corresponde a Imprenta y mantiene la idea de proveedor, envío y recepción.
- `FinishedGoodUnitsSection` representa correctamente la unidad trazable y muestra estados útiles como QA, reserva y entrega sin activar.
- `QualitySection` está razonablemente alineado con QA obligatorio sobre unidades.
- `DispatchSection` sí refleja separación física, reserva, envío y entrega.
- `WarrantySection`, `ReplacementSection` y `ReturnSection` están alineadas con postventa por unidad.
- `InventoryMovementsSection` e `HistorySection` están bien como feeds inmutables / reconstrucción histórica.

## Módulos desalineados

- `ProductionQueueSection` es el principal candidato a limpieza visual.
- La parte superior del `Panel operativo` todavía mezcla core, pedidos y postventa en una narrativa algo antigua.
- `PedidosSection` todavía muestra flujos de creación y gestión que pueden parecer `pedido -> QR -> imprenta`, cuando el flujo real ya está más repartido entre inventario, producción e imprenta.
- `PhysicalInventorySection` necesita una lectura más explícita de catálogo / inventario por estado vs. inventario físico histórico.

## Producción - análisis especial

- La captura observada sí coincide con una zona conceptualmente vieja de la UI.
- El texto `Produccion para Inventario PT` y la idea de `Produccion Bajo Pedido Empresa` eran válidos como categorías históricas, pero el bloque visual que enumeraba acciones como `Crear orden interna`, `Asignar chips`, `Descargar QR / arte` y `Enviar a imprenta` ya no comunica bien el flujo real.
- Esa parte está más cerca de una guía histórica o panel de ayuda que de la navegación operativa principal.
- W5.38B ya movió esa pantalla hacia un enfoque más correcto y ahora la UI de Producción se centra en:
  - órdenes de producción
  - ensamblaje de unidades desde lote digital / QR+link
  - estado de producción
  - salida a QA
- El paso de imprenta debe vivir visualmente en `Imprenta`, no como instrucción central dentro de Producción.

## Recomendación de plan

- `W5.38B` - Limpieza visual Producción
- `W5.38C` - Limpieza visual Inventario
- `W5.38D` - Limpieza visual Pedidos / Despacho
- `W5.38E` - Limpieza visual Postventa
- `W5.38F` - Pulido Movimientos / Historial
- `W5.38G` - Smoke visual final
- `W5.38H` - Push visual cleanup

## Confirmaciones

- No se cambió código funcional.
- No se tocó backend.
- No hubo migración.
- No se usó `prisma db push`.
- No se usó `prisma migrate reset`.
- No se tocó `checkout` legacy.
- No se tocó `Order` / `Product` legacy.
- No se tocó activación legacy.
- No se hizo push.
