# Notificaciones - PreRescatePTY

## Descripción funcional
Sistema de notificaciones multi-canal: email (Resend), SMS (Twilio), WhatsApp, y push notifications. Además de alertas de rescate y recordatorios.

## Rutas relacionadas
- `app/(public)/e/[shortCode]/page.tsx` - WhatsApp manual en página
- `app/api/public/[shortCode]/scan/route.ts` - Scan logging (status disabled)
- `app/api/cron/notify/route.ts` - Cron notify (deshabilitado)

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
Ninguno.

## Tests faltantes recomendados
- Tests de envío email/SMS
- Tests de notificaciones de pedidos
- Tests de WhatsApp (aunque es manual)

## Riesgos detectados
- Cron notify deshabilitado pero documentado como activo
- WhatsApp solo como link manual, no automatizado
- Sin tests de notificaciones

## Pendientes
- Reactivar o documentar cron notify como inactivo
- Considerar automatizar WhatsApp
- Tests de notificaciones