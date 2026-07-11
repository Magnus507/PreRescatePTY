# W6.05G-K4-B Payment Proof and Backorder Visible

## Resumen ejecutivo

Se ajustó la experiencia de tienda y `Mis pedidos` para que el usuario no quede atrapado en el copy `Yappy Manual`, y para que el pago manual, el comprobante y la producción estimada/backorder sean visibles de forma clara en el flujo de cliente.

## Qué cambió en Tienda

- Se reemplazó el copy rígido `Yappy Manual`.
- Ahora la tienda indica que el pago es manual y que el usuario verá Yappy QR y datos bancarios al finalizar o desde `Mis pedidos`.
- No se tocó el checkout de éxito ni el upload existente posterior al pedido.

## Qué cambió en Mis pedidos

- Se cargan los datos públicos de pago desde `/api/public/config`.
- Se muestra una guía de pago manual cuando el pedido está pendiente o en revisión.
- Se reutiliza el flujo existente de subir comprobante.
- Se agregó un bloque visible de producción estimada/backorder derivado de forma segura.

## Datos de pago mostrados

Cuando existen, se muestran:

- `yappy_qr_url`
- `yappy_handle`
- `bank_name`
- `bank_account_type`
- `bank_account_number`
- `bank_account_name`

## Cómo se sube comprobante

- En tienda, el comprobante sigue subiéndose desde el modal de éxito con `lastOrderId`.
- En `Mis pedidos`, se conserva el formulario existente para enviar referencia, URL o archivo de comprobante.
- El endpoint usado sigue siendo `POST /api/orders/[id]/payment-proof`.

## Cómo se muestra backorder

- `POST /api/orders` sigue devolviendo `fulfillmentSummary`.
- `GET /api/orders` ahora expone `customerFulfillmentSummary` derivado de la nota interna estructurada, sin exponer `adminReviewNotes`.
- `Mis pedidos` muestra:
  - mensaje de producción estimada,
  - aviso de backorder,
  - estimación de días.

## Cómo se evita exponer `adminReviewNotes`

- El cliente no recibe la nota interna cruda.
- El backend deriva un resumen seguro para cliente.
- La nota completa sigue disponible para administración.

## Qué no se tocó

- no se modificó `schema.prisma`;
- no se hicieron migraciones;
- no se tocó la BD;
- no se tocó Stripe;
- no se tocaron pedidos reales;
- no se aprobaron ni rechazaron pagos;
- no se tocaron reservas, stock, producción ni unidades;
- no se tocó `/dashboard/compras`.

## Pendientes

- Si luego se quiere una vista más detallada de backorder por línea, puede enriquecerse el resumen derivado sin mostrar notas internas.

## Skills usadas

- `prerescate-rules`
- `verification-loop`
- `frontend-patterns`
- `frontend-a11y`
- `design-system`
- `dashboard-builder`
- `brandkit`
- `design-taste-frontend`
- `high-end-visual-design`
- `impeccable`
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

La tienda ahora orienta mejor el pago manual y `Mis pedidos` comunica de forma clara el estado de pago y la producción estimada/backorder, sin revelar información interna sensible.
