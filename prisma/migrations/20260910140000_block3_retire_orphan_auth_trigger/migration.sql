-- Retire only the obsolete v2 signup trigger whose destination tables were
-- removed. No Auth users, application rows, or valid signup hooks are deleted.
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_proc p ON p.oid = t.tgfoid
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE t.tgrelid = to_regclass('auth.users')
      AND t.tgname = 'v2_on_auth_user_created'
      AND NOT t.tgisinternal
      AND n.nspname = 'private' AND p.proname = 'v2_handle_new_auth_user'
  ) THEN
    IF to_regclass('public.v2_users') IS NOT NULL
       OR to_regclass('public.v2_accounts') IS NOT NULL
       OR to_regclass('public.v2_account_members') IS NOT NULL THEN
      RAISE EXCEPTION 'Block 3: v2 tables exist; refusing to retire a potentially active Auth hook';
    END IF;
    DROP TRIGGER v2_on_auth_user_created ON auth.users;
  END IF;
END
$migration$;
