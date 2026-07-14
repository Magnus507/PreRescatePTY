# P0-02R - Auditoria de retiro de Stripe

**Fecha:** 14 de julio de 2026

**Base auditada:** `master` en `b652e06` tras la fase P0-01

**Estado:** auditoria estatica; no se eliminaron archivos ni se refactorizo nada

## 1. Conclusión ejecutiva

Stripe **no puede retirarse completamente hoy** sin romper al menos un flujo activo de compra/pago, porque sigue siendo usado por:

- `app/api/payments/checkout/route.ts`
- `app/api/payments/webhook/route.ts`
- `domains/shared/services/payment.service.ts`
- tests de checkout y webhook
- CSP y configuracion de entorno
- documentacion y smoke tests que siguen describiendo Stripe como flujo legacy/activo

Sin embargo, la auditoria tambien confirma que Stripe **ya no representa el flujo principal del negocio** para la operacion real de emergencias. El flujo dominante de negocio es manual:

Cliente -> Tienda -> Pedido -> Instrucciones de pago -> Subida de comprobante -> Verificacion manual -> Aprobacion Admin -> Reserva -> Produccion -> Despacho -> Entrega -> Activacion

Por lo tanto, la conclusion tecnica es:

- **No es seguro retirarlo por completo aun**
- **Si puede retirarse parcialmente del flujo principal manual, pero no del sistema completo sin un plan de compatibilidad**
- **Debe mantenerse un componente Stripe mientras exista el checkout automatizado y el webhook que crea/actualiza pedidos**

## 2. Mapa completo de Stripe

### Runtime activo

| Archivo | Responsabilidad | Runtime | Legacy | Historico | Puede eliminarse | Debe mantenerse | Motivo |
|---|---|---|---|---|---|---|---|
| [app/api/payments/checkout/route.ts](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/payments/checkout/route.ts) | Crea checkout de Stripe para paquetes | Si | No | No | No hoy | Si | Es un endpoint vivo y usa `PaymentService.createCheckoutSession` |
| [app/api/payments/webhook/route.ts](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/payments/webhook/route.ts) | Verifica webhook, crea orden, actualiza cuenta, sincroniza Operaciones | Si | No | No | No hoy | Si | Dispara efectos persistentes fuera de Stripe |
| [domains/shared/services/payment.service.ts](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/domains/shared/services/payment.service.ts) | SDK Stripe server-side | Si | No | No | No hoy | Si | Centraliza `checkout.sessions.create` y `webhooks.constructEvent` |
| [tests/routes/payments-checkout.test.ts](/Users/geancusatti/Documentos/PreRescatePTY/tests/routes/payments-checkout.test.ts) | Prueba checkout Stripe | Si | No | No | No | Si hasta retirar endpoint | Cubre contrato real del endpoint |
| [tests/routes/payments-webhook.test.ts](/Users/geancusatti/Documentos/PreRescatePTY/tests/routes/payments-webhook.test.ts) | Prueba webhook Stripe | Si | No | No | No | Si hasta retirar endpoint | Cubre metadata, firma y ordenes |
| [lib/order-number.ts](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/lib/order-number.ts) | Prefijo `STRIPE` para ordenes Stripe | Si | Parcial | No | No inmediato | Si mientras exista provider stripe | Forma parte de la numeracion visible |
| [lib/order-status.ts](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/lib/order-status.ts) | Clasifica provider `stripe` | Si | Parcial | No | No inmediato | Si | El dominio de estado aun reconoce Stripe |
| [prisma/schema.prisma](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/prisma/schema.prisma) | Campos `provider`, `providerReference`, `paymentStatus` | Si | Si | No | No | Si | Stripe sigue modelado en el schema |
| [package.json](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/package.json) | Dependencia `stripe` | Si | No | No | No hasta retirar runtime | Si | El SDK sigue instalado |

### Callers indirectos y bordes

| Archivo | Responsabilidad | Runtime | Legacy | Historico | Puede eliminarse | Debe mantenerse | Motivo |
|---|---|---|---|---|---|---|---|
| [app/api/orders/route.ts](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/orders/route.ts) | Sincroniza orden legacy a Operaciones y conserva provider/paymentStatus | Si | Si | No | No | Si | Mantiene provider/status compatibles |
| [domains/orders/services/order.service.ts](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/domains/orders/services/order.service.ts) | Crea orden Stripe desde webhook | Si | No | No | No | Si | Es un caller de negocio directo |
| [next.config.ts](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/next.config.ts) | CSP permite `js.stripe.com` y `hooks.stripe.com` | Si | No | No | No hasta eliminar runtime | Si | Stripe está permitido a nivel de browser policy |
| [.env](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/.env) | Define `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` | Si | No | No | No | Si mientras exista Stripe | Entorno de runtime activo |
| [.env.example](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/.env.example) | Documenta variables Stripe | No | Si | Si | Sí si se retira Stripe | No si se conserva | Es documentación de configuración |
| [.env.local](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/.env.local) | Variables locales Stripe | Si | No | No | Sí si se retira Stripe | No si se conserva | Entorno local contiene credenciales de desarrollo |
| [.env.local.backup](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/.env.local.backup) | Backup con variables Stripe | No | Sí | Sí | Sí | No | Archivo de respaldo, no runtime |
| [README.md](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/README.md) | Menciona Stripe como stack | No | Sí | Sí | Sí tras retiro | No | Es referencia descriptiva |
| [INSTRUCTIONS.md](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/INSTRUCTIONS.md) | Documento histórico con Stripe | No | Sí | Sí | Sí si se archiva | No | No gobierna runtime |
| [docs/05-qa/production-smoke-test.md](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/docs/05-qa/production-smoke-test.md) | Smoke de Stripe legacy | No | Sí | Sí | Sí tras retirar Stripe | No | Sigue describiendo verificación manual |
| [docs/02-mapa-funcional/pedidos-pagos.md](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/docs/02-mapa-funcional/pedidos-pagos.md) | Variables y flujo de pagos Stripe | No | Sí | Sí | Sí/archivar | No | Documento funcional de pagos |
| [docs/04-operaciones/environment-variables.md](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/docs/04-operaciones/environment-variables.md) | Lista `STRIPE_SECRET_KEY` | No | Sí | Sí | Sí si se retira | No | Guía operativa |
| [docs/04-operaciones/QUICK_REFERENCE.md](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/docs/04-operaciones/QUICK_REFERENCE.md) | Variables Stripe | No | Sí | Sí | Sí si se retira | No | Referencia operativa |

## 3. Dependencias

### Resultado de `npm ls`

- `stripe@22.0.1`
- No se detectaron dependencias instaladas `@stripe/stripe-js`, `react-stripe`, ni wrappers de frontend Stripe

### Qué consume el SDK

- `domains/shared/services/payment.service.ts`
- `app/api/payments/webhook/route.ts`
- `tests/routes/payments-checkout.test.ts`
- `tests/routes/payments-webhook.test.ts`

### Conclusión sobre dependencias

El SDK `stripe` no es decorativo. Tiene consumo runtime real y cobertura de tests. Puede eliminarse solo cuando desaparezcan el checkout y el webhook Stripe, además de limpiar la CSP y la configuración de entorno.

## 4. Variables

Variables Stripe encontradas:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Referencias adicionales:

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` aparece en documentación histórica, smoke tests y referencias operativas, pero no encontré un consumidor runtime claro en el código de esta auditoria

Conclusión:

- Las variables secretas siguen siendo necesarias mientras exista Stripe.
- Las referencias públicas/publishable viven más en docs que en runtime visible.

## 5. SDK

### Uso real del SDK

En `domains/shared/services/payment.service.ts`:

- `new Stripe(secretKey, { apiVersion: ... })`
- `stripe.checkout.sessions.create(...)`
- `stripe.webhooks.constructEvent(...)`

### Implicación

Stripe no está solo “nombrado” en el proyecto. Está integrado como servicio de pago y verificación de eventos.

## 6. Webhooks

### Flujo confirmado

`app/api/payments/webhook/route.ts`:

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
- **¿Stripe dispara reservas?** No directamente en el flujo de checkout/webhook actual
- **¿Stripe dispara despacho?** No directamente
- **¿Stripe dispara activación?** No directamente
- **¿Stripe dispara sincronización?** Sí, explícitamente
- **¿Stripe es solo un proveedor de pago?** No en el estado actual; es proveedor de pago + disparador de side effects de negocio

## 7. Checkout

### Flujo actual

`app/api/payments/checkout/route.ts`:

- exige sesión
- lee `packageId`
- valida el paquete en BD
- toma `pkg.price` desde BD
- llama `PaymentService.createCheckoutSession(...)`
- retorna la URL de Stripe

### Evidencia de uso real

El checkout sigue siendo una entrada operativa viva para planes/paquetes.

### Riesgo

Aunque el flujo manual principal funciona sin Stripe, este endpoint todavía abre una ruta de compra automatizada que depende del SDK y de la configuración secreta.

## 8. Tests

Tests que aún dependen de Stripe:

- `tests/routes/payments-checkout.test.ts`
- `tests/routes/payments-webhook.test.ts`

Tests y suites relacionadas por efectos secundarios:

- `tests/routes/payment-proof.test.ts`
- `tests/routes/admin-orders-approve.test.ts`
- `tests/lib/commercial-order-reservation.test.ts`

Estos no usan Stripe directamente, pero comparten el ecosistema de órdenes/pagos y ayudan a confirmar que Stripe no es el único mecanismo de avance del negocio.

## 9. Documentación

Documentos con Stripe como parte del sistema:

- `README.md`
- `INSTRUCTIONS.md`
- `docs/05-qa/production-smoke-test.md`
- `docs/02-mapa-funcional/pedidos-pagos.md`
- `docs/03-auditorias/ANALISIS_PROYECTO.md`
- `docs/03-auditorias/audit-previas/*`
- `docs/logic/order-state-machine.md`
- `docs/logic/account-capacity-policy.md`

### Lectura documental

La documentación muestra una mezcla de:

- flujo Stripe legacy todavía descrito como válido
- compras manuales que ya son la vía dominante
- referencias históricas que no distinguen con rigor entre dependencia viva y dependencia heredada

## 10. Histórico

Evidencia histórica relevante:

- `docs/prisma-migrations-legacy/20260526000000_stripe_order_idempotency/migration.sql` contiene un índice único parcial histórico para `Order.providerReference` cuando `provider = 'stripe'`
- Documentos de auditoría antiguos siguen describiendo Stripe como parte del proceso de pago
- Hay smoke tests y guías que todavía usan el término `Stripe legacy`

### Lectura

Stripe tiene una capa histórica fuerte. Eso no significa que sea irremovible, pero sí obliga a comprobar consumidores reales antes de borrarlo.

## 11. Riesgos

### Si Stripe se retira ahora

- se rompe `/api/payments/checkout`
- se rompe `/api/payments/webhook`
- se rompe la creación automática de `Order` stripe
- se rompe la actualización automática de `Account`
- se rompe la sincronización automática a Operaciones desde checkout
- se rompen tests de checkout/webhook
- se rompen referencias de CSP/entorno/documentación

### Si Stripe se mantiene

- se conserva una ruta automatizada de pago no principal
- se mantiene complejidad de seguridad, secretos y CSP
- se mantiene una dependencia externa adicional que el negocio quizá ya no necesita

## 12. Qué puede eliminarse

Solo puede considerarse eliminable después de desactivar el flujo completo:

- `PaymentService` como wrapper Stripe
- `app/api/payments/checkout/route.ts`
- `app/api/payments/webhook/route.ts`
- `stripe` del `package.json`
- variables Stripe de `.env*`
- CSP Stripe de `next.config.ts`
- tests Stripe
- docs y smoke tests de Stripe

Estado actual:

- **No eliminar todavía**

## 13. Qué debe mantenerse

Mientras exista checkout Stripe:

- `domains/shared/services/payment.service.ts`
- `app/api/payments/checkout/route.ts`
- `app/api/payments/webhook/route.ts`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `stripe` en `package.json`
- CSP con dominios Stripe
- tests críticos de checkout/webhook

## 14. Plan de retirada

### Fase 1

- congelar el checkout Stripe como ruta no principal
- comunicar que el flujo manual es el primario
- preparar una ventana de desactivación

### Fase 2

- deshabilitar el endpoint de checkout
- deshabilitar o convertir en no-op controlado el webhook
- confirmar que no hay callers externos ni internos adicionales

### Fase 3

- retirar SDK y variables
- limpiar CSP
- retirar tests y docs Stripe
- archivar documentación histórica

## 15. Orden recomendado

1. Confirmar con negocio si Stripe se retira o solo se congela
2. Desactivar checkout Stripe en producción
3. Observar por un ciclo completo si aparecen dependencias ocultas
4. Eliminar webhook y SDK solo cuando no haya consumidores
5. Limpiar docs, CSP y variables

## 16. Impacto

### Técnico

- menor superficie de riesgo si se retira
- menos secretos y menos integración externa

### Operativo

- el negocio manual ya cubre el camino principal
- se conserva compatibilidad histórica si Stripe permanece temporalmente

### Comercial

- si hay clientes que usan Stripe, el retiro abrupto rompe compra automatizada

## 17. Validaciones

- `git diff`
- `git diff --check`
- `git status --short`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`
- `npm ls stripe`

## 18. Resultado de validaciones

- `npm ls stripe`: `stripe@22.0.1`
- `npx prisma validate`: OK
- `npm run typecheck`: OK
- `npm run build`: OK con warnings preexistentes de `<img>` y `react-hooks/exhaustive-deps`

## 19. Commit

`PENDIENTE` hasta registrar el commit de esta fase.

## 20. Push

`PENDIENTE` hasta ejecutar `git push origin master` para esta fase.

## 21. Conclusión final

Stripe **puede retirarse parcialmente del flujo principal manual**, porque el negocio ya opera con comprobante + revisión manual + aprobación admin + reserva + producción + despacho + entrega + activación.

Stripe **no puede retirarse completamente todavía** porque sigue siendo dependencia runtime viva del checkout y webhook, y además dispara creación de pedidos, actualización de cuentas y sincronización operacional.

La decisión técnicamente correcta hoy es:

**Mantener Stripe por compatibilidad histórica y por la ruta de compra automatizada viva, mientras se prepara una retirada controlada o una desactivación formal.**
