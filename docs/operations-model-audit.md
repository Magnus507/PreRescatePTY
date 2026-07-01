# Auditoria del modelo operativo actual

Fecha: 2026-07-01

Commit base: `31fb7ac chore(operations): add smoke data cleanup script`

## Resumen ejecutivo

El Centro de Operaciones ya tiene un modelo operativo funcional y reutilizable para materiales, produccion, QC, empaque, inventario PT, despacho, comercial y postventa. La base actual sirve bien para flujo por evento y para trazabilidad operativa.

La brecha principal es de granularidad: hoy el sistema opera muy bien por lote, orden o unidad agregada, pero todavia no modela de forma explicita un lote digital QR+link, una orden a imprenta, ni una unidad terminada identificada como pieza operativa propia con separacion clara entre entrega y activacion final.

Aclaracion operativa clave: el sistema puede reservar o vender una etiqueta interna a un pedido, por ejemplo `Inicial-0800 -> Pedido #00800`, pero eso no significa asignacion al usuario final. La asignacion al usuario final ocurre unicamente cuando el codigo se activa.

## Modelos actuales relevantes

### Operaciones

- `OperationMaterial` y `OperationMaterialEvent`
- `OperationProductionOrder`, `OperationProductionOrderItem`, `OperationProductionEvent`
- `OperationQcInspection` y `OperationQcInspectionEvent`
- `OperationPackingBatch` y `OperationPackingEvent`
- `OperationFinishedGood` y `OperationFinishedGoodEvent`
- `OperationDispatch`, `OperationDispatchItem`, `OperationDispatchEvent`
- `OperationCommercialOrder`, `OperationCommercialOrderItem`, `OperationCommercialOrderEvent`
- `OperationWarranty`, `OperationWarrantyEvent`
- `OperationReplacement`, `OperationReplacementEvent`
- `OperationReturn`, `OperationReturnEvent`

### Legacy / activacion / cliente

- `Chip`
- `ChipClaimToken`
- `ScanEvent`
- `Order`
- `OrderItem`
- `CorporateOrderEmployeeItem`
- `CorporateProductRequest`
- `CorporateProductRequestItem`
- `Organization`
- `OrganizationMember`
- `User`
- `Product`

## Endpoints actuales relevantes

- `GET/POST /api/admin/operations/materials`
- `GET/POST /api/admin/operations/production-orders`
- `GET/POST /api/admin/operations/qc-inspections`
- `GET/POST /api/admin/operations/packing-batches`
- `GET/POST /api/admin/operations/finished-goods`
- `GET/POST /api/admin/operations/dispatches`
- `GET/POST /api/admin/operations/commercial-orders`
- `GET/POST /api/admin/operations/warranties`
- `GET/POST /api/admin/operations/replacements`
- `GET/POST /api/admin/operations/returns`
- `GET /api/admin/operations/dashboard`

Todos usan `requireRole(GENERAL_ADMIN_ROLES)` y operan con modelos basados en eventos o estados derivados.

## UI actual relevante

- `OperationsCenterSection.tsx`: contenedor real con tabs y dashboard.
- `MaterialsWorkflowSection.tsx`: datos reales, balance por eventos.
- `ProductionQueueSection.tsx`: datos reales y acciones de estado.
- `QualitySection.tsx`: datos reales, crea y actualiza QC.
- `PackingSection.tsx`: flujo real de empaque.
- `FinishedGoodsSection.tsx`: inventario PT real por eventos.
- `DispatchSection.tsx`: despachos reales con items y estados.
- `CommercialSection.tsx`: pedidos comerciales reales.
- `WarrantySection.tsx`, `ReplacementSection.tsx`, `ReturnSection.tsx`: postventa real.
- `DigitalResourcesSection.tsx`: real para chips/QR/shortCode, aunque todavia con lenguaje de inventario digital legacy.
- `HistorySection.tsx`: principalmente visual; no se detecto aun una fuente consolidada unificada.
- `InventoryMovementsSection.tsx`: ya no es placeholder bloqueante, pero sigue siendo una vista conceptual de movimientos, no un timeline consolidado real.

## Hallazgos y brechas frente al flujo nuevo

### A) Lote digital QR+link

- No existe un modelo operativo explicito para lote digital QR+link.
- Hoy `Chip` guarda `shortCode`, `qrUrl`, `nfcUrl`, `serialPublic`, `internalLabel` y `chipUidInternal`.
- Eso sirve para el chip individual, pero no para programacion de un lote digital que luego se consume por unidad.
- Falta separar formalmente lote digital, rango, tipo normal/empresarial y consumo irreversible de cada QR+link.
- Ese lote digital debe alimentar dos rutas posibles: `Sticker PreRescatePTY` y `Sticker PreRescatePTY Empresarial`.
- Al crear el lote debe elegirse si es normal o empresarial, porque esa decision afecta el producto terminado y las reglas de activacion posteriores.

### B) Etiqueta interna por unidad

- `Chip.internalLabel` ya existe y es unica.
- `FinishedGood` no representa una unidad fisica individual con etiqueta interna propia; representa inventario PT agregado por eventos.
- `CorporateOrderEmployeeItem` y `OrderItem` si pueden ligar una pieza a una relacion operativa, pero no son la unidad fisica misma.
- Para rastrear `Inicial-0800` como unidad operativa completa, falta un modelo de unidad terminada o una extension formal del inventario PT.

### C) Orden a imprenta

- No existe un modelo dedicado para orden a imprenta con proveedor, rango enviado, rango recibido y estado de recepcion.
- `OperationPackingBatch` puede parecerse, pero no resuelve el contrato de imprenta ni el seguimiento de rango digital.
- Esta es una brecha de modelo, no solo de UI.

### D) Inventario por unidad

- `OperationFinishedGood` funciona como agregado inventarial por producto terminado, con balance calculado por eventos.
- Eso sirve para stock operativo, pero no para distinguir cada unidad individual con rastreo propio.
- Hoy no se puede afirmar de forma nativa que una fila represente `Inicial-0800` como pieza fisica individual.
- Falta una entidad de unidad terminada o una capa de serializacion interna por unidad.

### E) Pedido normal / empresa / interno

- `Order` y `OperationCommercialOrder` cubren compra y pedido comercial, pero no estan unificados para la nueva taxonomia.
- `Order.orderType` y `Organization` permiten separar algunos casos, pero no modelan de forma limpia pedido interno de produccion.
- `OperationCommercialOrder` tiene `customerType`, `customerName`, `customerEmail`, `customerPhone`, `destination` y estado de fulfillment, por lo que es reutilizable como base de pedido operativo.
- Aun asi, el pedido interno para producir stock sigue siendo una distincion conceptual que hoy no esta tipada como tal.

### F) Reserva de unidad a pedido

- `OperationDispatchItem` reserva por cantidad de PT, no por unidad interna visible.
- `OperationFinishedGoodEvent` soporta balance por eventos, pero no una reserva por pieza con identidad propia.
- Hay riesgo de que una unidad quede ligada al pedido pero no a una pieza explicitamente trazable hasta activacion.

### G) Despacho con separacion fisica

- `OperationDispatch` ya tiene `status`, `destinationType`, `destinationName`, `destinationReference`, `destinationAddress`, `scheduledAt`, `dispatchedAt` y `deliveredAt`.
- Eso cubre bastante bien el flujo de entrega.
- Falta aun un estado operativo explicito de separacion fisica / empacado si se quiere exponer como hito de negocio y no solo como evento.
- Tambien faltan campos claros para transportista o metodo de envio si se quiere trazabilidad logistica mas rica.

### H) Entregado pero no activado

- Existe `Chip.activatedAt`, `Chip.status`, `CorporateOrderEmployeeItem.activatedAt` y `fulfillmentStatus`.
- Hay suficiente base para saber que algo fue entregado pero no activado, al menos en flujo de chips.
- Para el nuevo flujo por unidad terminada falta una relacion equivalente entre unidad entregada y activacion final.

### I) Movimientos automaticos

- Los eventos actuales ya cubren gran parte del flujo automatico.
- Materiales, PT, despacho, comercial y postventa tienen eventos append-only.
- Lo que falta es una vista unificada y una tipologia operativa comun para movimientos automaticos de todo el sistema.

### J) Historial general

- `HistorySection` hoy es mayormente conceptual/visual.
- No se detecto una fuente consolidada unica para historico general del centro de operaciones.
- La mejor salida es construirlo despues como timeline unificado por eventos de dominios, no como mock.

## Reutilizacion

Se reutiliza bien:

- el modelo de eventos append-only
- el control de inventario PT por balance
- el flujo de produccion, QC, empaque y despacho
- las relaciones de postventa
- el modelo de chips/QR/shortCode para activacion y trazabilidad publica

## Requiere migracion nueva

- lote digital QR+link
- orden a imprenta
- unidad terminada con etiqueta interna propia si se quiere trazabilidad pieza por pieza
- estados operativos adicionales de despacho si se quiere separar empacado / separado / enviado con mas claridad
- relacion formal unidad -> activacion si se quiere reflejar `entregado pero no activado` en el nuevo flujo

## Se resuelve con UI

- Reordenar tabs
- Renombrar `Comercial` a `Pedidos`
- Mostrar `Inventario PT` como flujo por evento, no stock manual
- Mover `Empaque` visualmente dentro de Produccion
- Reescribir `HistorySection` como timeline consolidado cuando exista fuente real

La UI ya fue alineada con ese orden recomendado en el panel de operaciones, manteniendo `Postventa` como secciones cercanas sin agrupar completamente en este bloque.

## No tocar todavia

- Prisma schema
- migraciones
- checkout legacy
- `Order` / `Product` legacy
- activacion normal y empresarial
- logica real de inventario ya estabilizada

Esta auditoria no debe tocar Prisma schema ni migraciones. Eso no significa que Prisma o migraciones nunca se tocaran; significa que no deben tocarse dentro de esta auditoria. Las migraciones nuevas deben hacerse despues, en bloques controlados y especificos.

## Riesgos

- Confundir unidad fisica con balance agregado
- Mezclar pedido con asignacion final de usuario
- Introducir una capa nueva de unidad sin definir bien la relacion con chips, QR y activacion
- Repetir estados de despacho que ya existen con otro nombre sin una taxonomia comun
- Meter historia consolidada antes de tener eventos estandarizados

## Orden recomendado actualizado

1. Reordenar UI y taxonomia de tabs.
2. Crear o preparar base real de materiales:
   - NFC chip en blanco
   - Sticker en blanco
   - Tarjeta con codigo de activacion / presentacion
   - Empaque / presentacion
3. Crear o preparar productos terminados base:
   - Sticker PreRescatePTY
   - Sticker PreRescatePTY Empresarial
4. Definir lote digital QR+link.
5. Definir orden a imprenta.
6. Definir unidad terminada por etiqueta interna.
7. Ajustar Pedidos:
   - pedido normal
   - pedido empresa
   - pedido interno
8. Ajustar inventario por unidad / reserva.
9. Implementar regla: si hay stock, Pedido -> Inventario -> Despacho, saltando Produccion.
10. Ajustar Produccion por lote / ensamblaje.
11. Ajustar QA obligatorio antes de Inventario PT.
12. Ajustar Despacho con separacion fisica, transportista y entrega.
13. Agregar alerta "entregado pero no activado".
14. Ajustar postventa con la nueva unidad.
15. Construir movimientos automaticos unificados.
16. Construir historial general consolidado.
17. Auditar legacy antes de tocar checkout o `Order` / `Product`.
