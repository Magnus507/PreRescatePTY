# Bloque 5 — Disaster Recovery runbook

Status: **OPEN until a real backup + isolated restore + Storage restore + application rollback are executed and measured.**

This runbook implements the recovery path required by the GO Comercial map without changing production data.

## Baseline

- Production application SHA at Block 5 entry: `899fc94b652e3a24e79eaf30ad35e98b0046db1d`.
- Production Vercel deployment: `dpl_29dc5jvoWgvJJYZzfZDAccfUPrPd` — READY.
- Known previous READY production deployment for rollback exercise:
  `dpl_drDNXVP3YW9yZcfMmji76rPyommi` — SHA `1f941445230b990981a01e2ef4345dcb30c82a2a`.
- Isolated Supabase restore project already exists: `PreRescatePTY-Restore-Test-2026-08-31`.
- The restore project currently has the same application-schema fingerprint as production (65 public application tables, excluding `_prisma_migrations`) but contains no application/auth data and no Storage objects.
- The Supabase organization is currently on the Free plan. Free projects do not provide the paid automatic daily-backup restore path used by Pro/Team/Enterprise. Therefore Block 5 uses a verifiable logical database backup plus a separate Storage-object backup.

## Recovery architecture

### Database

`scripts/dr/backup-database.sh` uses the Supabase CLI, not raw `pg_dump`, and creates:

- `roles.sql`
- `schema.sql`
- `data.sql`
- `SHA256SUMS`
- `manifest.json`

The dump follows Supabase's documented migration/restore path. The source connection string is supplied only through `DR_SOURCE_DB_URL`; it is never committed or printed.

### Storage

Database backups contain Storage metadata, **not the object bytes**. Therefore:

- `scripts/dr/export-storage.mjs` downloads every object in every bucket, preserves bucket configuration, and records SHA-256 per object.
- `scripts/dr/restore-storage.mjs` restores the objects into an isolated project and downloads each restored object again to verify its SHA-256.

Production baseline at Block 5 entry:

- `general`: 2 objects.
- `payment-proofs`: 95 objects.
- `profile-photos`: currently no live object rows.
- Total Storage rows: 97.

Object bytes are sensitive. Never commit `dr-artifacts/`.

### Off-site encrypted copies

`.github/workflows/dr-backup.yml` is the production backup mechanism after its required repository secrets are configured.

Schedule: **03:17 and 15:17 UTC daily**.

Only an AES-256-CBC + PBKDF2 encrypted archive and its checksum are uploaded as a GitHub Actions artifact. Plaintext database and Storage exports are deleted from the runner before upload. Artifact retention is 14 days.

Selected recovery-point objective (RPO): **12 hours nominal maximum between scheduled backups**, plus any observable scheduler delay. At certification time record the timestamp/age of the latest successful artifact; that is the measured RPO evidence for the run.

Required GitHub Actions secrets:

- `DR_SOURCE_DB_URL`
- `DR_SOURCE_SUPABASE_URL`
- `DR_SOURCE_SUPABASE_SERVICE_ROLE_KEY`
- `DR_BACKUP_PASSPHRASE` (24+ characters; use a high-entropy value)

Do not reuse application passwords or JWT/NextAuth secrets as the backup passphrase.

## Isolated database restore

For a brand-new isolated project:

```bash
export DR_TARGET_DB_URL='...'
export DR_CONFIRM_ISOLATED_TARGET=YES
bash scripts/dr/restore-database.sh dr-artifacts/<BACKUP_ID>/database
```

For the existing restore-test project, whose application schema already matches production and is empty, use data-only mode:

```bash
export DR_TARGET_DB_URL='...'
export DR_CONFIRM_ISOLATED_TARGET=YES
export DR_RESTORE_MODE=data-only
bash scripts/dr/restore-database.sh dr-artifacts/<BACKUP_ID>/database
```

Never set `DR_CONFIRM_ISOLATED_TARGET=YES` for production.

## Isolated Storage restore

The target must be an isolated project. Empty buckets are preferred.

```bash
export DR_TARGET_SUPABASE_URL='...'
export DR_TARGET_SUPABASE_SERVICE_ROLE_KEY='...'
node scripts/dr/restore-storage.mjs dr-artifacts/<BACKUP_ID>/storage
```

The script fails instead of silently merging into non-empty buckets unless `DR_ALLOW_TARGET_OBJECTS=1` is explicitly set.

## Integrity verification

After database restore:

```bash
export DR_SOURCE_DB_URL='...'
export DR_TARGET_DB_URL='...'
export DR_SENTINEL_ORDER_NUMBER='PR-2026-000824'
node scripts/dr/verify-restore.mjs
```

The verifier checks:

- exact critical-table row counts,
- `auth.users` count,
- public application schema fingerprint,
- critical relationships with zero orphans,
- optional synthetic sentinels.

The Block 4 physical-sale order `PR-2026-000824` may be used only as a restore sentinel; the verifier reports counts, not customer PII.

## RTO measurement

Start the recovery timer immediately before the isolated database restore.

Stop it only after all of the following are PASS:

1. database restore command,
2. `verify-restore.mjs`,
3. Storage restore and object checksum verification,
4. a basic application smoke against the recovered dependency set or equivalent restore validation,
5. application rollback/promote exercise.

Record both component durations and total elapsed time. The measured total is the Block 5 RTO evidence.

## Vercel application rollback exercise

Current production is `dpl_29dc5jvoWgvJJYZzfZDAccfUPrPd`.

Known previous READY deployment:
`dpl_drDNXVP3YW9yZcfMmji76rPyommi`.

Vercel documents `vercel rollback <deployment>` for reverting production, but rollback-to-a-specific-deployment is plan-gated on some plans. The current project is Hobby. If the direct rollback command is unavailable, use the supported **promote existing deployment** path to point production at the known READY deployment, verify smoke, then promote the current READY deployment back.

Required exercise:

1. Confirm both deployment IDs are READY.
2. Point production to the previous known-good READY deployment using Vercel's supported rollback/promote control.
3. Smoke `https://www.prerescatepty.com` and essential public/auth routes.
4. Record elapsed rollback time.
5. Promote `dpl_29dc5jvoWgvJJYZzfZDAccfUPrPd` back to production.
6. Repeat smoke and confirm production SHA is again `899fc94...`.
7. Check recent production runtime errors.

Do not rebuild the old SHA merely to call it a rollback if an existing READY deployment can be promoted. The objective is to demonstrate traffic can be returned to a known-good immutable deployment.

## Incident recovery declaration

An incident is recovered only when:

- the selected database restore is queryable,
- critical counts and relationships pass,
- required Storage objects are present and checksum-verified,
- required non-secret configuration is present,
- production application points to a known-good READY deployment,
- smoke tests pass,
- no new P1 recovery defect remains.

## Block 5 closure evidence

DR-01 can be marked CLOSED only after the certification run captures:

- backup ID and UTC timestamps,
- source SHA and production deployment,
- isolated restore target,
- database backup checksums,
- Storage object/bucket counts and checksum PASS,
- restore integrity PASS,
- selected RPO and latest-backup age,
- measured database/Storage/total RTO,
- Vercel rollback/promote elapsed time and smoke PASS,
- all limitations and owners.

Until those runtime steps are executed, this repository work is preparation, not proof of recovery.
