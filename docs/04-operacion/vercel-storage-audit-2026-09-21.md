# Auditoría Vercel Storage — 2026-09-21

## Alcance

Auditoría enfocada en el exceso de `Functions Storage` reportado por el equipo Hobby de PreRescate PTY, sin modificar datos de producción, esquema de Supabase ni comportamiento público.

## Estado verificado

- Proyecto Vercel: `pre-rescate-pty`
- Producción: READY
- Runtime: Next.js / LAMBDAS
- Región de funciones: `iad1`
- Commit de producción auditado: `11876ce983efe57a6e0f72072f1ae95b6d500c2e`
- Error clusters en la última hora: 0
- `/api/health/ready` exige autenticación por `CRON_SECRET` y responde 401 sin ella, como corresponde.

## Hallazgo principal

El problema no es Supabase Storage. El repositorio usa Supabase para datos/archivos, pero Next.js sigue generando código dinámico que Vercel empaqueta como Vercel Functions.

El árbol actual contiene:

- 178 Route Handlers bajo `app/api/**/route.ts`
- 40 páginas App Router
- middleware e instrumentation global
- Prisma ORM 6.19.3
- Sharp 0.35.4
- Sentry Next.js
- qrcode, next-auth, Supabase JS, Upstash, Resend, Twilio y otras dependencias de servidor

Vercel agrupa rutas Next.js en el menor número posible de funciones, por lo que 178 Route Handlers no equivalen necesariamente a 178 Lambdas. Sin embargo, una superficie server-side tan amplia multiplica el impacto de dependencias comunes trazadas dentro de los bundles.

## Candidatos de mayor peso

### 1. Prisma con motor Rust clásico — prioridad alta

`prisma/schema.prisma` usa:

```prisma
generator client {
  provider = "prisma-client-js"
}
```

y `lib/prisma.ts` instancia `@prisma/client` sin driver adapter.

Prisma 6.19.3 soporta `engineType = "client"` con `@prisma/adapter-pg`, eliminando el Query Engine Rust del artefacto desplegado. Es el candidato más sólido para bajar el peso de bundles serverless, pero debe migrarse y pasar CI/integración antes de producción.

### 2. Sharp nativo — prioridad media/alta

`lib/storage-utils.ts` importa `sharp` para optimizar cargas y convertirlas a WebP. Sharp incluye componentes nativos y puede aumentar el tamaño de la función que contenga la ruta de upload. No debe eliminarse sin conservar validación, optimización y seguridad de carga.

### 3. Sentry global — prioridad media

`instrumentation.ts`, `sentry.server.config.ts` y `sentry.edge.config.ts` cargan `@sentry/nextjs`. Mantener observabilidad es valioso, pero debe medirse su aporte al bundle antes de reducirlo.

### 4. Churn de deployments — prioridad crítica operativa

La política de ramas ya limita auto-deploys a `master` y `preview-*`, pero cada push directo a `master` sigue creando un deployment de producción completo.

En el repositorio hubo 16 commits el 2026-09-21 y Vercel mantiene actualmente 18 deployments visibles. El 21 de septiembre se hicieron múltiples micro-deploys consecutivos para ajustes visuales/producción.

Regla nueva: trabajar cambios en ramas que no despliegan, validar, y hacer un solo merge a `master` por lote.

## Compute / cron

Supabase `pg_cron` tiene un job activo cada 5 minutos que llama tres rutas Vercel:

1. `/api/cron/notify`
2. `/api/cron/commerce-order-sync?limit=25`
3. `/api/cron/expire-chips`

En 24 horas: 288 ejecuciones correctas del scheduler = 864 requests a Vercel por día, antes de contar el backup de GitHub Actions.

Observaciones:

- `notify` no envía notificaciones automáticas por política actual; solo escribe heartbeat.
- `commerce-order-sync` sí realiza trabajo útil y debe conservar frecuencia.
- `expire-chips` ya no expira chips; hace cleanup/retención. Además existe un cron diario en `vercel.json`, por lo que hay solapamiento de scheduling.

Esto no explica el exceso de Functions Storage, pero sí consume invocaciones/CPU innecesariamente y debe optimizarse por separado.

## Errores de runtime

En 7 días Vercel registra 4 errores históricos de `/api/upload`:

`UPLOAD_HANDLER_ERROR: Failed to parse body as FormData / no boundary found`

El código actual ya incluye recuperación de multipart y un flujo raw para foto de perfil. En la última hora auditada no existen clusters de errores, por lo que no se considera un P1 activo en el deployment actual.

## Archivos estáticos

`public/` pesa aproximadamente 2.70 MB. Los mayores archivos son:

- `backpack-safety.png`: ~910 KB
- `hero-helmet.png`: ~763 KB
- `sticker-official.png`: ~450 KB
- `logo.png`: ~419 KB

Estos archivos afectan principalmente Deployment Storage/CDN, no son el candidato principal para Functions Storage.

## .vercelignore

Actualmente solo excluye:

```
ops/
.obsidian/
brain_backup_reconstruido/
```

Hay documentación y archivos de agente que pueden excluirse del contexto de deployment para reducir carga de subida/build, aunque esto no sustituye la reducción de bundles de Functions.

## Plan de remediación

### Fase A — sin riesgo para producción
- Mantener toda optimización en `ops/vercel-storage-optimization`.
- No usar `preview-*` para esta auditoría.
- Evitar pushes directos a `master`.
- Medir/validar cada cambio con GitHub CI antes de un único deployment final.

### Fase B — reducción real de bundle
1. Migrar Prisma 6.19.3 a `engineType = "client"` + `@prisma/adapter-pg`.
2. Ejecutar Prisma validate, typecheck, unit/integration tests y build.
3. Auditar Sharp después de Prisma, sin mezclar ambas migraciones en el mismo cambio.
4. Medir Sentry solo si Prisma no reduce suficiente.

### Fase C — compute
- Dejar commerce sync a 5 minutos.
- Eliminar llamadas periódicas inútiles a notify mientras automated delivery esté deshabilitado, ajustando readiness.
- Separar cleanup/retention de expire-chips a una frecuencia adecuada y eliminar el scheduling duplicado.

### Fase D — deployment hygiene
- Un solo merge/deployment por lote.
- Ajustar retention policy de deployments a una ventana corta compatible con rollback.
- Conservar al menos un rollback probado.

## Limitación de evidencia

La API conectada de Vercel expone deployments, runtime logs/errors y documentación, pero en esta sesión el endpoint de build logs no está operativo y no expone un desglose autenticado de MB por función. Por eso no se atribuye una cantidad exacta de GB a Prisma/Sharp/Sentry sin medición de artefacto.

La conclusión de causa es estructural y respaldada por el código; la magnitud exacta por dependencia debe validarse en el siguiente build controlado.

## Conclusión

P0: 0  
P1: Functions Storage excedido y churn de deployments  
P2: bundle pesado probable por Prisma clásico/Sharp/Sentry; scheduler sobrefrecuente  
Producción actual: READY y sin errores de runtime en la última hora auditada.
