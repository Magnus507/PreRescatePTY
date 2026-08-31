-- Production hardening: legacy Prisma tables are server-only.
--
-- The application accesses these tables through Prisma using the privileged
-- database connection. They are not part of the browser-facing Supabase Data
-- API contract. Keep that boundary explicit and reproducible:
--   1) revoke any direct Data API privileges from anon/authenticated;
--   2) enable RLS as defense in depth;
--   3) intentionally create no anon/authenticated policies.
--
-- v2_* tables are excluded because they have their own RLS policies and grants.
-- _prisma_migrations is excluded because it is Prisma's internal migration ledger.

DO $$
DECLARE
  target RECORD;
BEGIN
  FOR target IN
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname <> '_prisma_migrations'
      AND c.relname NOT LIKE 'v2\_%' ESCAPE '\'
    ORDER BY c.relname
  LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon, authenticated', target.table_name);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target.table_name);
  END LOOP;
END
$$;
