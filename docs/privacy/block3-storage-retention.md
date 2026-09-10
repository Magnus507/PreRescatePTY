# Block 3 — Storage privacy and retention policy

Status: launch privacy control for Block 3. This document classifies the three Supabase Storage namespaces used by PreRescatePTY and defines how SafeDelete must treat them.

## Classification rules

### `profile-photos` — `DELETE_ON_ERASURE`

Paths are user-scoped (`<userId>/...`). Profile photos are personal assets, not accounting evidence. SafeDelete must enumerate the authenticated user's namespace and delete the objects through the Storage API. If the database reference has already disappeared, an orphan object under a former user namespace is still erasable and must be queued in `StorageCleanupOutbox` rather than left public.

### `general` user-scoped uploads — `DELETE_ON_ERASURE`

Current uploads use `<userId>/...`. Objects under a live user's namespace remain active assets. Objects whose namespace belongs to an erased/removed user and which have no live application reference are treated as legacy personal orphans and are deleted through the durable Storage cleanup worker. Non-user assets must use a namespace that cannot be confused with a user id.

### `payment-proofs` — `RETAIN_LEGAL`

Payment proofs use `payments/<userId>/<orderId>/...` and the bucket is private. They may substantiate commercial/accounting/tax transactions, so account erasure removes the direct application reference and identity linkage but must not blindly destroy evidence while a valid legal retention duty or hold is still active.

For new payment evidence, the application must preserve enough non-public retention metadata to determine a concrete `retentionUntil` from the applicable transaction/tax/commercial obligation. At expiry, and provided no valid legal hold remains, the object is deleted through the same durable Storage cleanup mechanism.

For the pre-policy legacy set whose relational order/user linkage was already lost, use a conservative temporary legal hold rather than guessing an early deletion date. The operational ceiling is **15 years from Storage `created_at`**, with an earlier review/deletion whenever the applicable obligation can be reconstructed and is already prescribed. This 15-year ceiling is a conservative legacy fallback, **not a statement that every payment proof has a statutory 15-year minimum**.

## Legal basis used for the retention design

- Panama Code of Commerce, Article 93: merchants must conserve payment-supporting documents and accounting books while operating and for five years after closing; documents for a particular transaction may be destroyed once actions arising from it are prescribed. Official source: https://www.organojudicial.gob.pa/uploads/wp_repo/uploads/2016/11/C%C3%B3digo-de-Comercio.pdf
- DGI requires taxpayers to keep accounting books/records and supporting documentation in an orderly way and make supporting records available for audit. Official source: https://dgi.mef.gob.pa/DOC/DOC
- DGI also states companies must keep copies of fiscal invoice receipts. Official source: https://dgi.mef.gob.pa/Preguntas/Facturacion
- Panama Law 81 of 2019 requires purpose limitation, proportionality and that personal data not be retained longer than necessary for the processing purpose. Official Gaceta: https://www.gacetaoficial.gob.pa/storage/gacetas/2019/03/28743_A/GacetaNo_28743a_20190329.pdf
- Decree 285 of 2021 requires communicating the expected retention period or the criteria used to determine it and recognizes legal-obligation exceptions to cancellation. Official Gaceta: https://www.gacetaoficial.gob.pa/storage/gacetas/2021/05/29296_A/85281.pdf

The applicable tax/commercial prescription can vary by obligation and can be interrupted. Therefore the product must not encode a blanket statutory minimum that the cited sources do not establish.

## Block 3 operational allowlist

A residual scan may allow only:

1. issued-invoice fields explicitly retained as the minimum legal/commercial record by `SafeDeleteService`; and
2. private `payment-proofs` objects still inside the `RETAIN_LEGAL` period above.

Public orphan profile/general user assets are never allowlisted. `UNKNOWN` is not an acceptable final classification: any object that cannot be classified blocks privacy closure until its provenance is established.
