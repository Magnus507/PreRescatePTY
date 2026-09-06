# Discovery — 2026-09-05

Estado: auditoría en curso. No constituye veredicto de lanzamiento. Base exacta en baseline.json.
Los 532 tests existentes pasan; esto no cubre los fallos nuevos siguientes.

| ID | Severidad provisional | Área y evidencia inicial | Causa / escenario | Estado |
| --- | --- | --- | --- | --- |
| NEW-01 | P1 | `app/api/contacts/profile-link/route.ts` POST/PATCH; `app/api/users/perfiles-medicos/[profileId]/contacts/route.ts` POST/PATCH | Falta autorización del Contact; PATCH legacy tampoco autoriza perfil y admite mass assignment. A puede vincular/alterar Contact B; el PATCH moderno escribe Contact antes de comprobar vínculo. | OPEN |
| NEW-02 | P1 | `lib/emergency-alerts.ts` queueEmergencyNotificationsFromScan | El trigger manual omite cooldown por destinatario; crear nuevos scans evade límite por scanId y puede generar spam/costo. | OPEN |
| NEW-03 | P1 | `lib/emergency-alerts.ts` sendOneNotification | El worker usa perfil actual del chip y destinatario almacenado sin revalidar contacto/consentimiento. Una reasignación o revocación puede enviar datos a destinatario obsoleto. | OPEN |
| NEW-04 | P1 | `lib/emergency-alerts.ts`, SMS/WhatsApp services | Timeout/5xx ambiguo se reintenta aunque Twilio pueda haber aceptado el mensaje; protección de lease solo cubre crash. | OPEN |
| NEW-05 | P2 | `lib/emergency-alerts.ts` recoverExpiredEmergencyNotificationLeases | Recuperación email no limita intentos ni antigüedad de la ventana de idempotencia del proveedor. | OPEN |
| NEW-06 | P1 | `app/api/orders/[id]/route.ts`, `payment-proof/route.ts` | Lectura de estado seguida por UPDATE por ID permite que una petición vieja revierta aprobación/cancelación concurrente; ruta antigua evita validación de ownership/archivo del comprobante. | OPEN |
| NEW-07 | P1 | activación individual/corporativa | Contar capacidad en transacción no serializa activaciones de distintos chips para la misma cuenta. La corporativa actualiza pendingItem por ID sin claim condicional. | OPEN |
| NEW-08 | P2 | `lib/notifications.ts` | Nombre controlable interpolado sin escape dentro de HTML de correo; inyección de contenido/enlaces. | OPEN |
| NEW-09 | P2 | `app/api/image-proxy/route.ts` | Rol imprenta puede leer comprobantes privados pese a separación de funciones de pago. | OPEN |
| NEW-10 | P2 | npm audit completo | 7 entradas (2 críticas derivadas de Vitest UI, 3 altas, 2 medias). Herramientas de desarrollo: no se demuestra ruta de explotación productiva. Clasificar alcance antes de fijar severidad final. | OPEN |
| NEW-11 | P2 | esquema real | No existe public._prisma_migrations; historia de MCP difiere de Prisma. El despliegue futuro requiere reconciliar baseline sin volver a aplicar DDL inicial. | OPEN |
| NEW-12 | P2 | perfil y safe-delete | Auditorías de perfil guardan snapshots completos; eliminación no cubre todos los perfiles de cuenta/proyecciones históricas. Requiere inventario de retención. | OPEN |

## Observaciones comprobadas

- GitHub master y deployment productivo corresponden a fe965b6; PR #10 fusionado y PR #8 obsoleto abierto.
- Ruleset 21953666 activo: PR, check verify estricto, bloqueo de borrado y force-push, sin bypass observado.
- Tablas de aplicación públicas con RLS activo; sin policies ni grants anon/authenticated. Arquitectura backend Prisma privilegiado: se exige autorización en cada endpoint; RLS no concede acceso entre clientes.
- Función legacy private.v2_handle_new_auth_user SECURITY DEFINER permanece; EXECUTE restringido a postgres. Hay que comprobar trigger y dependencias.
- Scheduler GitHub run 33944134256, evento schedule, pasos de autenticación y ambos workers exitosos. Esto no prueba entrega externa ni periodicidad garantizada.
- npm ci completado desde clon limpio; 77 archivos / 532 tests unitarios y de rutas PASS. Integración/concurrencia real aún no ejecutada en esta auditoría.
- No se han realizado escrituras ni pruebas agresivas contra producción.

## Pruebas necesarias antes de cierre

Dos actores y dos cuentas para NEW-01; rechazo previo a cualquier escritura y rechazo de campos privilegiados. Escaneos manuales/automáticos concurrentes, revocación antes del envío, destinatario cambiado, proveedor ambiguo, lease expirado y agotamiento. Carreras aprobación/cancelación/comprobante y capacidad de activación. Concurrencia PostgreSQL real aislada (2/10/50 reservas, 20 activaciones, 20 workers, 100 scans, 10 cron calls). Reauditoría del diff y verificación del SHA final desplegado.

### Hallazgos adicionales de la revisión transversal

- NEW-13 (P1): syncRealOrderToOperations reescribe status=draft, fulfillmentStatus=pending y borra/recrea items al reintentar; pierde estado operativo e identidades. Corregir preservando progreso y probar replay.
- NEW-14 (P1): markFinishedGoodUnitActivatedWithClient admite una unidad ya activada con otra referencia y estados available/reserved; puede sobrescribir identidad de activación. Restringir a dispatched/delivered no activados y conservar idempotencia solo con la misma referencia.
- NEW-15 (P2): helpers de integración permiten TRUNCATE de cualquier DATABASE_URL_TEST. Restringir destructivos a base local efímera identificada explícitamente.
- NEW-16 (P1): operaciones concurrentes sobre la misma orden operacional carecen de serialización común (reserva/liberación/creación de despacho). Bloquear fila de orden antes de inspeccionar unidades.
