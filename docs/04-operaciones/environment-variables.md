# Environment Variables (no secrets included)

Listado mínimo de variables de entorno requeridas por la app (valores de ejemplo no incluidos).

Required:
- DATABASE_URL
- DIRECT_URL (optional)
- NEXTAUTH_SECRET
- ENCRYPTION_KEY (required in production)
- UPSTASH_REDIS_REST_URL (if using Upstash)
- UPSTASH_REDIS_REST_TOKEN (if using Upstash)
- SENTRY_DSN (if using Sentry)
- RESEND_API_KEY (if using Resend)
- TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN (if using Twilio)

Optional / CI:
- SKIP_LINT_DURING_BUILD (set to "true" to skip lint during local builds)

Notes:
- Never commit real secrets. Use your secrets manager (Vercel/Netlify/GCP/AWS) in production.
- `ENCRYPTION_KEY` must be 32 bytes (or will be hashed to 32 bytes). In production set a stable key.
- Stripe variables were removed from the runtime and should not be configured for this phase.


---
*Originalmente en: docs/ops/*
