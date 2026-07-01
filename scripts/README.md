# 📁 Scripts — PreRescate ID

## Propósito

La carpeta `scripts/` contiene herramientas de mantenimiento, configuración de infraestructura, migración de datos y diagnóstico de base de datos. **No forman parte de la aplicación web** y no se ejecutan durante `npm run build` ni durante el despliegue en Vercel.

---

## ⚠️ Reglas de Seguridad

- **Nunca ejecutar scripts en producción sin aprobación explícita.**
- Los scripts destructivos (borrado, migración, creación) requieren variables de entorno de confirmación. **No las omitas.**
- Los cambios de base de datos en producción **deben documentarse** bajo `docs/04-operaciones/`.
- Los scripts que contengan credenciales hardcodeadas **deben refactorizarse** para usar variables de entorno antes de ejecutarse en cualquier entorno.

---

## Tipos de Scripts

| Categoría | Descripción | Riesgo |
|-----------|-------------|--------|
| **Solo lectura** | Consultas a BD, auditorías, verificaciones | 🟢 Muy bajo |
| **Configuración manual** | Configuran buckets, políticas RLS, etc. | 🟡 Medio |
| **Destructivo protegido** | Borrado, migración, creación — requiere confirmación explícita | 🔴 Alto |
| **Placeholder/no-op** | Histórico, imprime mensaje, sin efecto | 🟢 Sin riesgo |

---

## Scripts en `scripts/`

| Archivo | Categoría | Protección | Descripción |
|---------|-----------|------------|-------------|
| `check-chip.js` | Solo lectura | Ninguna | Consulta un chip por shortCode y lista 5 chips. Solo lee. |
| `setup-storage.js` | Configuración manual | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Crea buckets de Supabase Storage (general, profile-photos, payment-proofs). Requiere ambas env vars. Aborta si faltan. |
| `setup-storage.ts` | Configuración manual | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Versión TypeScript de `setup-storage.js`. Mismo propósito. Requiere ambas env vars. |
| `setup-rls-policies.js` | Configuración manual | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Muestra políticas RLS para buckets de Supabase. Solo imprime instrucciones para crear manualmente en la UI. |
| `backfill-corporate-chip-profiles.ts` | Destructivo protegido | `DRY_RUN=true/false` | Backfill de `assignedProfileId` en chips corporativos históricos. Default: solo auditoría (`DRY_RUN=true`). Ejecutar con `DRY_RUN=false` para escritura real. |
| `backfill-corporate-profiles.ts` | Destructivo protegido | `CONFIRM_CORPORATE_BACKFILL=YES_CREATE_CORPORATE_PROFILES` | Crea perfiles corporativos para miembros de organización legacy. Default: solo lectura (dry run). Ejecutar con la variable de confirmación para escritura real. |
| `create-initial-superadmin.ts` | Destructivo protegido | `CONFIRM_FULL_RESET=YES_DELETE_ALL_TEST_DATA` | Crea el superadmin inicial. **Solo funciona si la tabla User está vacía.** Genera contraseña temporal segura que se muestra una sola vez. |
| `reset-all-test-data.sql` | Destructivo protegido | Variable psql `confirm_full_reset` | Borra todos los datos de prueba en orden de dependencias FK. **No toca `_prisma_migrations`.** Requiere: `psql -v confirm_full_reset='YES_DELETE_ALL_TEST_DATA' -f ...` |
| `seed-structural-data.ts` | Destructivo protegido | `CONFIRM_STRUCTURAL_SEED=YES_CREATE_STRUCTURAL_DATA` | Crea/actualiza datos estructurales (Package, Product, SystemConfig). Idempotente (usa upsert). No toca usuarios, chips ni pedidos. |
| `smoke-operations-e2e.ts` | Escritura protegida | `CONFIRM_OPERATIONS_SMOKE=YES_RUN_OPERATIONS_SMOKE` | Crea datos de prueba `W530D_SMOKE_*` y valida el flujo Materiales → Producción → QC → Empaque → Inventario PT → Despacho. No borra datos. |
| `smoke-commercial-dispatch-e2e.ts` | Escritura protegida | `CONFIRM_COMMERCIAL_DISPATCH_SMOKE=YES_RUN_COMMERCIAL_DISPATCH_SMOKE` | Crea datos de prueba `W531D_SMOKE_*` y valida Comercial → Despacho → Inventario PT. No borra datos. |
| `smoke-after-sales-e2e.ts` | Escritura protegida | `CONFIRM_AFTER_SALES_SMOKE=YES_RUN_AFTER_SALES_SMOKE` | Crea datos de prueba `W534C_SMOKE_*` y valida Garantía → Reemplazo → Despacho y Devolución → Inventario PT. No borra datos. |
| `smoke-full-erp-e2e.ts` | Escritura protegida | `CONFIRM_FULL_ERP_SMOKE=YES_RUN_FULL_ERP_SMOKE` | Crea datos de prueba `W535D_SMOKE_*` y valida el flujo ERP completo Materiales → Producción → QC → Empaque → Inventario PT → Comercial → Despacho → Garantía → Reemplazo → Devolución → Inventario PT. No borra datos. |
| `clean-operations-smoke-data.ts` | Destructivo protegido | `CONFIRM_CLEAN_OPERATIONS_SMOKE=YES_CLEAN_OPERATIONS_SMOKE` | Borra datos smoke `W530D_SMOKE_*`, `W531D_SMOKE_*`, `W534C_SMOKE_*` y `W535D_SMOKE_*` por prefijo estricto. `DRY_RUN` por defecto; requiere confirmación exacta y no toca datos reales fuera de esos prefijos. |
| `seed-operations-base-materials.ts` | Destructivo protegido | `CONFIRM_SEED_BASE_MATERIALS=YES_SEED_BASE_MATERIALS` | Crea o actualiza los materiales base `PRP-MAT-NFC-BLANK`, `PRP-MAT-STICKER-BLANK`, `PRP-MAT-ACTIVATION-CARD` y `PRP-MAT-PACKAGING`. No crea stock, no registra movimientos y no borra datos. |

---

## Scripts en `scripts/prisma/`

| Archivo | Categoría | Protección | Descripción |
|---------|-----------|------------|-------------|
| `audit-database.ts` | Solo lectura | Ninguna | Auditoría profunda de integridad: huérfanos, inconsistencias, basura, cobertura de índices. Usa `DIRECT_URL` o `DATABASE_URL`. |
| `check-new-chips.ts` | Solo lectura | Ninguna | Lista los 10 chips más recientes con su estado, owner y perfil. Usa `DIRECT_URL`. |
| `test-conn.ts` | Solo lectura | Ninguna | Prueba conexión a BD vía `DIRECT_URL`. Ejecuta un `count` y desconecta. |
| `migrate-admins-to-users.ts` | Placeholder/no-op | Ninguna | Placeholders histórico. Solo imprime mensaje. Sin operaciones de BD. |

---

## Formato de Ejecución Seguro

```bash
# Scripts solo lectura (seguros)
npx tsx scripts/prisma/audit-database.ts
npx tsx scripts/prisma/check-new-chips.ts
npx tsx scripts/prisma/test-conn.ts
node scripts/check-chip.js

# Scripts de configuración de Supabase
SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/setup-storage.js
SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> npx tsx scripts/setup-storage.ts
SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/setup-rls-policies.js

# Scripts con confirmación requerida
DRY_RUN=true  npx tsx scripts/backfill-corporate-chip-profiles.ts   # solo audit
DRY_RUN=false npx tsx scripts/backfill-corporate-chip-profiles.ts   # escritura real
CONFIRM_CORPORATE_BACKFILL=YES_CREATE_CORPORATE_PROFILES npx tsx scripts/backfill-corporate-profiles.ts
CONFIRM_FULL_RESET=YES_DELETE_ALL_TEST_DATA npx tsx scripts/create-initial-superadmin.ts
CONFIRM_STRUCTURAL_SEED=YES_CREATE_STRUCTURAL_DATA npx tsx scripts/seed-structural-data.ts
CONFIRM_OPERATIONS_SMOKE=YES_RUN_OPERATIONS_SMOKE npx tsx scripts/smoke-operations-e2e.ts
CONFIRM_COMMERCIAL_DISPATCH_SMOKE=YES_RUN_COMMERCIAL_DISPATCH_SMOKE npx tsx scripts/smoke-commercial-dispatch-e2e.ts
CONFIRM_AFTER_SALES_SMOKE=YES_RUN_AFTER_SALES_SMOKE npx tsx scripts/smoke-after-sales-e2e.ts
CONFIRM_FULL_ERP_SMOKE=YES_RUN_FULL_ERP_SMOKE npx tsx scripts/smoke-full-erp-e2e.ts
CONFIRM_CLEAN_OPERATIONS_SMOKE=YES_CLEAN_OPERATIONS_SMOKE npx tsx scripts/clean-operations-smoke-data.ts
CONFIRM_SEED_BASE_MATERIALS=YES_SEED_BASE_MATERIALS npx tsx scripts/seed-operations-base-materials.ts
psql -v confirm_full_reset='YES_DELETE_ALL_TEST_DATA' -f scripts/reset-all-test-data.sql
```

---

## Notas Importantes

- **`setup-storage.js` y `setup-storage.ts`** son prácticamente idénticos. `setup-storage.js` es el original; `.ts` es la versión moderna. Se recomienda eliminar el `.js` en una futura limpieza.
- **`backfill-corporate-profiles.ts`** ahora tiene protección con `CONFIRM_CORPORATE_BACKFILL`. Por defecto ejecuta en modo solo lectura.
- **`reset-all-test-data.sql`** borra TODOS los datos excepto `_prisma_migrations`. Solo para entornos de desarrollo o QA.
- **`create-initial-superadmin.ts`** aborta si la tabla User no está vacía. No borra datos existentes.
- **`clean-operations-smoke-data.ts`** usa filtros estrictos por prefijo y corre en `DRY_RUN` por defecto. Solo borra datos de prueba identificados por `W530D_SMOKE`, `W531D_SMOKE`, `W534C_SMOKE` y `W535D_SMOKE` cuando recibe la confirmación exacta.
- **`seed-operations-base-materials.ts`** usa `upsert`/creación segura por `code` y solo prepara metadata base de materiales. No crea stock, cantidades ni eventos.
- Los scripts que usan `DIRECT_URL` asumen acceso directo a la base de datos (bypass de Connection Pooler). Solo funciona desde entornos con acceso a la BD directa.
