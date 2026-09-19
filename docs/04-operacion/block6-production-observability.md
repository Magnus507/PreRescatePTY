# Block 6 — Production, observability, deployments and capacity

Status: CLOSED - runtime, deployment, observability, capacity and release-workflow gates accepted on 2026-09-19.

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

## Final closure evidence

- Block 6 implementation PR: #83.
- CI run #672: SUCCESS.
- Browser E2E run #56: SUCCESS.
- Final implementation SHA before closure documentation:
  `7812e4aa4895586d57065b9dba7c8b870650f98c`.
- Production deployment:
  `dpl_58CrzBeH3GPWPPbZH42pJNXTyB4k` - READY.
- Public domain `www.prerescatepty.com` served the exact deployment above.
- Smoke PASS on landing, login, checkout/public pages and auth session.
- Runtime error clusters: 0 in the audited seven-day window.
- Post-deploy worker evidence at 2026-09-19T20:30Z:
  `customerProductionRecovery.scanned=1`,
  `skipped=1`, `failed=0`, with no failure payload.
- Supabase primary recovery scheduler remained active at `*/5`; the observed
  24-hour audit window contained 288 succeeded executions.
- Previous READY production deployment remains available as rollback candidate.

## Accepted capacity decision

Human evidence from the Vercel Billing screen confirmed the team is currently on
the Hobby plan. The operator explicitly accepts Hobby for development and
pre-launch only and will not upgrade before official commercial launch.

This is accepted for Block 6 because the Map Master explicitly permits the
decision to remain on Hobby when current gates fit objectively. Current release
churn is controlled, runtime is clean, and current Supabase usage is small
relative to its Free-plan quotas.

This acceptance does **not** authorize commercial operation on Hobby. Before the
final GO Commercial decision, Block 8 must re-check the hosting plan and require
a plan eligible for the intended commercial use (or a documented equivalent
hosting decision) before declaring GO.

Current pre-launch minimum core infrastructure budget:
- Vercel Hobby: USD 0/month.
- Supabase Free: USD 0/month.
- Core hosting/database base total: USD 0/month before domain, email, messaging,
  payment-provider fees or other third-party services.

Commercial-launch hosting cost is intentionally deferred until the launch
decision and must be budgeted at the then-current provider price.

## Gate matrix

| Gate | Result |
| --- | --- |
| Exact production SHA + READY + smoke | PASS |
| 0 unexplained repetitive runtime P1 | PASS |
| Domain / HTTPS / redirect / security headers | PASS |
| Preview churn policy applied | PASS |
| Error and critical-operation observability | PASS |
| Payment / fulfillment / worker traceability | PASS |
| Build fail-fast + typecheck + strict allow-scripts | PASS |
| Capacity state and current quotas accepted | PASS |
| Rollback candidate available | PASS |
| Vercel plan decision documented | PASS - Hobby accepted pre-launch only |

## Residual state

- P0: 0.
- P1: 0.
- P2/P3 material to Block 6: none blocking closure.
- Launch condition: revalidate Vercel plan immediately before GO Commercial.
- Known non-blocking 404 noise: missing PWA icon requests and external
  `/llms.txt` probes; neither is a Block 6 P1.

## Protected / do not reopen without new objective evidence

Do not reopen Block 6 findings solely because:
- an old pre-Block-6 deployment had different runtime traffic;
- GitHub scheduled Actions are not exactly five-minute periodic (Supabase
  `pg_cron` is the primary scheduler);
- the pre-launch account remains on Hobby by explicit operator decision.

Reopen only on new evidence such as production SHA drift, repeated P1 runtime
errors, scheduler degradation, uncontrolled deployment churn, capacity
exhaustion, domain/TLS failure, or a launch attempt without an accepted
commercial hosting plan.

## Handoff to Block 7

Block 6 is CLOSED. Do not start Block 8. The next block is Block 7:
commercial operation, legal/privacy policies and support.

First Block 7 action: revalidate current master/production SHA and then inventory
the actual published policies, retention rules, returns/refunds/shipping support
processes and launch scope against what the product currently implements.
