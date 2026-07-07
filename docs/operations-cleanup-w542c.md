# W5.42C Operations Cleanup

This note records the cleanup pass for internal production to stock availability and the UI simplification of Operations sections.

## Scope

- Internal production QA now routes to stock when the source is internal.
- Customer production still reserves finished goods.
- Operations center, inventory, and dispatch copy were simplified.
- Modal overlays were normalized to viewport-fixed patterns.

## Validation

- `npx tsx scripts/audit-operations-cleanup-w542c.ts`
- `npx tsx scripts/repair-internal-production-stock-w542c.ts`

## Safety

- Repair is dry-run by default.
- Real repair requires `CONFIRM_REPAIR_INTERNAL_STOCK_W542C=YES_REPAIR_INTERNAL_STOCK_W542C`.
