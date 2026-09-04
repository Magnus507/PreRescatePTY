# Telemetry and diagnostic data minimization

Launch-hardening policy for PreRescatePTY. This document defines what application logs and Sentry diagnostics are allowed to contain. It does not authorize collection of medical or payment evidence.

## Data classes

### Never emit in application telemetry

- Authentication material: passwords, passcodes, session values, bearer/access/refresh tokens, cookies, API keys, encryption keys and secrets.
- Direct identifiers: email, telephone/WhatsApp, account/address details, birth date, government document numbers, precise coordinates/location and client IP data.
- Medical/health data: allergies, medications, diagnoses/conditions, blood type, treatments, disability/medical notes and emergency-contact details.
- Payment evidence: receipts/comprobantes/vouchers, payment-proof URLs/files, bank account data, card numbers and CVV.

Operational identifiers such as order IDs, route names, HTTP method, status, queue/outbox IDs and sanitized error classes may be retained when they do not contain the classes above.

## Application controls

- `lib/security/telemetry.ts` is the single redaction layer for console logs and Sentry event hooks.
- `lib/logger.ts` sanitizes both the message string and every structured argument before console output.
- Sentry uses `sendDefaultPii: false`, `beforeSend`, `beforeSendTransaction` and `beforeBreadcrumb` from the shared privacy config.
- Request-error instrumentation sends method + sanitized path only; incoming headers are excluded.
- Sentry Replay is disabled: session replay sample rate `0`, error replay sample rate `0`, and no Replay integration is registered.
- Trace sampling is environment-scoped: production `10%`, preview `25%`, development/test `0%`.
- Automated tests cover secrets/tokens, Panama telephone numbers, medical fields, payment evidence, request payload/cookies/query strings and direct identifiers.

## Retention and access gate

The repository cannot prove the hosted Sentry project's administrative settings. Before final go-live, the Sentry project owner must verify and record:

- diagnostic-event retention is no longer than the business-approved period; launch target: **30 days or less** for sanitized diagnostics;
- access is limited to designated technical maintainers with least privilege;
- MFA/SSO protections available for the account/team are enabled;
- Session Replay is not re-enabled through project/integration settings;
- a periodic access review owner and cadence are recorded.

Until those hosted settings are verified, P1-12 is **code-controls complete but external retention/access verification pending**.

## Incident rule

Do not disable redaction to debug a production incident. If more context is required, add a narrowly scoped, non-sensitive operational field and cover it with a test before deployment.
