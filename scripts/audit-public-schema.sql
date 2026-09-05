-- Catalog only: no application records or credentials. Exclude migration
-- bookkeeping, which is checked separately. Stable across PostgreSQL 17 patches.
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
SELECT md5(string_agg(kind || '|' || name || '|' || definition, E'\n' ORDER BY kind COLLATE "C", name COLLATE "C", definition COLLATE "C")) AS "schemaFingerprint",
       count(*) AS "catalogFacts"
FROM facts;
