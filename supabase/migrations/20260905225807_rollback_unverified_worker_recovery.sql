-- NEW-18: HTTP probes returned 401; pg_net PUBLIC grants persisted after revoke.
-- Remove only the just-created recovery job and unused HTTP extension, without CASCADE.
begin;
select cron.unschedule(jobid) from cron.job where jobname = 'prerescate-worker-recovery';
drop extension pg_net;
commit;
