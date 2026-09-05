# Environment variables — launch contract

This file is the human-readable companion to `lib/env.ts`. Variable names are documented here; secret values must never be committed, pasted into issues, logs, screenshots, or pull requests.

## Scope model

- **Build:** values that may be read while Next.js/Prisma is built. Public variables prefixed with `NEXT_PUBLIC_` can be embedded in browser assets and must never contain secrets.
- **Runtime:** server/application values available to deployed functions. Production startup validates the required core before serving traffic.
- **Script:** maintenance, seed, repair and smoke scripts. These values are not automatically required by the web runtime.
- **Test:** isolated test/integration database settings.
- **Platform:** supplied by Next.js/Vercel rather than manually copied from `.env.example`.

## Production-required core

| Variable | Scope | Sensitive | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | runtime/script/test | yes | Prisma application database connection. |
| `NEXTAUTH_URL` | runtime | no | Canonical authentication origin. |
| `NEXTAUTH_SECRET` | runtime | yes | NextAuth signing/encryption secret. |
| `ENCRYPTION_KEY` | runtime | yes | Application encryption key for sensitive values. |
| `NEXT_PUBLIC_SITE_URL` | build/runtime | no | Canonical public site URL used in links/notifications. |
| `NEXT_PUBLIC_SUPABASE_URL` | build/runtime | no | Supabase project URL used by server storage helpers. |
| `SUPABASE_SERVICE_ROLE_KEY` | runtime | yes | Server-only Supabase service role credential. Never expose to browser code. |
| `CRON_SECRET` | runtime | yes | Authentication secret for scheduled endpoints. |
| `UPSTASH_REDIS_REST_URL` | runtime | no | Distributed rate-limit backend; required so serverless instances share counters. |
| `UPSTASH_REDIS_REST_TOKEN` | runtime | yes | Server-only credential for the distributed rate-limit backend. |

Production startup fails closed when this core is missing or malformed. Staging uses the same strict validator so configuration drift is detected before promotion.

## Build/public optional

| Variable | Scope | Sensitive | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | build/runtime | no | Optional public application origin used by legacy/current UI helpers. |
| `NEXT_PUBLIC_SENTRY_DSN` | build/runtime | no | Optional Sentry DSN. It is public by design, but telemetry remains minimized by policy. |
| `NEXT_PUBLIC_VERCEL_ENV` | build/platform | no | Optional/public deployment-environment hint supplied by platform/build configuration. |
| `DIRECT_URL` | build/script | yes | Direct database connection for Prisma/migration tooling; not an application-runtime dependency. |

## Optional integrations

Optional does not mean partially configured. In production, once an integration has configuration present, its required companion variables must also be present.

| Integration | Variables |
| --- | --- |
| Resend | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| Twilio SMS/WhatsApp | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `TWILIO_WHATSAPP_NUMBER`, `TWILIO_WHATSAPP_FROM` |
| Yappy | `YAPPY_ENVIRONMENT`, `YAPPY_MERCHANT_ID`, `YAPPY_SECRET_KEY`, `YAPPY_DOMAIN` |

For Twilio, account SID + auth token are required if any Twilio sender is configured; at least one SMS or WhatsApp sender must be present. For Yappy, `YAPPY_ENVIRONMENT` alone does not enable payments; merchant ID, secret key and domain must be complete before the integration is considered configured.

## Script-only and test-only

| Variable | Scope | Sensitive | Purpose |
| --- | --- | --- | --- |
| `APP_URL` | script | no | Base URL for maintenance/audit scripts that call the application. |
| `SUPABASE_URL` | script | no | Supabase URL alias used by maintenance/audit scripts. |
| `DATABASE_URL_TEST` | test | yes | Dedicated integration-test database connection. Never point this at production. |

### Seed credentials

These variables exist only for explicit seed/development commands and are intentionally **not** included in `.env.example`. Do not persist seed passwords in Vercel or production shell profiles.

- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `SEED_CLIENT_PASSWORD`
- `SEED_CORPORATE_PASSWORD`
- `SEED_SUPERADMIN_PASSWORD`

### One-shot smoke, repair and backfill guards

The following variables are confirmation switches consumed by individual scripts. They are intentionally **not** part of `.env.example`: set them only for the exact command invocation after reviewing that script. A value used by one script must not be assumed valid for another.

- `APPLY_W605G_H5`
- `CONFIRM_AFTER_SALES_SMOKE`
- `CONFIRM_CLEAN_OPERATIONS_SMOKE`
- `CONFIRM_COMMERCIAL_DISPATCH_SMOKE`
- `CONFIRM_E2E_ACTIVATION_W542B`
- `CONFIRM_E2E_OPERATIONS_W542A`
- `CONFIRM_FULL_ERP_SMOKE`
- `CONFIRM_OPERATIONS_SMOKE`
- `CONFIRM_REPAIR_INTERNAL_STOCK_W542C`
- `CONFIRM_REPAIR_ORDER_PAYMENT_PROOF`
- `CONFIRM_SEED_BASE_FINISHED_GOODS`
- `CONFIRM_SEED_BASE_MATERIALS`
- `CONFIRM_STRUCTURAL_SEED`
- `CONFIRM_W539L_SMOKE`
- `DRY_RUN`
- `W537V_SMOKE_CLEANUP`
- `W537V_SMOKE_CONFIRM`
- `W603C_MAPPING_BACKFILL_DRY_RUN`
- `W603C_MAPPING_BACKFILL_TOKEN` — sensitive one-shot backfill token; never persist or log it.

## Platform-managed

`NODE_ENV`, `NEXT_RUNTIME`, `VERCEL`, `VERCEL_ENV` and `VERCEL_URL` are runtime/build context supplied by Node/Next.js/Vercel. They are part of the typed contract so code scanning recognizes them, but they are intentionally omitted from `.env.example`.

## Validation commands

- `npm run env:check` — scans code/Prisma for environment-variable consumers and fails when a consumed variable is absent from the typed contract, `.env.example` is out of sync, or this document omits a contract key.
- `npm run env:verify:production` — validates the strict production runtime contract without printing values.
- `npm run env:verify:staging` — validates staging against the same required core as production.
- `npm run env:verify:test` — verifies that the isolated test database variable exists.

CI runs the contract check plus the strict production schema using non-secret CI placeholders. This verifies shape/completeness without requiring real production credentials.

## Staging checklist

- [ ] Environment names match `lib/env.ts`; no undocumented aliases.
- [ ] Run `npm run env:check` and `npm run env:verify:staging` successfully.
- [ ] `DATABASE_URL`/`DIRECT_URL` target only the intended non-production database when exercising migrations or destructive scripts.
- [ ] `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` resolve to the staging/preview origin.
- [ ] Yappy remains UAT unless the release gate explicitly authorizes production credentials.
- [ ] Optional integrations are either complete or absent; never leave half-configured credentials.
- [ ] Seed credentials and one-shot confirmation flags are absent from persistent deployment environments.
- [ ] Smoke-test `/`, authentication, storage, notification provider paths in scope and cron authorization.

## Production checklist

- [ ] Compare deployed variable **names** with this contract; never copy values into GitHub evidence.
- [ ] Run `npm run env:verify:production` in a trusted environment or equivalent pre-deploy validation.
- [ ] Confirm `NEXTAUTH_URL`, `NEXT_PUBLIC_SITE_URL` and `YAPPY_DOMAIN` use the approved production origin where applicable.
- [ ] Confirm `DATABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` belong to the production project and are server-only.
- [ ] Confirm `ENCRYPTION_KEY`, `NEXTAUTH_SECRET` and `CRON_SECRET` are present and stored only in the deployment secret store.
- [ ] Confirm optional provider groups in launch scope are complete; providers outside launch scope are explicitly absent/disabled.
- [ ] Confirm all seed credentials and one-shot script guards listed above are absent from Vercel production variables.
- [ ] After deployment, require HTTP 200 smoke tests and no environment-validation error before promotion is accepted.

## Rotation rule

`BOOTSTRAP_ADMIN_USER_ID` is an optional, one-shot script parameter for
`scripts/bootstrap-existing-admin.ts`. It identifies an existing active user
explicitly approved by the owner for initial administration. It is not a secret,
not a public variable, and must not be persisted in Vercel environments. The
script defaults to a dry run; `--apply` is required for the role change. It refuses
to run if an active administrator already exists and never resets user data.

Changing `ENCRYPTION_KEY` is a data migration/rotation operation, not a routine environment edit. Rotate authentication, cron, provider and service credentials through their owning provider and deployment secret store, record the date/owner, and never commit old or new values.
