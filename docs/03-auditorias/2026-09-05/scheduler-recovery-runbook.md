> Actualización 22:58 UTC: intento aplicado y revertido. Tres HTTP 401; job no habilitado. Ver scheduler-runtime-attempt.md. El SQL siguiente es histórico y requiere corregir permisos efectivos de pg_net antes de reutilizarse.

# Recuperación del scheduler — NEW-18

Preparado, NO aplicado ni probado en runtime. No cierra el P1.

## Requisito externo

En Vault del proyecto productivo, crear `prerescate_cron_secret` con exactamente
el valor de `CRON_SECRET` de Vercel Production. No es la contraseña de administrador.
No pegar el valor en chat, GitHub, SQL versionado ni logs. Usar la UI de Vault.
No rotar el secreto ni quitar el scheduler GitHub existente para este cambio.

Vault está instalado; pg_cron/pg_net están disponibles pero no instalados.
Generar/versionar una migración antes de aplicar la configuración siguiente.
El intento de instalar el CLI local terminó por cancelación de autorización de
red; no se eludió ese control. Este documento NO es una migración aplicada.

## SQL propuesto para revisión y migración

Ejecutar solo como operador DB autorizado y después de provisionar el secreto.
Destino fijo, sin URLs de cliente ni valores secretos en el comando del job.

```sql
begin;
do $preflight$
begin
  if not exists (select 1 from vault.secrets where name = 'prerescate_cron_secret') then
    raise exception 'Missing scheduler credential in Vault';
  end if;
end;
$preflight$;
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('prerescate-worker-recovery', '*/5 * * * *', $job$
  do $worker$
  declare
    scheduler_token text;
    worker_path text;
  begin
    select decrypted_secret into strict scheduler_token
    from vault.decrypted_secrets where name = 'prerescate_cron_secret';
    if scheduler_token is null or length(scheduler_token) = 0 then
      raise exception 'Empty scheduler credential';
    end if;
    foreach worker_path in array array[
      '/api/cron/notify', '/api/cron/commerce-order-sync?limit=25', '/api/cron/expire-chips'
    ] loop
      perform net.http_post(
        url := 'https://www.prerescatepty.com' || worker_path,
        headers := jsonb_build_object('Content-Type', 'application/json',
          'Authorization', 'Bearer ' || scheduler_token),
        body := '{}'::jsonb, timeout_milliseconds := 90000
      );
    end loop;
  end;
  $worker$;
$job$);
commit;
```

## Verificación obligatoria

1. Verificar owner del job y ausencia de permisos cliente para Vault/cola HTTP/cron.
   No imprimir `net.http_request_queue.headers` ni secretos desencriptados.
2. SUCCESS en cron.job_run_details solo confirma SQL encolado, NO HTTP exitoso.
   Revisar status_code/timed_out/fecha de net._http_response y 2xx de los tres endpoints.
3. Confirmar los tres cron:last-success:* en SystemConfig: fecha en value y updatedAt.
   Nunca escribir manualmente heartbeats para simular salud.
4. Observar varias ejecuciones y una ventana operativa extendida; huecos <=15 minutos.
5. Probar recovery con fixtures aislados; no enviar notificaciones a contactos reales.
6. Incorporar monitor externo del health autenticado para alertar por ejecuciones
   ausentes o caída DB. No declarar alertas PASS hasta observar recepción autorizada.

Rollback acotado: `select cron.unschedule('prerescate-worker-recovery');`
Verificar antes el nombre. No borrar extensiones ni jobs ajenos. GitHub puede
mantenerse como respaldo porque los workers usan claims/idempotencia.

## Referencias oficiales

- https://supabase.com/docs/guides/cron/install
- https://supabase.com/docs/guides/functions/schedule-functions
- https://supabase.com/docs/guides/database/vault
- https://supabase.com/docs/guides/database/extensions/pg_net
