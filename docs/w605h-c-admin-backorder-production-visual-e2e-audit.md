# W6.05H-C Admin Backorder Production Visual E2E Audit

## Resumen ejecutivo

Se auditó en modo read-only el flujo admin de `backorder -> producción por faltante` después de H-B y H-B-V. La implementación está alineada con el objetivo funcional: el admin puede ver cuándo falta producción, cuánto falta, sobre qué `productCode` aplica y qué acción tomar. El flujo no implementa automatización ni reserva de stock, y mantiene la producción como acción explícita.

Conclusión:

- el badge `Producción requerida` existe y es visible;
- el CTA principal cambia a `Crear producción por faltante` cuando hay backorder;
- el backend rechaza pedidos mixtos en modo backorder;
- si el pago está `pending`, la UI exige confirmación explícita;
- si ya existe producción vinculada, el flujo la reutiliza;
- no se observan dos CTAs de producción compitiendo para el mismo caso comercial.

## Revisión visual

Archivos revisados:

- [`app/(admin)/admin/_components/sections/CommercialSection.tsx`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(admin)/admin/_components/sections/CommercialSection.tsx)
- [`app/(admin)/admin/_components/sections/PedidosSection.tsx`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(admin)/admin/_components/sections/PedidosSection.tsx)

### Lo que se ve en pantalla

- el badge `Producción requerida · X u.` aparece junto a los estados de pedido/pago;
- el bloque de detalle muestra:
  - `ProductCode`;
  - stock disponible;
  - faltante;
- si el pedido mezcla más de un `productCode`, aparece una advertencia explícita;
- el CTA principal para pedidos con faltante es `Crear producción por faltante`;
- los pedidos internos siguen usando `Enviar a producción`, pero ese flujo es distinto y no compite con el de backorder comercial;
- en `PedidosSection` también se muestra `Producción requerida` en el badge y un bloque `Backorder visible` dentro del detalle.

### Legibilidad y jerarquía

- el badge de producción no compite con el estado de pago porque se coloca como chip adicional y no reemplaza el badge de pago;
- `productCode`, stock y faltante están en un bloque dedicado, con jerarquía clara;
- el CTA de backorder usa lenguaje directo y describe la acción real;
- el layout usa grid y tarjetas, sin señales obvias de overflow en escritorio dentro del código revisado.

### Responsive

- la estructura usa `grid` con columnas adaptativas y bloques apilables;
- no se observan dependencias de ancho fijo que rompan el flujo en mobile dentro del código auditado;
- el riesgo principal en mobile es más semántico que de layout: el usuario debe distinguir entre pedido interno y pedido comercial, pero el copy actual ya los separa.

## Casos auditados

### Caso A: Sin backorder

- no debe mostrar `Producción requerida`;
- no debe invitar a crear producción por faltante.

Resultado:

- cumplido en `CommercialSection` porque `productionNeed.needsProduction` controla el bloque y el CTA;
- cumplido en `PedidosSection` porque el badge depende de `customerFulfillmentSummary?.hasBackorder`.

### Caso B: Backorder parcial

- debe mostrar faltante;
- el CTA debe producir el faltante, no el total.

Resultado:

- cumplido en UI comercial: el bloque muestra `Stock disponible`, `Faltante` y el CTA llama `handleSendToProduction(..., { mode: "backorder", plannedQuantity: productionNeed.missing })`;
- el backend usa `plannedQuantity` y `mode = backorder`.

### Caso C: Backorder total

- el CTA debe producir la cantidad total faltante.

Resultado:

- cumplido por la misma ruta: si `availableStock = 0`, `missing = requestedQty`, por lo que el `plannedQuantity` enviado equivale al total pendiente.

### Caso D: Pedido mixto con varios `productCode`

- backend debe rechazar modo backorder;
- UI no debe prometer una acción simple si es mixto.

Resultado:

- backend: rechaza con `BACKORDER_MULTI_PRODUCT_NOT_SUPPORTED`;
- UI: muestra advertencia `Este pedido mezcla más de un productCode...` y oculta el CTA de backorder.

### Caso E: Pago `pending`

- debe advertir o requerir confirmación antes de producción.

Resultado:

- UI: muestra confirmación explícita con `window.confirm`;
- backend: exige `confirmPendingPayment = true`.

### Caso F: Pago `under_review` / `paid`

- puede permitir acción explícita.

Resultado:

- no hay bloqueo adicional en el endpoint para esos estados;
- el flujo continúa de forma manual y explícita.

### Caso G: Producción ya creada

- no debe duplicar;
- debe reutilizar o mostrar ya solicitada.

Resultado:

- el endpoint busca el marcador estable `W605H-B-BACKORDER-PRODUCTION:<commercialOrderId>` y también respeta el legado;
- si existe producción previa, devuelve `created: false`;
- en `CommercialSection`, el CTA de pedido interno cambia a `Ver producción` cuando ya hay vínculo.

## Endpoint

Archivo revisado:

- [`app/api/admin/operations/commercial-orders/[id]/send-to-production/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/admin/operations/commercial-orders/[id]/send-to-production/route.ts)

### Hallazgos

- soporta `mode = "backorder"` y `mode = "full"`;
- soporta `plannedQuantity`;
- soporta `confirmPendingPayment`;
- usa stock real para calcular faltante;
- rechaza pedidos mixtos en backorder;
- no crea unidades;
- no reserva;
- no despacha;
- no entrega;
- no activa;
- outputType sigue saliendo del `productCode` canónico del ítem;
- no quedó fallback duro a `PRP-FG-STICKER` en esta ruta.

### Punto de seguridad

- el endpoint sigue dependiendo del stock actual al momento de la acción;
- si el inventario cambió entre la creación del pedido y la acción de admin, la cantidad a producir puede variar respecto al backorder original;
- esto está documentado como riesgo, no como bug de implementación.

## Persistencia

Archivos revisados:

- [`lib/orders/store-order-fulfillment.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/lib/orders/store-order-fulfillment.ts)
- [`lib/operations/operations-order-view-model.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/lib/operations/operations-order-view-model.ts)

### Hallazgos

- `backorderQtyTotal` se deriva de la nota interna del pedido;
- `customerFulfillmentSummary` se expone al admin desde el view model;
- el cliente no recibe la nota interna cruda;
- la persistencia sigue dependiendo de `adminReviewNotes`, así que el dato es útil pero no ideal;
- el formato vigente en notas internas incluye:
  - `Tiene backorder: sí/no.`
  - `Producción estimada: 14 días.`
  - líneas por item con `backorder=...`

### Riesgo de persistencia

- si el contenido de `adminReviewNotes` cambia de formato, la derivación visual pierde precisión;
- no hay todavía un campo estructurado específico de backorder;
- para este cierre, el mecanismo es suficiente y consistente con la fase H-B.

## Riesgos remanentes

- no hay reserva de stock;
- la producción por faltante depende del stock actual al momento de ejecutar la acción;
- si el stock cambió, el faltante puede no coincidir con el backorder original;
- pedidos mixtos siguen necesitando separación por `productCode`;
- producción con pago `pending` requiere confirmación explícita;
- no hay producción automática;
- `PedidosSection` muestra el backorder derivado de nota interna, no de un campo estructurado dedicado.

## Decisión de cierre

- Cerrable sin bloque adicional

Motivo:

- el flujo visual y funcional está alineado;
- no hay dos CTAs de producción compitiendo para el mismo caso comercial;
- el backend protege los casos ambiguos;
- build, typecheck y validación Prisma ya pasaron en la fase de cierre anterior.

## Qué no se tocó

- no se modificó código productivo;
- no se modificó `schema.prisma`;
- no se hicieron migraciones;
- no se tocó la base de datos;
- no se crearon pedidos reales;
- no se aprobaron ni rechazaron pagos;
- no se reservaron unidades;
- no se creó producción;
- no se crearon unidades trazables;
- no se despachó;
- no se entregó;
- no se activaron chips;
- no se asignaron chips;
- no se tocó Stripe;
- no se tocó `/dashboard/compras`.

## Skills usadas

- `prerescate-rules`
- `verification-loop`
- `dashboard-builder`
- `frontend-patterns`
- `frontend-a11y`
- `design-system`
- `security-review`
- `error-handling`
- `backend-patterns`
- `api-design`
- `coding-standards`

## Validaciones

- `git status --short`
- `git diff`
- `git diff --check`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`

