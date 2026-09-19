# Block 6 — Production, observability, deployments and capacity

Status: OPEN while runtime gates and the commercial Vercel plan gate are being closed.

## Live baseline — 2026-09-19

- Master at Block 6 entry: `cf6b864c0741af7452d1abf8b2e4d40c48bbf167`.
- Production deployment at entry: `dpl_A7MrsbHRucLqhu43kDe1WTNcNWxR`, READY.
- Public production domain served that deployment after the Block 5 roll-forward.
- Vercel grouped runtime errors: no clusters in the last 7 days at the audit cut.
- Recent production 404s were limited to five requests for the missing PWA icon, one deliberate Block 5 probe, and one `/llms.txt` request. None is classified as P1.
- Supabase production organization plan reported by the platform API: Free.
- Production database size at the audit cut: about 44 MB.
- Storage object bytes at the audit cut: 12,215,253 bytes across 97 objects.
- Auth users at the audit cut: 1.

## Worker observability

The primary recovery scheduler remains Supabase `pg_cron` job
`prerescate-worker-recovery`, active at `*/5 * * * *`. The last 24-hour
window contained 288 succeeded scheduler executions and no failed status in the
queried window.

GitHub Actions `Production workers` remains a backup observer/processor, not a
five-minute SLA source. Although its YAML schedule is `*/5`, observed scheduled
run gaps over the sampled history were roughly 113–337 minutes. Block 6 must not
represent GitHub scheduled Actions as a five-minute monitor.

The commerce worker heartbeat exposed one recurring false operational failure:
a historical produced unit belonged to a cancelled source/commercial order. The
reservation reconciler correctly treats that state as an intentional no-op, but
the outer recovery wrapper converted the no-op into
`HISTORICAL_CUSTOMER_UNIT_NOT_RESERVED` on every cycle. Block 6 changes that
expected terminal no-op to `skipped`; genuine reservation failures still remain
failures.

## Vercel deployment policy

Automatic branch deployments are intentionally constrained:

- `master`: automatic production deployment enabled.
- `preview-*`: explicit opt-in preview deployment enabled.
- every other branch: automatic Vercel deployment disabled.

GitHub CI and Browser E2E remain the mandatory PR gates. A Vercel preview is
created only when an operator intentionally uses a `preview-*` branch. This
prevents audit/fix micro-commits from recreating the deployment churn that
previously exhausted Hobby deployment capacity.

## Build/install fail-fast

The production build remains `npm run build`, which executes Prisma generation,
TypeScript `tsc --noEmit`, then `next build`. `.npmrc` keeps
`strict-allow-scripts=true`, while `package.json` explicitly denies dependency
install scripts that are not required. CI must prove this remains buildable
before merge.

## Capacity and plan guardrails

Current Supabase usage is far below the Free-plan database and Storage quotas at
the audit cut. The Block 5 logical encrypted backup/restore mechanism remains the
recoverability control while automatic Supabase backups are unavailable on Free.

For a commercial launch, Vercel Hobby cannot be accepted if the team is still on
Hobby: Vercel's current Terms restrict Hobby to personal/non-commercial use.
The account plan is not exposed by the connected Vercel project API, so the
operator must confirm the dashboard plan. If it is Hobby, upgrade to Pro (or move
production to another commercial-eligible hosting plan) before Block 6 can close.

Minimum core monthly budget if Vercel Pro + current Supabase Free are retained:
USD 20/month for Vercel before tax/overages. If Supabase is also upgraded to Pro,
the base core budget becomes USD 45/month before tax/overages.

## Exit gates still to prove

1. PR CI and Browser E2E green for the Block 6 changes.
2. Production deployment of the merged SHA READY and public-domain smoke PASS.
3. No new runtime P1 after deployment.
4. Worker heartbeat after deployment reports the cancelled historical unit as
   skipped rather than failed.
5. Rollback candidate remains available.
6. Operator confirms Vercel commercial-eligible plan state.

Do not start Block 7 until all Block 6 exit gates are closed and the Block 6
closure dossier is emitted.
