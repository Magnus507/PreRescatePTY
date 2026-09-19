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

The dump follows Supabase's documented migration/restore path. A non-PII `dump-summary.json` is derived from the exact COPY sections and contains row counts plus a schema fingerprint for restore verification. The source connection string is supplied only through `DR_SOURCE_DB_URL`; it is never committed or printed.

### Storage

Database backups contain Storage metadata, **not the object bytes**. Therefore:

- `scripts/dr/export-storage.mjs` downloads every object in every bucket, preserves bucket configuration, and records SHA-256 per object.
- `scripts/dr/verify-storage-snapshot.mjs` re-reads the source after the database dump and fails the backup if any object was added, removed or changed across the backup window.
- `scripts/dr/restore-storage.mjs` restores the objects into an isolated project and downloads each restored object again to verify its SHA-256.

Production baseline at Block 5 entry:

- `general`: 2 objects.
- `payment-proofs`: 95 objects.
- `profile-photos`: currently no live object rows.
- Total Storage rows: 97.

Object bytes are sensitive. Never commit `dr-artifacts/`.

### Off-site encrypted copies

`.github/workflows/dr-backup.yml` is the production backup mechanism after its required repository secrets are configured.

Schedule: **every 6 hours at minute 17 UTC**, plus a weekly long-retention recovery point on Sunday 04:43 UTC.

The workflow also runs once when this backup workflow is first merged to `master`; its `push` trigger is path-limited to the workflow file, so normal application releases do not create extra backups.

Only an AES-256-CBC + PBKDF2 encrypted archive, its SHA-256 checksum and a passphrase-keyed HMAC are uploaded as a GitHub Actions artifact. The HMAC is verified before decryption so corruption or ciphertext tampering fails closed. Plaintext database and Storage exports are deleted from the runner before upload. Recent recovery points are retained 5 days; the weekly tier is retained 30 days.

Selected recovery-point objective (RPO): **6 hours nominal maximum between scheduled backups**, plus any observable scheduler delay. Certification records a conservative recovery-point timestamp from the earliest start of the coherent database/Storage snapshot and measures its age when restore begins; that value is the runtime RPO evidence for the run.

Required GitHub Actions secrets (only sensitive values are stored as secrets; project URLs are fixed non-secret configuration):

- `DR_SOURCE_DB_URL`
- `DR_SOURCE_SUPABASE_SERVICE_ROLE_KEY`
- `DR_TARGET_DB_URL`
- `DR_TARGET_SUPABASE_SERVICE_ROLE_KEY`
- `DR_BACKUP_PASSPHRASE` (32+ characters; use a high-entropy value)

Do not reuse application passwords or JWT/NextAuth secrets as the backup passphrase.

## Automatic isolated certification

`.github/workflows/dr-restore-certification.yml` listens for the successful **first post-merge backup run only**: the triggering backup must itself have been caused by the `master` push. Scheduled backups do not automatically restore over the test environment.

The workflow is hard-guarded to the dedicated restore-test project reference and refuses either production project reference. It:

1. downloads the encrypted backup from the triggering run,
2. verifies the encrypted artifact checksum,
3. decrypts only on the ephemeral runner,
4. restores database data into the pre-provisioned isolated schema,
5. restores Storage bytes and verifies every object SHA-256,
6. compares restored table counts against the exact `data.sql` COPY sections and validates the backup-time schema fingerprint,
7. verifies critical relations have zero orphans,
8. confirms the Block 4 order sentinel `PR-2026-000824`,
9. records measured isolated recovery RTO,
10. uploads only non-PII restore evidence, then deletes decrypted backup material.

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

The restore script contains a hard stop for the current production project reference in addition to the explicit confirmation flag.

## Isolated Storage restore

The target must be an isolated project.

```bash
export DR_TARGET_SUPABASE_URL='...'
export DR_TARGET_SUPABASE_SERVICE_ROLE_KEY='...'
node scripts/dr/restore-storage.mjs dr-artifacts/<BACKUP_ID>/storage
```

When database metadata has already restored `storage.objects`, the certification workflow explicitly enables overwrite in the isolated target so the real object bytes can be written and checksum-verified. The Storage script also hard-stops if the target URL is production.

## Integrity verification

After database restore:

```bash
export DR_TARGET_DB_URL='...'
export DR_SENTINEL_ORDER_NUMBER='PR-2026-000824'
node scripts/dr/verify-restore.mjs dr-artifacts/<BACKUP_ID>/database/dump-summary.json
```

The verifier checks:

- row counts derived from the exact SQL dump, including `auth.users` and Storage metadata,
- backup-time schema fingerprint across `public`, `auth` and `storage`,
- critical relationships with zero orphans,
- optional synthetic sentinels.

The Block 4 physical-sale order `PR-2026-000824` is used only as a restore sentinel; the verifier reports counts, not customer PII.

## RTO measurement

The isolated recovery timer starts immediately before database restore and stops only after:

1. database restore is complete,
2. Storage bytes are restored and checksum-verified,
3. critical database integrity and sentinel checks are PASS.

That elapsed time is the measured **data-plane RTO** for the Block 5 recovery test. Application rollback is a separate control with its own elapsed time and smoke evidence; do not hide rollback delay inside the database RTO.

## Vercel application rollback exercise

Current production is `dpl_29dc5jvoWgvJJYZzfZDAccfUPrPd`.

Known previous READY deployment:
`dpl_drDNXVP3YW9yZcfMmji76rPyommi`.

Vercel documents `vercel rollback <deployment>` for reverting production, but rollback-to-a-specific-deployment is plan-gated on some plans. The current project is Hobby. If the direct rollback command is unavailable, use the supported **promote existing deployment** path to point production at the known READY deployment, verify smoke, then promote the current READY deployment back.

Required exercise:

1. Confirm both deployment IDs are READY.
2. Point production to the previous known-good READY deployment using Vercel's supported rollback/promote control.
3. Smoke `https://www.prerescatepty.com` and essential public/auth routes.
4. Record elapsed rollback/promote time.
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
- measured database/Storage data-plane RTO,
- Vercel rollback/promote elapsed time and smoke PASS,
- all limitations and owners.

Until those runtime steps are executed, this repository work is preparation, not proof of recovery.
