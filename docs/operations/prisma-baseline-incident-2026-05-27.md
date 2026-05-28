# Prisma Baseline Incident — 2026-05-27 (PR-1 Medical Profile)

## 1) Contexto

Durante la implementación de **PR-1 medical profile**, se agregaron nuevos campos de seguro médico en `Profile` y se necesitaba aplicar una migración de forma **no destructiva** sobre una base con datos reales.

Campos incorporados en la migración manual:

- `isInsured`
- `insuranceProvider`
- `insurancePolicyNumber`
- `preferredHospital`
- `insuranceEmergencyPhone`
- `primaryDoctorName`
- `primaryDoctorPhone`
- `showInsuranceProviderPublic`
- `showPreferredHospitalPublic`
- `showPrimaryDoctorPublic`
- `showPrimaryDoctorPhonePublic`
- `showAdditionalNotesPublic`

Migración objetivo aplicada:

- `20260527193105_add_medical_insurance_fields`

## 2) Problema encontrado

1. `prisma migrate dev` detectó **drift** y pidió **reset destructivo**.
2. Se rechazó el reset por política de no pérdida de datos.
3. `prisma migrate deploy` falló con **P3005**:
   - *The database schema is not empty*.
4. Además, la migración `20260527192323_add_medical_insurance_fields` estaba vacía (sin `migration.sql`), lo que provocó **P3017** al intentar resolverla:
   - *The migration ... could not be found*.

## 3) Solución aplicada

Se ejecutó un baseline **no destructivo**:

1. Marcar como aplicadas las migraciones históricas con:
   - `npx prisma migrate resolve --applied <migration_name>`
2. Crear un `migration.sql` **no-op** para la carpeta vacía:
   - `prisma/migrations/20260527192323_add_medical_insurance_fields/migration.sql`
3. Marcar esa migración como aplicada con `migrate resolve --applied`.
4. Ejecutar `npx prisma migrate deploy` nuevamente.
5. Resultado: Prisma aplicó únicamente:
   - `20260527193105_add_medical_insurance_fields`

## 4) Garantías

Durante todo el procedimiento se mantuvieron estas garantías:

- **No reset** (`migrate reset` no ejecutado)
- **No db push**
- **No pérdida de datos**
- **API pública sin cambios** (`app/api/public/[shortCode]/route.ts` y `app/(public)/e/[shortCode]/page.tsx` sin diff)
- **Typecheck OK**
- **Build OK**

## 5) Lecciones

- No usar `prisma migrate dev` contra bases con datos reales y drift sin estrategia previa.
- Preferir `prisma migrate deploy` + baseline controlado (`migrate resolve`) en entornos con historial parcial.
- Nunca aceptar prompts tipo **“All data will be lost”** en este contexto.
- Documentar explícitamente migraciones manuales y/o no-op para trazabilidad operativa.
