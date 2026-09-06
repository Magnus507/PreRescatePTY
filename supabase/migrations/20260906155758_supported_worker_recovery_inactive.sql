-- NEW-18: infrastructure only; no business schema or data changes.
-- Job remains INACTIVE pending HTTP authentication and runtime verification.
begin;
do $preflight$
begin
  if not exists (select 1 from vault.secrets where name = 'prerescate_cron_secret') then
    raise exception 'Missing scheduler credential in Vault';
  end if;
end;
$preflight$;
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
-- Fail closed until all three one-shot HTTP probes authenticate successfully.
select cron.alter_job(jobid, active := false)
from cron.job where jobname = 'prerescate-worker-recovery';
commit;
