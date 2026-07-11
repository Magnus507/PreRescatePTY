# W6.05J-C Admin Dispatch UI Guardrails

## Resumen ejecutivo

Se reforzó la UI de admin para que el operador vea con claridad si un pedido comercial está listo para despacho desde stock reservado, qué `productCode` aplica, cuántas unidades están reservadas y compatibles, cuántas faltan y cuál es el estado de pago antes de intentar despachar.

La lógica de backend no se relajó ni se modificó. El endurecimiento comercial de `create-dispatch` sigue intacto y la entrega continúa sin activar chips ni asignar perfiles.

## Qué se mejoró visualmente

### Estado para despacho

En la tarjeta del pedido comercial se añadió un bloque visible con:

- `ProductCode`
- cantidad solicitada
- unidades reservadas compatibles
- unidades pendientes
- estado de pago
- mensaje operativo de bloqueo o listo para despacho

### Mensajes visibles

Se agregaron copys claros para el operador:

- `Listo para despacho: X unidad(es) reservadas y compatibles.`
- `Falta reservar X unidad(es) antes de despachar.`
- `Pedido mixto: requiere despacho por línea/productCode.`
- `Pago pendiente: confirma la política antes de despachar.`
- `La entrega no activa chips; la activación ocurre después en Mis dispositivos.`

### Señal visual

- el bloque usa un estado visual distinto cuando el pedido está listo o bloqueado;
- los colores no son la única señal, también cambian el texto y la etiqueta de estado;
- la información queda cerca de la reserva y de las acciones de despacho para reducir confusión.

## Guardrails mostrados

- pedido mixto bloqueado para despacho simple;
- pedido sin `productCode` claro se muestra como bloqueado;
- unidades reservadas compatibles visibles;
- faltante visible antes de despachar;
- pago visible con advertencia cuando aplica;
- recordatorio de que la entrega no activa chips.

## Cómo se evita confusión del operador

- la reserva de stock sigue separada del despacho;
- la producción por faltante sigue separada del despacho;
- el CTA de despacho no cambia de sentido;
- el operador ve el dato de `productCode` antes de actuar;
- el operador ve si realmente ya hay suficientes unidades reservadas para el pedido.

## Qué no cambió

- no se cambió `schema.prisma`;
- no se hicieron migraciones;
- no se modificó BD;
- no se tocó `create-dispatch` backend;
- no se tocó activación ni asignación;
- no se tocó confirmación de entrega;
- no se despachó nada real en pruebas;
- no se entregó nada real en pruebas;
- no se tocaron tienda cliente ni `Mis pedidos` cliente.

## Riesgos remanentes

- si el operador ignora el bloque, sigue existiendo riesgo humano;
- pedidos mixtos siguen requiriendo tratamiento por línea/productCode;
- el estado de pago sigue dependiendo de la política operativa;
- la trazabilidad de entrega conserva `reservedOrderId`, pero eso no reemplaza una buena revisión humana.

## Skills usadas

- `prerescate-rules`
- `verification-loop`
- `dashboard-builder`
- `frontend-patterns`
- `frontend-a11y`
- `design-system`
- `api-design`
- `backend-patterns`
- `security-review`
- `error-handling`
- `coding-standards`

## Validaciones

- `git status --short`
- `git diff`
- `git diff --check`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`

## Conclusión

W6.05J-C deja la UI comercial más legible para el despacho desde stock reservado sin tocar la lógica operativa crítica. El operador ahora ve de forma explícita qué falta, qué está reservado y si el pedido realmente está listo para avanzar.
