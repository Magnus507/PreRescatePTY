# P0-02R - Auditoria de retirada de Stripe

**Fecha:** 14 de julio de 2026

**Base auditada:** `master` en `970b2c2f478e0f146729977b1f722a0d2a27fae7`

**Estado:** auditoria estatica; no se modifico codigo

## 1. Conclusión ejecutiva

Stripe **no puede retirarse completamente hoy** sin romper al menos un flujo activo, porque aun existe un caller de checkout en la pagina publica de registro y porque los endpoints Stripe siguen siendo runtime activo.

La operacion real del negocio ya funciona principalmente por el flujo manual:

Cliente -> Tienda -> Pedido -> Instrucciones de pago -> Subida de comprobante -> Verificacion manual -> Aprobacion Admin -> Reserva -> Produccion -> Despacho -> Entrega -> Activacion

Eso significa que Stripe **ya no es el flujo principal del negocio**, pero **todavia es un componente vivo** en el sistema. La conclusion tecnica de esta auditoria es:

- **No puede eliminarse completamente sin una migracion previa del caller publico que aun invoca checkout**
- **Puede retirarse parcialmente del flujo principal manual, pero no del sistema completo sin cambios adicionales**
- **Debe mantenerse temporalmente mientras exista `app/(public)/registro/page.tsx` llamando `/api/payments/checkout`**

## 2. Mapa completo de Stripe

### Runtime activo

| Archivo | Responsabilidad | Runtime | Legacy | Histórico | Puede eliminarse | Debe mantenerse | Motivo |
|---|---|---:|---:|---:|---:|---:|---|
| [`app/api/payments/checkout/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/payments/checkout/route.ts) | Crea sesión Stripe para paquetes | Sí | No | No | No hoy | Sí | Endpoint vivo con dependencia directa del SDK |
| [`app/api/payments/webhook/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/payments/webhook/route.ts) | Verifica webhook, crea orden, actualiza cuenta y sincroniza Operaciones | Sí | No | No | No hoy | Sí | Dispara efectos persistentes de negocio |
| [`domains/shared/services/payment.service.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/domains/shared/services/payment.service.ts) | Wrapper del SDK Stripe | Sí | No | No | No hoy | Sí | Centraliza checkout y verificación de webhook |
| [`app/(public)/registro/page.tsx`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(public)/registro/page.tsx) | Caller público de checkout automático | Sí | No | No | No hoy | Sí | Sigue redirigiendo al checkout Stripe cuando hay `package` |
| [`tests/routes/payments-checkout.test.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/tests/routes/payments-checkout.test.ts) | Contrato del endpoint de checkout | Sí | No | No | No hoy | Sí hasta retirar endpoint | Cubre el flujo vivo |
| [`tests/routes/payments-webhook.test.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/tests/routes/payments-webhook.test.ts) | Contrato del webhook Stripe | Sí | No | No | No hoy | Sí hasta retirar endpoint | Cubre metadata, firma e idempotencia |
| [`lib/order-number.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/lib/order-number.ts) | Prefijo/ramificación de numeración ligada a provider | Sí | Parcial | No | No inmediato | Sí mientras exista provider Stripe | Forma parte del rastro visible de pedidos Stripe |
| [`lib/order-status.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/lib/order-status.ts) | Clasificación de provider y estado | Sí | Parcial | No | No inmediato | Sí | Sigue interpretando pedidos Stripe |
| [`domains/orders/services/order.service.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/domains/orders/services/order.service.ts) | Crea orden Stripe desde webhook | Sí | No | No | No hoy | Sí | Caller de negocio directo |

### Bordes, configuración y documentación

| Archivo | Responsabilidad | Runtime | Legacy | Histórico | Puede eliminarse | Debe mantenerse | Motivo |
|---|---|---:|---:|---:|---:|---:|---|
| [`package.json`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/package.json) | Dependencia `stripe` | Sí | No | No | No hoy | Sí | El SDK sigue instalado |
| [`package-lock.json`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/package-lock.json) | Bloqueo de dependencia `stripe` | Sí | No | No | No hoy | Sí | Refleja el runtime instalado |
| [`.env`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/.env) | `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` | Sí | No | No | No hoy | Sí mientras exista Stripe | Variables activas |
| [`.env.example`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/.env.example) | Variables Stripe documentadas | No | Sí | Sí | Sí cuando se retire Stripe | No | Solo referencia de configuración |
| [`.env.local`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/.env.local) | Variables Stripe locales | Sí | No | No | Sí cuando se retire Stripe | No | Entorno local contiene credenciales |
| [`.env.local.backup`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/.env.local.backup) | Respaldo con variables Stripe | No | Sí | Sí | Sí | No | Respaldo histórico |
| [`next.config.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/next.config.ts) | CSP permite dominios Stripe | Sí | No | No | No hoy | Sí | La política del navegador sigue habilitando Stripe |
| [`README.md`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/README.md) | Menciona Stripe como parte del stack | No | Sí | Sí | Sí tras retiro | No | Documento descriptivo |
| [`INSTRUCTIONS.md`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/INSTRUCTIONS.md) | Referencia histórica con Stripe | No | Sí | Sí | Sí si se archiva | No | No gobierna runtime |
| [`docs/05-qa/production-smoke-test.md`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/docs/05-qa/production-smoke-test.md) | Smoke de Stripe legacy | No | Sí | Sí | Sí tras retiro | No | Documenta un flujo todavía presente |
| [`docs/02-mapa-funcional/pedidos-pagos.md`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/docs/02-mapa-funcional/pedidos-pagos.md) | Flujo y variables de pagos Stripe | No | Sí | Sí | Sí/archivar | No | Mapa funcional mixto |
| [`docs/04-operaciones/environment-variables.md`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/docs/04-operaciones/environment-variables.md) | Lista `STRIPE_SECRET_KEY` | No | Sí | Sí | Sí si se retira | No | Guía operativa |
| [`docs/04-operaciones/QUICK_REFERENCE.md`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/docs/04-operaciones/QUICK_REFERENCE.md) | Referencia rápida Stripe | No | Sí | Sí | Sí si se retira | No | Referencia operativa |
| [`docs/03-auditorias/ANALISIS_PROYECTO.md`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/docs/03-auditorias/ANALISIS_PROYECTO.md) | Describe checkout/webhook Stripe | No | Sí | Sí | Sí cuando deje de ser vigente | No | Auditoría histórica |
| [`docs/logic/order-state-machine.md`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/docs/logic/order-state-machine.md) | Explica eventos Stripe en la máquina de estados | No | Sí | Sí | Sí si se elimina Stripe | No | Documento de lógica |
| [`docs/logic/account-capacity-policy.md`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/docs/logic/account-capacity-policy.md) | Menciona Stripe legacy | No | Sí | Sí | Sí si se retira | No | Política documental |

## 3. Callers auditados

### Callers runtime directos

- [`app/api/payments/checkout/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/payments/checkout/route.ts)
- [`app/api/payments/webhook/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/payments/webhook/route.ts)
- [`domains/shared/services/payment.service.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/domains/shared/services/payment.service.ts)
- [`app/(public)/registro/page.tsx`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(public)/registro/page.tsx)
- [`domains/orders/services/order.service.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/domains/orders/services/order.service.ts)

### Callers indirectos y bordes

- [`app/api/orders/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/orders/route.ts)
- [`app/api/orders/manual/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/orders/manual/route.ts)
- [`app/api/orders/[id]/payment-proof/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/orders/[id]/payment-proof/route.ts)
- [`app/api/orders/[id]/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/orders/[id]/route.ts)
- [`app/api/organizations/corporate-orders/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/organizations/corporate-orders/route.ts)
- [`app/api/organizations/corporate-orders/from-requests/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/organizations/corporate-orders/from-requests/route.ts)
- [`app/api/admin/orders/[id]/delete/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/admin/orders/[id]/delete/route.ts)
- [`app/api/admin/orders/[id]/permanent-delete/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/admin/orders/[id]/permanent-delete/route.ts)
- [`app/api/admin/orders/[id]/send-to-dispatch/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/admin/orders/[id]/send-to-dispatch/route.ts)
- [`app/api/admin/orders/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/admin/orders/route.ts)
- [`lib/operations/operations-order-view-model.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/lib/operations/operations-order-view-model.ts)
- [`lib/operations/dispatch-view-model.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/lib/operations/dispatch-view-model.ts)

## 4. Dependencias

### Resultado de `npm ls stripe`

- `stripe@22.0.1`
- No se detectaron dependencias instaladas `@stripe/stripe-js`, `react-stripe-js` ni wrappers de frontend Stripe

### Qué consume el SDK

- [`domains/shared/services/payment.service.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/domains/shared/services/payment.service.ts)
- [`app/api/payments/webhook/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/payments/webhook/route.ts)
- [`tests/routes/payments-checkout.test.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/tests/routes/payments-checkout.test.ts)
- [`tests/routes/payments-webhook.test.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/tests/routes/payments-webhook.test.ts)

### Conclusión sobre dependencias

El SDK `stripe` no es decorativo. Tiene consumo runtime y cobertura de pruebas. Puede eliminarse solo después de retirar el checkout, el webhook, el caller público de registro, las variables de entorno y la CSP que lo habilita.

## 5. Variables

Variables Stripe encontradas:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Referencias adicionales:

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` aparece en documentación histórica y material de soporte, pero no encontré un consumidor runtime claro en el código activo de esta auditoría

Conclusión:

- Las variables secretas siguen siendo necesarias mientras exista Stripe
- La referencia pública/publishable vive principalmente en documentación histórica

## 6. SDK

### Uso real del SDK

En [`domains/shared/services/payment.service.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/domains/shared/services/payment.service.ts):

- `new Stripe(secretKey, { apiVersion: ... })`
- `stripe.checkout.sessions.create(...)`
- `stripe.webhooks.constructEvent(...)`

### Implicación

Stripe no está solo nombrado en el proyecto. Está integrado como servicio de pago y verificación de eventos.

## 7. Webhooks

### Flujo confirmado

[`app/api/payments/webhook/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/payments/webhook/route.ts):

1. Lee `stripe-signature`
2. Verifica firma con `STRIPE_WEBHOOK_SECRET`
3. Procesa `checkout.session.completed`
4. Valida snapshot financiero embebido en metadata
5. Busca o crea la `Order` con `provider: "stripe"`
6. Actualiza `Account`
7. Llama `syncRealOrderToOperations(...)`

### Respuesta a las preguntas clave

- **¿Stripe crea pedidos?** Sí, en el webhook `checkout.session.completed`
- **¿Stripe solo confirma pagos?** No, también dispara creación de `Order` y actualización de `Account`
- **¿Stripe dispara producción?** No directamente, pero sí dispara sincronización operacional que puede derivar en producción
- **¿Stripe dispara reservas?** No directamente en el flujo actual
- **¿Stripe dispara despacho?** No directamente
- **¿Stripe dispara activación?** No directamente
- **¿Stripe dispara sincronización?** Sí, explícitamente
- **¿Stripe es solo un proveedor de pago?** No en el estado actual; es proveedor de pago y disparador de side effects de negocio

## 8. Checkout

### Flujo actual

[`app/api/payments/checkout/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/payments/checkout/route.ts):

- exige sesión
- lee `packageId`
- valida el paquete en BD
- toma `pkg.price` desde BD
- llama `PaymentService.createCheckoutSession(...)`
- retorna la URL de Stripe

### Evidencia de uso real

El checkout sigue siendo una entrada operativa viva para la experiencia pública de registro.

### Riesgo

Aunque el flujo manual principal funciona sin Stripe, este endpoint todavía abre una ruta automatizada de compra que depende del SDK y de credenciales secretas.

## 9. Manual vs Stripe

### Flujo manual existente

[`app/api/orders/manual/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/orders/manual/route.ts) ya soporta:

- creación de orden manual con `provider: "manual"`
- `paymentStatus: "pending"`
- `paymentMethod` manual (`yappy` / `bank_transfer`)
- subida posterior de comprobante
- aprobación o rechazo por admin

### Lectura técnica

El negocio ya tiene un camino manual completo. Eso reduce la necesidad de Stripe, pero no elimina el caller de checkout que sigue presente en registro.

## 10. Tests

Tests que aún dependen de Stripe:

- [`tests/routes/payments-checkout.test.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/tests/routes/payments-checkout.test.ts)
- [`tests/routes/payments-webhook.test.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/tests/routes/payments-webhook.test.ts)

Tests y suites relacionadas por efectos secundarios:

- [`tests/routes/payment-proof.test.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/tests/routes/payment-proof.test.ts)
- [`tests/routes/admin-orders-approve.test.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/tests/routes/admin-orders-approve.test.ts)
- [`tests/lib/commercial-order-reservation.test.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/tests/lib/commercial-order-reservation.test.ts)

Estos no usan Stripe directamente, pero confirman que el negocio ya puede avanzar por vías manuales.

## 11. Documentación

Documentos con Stripe como parte del sistema:

- [`README.md`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/README.md)
- [`INSTRUCTIONS.md`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/INSTRUCTIONS.md)
- [`docs/05-qa/production-smoke-test.md`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/docs/05-qa/production-smoke-test.md)
- [`docs/02-mapa-funcional/pedidos-pagos.md`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/docs/02-mapa-funcional/pedidos-pagos.md)
- [`docs/03-auditorias/ANALISIS_PROYECTO.md`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/docs/03-auditorias/ANALISIS_PROYECTO.md)
- [`docs/logic/order-state-machine.md`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/docs/logic/order-state-machine.md)
- [`docs/logic/account-capacity-policy.md`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/docs/logic/account-capacity-policy.md)
- [`docs/w605g-k1-orders-payload-payment-audit.md`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/docs/w605g-k1-orders-payload-payment-audit.md)
- [`docs/w605g-j-technical-design-store-quantity-stock-backorder-orders-payments.md`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/docs/w605g-j-technical-design-store-quantity-stock-backorder-orders-payments.md)
- [`docs/w605g-a-client-store-audit.md`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/docs/w605g-a-client-store-audit.md)

### Lectura documental

La documentación mezcla:

- flujo Stripe legacy todavía descrito como válido
- compras manuales que ya son la vía dominante
- referencias históricas que no distinguen con rigor entre dependencia viva y dependencia heredada

## 12. Histórico

Evidencia histórica relevante:

- [`docs/prisma-migrations-legacy/20260526000000_stripe_order_idempotency/migration.sql`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/docs/prisma-migrations-legacy/20260526000000_stripe_order_idempotency/migration.sql) contiene un índice único parcial histórico para `Order.providerReference` cuando `provider = 'stripe'`
- Documentos de auditoría antiguos siguen describiendo Stripe como parte del proceso de pago
- Hay smoke tests y guías que todavía usan el término `Stripe legacy`

### Lectura

Stripe tiene una capa histórica fuerte. Eso no significa que sea irremovible, pero sí obliga a retirar primero cada caller vivo antes de borrar el SDK y la configuración.

## 13. Riesgos

### Si Stripe se retira ahora

- se rompe `/api/payments/checkout`
- se rompe `/api/payments/webhook`
- se rompe el caller automático de registro en `app/(public)/registro/page.tsx`
- se rompe la creación automática de `Order` stripe
- se rompe la actualización automática de `Account`
- se rompe la sincronización automática a Operaciones desde checkout
- se rompen tests de checkout/webhook
- se rompen referencias de CSP, entorno y documentación

### Si Stripe se mantiene

- se conserva una ruta automatizada de pago que ya no parece ser la principal del negocio
- se mantiene complejidad de seguridad, secretos, CSP y documentación
- se mantiene una dependencia externa que el negocio probablemente ya no necesita como flujo primario

## 14. Qué puede eliminarse

Solo puede considerarse eliminable después de desactivar el flujo completo:

- `domains/shared/services/payment.service.ts`
- `app/api/payments/checkout/route.ts`
- `app/api/payments/webhook/route.ts`
- `stripe` del `package.json`
- `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` de `.env*`
- CSP de Stripe en `next.config.ts`
- tests Stripe
- docs y smoke tests de Stripe
- caller automático de registro que sigue redirigiendo al checkout

### Estado actual

- **No eliminar todavía**

## 15. Qué debe mantenerse por compatibilidad

Mientras exista el caller público actual:

- el endpoint de checkout
- el servicio Stripe
- la verificación de webhook
- las variables secretas
- la política CSP con dominios Stripe
- los tests que cubren ese flujo

## 16. Plan de retirada

1. Migrar el caller público que hoy invoca `/api/payments/checkout`
2. Conservar temporalmente el flujo manual como vía dominante
3. Retirar checkout y webhook una vez el caller haya desaparecido
4. Eliminar `stripe` del `package.json`
5. Quitar `STRIPE_*` de `.env*`
6. Remover Stripe de CSP y documentación
7. Eliminar tests y guías ya obsoletos

## 17. Orden recomendado

1. Aislar y migrar el caller público
2. Confirmar que no quedan imports runtime del SDK
3. Retirar endpoint y wrapper Stripe
4. Limpiar entorno y CSP
5. Actualizar documentación histórica y tests

## 18. Impacto

### Si se retira bien

- se simplifica el flujo de compra
- se reduce superficie de secretos y CSP
- se alinea el sistema con el flujo manual real

### Si se retira mal

- se rompe el registro público
- se pierde la única ruta de compra automática todavía viva
- se deja la documentación desalineada con el runtime

## 19. Validaciones

Esta auditoría se apoyó en:

- búsqueda de referencias Stripe en código, tests, docs y configuración
- revisión de `npm ls stripe`
- lectura de los endpoints activos de checkout y webhook
- lectura de la página pública de registro
- lectura del flujo manual ya existente

## 20. Conclusión final

Stripe **todavía no puede retirarse completamente** porque existe un caller público activo que lo invoca. Sin embargo, el sistema ya dispone de un flujo manual dominante y funcional, por lo que la retirada total parece viable **después** de migrar ese caller y limpiar el runtime.

**Conclusión operativa:** Stripe es hoy una dependencia viva pero acotada, no el flujo principal del negocio.
