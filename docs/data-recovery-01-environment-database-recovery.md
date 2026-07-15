# DATA-RECOVERY-01 - Diagnóstico y recuperación segura del entorno de base de datos

**Fecha de corte:** 14 de julio de 2026
**Ámbito:** entorno de desarrollo / verificación local
**Estado:** recuperación parcial aplicada y documentada
**Restricción:** no se tocaron producción, migraciones históricas en producción ni datos reales de negocio fuera del entorno objetivo.

## 1. Objetivo

Restaurar un entorno de base de datos coherente para desarrollo y validación local sin hacer acciones destructivas.

El objetivo no fue "arreglar producción", sino:

- identificar la base realmente usada por la aplicación;
- detectar desajustes de esquema y datos;
- recuperar una línea base útil para pruebas;
- dejar evidencia clara de lo que sigue siendo un riesgo.

## 2. Diagnóstico del entorno real

### 2.1 Base usada por la app

La aplicación apunta a un proyecto Supabase único para `DATABASE_URL` y `DIRECT_URL`, con:

- host del pooler en `aws-1-us-west-2.pooler.supabase.com`;
- base `postgres`;
- mismo proyecto Supabase para lectura y escritura;
- URLs locales cargadas desde `.env.local` y `.env`.

### 2.2 Hallazgo principal

El entorno estaba funcional en apariencia, pero no era coherente con Prisma Migrate:

- `npx prisma migrate status` reportó todas las migraciones como no aplicadas;
- la tabla `_prisma_migrations` no existía;
- el esquema físico ya tenía tablas, pero la historia migratoria estaba ausente;
- varios campos críticos en la base seguían como `text` mientras el schema Prisma ya esperaba enums.

En otras palabras: la base no estaba vacía, pero sí estaba fuera de sincronía con la cadena de migraciones del repositorio.

## 3. Inventario inicial

Antes de la recuperación, el conteo relevante era:

- `User`: 3
- `Account`: 2
- `Profile`: 2
- `Organization`: 1
- `OrganizationMember`: 1
- `Consent`: 2
- `Contact`: 0
- `Product`: 0
- `ProductOperationalMapping`: 0
- `Package`: 0
- `OperationFinishedGood`: 0
- `OperationFinishedGoodUnit`: 0
- `OperationCommercialOrder`: 0
- `OperationCommercialOrderItem`: 0
- `CommerceOrderSyncOutbox`: 0
- `Order`: 0
- `OrderItem`: 0
- `Chip`: 0
- `ScanEvent`: 0
- `Notification`: 0

## 4. Problema estructural encontrado

El primer intento de escritura reveló drift de esquema:

- el schema Prisma ya modelaba enums en campos críticos;
- la base aún tenía columnas `text`;
- Prisma falló al insertar con un error de tipo inexistente para el enum;
- por tanto, no bastaba con sembrar datos vacíos: había que alinear tipos.

Esto confirmó que el entorno necesitaba una reparación técnica previa al seed.

## 5. Recuperación aplicada

### 5.1 Reparación de enums de estado

Se aplicó una reparación controlada para alinear los tipos críticos de estado con el schema actual.

Se crearon y/o alinearon:

- `OrderPaymentStatus`
- `OrderStatus`
- `OrderAdminReviewStatus`
- `CommerceOrderSyncOutboxStatus`
- `OperationFinishedGoodUnitStatus`
- `OperationFinishedGoodUnitQaStatus`
- `OperationFinishedGoodUnitActivationStatus`

Y se ajustaron las columnas críticas correspondientes:

- `Order.paymentStatus`
- `Order.orderStatus`
- `Order.adminReviewStatus`
- `CommerceOrderSyncOutbox.status`
- `OperationFinishedGoodUnit.status`
- `OperationFinishedGoodUnit.qaStatus`
- `OperationFinishedGoodUnit.activationStatus`

### 5.2 Seed de recuperación

Después de la alineación, se sembró un entorno mínimo pero coherente para desarrollo y pruebas:

- paquetes;
- materiales operacionales;
- finished goods;
- productos de tienda;
- producto base para chips;
- chips;
- contacto público;
- perfiles/consentimientos necesarios;
- unidades de inventario;
- órdenes personales;
- orden comercial;
- items asociados.

También se regeneraron credenciales de recuperación para:

- superadmin;
- cliente;
- cuenta corporativa.

## 6. Inventario final

Después de la recuperación, el entorno quedó con:

- `Package`: 6
- `OperationMaterial`: 4
- `OperationFinishedGood`: 2
- `Product`: 3
- `ProductOperationalMapping`: 2
- `OperationFinishedGoodUnit`: 2
- `Order`: 2
- `OrderItem`: 2
- `OperationCommercialOrder`: 1
- `OperationCommercialOrderItem`: 1
- `Chip`: 2
- `Contact`: 1
- `Consent`: 2

Y siguieron presentes:

- `User`
- `Account`
- `Profile`
- `Organization`
- `OrganizationMember`

## 7. Validaciones ejecutadas

Se ejecutaron estas validaciones:

- `git diff`
- `git diff --check`
- `git status --short`
- `npx prisma validate`
- `npx prisma generate`
- `npx prisma migrate status`
- `npm run lint`
- `npm run typecheck`
- `npx vitest run`
- `npm run test:coverage -- --run`
- `npm run build`
- `npm audit --omit=dev`

### Resultado resumido

- `npx prisma validate`: aprobado
- `npx prisma generate`: aprobado
- `npx prisma migrate status`: sigue reportando 26 migraciones no aplicadas y ausencia de `_prisma_migrations`
- `npm run lint`: aprobado con 6 warnings preexistentes
- `npm run typecheck`: aprobado
- `npx vitest run`: aprobado
- `npm run test:coverage -- --run`: aprobado
- `npm run build`: aprobado con warnings preexistentes
- `npm audit --omit=dev`: reportó 7 vulnerabilidades moderadas ligadas a dependencias indirectas

## 8. Riesgos y límites

### 8.1 Riesgo que sigue abierto

La ausencia de `_prisma_migrations` sigue siendo el mayor residuo de consistencia histórica.

Eso implica:

- no existe trazabilidad nativa de Prisma Migrate para esta base;
- la discrepancia entre esquema lógico y físico debe tratarse como deuda técnica activa;
- antes de cualquier cambio estructural, la cadena de migraciones reales debe revisarse con cuidado.

### 8.2 Qué no se hizo

- no se hizo `reset`;
- no se hizo `drop`;
- no se truncaron tablas;
- no se tocó producción;
- no se forzó una migración destructiva;
- no se intentó reconstruir toda la historia migratoria;
- no se divulgaron credenciales reales.

## 9. Conclusión

El entorno de base de datos fue diagnosticado y recuperado de forma segura para desarrollo local.

La recuperación tuvo dos partes:

1. alinear los tipos críticos de estado con el schema actual;
2. sembrar un conjunto mínimo y coherente de datos para seguir trabajando sin bloquear el flujo.

La base quedó utilizable para desarrollo y validación, pero todavía arrastra una limitación importante: la historia de migraciones de Prisma no está presente en la base activa.

**¿El entorno quedó coherente para desarrollo y validación local? Sí.**
**¿Persisten riesgos estructurales por ausencia de `_prisma_migrations`? Sí.**
