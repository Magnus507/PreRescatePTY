# Route audit — PreRescatePTY — 2026-09-20

Status: COMPLETE for the pre-Block-8 re-certification pass.

## Objective

Re-audit the route concerns originally tracked in GitHub issue #5 without deleting
URLs by intuition and without reopening already-closed QR/NFC, order, payment or
corporate flows.

## Current route decisions

| Route / family | Decision | Reason |
|---|---|---|
| `/dashboard/tienda` | KEEP | Canonical consumer store route exposed by current dashboard navigation. |
| `/dashboard/compras` | REDIRECT -> `/dashboard/tienda` | Historical store URL. It is no longer a canonical page, but compatibility is safer than a 404. |
| `/dashboard/historial` | KEEP / AUXILIARY | Functional rescue-scan history using `/api/chips/scans`. Not a primary nav item, but not dead code. |
| `/dashboard/upgrade` | KEEP / AUXILIARY | Functional package/order checkout surface. Not safe to delete merely because it is absent from the primary nav. |
| `/dashboard/empresas` | KEEP | Consumer-side/company workflow entry exposed by current consumer navigation as “Empresa”. |
| `/dashboard/empresa` | KEEP | Corporate account dashboard; distinct from the consumer/company entry route. |
| `/dashboard/empresa-perfil` | KEEP | Corporate public-profile editor; distinct from the corporate dashboard. |
| `/dashboard/colaboradores`, `/dashboard/solicitudes`, `/dashboard/pedidos-corporativos` | KEEP | Current corporate navigation and order/member workflows. |
| `/admin/inventario/lotes` | REDIRECT -> `/admin?tab=inventory` | Historical standalone inventory location; current admin architecture centralizes inventory in the admin shell. |
| `/admin` and `/admin?tab=...` | KEEP | Canonical admin shell. |
| `/e/[shortCode]` | KEEP / CRITICAL | Personal emergency public profile used by QR/NFC rescue flow. |
| `/empresa/[shortCode]` | KEEP | Corporate public profile. It represents a different entity and data model from `/e/[shortCode]`. |
| `/activar` and `/activar/[internalLabel]` | KEEP | Activation compatibility and physical-device workflow. |
| Public marketing/legal/auth routes | KEEP | Current navigation, onboarding, support and legal/compliance surfaces. |

## Findings

1. The two historical URLs named in issue #5 that are no longer represented by
   canonical pages are `/dashboard/compras` and `/admin/inventario/lotes`.
   They now preserve compatibility through redirects rather than returning 404.
2. `/dashboard/historial` is not orphaned functionality: it reads rescue scan
   history and remains a useful auxiliary surface.
3. `/dashboard/upgrade` still contains a live package/order/payment flow and is
   therefore not safe to remove during release freeze.
4. The three company routes are not duplicates:
   - `/dashboard/empresas`: consumer/company workflow entry;
   - `/dashboard/empresa`: corporate account dashboard;
   - `/dashboard/empresa-perfil`: corporate public-profile management.
5. `/e/[shortCode]` and `/empresa/[shortCode]` intentionally resolve different
   public entity types and must not be merged.
6. No QR/NFC public route was renamed or deleted.

## Release decision

No destructive route cleanup is required before the next Block 8 certification.
Compatibility redirects are preferable to deleting working auxiliary routes.

Reopen this audit only if traffic/evidence identifies a real duplicate or broken
route, not merely because a page is absent from primary navigation.
