# Order State Machine (Canónica)

## Objetivo
Definir de forma explícita los estados y transiciones permitidas para órdenes y pagos en PreRescate PTY, separando los flujos `manual`, `stripe` y `legacy`.

---

## Estados válidos

### paymentStatus
- `pending`
- `under_review`
- `paid`
- `rejected`
- `cancelled`

### orderStatus
- `pending`
- `processing`
- `completed`
- `cancelled`

> Nota: existe `shipped` en parte del UI/operación logística actual. Se mantiene por compatibilidad operativa, pero para la máquina de pagos base el núcleo es `pending/processing/completed/cancelled`.

### adminReviewStatus
- `pending`
- `approved`
- `rejected`

### provider
- `manual`
- `stripe`
- `legacy`

---

## Estados iniciales por provider

### Manual
- Al crear orden manual:
  - `paymentStatus = pending`
  - `orderStatus = pending`
  - `adminReviewStatus = pending`

### Stripe
- Al confirmar webhook de Stripe (`checkout.session.completed`):
  - `paymentStatus = paid`
  - `orderStatus = completed`
  - `provider = stripe`

### Legacy
- Al crear orden legacy (`/api/orders`):
  - `paymentStatus = pending`
  - `orderStatus = pending`
  - `provider = legacy`

---

## Transiciones válidas

## Flujo manual (cliente + admin)

1. **Creación**
   - `pending/pending/pending`

2. **Cliente sube comprobante/referencia**
   - `paymentStatus: pending -> under_review`
   - `orderStatus: pending -> processing`
   - `adminReviewStatus: pending` (sin cambio)

3. **Admin aprueba**
   - `paymentStatus: under_review -> paid`
   - `orderStatus: processing -> completed`
   - `adminReviewStatus: pending -> approved`

4. **Admin rechaza**
   - `paymentStatus: under_review -> rejected`
   - `orderStatus: processing|pending -> cancelled`
   - `adminReviewStatus: pending -> rejected`

5. **Cliente cancela antes de cierre**
   - `paymentStatus: pending|under_review -> cancelled`
   - `orderStatus: pending|processing -> cancelled`

## Flujo stripe
- Evento `checkout.session.completed` crea orden ya cerrada en pago:
  - `paymentStatus = paid`
  - `orderStatus = completed`

## Flujo legacy
- Permite gestión operativa existente sin entrar al flujo manual de revisión.

---

## Transiciones inválidas

- Orden `manual` cambiar estado por `PATCH /api/admin/orders` (para pago/revisión).
- Aprobar manual si no está en `under_review`.
- Rechazar manual si no está en `under_review`.
- Cancelar manual por cliente cuando ya está final (`paid/rejected/cancelled/completed`).
- Usar endpoints `approve/reject` para órdenes `stripe` o `legacy`.

---

## Endpoint autorizado por transición

## Cliente
- `POST /api/orders/manual`
  - Crea orden manual (`pending/pending/pending`).

- `POST /api/orders/{id}/payment-proof`
  - Manual: `pending -> under_review`, `pending -> processing`.

- `PATCH /api/orders/{id}`
  - Cancelación de orden manual por cliente (según guardas).

## Admin
- `POST /api/admin/orders/{id}/approve`
  - Solo manual en revisión: aprueba pago y cierra orden.

- `POST /api/admin/orders/{id}/reject`
  - Solo manual en revisión: rechaza pago y cancela orden.

- `PATCH /api/admin/orders`
  - Operación general/logística para no-manual y tareas operativas.
  - **No** debe ser el camino de aprobación/rechazo de manual.

## Stripe
- `POST /api/payments/checkout`
  - Inicia checkout.

- `POST /api/payments/webhook`
  - Confirma pago y crea orden stripe cerrada.

---

## Qué debe ver el cliente

- `pending`: esperando pago.
- `under_review`: comprobante recibido, validación en curso.
- `paid`: pago aprobado.
- `rejected`: pago rechazado + motivo si existe.
- `cancelled`: orden cancelada.
- `completed`: pedido completado.

Acciones disponibles:
- Subir comprobante/referencia solo en estados manuales permitidos.
- Cancelar solo si la orden manual aún no está finalizada.

---

## Qué debe ver admin

- En `manual` + `under_review`:
  - Acciones: `Aprobar` / `Rechazar`.
  - Campo de notas de revisión.

- En no-manual:
  - Gestión operativa/logística por flujos actuales.

Regla operativa clave:
- No usar PATCH genérico para cambiar estado de pago en órdenes manuales.
