# Block 7 — Commercial operations, compliance, support and product scope

Status: OPEN until the remaining human/compliance launch gates below are resolved.

## 1. Live baseline

- Entry master/production SHA: `5b5a4a4a703c203f8200685119658735e6e9a9e8`.
- Entry Vercel production deployment: `dpl_2RNC5Zyar6WCYUhWKRUTZ43G9Xfq`, READY.
- Production runtime errors at entry: none in the audited 24-hour window.
- Blocks 1–6 remain protected and are not reopened by this document.

## 2. Product scope for launch

### Personal / family

In scope for self-service launch:
- public catalogue;
- account creation;
- personal package checkout;
- manual bank-transfer/Yappy payment paths when enabled;
- admin payment review;
- production / inventory / dispatch;
- delivery;
- physical activation;
- public rescue profile;
- account support, SafeDelete and post-sale operations.

### Organizations / Corporate

Public corporate pages are **information / sales-enquiry only** for launch. The public
catalogue may describe organization packages, but the CTA routes to Contact and does
not create a self-service corporate checkout.

Corporate onboarding, member import and organization-specific privacy arrangements
must be coordinated manually before an organization is activated. Block 8 must not
represent the corporate module as an unattended self-service purchase flow.

## 3. Support channel

Primary public intake:
- `/contacto` → `POST /api/contacts/public` → `SupportMessage`.
- The public form requires name, email, **WhatsApp phone** and message.
- Panama 8-digit mobile numbers are normalized to country code `507`; international
  numbers are accepted when they contain 10–15 digits.

Operational behavior:
- rate limited;
- validates field shape and length;
- persists the message in the application database;
- stores no request IP/user-agent as part of the support message;
- never depends on email delivery to accept a normal support case;
- returns success only after database persistence succeeds.

Admin module:
- `/admin?tab=support`;
- accessible only to general admin roles (`admin`, `superadmin`);
- lists unread/open/resolved counters;
- supports search by name, email, WhatsApp or message;
- marks messages read/unread;
- marks cases resolved/reopened;
- admin state changes are audit logged;
- “Responder por WhatsApp” opens a prefilled `wa.me` conversation with the customer.

Resend remains available for transactional application email such as password recovery,
but it is **not** the system of record for public support intake.

Support targets:
- ordinary request: first human response target within 1 business day;
- payment / delivery / return / warranty: acknowledge within 2 business days;
- suspected account or identifier compromise: treat as urgent and begin triage as
  soon as the operator sees the case.

Retention:
- unresolved cases remain available while active;
- resolved messages are automatically purged after 730 days (24-month operational
  target) by the maintenance worker.

Owner while pre-launch: PreRescatePTY operator.

## 4. Incident escalation

### Compromised account

1. Verify the reporter through the authenticated account or an identity check.
2. Reset password and terminate/invalidate sessions using the existing auth controls.
3. Review recent account/profile/chip changes.
4. If exposure is suspected, preserve only the minimum audit evidence and classify
   the privacy/security incident for response.
5. If the user requests erasure, use the protected SafeDelete flow.

### Lost / compromised identifier

1. Verify ownership.
2. Deactivate/revoke the old identifier before linking a replacement.
3. Confirm the old QR/NFC no longer exposes the profile.
4. Record replacement/return/warranty events in Postventa as applicable.
5. Activate the replacement only after physical ownership is established.

### Payment / order incident

1. Use Order + PaymentAttempt/PaymentEvent + operations history as the source of truth.
2. Do not mark an order paid solely from a customer screenshot without the configured
   provider/admin verification path.
3. If payment is disputed, freeze fulfillment decisions until the case is resolved.
4. Preserve legally required evidence privately; do not copy sensitive evidence into
   support notes or logs.

## 5. Retention matrix

| Category | Retention / criterion | Operational enforcement |
| --- | --- | --- |
| Account/profile/medical/contact data | While account active; erase/anonymize on SafeDelete | SafeDelete |
| Profile photos + user-scoped general uploads | Until replaced/deleted/account erasure | Durable Storage cleanup; 24h operational target |
| Scan telemetry (IP/UA/geo) | Max 365 days | Maintenance worker deletes old ScanEvent rows |
| Chip/Profile last-scan location | Max 365 days | Maintenance worker clears denormalized fields |
| Orders/dispatch/post-sale PII | While needed for transaction/post-sale/legal record; minimize on erasure | SafeDelete pseudonymization/minimization |
| Payment proofs | Private RETAIN_LEGAL until applicable duty/hold expires | Block 3 retention classification + manual/legal review |
| Issued fiscal/commercial records | Minimum legally required record only | SafeDelete retains only permitted minimum |
| Support correspondence | Active case + up to 730 days after resolution unless dispute/legal need | SupportMessage + maintenance purge |
| Cookie preference | Until browser storage is cleared, choice changes or consent schema changes | Browser local storage |

No category is assigned “forever” merely because deletion automation is inconvenient.

## 6. Consent

Current public legal consent version:
`registration-terms-privacy-2026-09-19-v1.2`.

Rules:
- registration requires acceptance of Terms + Privacy and stores the exact text version;
- an existing account without the current version is required to accept it before
  creating a new personal purchase;
- evidence is minimized: version, time, account/user context and legal-document paths;
- IP/user-agent are not retained as consent fingerprints;
- withdrawal that requires ending the health-data service is handled by SafeDelete /
  support, while legally required commercial records remain minimized and private.

## 7. Customer purchase / logistics

Product checkout currently records:
- selected package;
- recipient;
- phone;
- address/city;
- optional delivery notes;
- payment method.

The order total shown by the application is the **product total**. No shipping fee is
silently inserted. If delivery has an additional carrier charge, support must disclose
it and obtain acceptance before dispatch.

Cancellation:
- customer may cancel while the order is still eligible before dispatch/carrier handoff.

Return:
- change-of-mind commercial policy: request within 7 calendar days after delivery,
  product unused/unactivated and suitable for resale;
- support opens the case before the customer ships anything;
- change-of-mind return transport is customer-paid unless mandatory consumer law says
  otherwise;
- provider-attributable defect/wrong item/covered shipping damage follows warranty or
  applicable consumer remedy.

Refund:
- after approved inspection, operational target is initiation within 7 business days;
- payment provider/bank settlement time is outside the application.

## 8. Warranty / replacement

Commercial warranty: 1 year from delivery for manufacturing defects, without limiting
mandatory consumer rights.

Targets:
- acknowledge claim within 2 business days;
- communicate next step / additional evidence need within 5 business days;
- physical transport time is additional where inspection requires the item.

Replacement safety rule: old identifier is revoked/deactivated before the replacement
becomes the active public identifier for the profile.

The admin Operations Center includes Postventa surfaces for warranty, return and
replacement records, which are the internal system of record for these cases.

## 9. Public policy-code alignment

Published legal pages in this block must describe actual behavior:
- Privacy covers health, location/scans, contacts, files, orders, payments, shipping,
  support and post-sale data.
- Cookie policy treats Vercel Analytics/Speed Insights as optional analytics and
  Sentry as necessary technical/security diagnostics, matching runtime.
- Terms state manual rescue contact, lifetime digital service, one-time personal
  purchase, corporate enquiry scope, shipping/refund/warranty links and fiscal-document
  limitation.
- Account deletion points to the real protected SafeDelete flow.
- Shipping does not claim that a carrier fee is already calculated by checkout.
- Internal application receipts are not represented as DGI fiscal invoices.

## 10. Fiscal / tax gate — Panama

The application currently creates an internal Invoice record with status
`pending_configuration`; its `REC-...` number is an operational receipt identifier,
not evidence of DGI fiscal authorization.

Before GO Commercial, the operator must resolve and document with an accountant or
other qualified Panama professional, as appropriate:
1. the legal/tax identity that will sell the product;
2. RUC/NIT and activity registration if required;
3. whether DGI electronic invoice or another authorized fiscal system will be used;
4. applicable ITBMS/tax treatment and how price/tax values are represented;
5. retention requirements for issued fiscal documents and payment evidence.

Until that decision is complete, the internal invoice object must remain clearly
distinguished from a fiscal invoice.

Owner: PreRescatePTY operator.
Launch severity: **P1 compliance gate**. Block 7 cannot be declared CLOSED while this
gate lacks a documented decision.

## 11. Professional legal/privacy review

The public policy set is aligned to current software behavior and the Block 3 privacy
controls. Before final GO, obtain professional review where appropriate for:
- Panama consumer/warranty wording;
- sensitive health-data consent/notice;
- corporate/employee data arrangements if Corporate is activated;
- tax/fiscal implementation.

Owner: PreRescatePTY operator.
This is a launch-compliance task, not a substitute for software testing.

## 12. Commercial runbook

### New personal customer
1. Customer reviews package + legal policies.
2. Account registration records versioned Terms/Privacy consent.
3. Checkout confirms recipient/address and any required re-consent.
4. Order is created; customer completes configured payment flow.
5. Admin confirms payment through the approved path.
6. Operations reserves stock or sends required units to production.
7. QC / packaging / dispatch are recorded.
8. Carrier charge, if any, is communicated and accepted before dispatch.
9. Delivery is confirmed.
10. Customer activates physical identifier and configures public profile.
11. Support handles post-sale, replacement or erasure requests.

### Return / warranty
1. Intake through Contact with order/identifier reference.
2. Open/record case in Postventa.
3. Determine cancellation vs return vs warranty vs replacement.
4. Communicate instructions before physical shipment.
5. Inspect / decide / record event.
6. Refund, replace, repair or reject with reason as applicable.
7. If identifier is replaced, revoke old public identifier first.

### Account closure
1. Customer initiates protected delete from Settings or requests support.
2. Fresh auth + password + explicit confirmation.
3. SafeDelete removes/anonymizes operational PII and disables affected identifiers.
4. DELETE_ON_ERASURE Storage enters durable cleanup.
5. RETAIN_LEGAL evidence stays private/minimized until its retention duty ends.
6. Any cleanup queue failure is an operational incident, not silent success.

## 13. Block 7 remaining gates

- [ ] Database-backed Contact → Admin Support inbox flow verified in production.
- [ ] Fiscal/tax implementation decision documented with appropriate professional input.
- [ ] Operator accepts/adjusts the published shipping-return-warranty operating rules.
- [ ] CI + Browser E2E green on Block 7 PR.
- [ ] Production deploy READY and legal/support smoke passes.
- [ ] Scan-retention maintenance run verified live.
- [ ] No Block 7 P0/P1 remains unresolved.

Do not start Block 8 before Block 7 is formally CLOSED and its closure dossier exists.
