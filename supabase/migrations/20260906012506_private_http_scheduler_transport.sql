-- NEW-18 alternative transport. No jobs or network calls are created here.
-- Dedicated schema avoids the PUBLIC-readable pg_net request queue.
begin;
create schema prerescate_http authorization postgres;
revoke all on schema prerescate_http from public, anon, authenticated;
create extension http with schema prerescate_http;
revoke all on all functions in schema prerescate_http from public, anon, authenticated;
do $guard$
begin
  if exists (
    select 1 from pg_roles r where r.rolname in ('anon', 'authenticated')
    and has_schema_privilege(r.oid, 'prerescate_http', 'USAGE')
  ) then
    raise exception 'HTTP transport schema must remain private';
  end if;
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    cross join pg_roles r
    where n.nspname='prerescate_http' and r.rolname in ('anon','authenticated')
    and has_function_privilege(r.oid,p.oid,'EXECUTE')
  ) then
    raise exception 'HTTP transport functions must not be executable by clients';
  end if;
end;
$guard$;
commit;
