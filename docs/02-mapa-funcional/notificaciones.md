# Notificaciones - PreRescatePTY

## Descripción funcional
Sistema de notificaciones multi-canal: email (Resend), SMS (Twilio), WhatsApp, y push notifications. Además de alertas de rescate y recordatorios.

## Rutas relacionadas
- `app/(public)/e/[shortCode]/page.tsx` - WhatsApp manual en página
- `app/api/public/[shortCode]/scan/route.ts` - Registro de escaneo y encolado durable de alertas
- `app/api/cron/notify/route.ts` - Reintento de notificaciones pendientes vía cron

## Componentes relacionados
- Minimal links a WhatsApp en página pública

## APIs relacionadas
- `app/api/notifications/*` - (si existe)
- `domains/notifications/services/order-notification.service.ts`
- `domains/shared/services/email.service.ts`
- `domains/shared/services/sms.service.ts`
- `domains/shared/services/whatsapp.service.ts`

## Servicios/helpers
- `lib/notifications.ts` - Helper notificaciones

## Modelos Prisma relacionados
- `Notification`, `NotificationPreference` - Modelos existentes

## Variables de entorno
- `RESEND_API_KEY` - Email
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` - SMS
- `WHATSAPP_NUMBER` - WhatsApp manual

## Tests existentes
- `tests/lib/emergency-alerts.test.ts`
- `tests/routes/public-scan.test.ts`
- `tests/routes/cron-notify.test.ts`
- `tests/routes/auth-register.test.ts`

## Tests faltantes recomendados
- Tests de envío email/SMS
- Tests de notificaciones de pedidos
- Tests de WhatsApp (aunque es manual)

## Riesgos detectados
- El envío depende de proveedores configurados en runtime
- WhatsApp manual sigue existiendo como fallback de contacto directo
- Los reintentos necesitan `CRON_SECRET` para ejecutarse

## Pendientes
- Mantener el cron operativo y monitoreado
- Revisar métricas de cola, reintentos y fallos permanentes
- Ampliar cobertura si se agregan nuevos canales
