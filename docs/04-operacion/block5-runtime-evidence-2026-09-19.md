# Block 5 recovery runtime evidence — 2026-09-19

Purpose: preserve the objective runtime evidence already obtained for Block 5 without reopening Blocks 1–4.

## Backup and isolated restore

- Source master at certification: `10b4756fbe7d4c55581d5e8ab6a53d5eaf9dd4a6`.
- Backup workflow run: `35463384494` — SUCCESS.
- Backup ID: `20260919T190810Z-run-35463384494-1`.
- Restore certification run: `35463553303` — SUCCESS.
- Isolated target: `PreRescatePTY-Restore-Test-2026-08-31`.
- Measured recovery-point age: 210 s.
- Measured data-plane recovery RTO: 57 s.
- Integrity verification: PASS.
- Dump verification: 96 summarized tables, 400 copied rows.
- Critical relationships: zero orphans.
- Sentinel order `PR-2026-000824`: PASS.
- Storage restore: 3 buckets, 97 objects, 12,215,253 bytes.
- Storage checksum verification: PASS.

## Vercel rollback exercise

The immutable previous READY deployment `dpl_29dc5jvoWgvJJYZzfZDAccfUPrPd` (SHA `899fc94b652e3a24e79eaf30ad35e98b0046db1d`) was successfully put back in production and smoke-tested.

The Block 5 implementation deployment `dpl_Fuw5nJJ9NLcnc4aTgUfYbAppokEz` (SHA `10b4756fbe7d4c55581d5e8ab6a53d5eaf9dd4a6`) is READY.

This documentation-only PR is intentionally used as the safe Git-based roll-forward back to current `master` after the rollback exercise. Block 5 remains OPEN until the post-merge production deployment is READY, the public domain serves that new deployment, final smoke passes, and recent runtime errors are checked.

No production database or Storage data is modified by this file.
