# NEW-18 — arquitectura soportada, 2026-09-06

Resultado: OPEN / NO-GO provisional. Una prueba controlada por endpoint,
15:58:13.209454 UTC: notify request 3 HTTP 401; commerce-order-sync?limit=25
request 4 HTTP 401; expire-chips request 5 HTTP 401. Todos timed_out=false.
No hubo reintentos después de los 401, ni se habilitó el job.
Verificación: prerescate-worker-recovery active=false, scheduled_runs=0.

## Acceso efectivo y NEW-19

Data API con clave anon legítima: public.User rechazado 401/42501 por permisos;
net/http_request_queue, vault/decrypted_secrets y cron/job rechazados
406/PGRST106 Invalid schema. Se pidió limit=0: no se extrajeron filas.
Un intento previo con publishable key recibió rechazo de gateway y no se utilizó
como prueba de aislamiento de esquemas. La configuración SQL NULL tampoco se
utilizó como evidencia de aislamiento.

Con SET LOCAL ROLE anon y authenticated, net.http_post pudo encolar, y COUNT
sobre net.http_request_queue y net._http_response fue permitido (cero filas).
Cada prueba terminó en ROLLBACK; no salió tráfico de esas dos llamadas SQL.
Vault denegó ambos roles con 42501. No se leyeron headers ni Authorization.

Esto confirma privilegios SQL internos reales, no solo nominales; no equivale a
acceso de cliente HTTP. PostgREST no ofrece esos esquemas. No hay funciones en
public; graphql_public solo contiene un stub que informa pg_graphql deshabilitado.
No se encontraron vistas públicas que referencien net/vault/cron, ni referencias
correspondientes, RPC o SQL unsafe en la búsqueda de app/lib/prisma.
No se ha demostrado un puente desde la superficie cliente auditada.

NEW-19: la anterior conclusión de vulnerabilidad de cliente basada exclusivamente
en grants era un FALSE POSITIVE en el alcance comprobado. Sigue siendo riesgo
residual si se exponen esos esquemas o se incorpora SQL arbitrario/RPC puente.
No se otorgaron nuevos privilegios para sortear controles del proveedor.

## Migraciones

- 20260906155643_supported_pg_net_transport.sql: pg_net instalado por vía oficial.
- 20260906155758_supported_worker_recovery_inactive.sql: job */5 creado INACTIVO.

Ambas versionadas antes de aplicar. Timestamps CLI originales 20260906155547 y
20260906155721 alineados posteriormente con versiones reales de apply_migration.
No se instaló http. GitHub sigue de respaldo. La migración http anterior continúa
sin aplicar y no debe incluirse en un replay automático.

## Puertas pendientes

HTTP 2xx FAIL (401). Heartbeats del nuevo scheduler y cadencia NOT TESTABLE:
no fue activado. NEW-18 no se cierra. La credencial actual fue rechazada en runtime;
no se infiere su contenido, ni se rota ni imprime su valor.

Documentación oficial consultada antes de modificar producción:
https://supabase.com/docs/guides/cron
https://supabase.com/docs/guides/database/extensions/pg_net
https://supabase.com/docs/guides/database/vault
https://supabase.com/docs/guides/api/using-custom-schemas
