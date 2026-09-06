# NEW-18 — intento runtime 2026-09-05 22:56 UTC

Estado: OPEN / NO-GO. Detenido ante HTTP 401 conforme a instrucción del usuario.

Se confirmó presencia de prerescate_cron_secret sin leer su valor al cliente.
Migración inicial creada con Supabase CLI 2.81.3, versionada antes de aplicar.
El job se creó INACTIVO; nunca se habilitó su ejecución periódica.

| Endpoint | Request ID pg_net | HTTP | Timeout | Fecha UTC |
| --- | --- | --- | --- | --- |
| /api/cron/notify | 1 | 401 | false | 2026-09-05 22:56:58.093157 |
| /api/cron/commerce-order-sync?limit=25 | 2 | 401 | false | 2026-09-05 22:56:58.093157 |
| /api/cron/expire-chips | 3 | 401 | false | 2026-09-05 22:56:58.093157 |

Se consultaron solo id/status_code/timed_out/created de net._http_response.
No se imprimieron headers, secretos ni cuerpos de respuesta.
La credencial fue rechazada: corregir Vault con el valor exacto de Vercel Production.
No se hicieron reintentos después de observar 401.

## Hallazgo durante instalación y rollback

NEW-19: los REVOKE ejecutados por postgres no eliminaron los grants PUBLIC
propiedad de supabase_admin en net.http_request_queue. La verificación efectiva
mostró anon/authenticated con USAGE net y SELECT en la cola. Es un riesgo de
exposición de headers si existe un camino SQL/API hacia ese esquema; no se probó
exposición REST ni extracción por un atacante. Severidad P2, remediado por rollback.
No basta con que REVOKE termine sin error. Antes de reinstalar se requiere comprobar
que los permisos efectivos quedan restringidos bajo el propietario autorizado.

Se versionó y aplicó rollback SIN CASCADE: quitó únicamente el job recién creado y
pg_net, que no estaba instalado antes. Verificación posterior:
pg_net_installed=false; recovery_job_present=false; vault_secret_present=true.
pg_cron permanece instalado sin el job de recuperación; GitHub no se modificó.
No se tocaron tablas de negocio ni se rotó/borró el secreto.

## Migraciones aplicadas

- 20260905225639_prerescate_worker_recovery.sql
- 20260905225807_rollback_unverified_worker_recovery.sql

Archivos generados inicialmente por CLI con timestamps 20260905225553 y
20260905225730; después se alinearon con las versiones reales asignadas por
apply_migration, verificadas en supabase_migrations.schema_migrations. No repetirlas.
El historial Supabase de infraestructura es separado del historial Prisma de negocio.

## Heartbeats observados después de las pruebas

- notify: 2026-09-05 21:15:05.480 UTC
- commerce-order-sync: 2026-09-05 21:15:08.001 UTC
- expire-chips: 2026-09-05 21:15:09.557 UTC

Son anteriores al intento y NO demuestran éxito de este scheduler.
HTTP 2xx: FAIL. Cadencia <=15 minutos: NOT TESTABLE, job no habilitado.
Varias ejecuciones: NOT TESTABLE. NEW-18 sigue abierto. No se reutilizan los
575 tests previos como prueba de esta configuración de infraestructura.
