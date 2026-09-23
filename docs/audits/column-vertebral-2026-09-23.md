# Auditoría columna vertebral — cierre técnico

Fecha: 2026-09-23
Alcance: BD → servicios → API → UI → operación → CI/CD → observabilidad/rollback

## Dictamen

**GO técnico de base de datos. GO de aplicación condicionado al despliegue y smoke posterior.** La migración productiva fue aplicada y el gate SQL terminó sin excepciones. La implementación convierte las identidades físicas/digitales críticas en invariantes de base de datos, elimina la exposición pública de identificadores internos y añade gates automáticos de regresión.

## Controles implementados

- Identidades inmutables para Chip, token de activación, lote digital, ítem digital y unidad terminada.
- Coherencia de cuenta/propietario/perfil en Chip y coherencia ítem–chip en unidad terminada.
- Un único token activo y no consumido por chip.
- Hash y últimos cuatro caracteres del código de activación obligatorios.
- RLS y revocación de privilegios Data API para tablas server-only.
- Perfil público sin identificadores internos, sin caché y con errores sanitizados.
- Preparación digital idempotente: el replay no crea ítems, chips, tokens ni eventos.
- Gate SQL de duplicados, huérfanos, cruces de cuenta, URLs, RLS y triggers.
- Pruebas PostgreSQL de lotes 1/10/100/1000, rollback, inmutabilidad, tenant y RLS.
- Smoke automático posterior a producción.
- Protección CODEOWNERS de rutas y esquema críticos.

## Evidencia requerida para GO

| Gate | Resultado al cierre |
|---|---|
| Integridad productiva: duplicados, huérfanos, tenant, activación, URLs | PASS |
| Migración de hardening productiva | PASS |
| Historial Prisma | PASS: 44/44, 0 incompletas, checksum final exacto |
| RLS directo como `anon` | PASS: acceso denegado |
| Prueba aislada 1/10/100/1000 + rollback | PASS |
| Unitarias y rutas | PASS: 727/727 |
| Gate específico columna vertebral | PASS: 42/42 |
| Cobertura | PASS: 65.71% statements, 72.98% lines, 91.11% functions |
| Lint | PASS: 0 errores; 2 advertencias históricas de imagen |
| Auditoría npm | PASS: 0 vulnerabilidades |
| Build local | No concluido: el entorno detuvo contacto de telemetría de Sentry; telemetría de build quedó deshabilitada en configuración |
| CI/Vercel + smoke productivo | Pendiente del commit/despliegue |

Los avisos `RLS Enabled No Policy` son intencionales: estas tablas son server-only, tienen RLS y no conceden privilegios a `anon`/`authenticated`. El aviso `pg_net in public` corresponde a una extensión administrada de Supabase y no fue reubicada durante este cambio.

## Rollback

- Aplicación: rollback de deployment desde Vercel.
- Datos: los triggers/constraints son aditivos; ante incompatibilidad se deshabilita el release y se ejecuta una migración forward de reversión explícita.
- Desastre: restauración desde los backups cifrados y workflow de certificación ya existentes.
