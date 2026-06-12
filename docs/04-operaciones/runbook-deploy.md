# Runbook: Deploy (minimal)

1. Ensure CI environment variables are set (see `docs/ops/environment-variables.md`).
2. On CI server:

```bash
npm ci
npx prisma generate
npm run typecheck
npm run lint
npm run build
```

3. If all steps pass, publish the build artifact / deploy via your hosting (Vercel recommended for Next.js App Router).
4. Post-deploy:
- Verify health endpoint `/api/health` (if implemented)
- Check Sentry for new errors
- Smoke test key flows: login, profile view via public QR, chip activation

Rollback: use previous successful deployment artifact in hosting provider.


---
*Originalmente en: docs/ops/*