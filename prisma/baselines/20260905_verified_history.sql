-- Verified metadata baseline; does not replay application migrations or change user records.
-- Source: fe965b628b01c9751a2d6a472ebcb5dbf87cfead, schema parity verified in CI 33972370894.
-- Historical execution timestamps are unknown: these are baseline-recording timestamps.
DO $baseline$
DECLARE fingerprint text;
BEGIN
WITH facts AS (
  SELECT 'column' AS kind, c.relname || '.' || a.attname AS name,
    format_type(a.atttypid, a.atttypmod) || '|' || a.attnotnull::text || '|' ||
    coalesce(pg_get_expr(d.adbin, d.adrelid), '') AS definition
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_attribute a ON a.attrelid = c.oid
  LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
  WHERE n.nspname = 'public' AND c.relkind IN ('r','p')
    AND c.relname <> '_prisma_migrations' AND a.attnum > 0 AND NOT a.attisdropped
  UNION ALL
  SELECT 'constraint', c.relname || '.' || con.conname, pg_get_constraintdef(con.oid, true)
  FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname <> '_prisma_migrations'
  UNION ALL
  SELECT 'index', tablename || '.' || indexname, indexdef
  FROM pg_indexes WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  UNION ALL
  SELECT 'rls', c.relname, c.relrowsecurity::text || '|' || c.relforcerowsecurity::text
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r','p') AND c.relname <> '_prisma_migrations'
  UNION ALL
  SELECT 'policy', tablename || '.' || policyname,
    permissive || '|' || roles::text || '|' || cmd || '|' || coalesce(qual,'') || '|' || coalesce(with_check,'')
  FROM pg_policies WHERE schemaname = 'public'
  UNION ALL
  SELECT 'enum', t.typname || '.' || e.enumsortorder::text, e.enumlabel
  FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace JOIN pg_enum e ON e.enumtypid = t.oid
  WHERE n.nspname = 'public'
)

SELECT md5(string_agg(kind || '|' || name || '|' || definition, E'\n' ORDER BY kind COLLATE "C", name COLLATE "C", definition COLLATE "C"))
INTO fingerprint FROM facts;
IF fingerprint IS DISTINCT FROM '4280551764e73d926998c098f0676f37' THEN
  RAISE EXCEPTION 'Schema mismatch: baseline refused';
END IF;
IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
  RAISE EXCEPTION 'Migration history already exists: inspect rather than overwrite';
END IF;
CREATE TABLE public._prisma_migrations (
  id varchar(36) PRIMARY KEY NOT NULL,
  checksum varchar(64) NOT NULL,
  finished_at timestamptz,
  migration_name varchar(255) NOT NULL,
  logs text,
  rolled_back_at timestamptz,
  started_at timestamptz NOT NULL DEFAULT now(),
  applied_steps_count integer NOT NULL DEFAULT 0
);
ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public._prisma_migrations FROM PUBLIC, anon, authenticated;
INSERT INTO public._prisma_migrations
  (id, checksum, finished_at, migration_name, logs, applied_steps_count)
VALUES
  (gen_random_uuid()::text, '3522900b213846399e37a331792cfaaf71a5130cf255f80e75794be6a3a7b2b2', now(), '20260629000000_baseline_initial_schema', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, '9284ac19bbe66ebcb5049433b64144079818dbbcbace780c874783cea1d4e835', now(), '20260629000001_chip_replacement_token_status', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, '1167080813d22b888130ddfb388275ba6201beed7f6e559f5003d4ae9816299b', now(), '20260629000002_operations_materials_events', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, 'd127a1d749f3e35f37611be399da6b69a5225be4f0584430b4de6d28e612e94f', now(), '20260630000000_operations_production_orders', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, 'dd7407bad65bcc9eae5f7545c47ef0b7333408cb4eaecf14cd3445a84c60f4d3', now(), '20260630145755_operations_qc_inspections', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, '69cbe4a9d1ce553eeb558b303d0c4098fe98274e496251861a7ac11e05ff377a', now(), '20260630185538_operations_packing_batches', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, 'f50d14b0a022cb4f5b8424db9bb328a0388bed3c7064a016723732e49d7a6431', now(), '20260630192540_operations_finished_goods_inventory', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, '6be0930b263fb440715b2b5091dbbfb715a52f022910cd3324509719a02ce2d5', now(), '20260630194627_operations_dispatches', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, '3c22d0ce294fca8b78e2793b251dad66f155ca4b8839d8cf86a9d11f1e5bb05f', now(), '20260630201942_operations_commercial_orders', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, 'ef7402092b8aadbb19251adbdd341e99e034aeda658c4eb14e35ebb939891d02', now(), '20260630204952_operations_warranties', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, '5e39497fc96b297fccf3dd601450f39924b2a6fb94137b0d381ac49d7e010de0', now(), '20260630210956_operations_replacements', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, '1b326eff46bc023cf8dd715cd602b274b8e4699f74a35876dc26c414bb645157', now(), '20260630212550_operations_returns', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, 'ecd7e8918e5d15c02293cec1f77add38222d61d4cc37d7a7c2bcb32a4232b1b0', now(), '20260701154317_operations_digital_batches', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, '8ccea9fbe09a315a12b3e2dd7bc529c5788ce9c7b2fd2a33c8069a978e972b9c', now(), '20260701155228_operations_print_orders', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, 'c65d384521072c028150cb4951c13b200bd77ebd19987dc6a1ae0bc701cde90e', now(), '20260701155914_operations_finished_good_units', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, 'c66a8784484b8b805362e2e55110e8271d06be9205c308e83b21e79229674812', now(), '20260701164613_operations_dispatch_units', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, '88a61554ac2079d3c0e952f6d747615851d13042590a5ff7a4333262057c9478', now(), '20260701172445_operations_after_sales_units', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, 'eb0ab6b790d85fe02957d4143d8a5ede34ceda5f118f59b09a959cd4654b11d8', now(), '20260702000001_operations_digital_short_code_unique', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, '507f7a651f8af6e7f408c7a40f9ac350c7041cf1ac22157b8600355bf10e2223', now(), '20260702022218_operations_production_unit_preparation', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, 'f35fc32428ba396c1cbed0622f86847e6de08436657c0ab8f0698d91aab0a64a', now(), '20260709195449_add_product_operational_mapping', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, '2085f9987a461cb3b40078b23e74f76b860b814909446a2fb376c6a50bdb99f0', now(), '20260714233000_commerce_order_sync_outbox', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, '229417c800e543e092b30a38205d27fb30df9e304d6b8553c780959b4f52f583', now(), '20260714235500_order_item_operational_snapshot', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, '8d59dd83e1d2cde2f4ecfe9f703dc3d249d9ab07a2827fa6e93c9c99e3a5a136', now(), '20260715001000_user_session_version', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, 'c43fcc80a662be9cd0d024437299b5a0a550685488339a5b61bdde3440bd40a8', now(), '20260715003000_password_reset_consumed_at', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, '6c069388aa612e0397de7656150d34386a0d1a87fe392ebb2a231f04590afe18', now(), '20260715010000_money_decimal', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, 'dca7dc46ed8072e582f6b6d551422c9b2e77e3fdcd7eccd6fcd6e67a6e46c27c', now(), '20260715122000_status_strong_domains', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, 'a7ea4aaf8d40e6899eedadedbf2ed4ef9711a884f0fdf58f7edd7321ab661fc5', now(), '20260715143000_reconcile_operation_commercial_money', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, '28e12b5c4978b2d5bf5445e3b71a46294dd3925bfa5405fb3f09f9205344d944', now(), '20260826231500_add_payment_attempts', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, 'ad45c7dfaab09d19fe0c5a6e8bb6a1a4bf0cd09aaed41760752987647b2349a5', now(), '20260826233500_private_payment_proofs', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, '11b4206b8551394bdad2351b450b4613f320843172c1dce856ab2555c1fa37f0', now(), '20260826235500_add_pending_invoices', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, 'e4f0de4fc5730dc02bcf0fc8d24693e604d0dc390bcbe0d35f381d753c8a6a5b', now(), '20260827064000_link_traceable_units_to_chips', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, 'a8feac9158e23e8531ff7829545a193b32bf87423c6af6980d2bc90cdbf5d0d2', now(), '20260827081500_protect_activation_codes', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, 'c1c6de3228fe8c6fb98492a26f1c1ad04d922a8089a4a36466ac96f8c326b854', now(), '20260831190000_harden_public_rls', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, '3ee7fd1313bdbc3929b2c93a8992e30d9cf3496eb49ed6204b302aea53866443', now(), '20260904021415_harden_emergency_notifications', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, '9684fc853996b988aeccd57c206ab12d5f56595df7cda4c86da2217c096d4e9f', now(), '20260904032000_storage_cleanup_outbox', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, 'bd577ec5641f58fe9600f6450ff2f950bc4dcefc0bb0ea60217e3763647c4762', now(), '20260904041000_reconcile_schema_defaults', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, 'b35119739828a9b6b550937354b81ffe63b47f116fa117da2dca86ca551cfcec', now(), '20260904113000_add_audit_request_context', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0),
  (gen_random_uuid()::text, '2e1e1e847a0396c1b91f48fdc9eacedf53c5f7d30a19c714597733bdaf70c573', now(), '20260904170000_harden_storage_cleanup_outbox', 'Verified existing schema baseline; original application was tracked by Supabase migrations.', 0);
END $baseline$;
