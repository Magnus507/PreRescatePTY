# P0-02S - Retirada de Stripe y consolidacion del pago manual

**Fecha de cierre:** 14 de julio de 2026  
**Revision base:** `812e124` (`master`)  
**Estado:** implementado y verificado localmente  
**Objetivo:** eliminar Stripe del runtime del producto y consolidar el flujo manual como camino unico de compra.

## 1. Conclusión ejecutiva

Stripe ya no es una dependencia runtime del producto.

La retirada fue completada en el codigo activo, los endpoints de checkout y webhook fueron eliminados, el paquete `stripe` fue desinstalado, el frontend dejo de redirigir a Stripe, y el flujo de compra quedo consolidado en el proceso manual: pedido -> instruccion de pago -> comprobante -> revision manual -> aprobacion admin -> reserva -> operaciones.

**Conclusión técnica:** **SÍ, Stripe ya no es una dependencia runtime del producto.**

## 2. Mapa completo de Stripe antes de la retirada

### Callers y piezas retiradas

| Archivo | Responsabilidad previa | Runtime | Legacy | Histórico | Eliminado | Motivo |
|---|---|---:|---:|---:|---:|---|
| `app/api/payments/checkout/route.ts` | Crear sesión Stripe para paquetes | Sí | No | No | Sí | Ya no existía necesidad funcional y era un punto de entrada vivo a Stripe |
| `app/api/payments/webhook/route.ts` | Verificar eventos Stripe, crear orden y sincronizar operaciones | Sí | No | No | Sí | Era el único disparador runtime de Stripe con side effects de negocio |
| `domains/shared/services/payment.service.ts` | Wrapper del SDK Stripe | Sí | No | No | Sí | Solo servía al flujo Stripe retirado |
| `tests/routes/payments-checkout.test.ts` | Cobertura del checkout Stripe | No | No | Sí | Sí | La ruta ya no existe |
| `tests/routes/payments-webhook.test.ts` | Cobertura del webhook Stripe | No | No | Sí | Sí | La ruta ya no existe |

### Referencias que quedaron como históricas o documentales

| Archivo | Responsabilidad | Runtime | Legacy | Histórico | Eliminado | Motivo |
|---|---|---:|---:|---:|---:|---|
| `docs/p002-stripe-retirement-audit.md` | Auditoría previa de retirada | No | No | Sí | No | Queda como evidencia histórica del estado anterior |
| `docs/03-auditorias/ANALISIS_PROYECTO.md` | Análisis histórico con Stripe | No | No | Sí | No | Documento legado, no fuente de verdad del runtime |
| `docs/logic/order-state-machine.md` | Menciona estado/flujo stripe legacy | No | Sí | Sí | No | Conservado por trazabilidad histórica |
| `docs/logic/account-capacity-policy.md` | Describe compatibilidad histórica | No | Sí | Sí | No | Conservado como referencia de evolución |
| `docs/w608h-legacy-package-flow-audit.md` | Flujo legacy de paquete/Stripe | No | Sí | Sí | No | Conservado como evidencia histórica |

## 3. Dependencias retiradas

### Eliminadas del runtime

- `stripe`

### Verificación

- `npm ls stripe` devuelve `(empty)`.
- `package.json` ya no declara `stripe`.
- `package-lock.json` se actualizó para reflejar la retirada.

### Dependencias relacionadas que no se encontraron como runtime activo

- `@stripe/stripe-js`
- `react-stripe-js`
- wrappers de frontend Stripe

## 4. Variables retiradas

### Eliminadas de la configuración activa

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

### Estado actual

- `.env.example` ya no las documenta.
- `docs/04-operaciones/environment-variables.md` indica que Stripe fue retirado del runtime.
- El build y el typecheck pasan sin requerir estas variables.

### Nota operativa

Las copias locales o respaldos antiguos pueden seguir existiendo en archivos personales o históricos, pero no forman parte de la configuración soportada por esta fase.

## 5. SDK y webhooks

### SDK

El SDK de Stripe fue retirado del runtime junto con el flujo que lo consumía.

### Webhooks

- `POST /api/payments/webhook` fue eliminado.
- La verificación de `stripe-signature` ya no existe en el runtime.
- No quedan eventos `checkout.session.completed` procesados por el sistema.

### Checkout

- `POST /api/payments/checkout` fue eliminado.
- Ya no existe redirección automática hacia Stripe desde el frontend.

## 6. Flujo consolidado

### Flujo manual actual

1. El cliente inicia la compra desde la tienda.
2. El sistema crea un pedido manual.
3. El usuario recibe instrucciones de pago.
4. El usuario sube el comprobante.
5. El equipo revisa el comprobante manualmente.
6. Un admin aprueba o rechaza.
7. La aprobación dispara reserva.
8. La reserva alimenta producción, despacho, entrega y activación.

### Responsabilidades movidas al flujo manual

- La confirmación de pago ya no depende de un proveedor externo.
- La activación de negocio ya no se encadena desde un webhook de Stripe.
- La sincronización operacional continúa existiendo, pero ahora parte de una orden manual consolidada.

## 7. Callers auditados y resultado

### Compra personal

- `app/(public)/registro/page.tsx`
- `app/(public)/comprar/ComprarContent.tsx`
- Resultado: no quedan redirecciones automáticas a Stripe.

### Compra corporativa

- `app/api/organizations/corporate-orders/route.ts`
- `app/api/organizations/corporate-orders/from-requests/route.ts`
- Resultado: generan pedidos y sincronización operativa sin Stripe.

### Pedidos manuales

- `app/api/orders/manual/route.ts`
- `app/api/orders/route.ts`
- Resultado: consolidan el flujo manual como vía principal.

### Pedidos legacy

- `lib/order-status.ts`
- `app/api/orders/route.ts`
- Resultado: conservan compatibilidad histórica de clasificación, sin dependencia Stripe runtime.

### Packages

- `docs/w608h-legacy-package-flow-audit.md`
- `docs/logic/order-state-machine.md`
- Resultado: permanecen como compatibilidad histórica, no como runtime Stripe.

### Sync operaciones

- `lib/operations/sync-real-order-to-operations.ts`
- `app/api/orders/manual/route.ts`
- Resultado: la sincronización sigue activa, pero ya no nace de Stripe.

### Producción, despacho y activación

- `app/api/admin/retail/sell/route.ts`
- `app/api/admin/chips/[chipId]/assign-direct/route.ts`
- `app/api/admin/operations/...`
- Resultado: continúan operando sobre pedidos manuales y administrativos.

### Admin

- `app/(admin)/admin/_utils/order-helpers.ts`
- `tests/services/safe-delete.service.test.ts`
- Resultado: se eliminaron etiquetas y referencias de Stripe del runtime administrativo.

### Dashboard cliente

- `app/(public)/comprar/ComprarContent.tsx`
- `app/(public)/faq/FAQContent.tsx`
- Resultado: el mensaje al usuario ya describe pago manual.

### Dashboard empresa

- `app/api/organizations/corporate-orders/route.ts`
- `app/api/organizations/corporate-orders/from-requests/route.ts`
- Resultado: no existe dependencia Stripe en el flujo empresarial actual.

### Notificaciones y emails

- No se detectó un disparador Stripe activo para notificaciones o emails en runtime.

### Tests

- `tests/routes/orders-manual.test.ts`
- `tests/routes/payment-proof.test.ts`
- `tests/services/safe-delete.service.test.ts`
- `tests/lib/sync-real-order-to-operations.test.ts`

## 8. Qué puede eliminarse y qué debe mantenerse

### Puede eliminarse

- `app/api/payments/checkout/route.ts`
- `app/api/payments/webhook/route.ts`
- `domains/shared/services/payment.service.ts`
- `tests/routes/payments-checkout.test.ts`
- `tests/routes/payments-webhook.test.ts`
- `stripe` del `package.json` y `package-lock.json`
- `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` de la configuración activa
- dominios Stripe en la CSP de `next.config.ts`

### Debe mantenerse

- el flujo manual de pedidos
- la subida de comprobantes
- la aprobación manual
- la reserva de inventario
- la sincronización a operaciones
- la documentación histórica que explica cómo funcionaba Stripe antes de la retirada

## 9. Riesgos residuales

- Referencias históricas pueden seguir existiendo en documentación archivada.
- Algunos documentos antiguos describen Stripe como parte del sistema; eso ya no refleja el runtime actual.
- La migración de término y soporte documental todavía requiere limpieza para evitar confusión operacional.

## 10. Validaciones

### Comandos ejecutados

- `git diff`
- `git diff --check`
- `git status --short`
- `npx prisma validate`
- `npm run typecheck`
- `npm run lint`
- `npx vitest run`
- `npm run build`
- `npm audit --omit=dev`
- `npm ls stripe`

### Resultado resumido

- `npx prisma validate`: pasa
- `npm run typecheck`: pasa
- `npm run lint`: falla por 93 errores y 6 warnings preexistentes
- `npx vitest run`: falla por 21 pruebas, concentradas en `tests/routes/chips-activate.test.ts` y `tests/routes/public-demo.test.ts`
- `npm run build`: pasa con warnings preexistentes de `<img>` y una dependencia incompleta de `useCallback`
- `npm audit --omit=dev`: reporta 20 vulnerabilidades heredadas
- `npm ls stripe`: `(empty)`

### Warnings y deuda previa

- `@next/next/no-img-element` en `QrPreviewModal`, `ReceiptModal`, `ProductionQueueSection`, `DemoContent` y `DemoSection`
- `react-hooks/exhaustive-deps` en `app/(app)/dashboard/pedidos-corporativos/[id]/distribucion/page.tsx`
- fallos de suite heredados en `chips-activate` y `public-demo`
- vulnerabilidades heredadas en dependencias directas y transitivas no relacionadas con Stripe

## 11. Historico y compatibilidad

Se conservan referencias históricas en documentos antiguos porque forman parte de la trazabilidad del proyecto. No deben interpretarse como runtime vigente.

## 12. Orden recomendado

1. Publicar esta fase como evidencia del retiro.
2. Mantener el flujo manual como única vía de compra soportada.
3. Archivar o actualizar la documentación histórica que todavía narra Stripe como flujo activo.
4. Evitar reintroducir Stripe por caminos laterales.

## 13. Impacto

- Menos superficie de ataque y menos dependencias de terceros.
- Menos complejidad operacional en compra y verificación.
- Mayor claridad para soporte: el flujo crítico pasa por comprobante y revisión humana.
- La sincronización a operaciones queda desacoplada de un proveedor externo.

## 14. Commit y push

- Commit: pendiente de registrar en esta ejecución.
- Push: pendiente de publicar en `origin/master`.
