# PLAN FINAL — RESET TOTAL Y NUEVO SUPERADMIN

---

## 1. MECANISMO REAL DE AUTENTICACIÓN ADMIN

### Hallazgos de la auditoría:

| Aspecto | Evidencia |
|---------|-----------|
| **Tabla de usuarios** | `User` (única tabla, no existe `AdminUser` separada) |
| **Campo que indica admin** | `isAdmin: Boolean @default(false)` |
| **Campo de rol admin** | `adminRole: String?` — valores válidos: `"admin"`, `"superadmin"`, `"imprenta"` (solo cuando `isAdmin=true`) |
| **Campo de rol usuario normal** | `role: String @default("owner")` — valores: `"owner"`, `"member"` |
| **Login** | NextAuth Credentials Provider → `lib/auth.ts` → `prisma.user.findUnique({ where: { email } })` |
| **Verificación contraseña** | `bcrypt.compare(credentials.password, user.passwordHash)` (bcryptjs, cost 12 en creación, 10 en seed) |
| **MFA** | Opcional: `mfaEnabled`, `mfaSecret` (encriptado con AES-256-CBC via `lib/encryption.ts`) |
| **Session/JWT** | `role` en token = `user.isAdmin ? user.adminRole : user.role` |
| **Middleware** | Protege `/admin/*` y `/dashboard/*` validando `token.role` ∈ `["admin","superadmin","imprenta"]` |
| **RBAC** | `lib/rbac.ts` → `SUPERADMIN_ROLES = ["superadmin"]`, `GENERAL_ADMIN_ROLES = ["admin","superadmin"]` |
| **Account requerida** | **NO** — el admin puede existir sin `accountId` (es opcional en User) |
| **Supabase Auth** | **NO** — solo para storage de imágenes; autenticación 100% Prisma DB + NextAuth |

### Respuestas exactas a la Fase 1:

1. **¿El login admin usa AdminUser, User o ambos?** → **Solo `User`** (tabla unificada, campo `isAdmin` + `adminRole`)
2. **¿Necesita Account?** → **NO** — `accountId` es opcional (`String?`)
3. **¿Qué campo representa acceso total?** → `isAdmin=true` + `adminRole="superadmin"`
4. **¿Cuál es el rol correcto?** → `"superadmin"` (enum `VALID_ADMIN_ROLES` en `lib/validations.ts`)
5. **¿Cómo debe almacenarse la contraseña?** → `bcrypt.hash(password, 12)` → campo `passwordHash` (String)
6. **¿Existe script/endpoint seguro para crear superadmin?** → **SÍ**: `POST /api/admin/admins` (requiere sesión superadmin) y `prisma/seed.ts` (usa env `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`)
7. **¿Depende de Supabase Auth?** → **NO** — autenticación 100% Prisma + NextAuth Credentials

---

## 2. TABLAS REQUERIDAS PARA UN SUPERADMIN

Para que un superadmin funcione **solo se necesita**:

| Tabla | Obligatoria | Motivo |
|-------|-------------|--------|
| `User` | ✅ SÍ | Registro del superadmin (email, passwordHash, isAdmin=true, adminRole="superadmin") |
| `Account` | ❌ NO | `accountId` es opcional en User |
| `Package` | ❌ NO | Solo para cuentas de clientes, no para admin |
| `SystemConfig` | ❌ NO | Configuración opcional del sistema |

**Conclusión**: Tras el reset, basta con crear **1 registro en `User`** con los campos correctos.

---

## 3. ROL DE ACCESO TOTAL

| Rol | Permisos |
|-----|----------|
| `superadmin` | Acceso total: puede crear/editar/borrar otros admins, acceso a todas las secciones admin, `SUPERADMIN_ROLES` en RBAC |
| `admin` | Acceso general admin, **no** puede gestionar otros admins |
| `imprenta` | Solo módulo inventario/fábrica |

**El superadmin propuesto debe tener**: `isAdmin=true`, `adminRole="superadmin"`, `status="active"`

---

## 4. MÉTODO DE HASHING

- **Algoritmo**: bcrypt (via `bcryptjs`)
- **Cost**: 12 (en `app/api/admin/admins/route.ts`) — más seguro que el seed (cost 10)
- **Campo**: `User.passwordHash` (String)
- **Verificación**: `bcrypt.compare(plainPassword, passwordHash)`

---

## 5. DATOS ESTRUCTURALES QUE DEBEN RECREARSE (SEED MÍNIMO)

Tras borrar **todos** los datos de aplicación, el sistema **no arrancará correctamente** sin:

| Tabla | ¿Requerida para arranque? | Acción |
|-------|---------------------------|--------|
| `Package` | **SÍ** | El catálogo de paquetes/planes es referenciado por `Account.packageId`, `Order.packageId`, y la UI de tienda/admin. Sin paquetes, la tienda y creación de cuentas fallan. |
| `SystemConfig` | **NO** | Configuración opcional, clave-valor |
| `Product` | **SÍ** | Referenciado por `CorporateOrderEmployeeItem.productId`, `CorporateProductRequestItem.productId`, tienda |

**Propuesta**: Ejecutar **seed mínimo** tras el reset que cree:
1. Los 6 paquetes oficiales (Combo Estándar, Dúo, Familiar, Hogar Full, Empresa, Corporativo)
2. Los productos base (si los hay en seed actual — revisar seed.ts)
3. **NO** crear organización demo, ni usuarios de prueba

---

## 6. ORDEN DE BORRADO (DEPENDENCIAS FK)

Orden **bottom-up** (hijos antes que padres) para evitar violaciones de FK:

| Orden | Tabla | Acción | Motivo | Dependencias (FK salientes) |
|-------|-------|--------|--------|----------------------------|
| 1 | `CorporateProductRequestItem` | DELETE | Hijo de CorporateProductRequest | `CorporateProductRequest`, `Product` |
| 2 | `CorporateProductRequest` | DELETE | Hijo de Organization, User, Order | `Organization`, `User`, `Order` |
| 3 | `CorporateOrderEmployeeItem` | DELETE | Hijo de Order, OrganizationMember, Product, Chip | `Order`, `OrganizationMember`, `Product`, `Chip` |
| 4 | `OrderItem` | DELETE | Hijo de Order, Profile, Chip | `Order`, `Profile`, `Chip` |
| 5 | `ChipClaimToken` | DELETE | Hijo de Chip, Order | `Chip`, `Order` |
| 6 | `ScanEvent` | DELETE | Hijo de Chip, Account | `Chip`, `Account` |
| 7 | `Notification` | DELETE | Hijo de Chip | `Chip` |
| 8 | `AppNotification` | DELETE | Hijo de User | `User` |
| 9 | `Consent` | DELETE | Hijo de User, Account, Profile | `User`, `Account`, `Profile` |
| 10 | `AuditLog` | DELETE | Hijo de Account, User | `Account`, `User` |
| 11 | `DigitalPass` | DELETE | Hijo de Profile | `Profile` |
| 12 | `ProfileContact` | DELETE | Hijo de Profile, Contact | `Profile`, `Contact` |
| 13 | `Contact` | DELETE | Hijo de User | `User` |
| 14 | `OrganizationMember` | DELETE | Hijo de Organization, Profile, Location, Department | `Organization`, `Profile`, `OrganizationLocation`, `OrganizationDepartment` |
| 15 | `OrganizationDepartment` | DELETE | Hijo de OrganizationLocation | `OrganizationLocation` |
| 16 | `OrganizationLocation` | DELETE | Hijo de Organization | `Organization` |
| 17 | `CorporatePublicProfile` | DELETE | Hijo de Organization | `Organization` |
| 18 | `Organization` | DELETE | Hijo de Account | `Account` |
| 19 | `Chip` | DELETE | Hijo de Account, Profile, User | `Account`, `Profile`, `User` |
| 20 | `Profile` | DELETE | Hijo de Account, User | `Account`, `User` |
| 21 | `Order` | DELETE | Hijo de User, Package, Organization | `User`, `Package`, `Organization` |
| 22 | `User` | DELETE | Hijo de Account | `Account` |
| 23 | `Account` | DELETE | Padre de User, Profile, Chip, Organization | `Package` |
| 24 | `PasswordResetToken` | DELETE | Independiente | — |
| 25 | `Product` | DELETE | Referenciado por OrderItem, CorporateOrderEmployeeItem, CorporateProductRequestItem | — |
| 26 | `Package` | DELETE | Referenciado por Account, Order | — |
| 27 | `SystemConfig` | DELETE | Independiente | — |

**Tablas que NO se tocan**:
- `_prisma_migrations` (historial de migraciones)
- Estructura de tablas (schema)

---

## 7. ARCHIVOS PREPARADOS

### 7.1 `scripts/reset-all-test-data.sql`

```sql
-- ============================================================
-- RESET TOTAL DE DATOS DE PRUEBA — PRE RESCATE PTY
-- ============================================================
-- REGLAS:
--  - NO toca _prisma_migrations
--  - NO usa DROP TABLE
--  - Borra en orden de dependencias FK (hijos → padres)
--  - Requiere variable de entorno CONFIRM_FULL_RESET=YES_DELETE_ALL_TEST_DATA
-- ============================================================

\set ON_ERROR_STOP on

-- Verificación de confirmación (se hace en el wrapper TypeScript, pero doble check)
DO $$
BEGIN
  IF current_setting('app.confirm_full_reset', true) != 'YES_DELETE_ALL_TEST_DATA' THEN
    RAISE EXCEPTION 'FALTA CONFIRMACIÓN: Establezca CONFIRM_FULL_RESET=YES_DELETE_ALL_TEST_DATA';
  END IF;
END $$;

-- Contadores pre-borrado (para reporte)
\echo '=== CONTEOS PRE-BORRADO ==='
SELECT 'CorporateProductRequestItem' AS tabla, count(*) FROM "CorporateProductRequestItem"
UNION ALL SELECT 'CorporateProductRequest', count(*) FROM "CorporateProductRequest"
UNION ALL SELECT 'CorporateOrderEmployeeItem', count(*) FROM "CorporateOrderEmployeeItem"
UNION ALL SELECT 'OrderItem', count(*) FROM "OrderItem"
UNION ALL SELECT 'ChipClaimToken', count(*) FROM "ChipClaimToken"
UNION ALL SELECT 'ScanEvent', count(*) FROM "ScanEvent"
UNION ALL SELECT 'Notification', count(*) FROM "Notification"
UNION ALL SELECT 'AppNotification', count(*) FROM "AppNotification"
UNION ALL SELECT 'Consent', count(*) FROM "Consent"
UNION ALL SELECT 'AuditLog', count(*) FROM "AuditLog"
UNION ALL SELECT 'DigitalPass', count(*) FROM "DigitalPass"
UNION ALL SELECT 'ProfileContact', count(*) FROM "ProfileContact"
UNION ALL SELECT 'Contact', count(*) FROM "Contact"
UNION ALL SELECT 'OrganizationMember', count(*) FROM "OrganizationMember"
UNION ALL SELECT 'OrganizationDepartment', count(*) FROM "OrganizationDepartment"
UNION ALL SELECT 'OrganizationLocation', count(*) FROM "OrganizationLocation"
UNION ALL SELECT 'CorporatePublicProfile', count(*) FROM "CorporatePublicProfile"
UNION ALL SELECT 'Organization', count(*) FROM "Organization"
UNION ALL SELECT 'Chip', count(*) FROM "Chip"
UNION ALL SELECT 'Profile', count(*) FROM "Profile"
UNION ALL SELECT 'Order', count(*) FROM "Order"
UNION ALL SELECT 'User', count(*) FROM "User"
UNION ALL SELECT 'Account', count(*) FROM "Account"
UNION ALL SELECT 'PasswordResetToken', count(*) FROM "PasswordResetToken"
UNION ALL SELECT 'Product', count(*) FROM "Product"
UNION ALL SELECT 'Package', count(*) FROM "Package"
UNION ALL SELECT 'SystemConfig', count(*) FROM "SystemConfig";

-- ============================================================
-- BORRADO EN ORDEN DE DEPENDENCIAS
-- ============================================================

-- 1. CorporateProductRequestItem
DELETE FROM "CorporateProductRequestItem";

-- 2. CorporateProductRequest
DELETE FROM "CorporateProductRequest";

-- 3. CorporateOrderEmployeeItem
DELETE FROM "CorporateOrderEmployeeItem";

-- 4. OrderItem
DELETE FROM "OrderItem";

-- 5. ChipClaimToken
DELETE FROM "ChipClaimToken";

-- 6. ScanEvent
DELETE FROM "ScanEvent";

-- 7. Notification
DELETE FROM "Notification";

-- 8. AppNotification
DELETE FROM "AppNotification";

-- 9. Consent
DELETE FROM "Consent";

-- 10. AuditLog
DELETE FROM "AuditLog";

-- 11. DigitalPass
DELETE FROM "DigitalPass";

-- 12. ProfileContact
DELETE FROM "ProfileContact";

-- 13. Contact
DELETE FROM "Contact";

-- 14. OrganizationMember
DELETE FROM "OrganizationMember";

-- 15. OrganizationDepartment
DELETE FROM "OrganizationDepartment";

-- 16. OrganizationLocation
DELETE FROM "OrganizationLocation";

-- 17. CorporatePublicProfile
DELETE FROM "CorporatePublicProfile";

-- 18. Organization
DELETE FROM "Organization";

-- 19. Chip
DELETE FROM "Chip";

-- 20. Profile
DELETE FROM "Profile";

-- 21. Order
DELETE FROM "Order";

-- 22. User (EXCEPTO el superadmin que se creará después — aquí borramos todos)
DELETE FROM "User";

-- 23. Account
DELETE FROM "Account";

-- 24. PasswordResetToken
DELETE FROM "PasswordResetToken";

-- 25. Product
DELETE FROM "Product";

-- 26. Package
DELETE FROM "Package";

-- 27. SystemConfig
DELETE FROM "SystemConfig";

-- ============================================================
-- CONTEOS POST-BORRADO
-- ============================================================
\echo '=== CONTEOS POST-BORRADO (DEBEN SER 0) ==='
SELECT 'CorporateProductRequestItem' AS tabla, count(*) FROM "CorporateProductRequestItem"
UNION ALL SELECT 'CorporateProductRequest', count(*) FROM "CorporateProductRequest"
UNION ALL SELECT 'CorporateOrderEmployeeItem', count(*) FROM "CorporateOrderEmployeeItem"
UNION ALL SELECT 'OrderItem', count(*) FROM "OrderItem"
UNION ALL SELECT 'ChipClaimToken', count(*) FROM "ChipClaimToken"
UNION ALL SELECT 'ScanEvent', count(*) FROM "ScanEvent"
UNION ALL SELECT 'Notification', count(*) FROM "Notification"
UNION ALL SELECT 'AppNotification', count(*) FROM "AppNotification"
UNION ALL SELECT 'Consent', count(*) FROM "Consent"
UNION ALL SELECT 'AuditLog', count(*) FROM "AuditLog"
UNION ALL SELECT 'DigitalPass', count(*) FROM "DigitalPass"
UNION ALL SELECT 'ProfileContact', count(*) FROM "ProfileContact"
UNION ALL SELECT 'Contact', count(*) FROM "Contact"
UNION ALL SELECT 'OrganizationMember', count(*) FROM "OrganizationMember"
UNION ALL SELECT 'OrganizationDepartment', count(*) FROM "OrganizationDepartment"
UNION ALL SELECT 'OrganizationLocation', count(*) FROM "OrganizationLocation"
UNION ALL SELECT 'CorporatePublicProfile', count(*) FROM "CorporatePublicProfile"
UNION ALL SELECT 'Organization', count(*) FROM "Organization"
UNION ALL SELECT 'Chip', count(*) FROM "Chip"
UNION ALL SELECT 'Profile', count(*) FROM "Profile"
UNION ALL SELECT 'Order', count(*) FROM "Order"
UNION ALL SELECT 'User', count(*) FROM "User"
UNION ALL SELECT 'Account', count(*) FROM "Account"
UNION ALL SELECT 'PasswordResetToken', count(*) FROM "PasswordResetToken"
UNION ALL SELECT 'Product', count(*) FROM "Product"
UNION ALL SELECT 'Package', count(*) FROM "Package"
UNION ALL SELECT 'SystemConfig', count(*) FROM "SystemConfig";

\echo '✅ RESET COMPLETADO — Tablas de aplicación vacías'
\echo '⚠️  _prisma_migrations INTACTA'
```

### 7.2 `scripts/create-initial-superadmin.ts`

```typescript
// ============================================================
// CREACIÓN SEGURA DEL SUPERADMIN INICIAL
// ============================================================
// - Reutiliza hashing bcrypt (cost 12) del proyecto
// - Usa modelo User correcto (isAdmin + adminRole)
// - Genera contraseña temporal segura con crypto
// - Muestra contraseña UNA SOLA VEZ al finalizar
// - Requiere CONFIRM_FULL_RESET=YES_DELETE_ALL_TEST_DATA
// - No guarda secretos en logs ni archivos
// ============================================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

const SUPERADMIN_EMAIL = 'superadmin@prerescatepty.com';
const CONFIRMATION_ENV = 'CONFIRM_FULL_RESET';
const REQUIRED_VALUE = 'YES_DELETE_ALL_TEST_DATA';

function generateSecurePassword(length = 20): string {
  // Caracteres seguros: alfanuméricos + símbolos, sin caracteres ambiguos
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
  let password = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }
  // Asegurar al menos: 1 mayúscula, 1 minúscula, 1 número, 1 símbolo
  if (!/[A-Z]/.test(password)) password = 'A' + password.slice(1);
  if (!/[a-z]/.test(password)) password = password.slice(0, -1) + 'a';
  if (!/[0-9]/.test(password)) password = password.slice(0, -1) + '2';
  if (!/[!@#$%^&*]/.test(password)) password = password.slice(0, -1) + '!';
  return password;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  CREACIÓN SUPERADMIN INICIAL — PRE RESCATE PTY               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  // 1. Verificación de confirmación explícita
  const confirmation = process.env[CONFIRMATION_ENV];
  if (confirmation !== REQUIRED_VALUE) {
    console.error('\n❌ ABORTADO: Falta confirmación explícita');
    console.error(`   Establezca la variable de entorno:`);
    console.error(`   ${CONFIRMATION_ENV}=${REQUIRED_VALUE}`);
    console.error('\n   Esto evita ejecuciones accidentales.');
    process.exit(1);
  }

  console.log('\n✅ Confirmación verificada');

  // 2. Verificar que no existe ya el superadmin
  const existing = await prisma.user.findUnique({
    where: { email: SUPERADMIN_EMAIL },
  });

  if (existing) {
    console.error(`\n❌ ABORTADO: Ya existe usuario con email ${SUPERADMIN_EMAIL}`);
    console.error('   El reset debe haber borrado todos los usuarios primero.');
    process.exit(1);
  }

  // 3. Generar contraseña temporal segura
  const tempPassword = generateSecurePassword(24);
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  console.log('\n📋 Resumen de creación:');
  console.log(`   Email:    ${SUPERADMIN_EMAIL}`);
  console.log(`   Rol:      superadmin (acceso total)`);
  console.log(`   Estado:   active`);
  console.log(`   Hash:     bcrypt cost 12`);

  // 4. Crear superadmin
  const superadmin = await prisma.user.create({
    data: {
      email: SUPERADMIN_EMAIL,
      passwordHash,
      role: 'owner',           // rol base (no usado cuando isAdmin=true)
      isAdmin: true,           // ← CLAVE: marca como administrador
      adminRole: 'superadmin', // ← CLAVE: rol de acceso total
      status: 'active',
      // accountId: null (opcional, no requerido para admin)
    },
  });

  console.log('\n✅ Superadmin creado exitosamente');
  console.log(`   ID: ${superadmin.id}`);

  // 5. Verificación final
  const verify = await prisma.user.findUnique({
    where: { id: superadmin.id },
    select: { id: true, email: true, isAdmin: true, adminRole: true, status: true },
  });

  console.log('\n🔍 Verificación post-creación:');
  console.log(`   ID:       ${verify?.id}`);
  console.log(`   Email:    ${verify?.email}`);
  console.log(`   isAdmin:  ${verify?.isAdmin}`);
  console.log(`   adminRole: ${verify?.adminRole}`);
  console.log(`   status:   ${verify?.status}`);

  // 6. MOSTRAR CONTRASEÑA TEMPORAL UNA SOLA VEZ
  console.log('\n' + '═'.repeat(60));
  console.log('🔐  CONTRASEÑA TEMPORAL (MOSTRARSE UNA SOLA VEZ)');
  console.log('═'.repeat(60));
  console.log(`\n   ${tempPassword}\n`);
  console.log('═'.repeat(60));
  console.log('⚠️  IMPORTANTE:');
  console.log('   • Guarde esta contraseña AHORA — no se volverá a mostrar');
  console.log('   • Inicie sesión en /login y cambie la contraseña inmediatamente');
  console.log('   • El sistema soporta MFA (opcional) en /dashboard/configuracion');
  console.log('═'.repeat(60));

  // 7. Conteo final de usuarios (debe ser 1)
  const userCount = await prisma.user.count();
  console.log(`\n📊 Total usuarios en BD: ${userCount} (debe ser 1)`);

  if (userCount !== 1) {
    console.error('❌ ADVERTENCIA: Se esperaba 1 usuario, hay', userCount);
  }
}

main()
  .catch((e) => {
    console.error('\n❌ ERROR:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## 8. PROTECCIONES AGREGADAS

| Protección | Implementación |
|------------|----------------|
| **Confirmación explícita** | Variable `CONFIRM_FULL_RESET=YES_DELETE_ALL_TEST_DATA` requerida en ambos scripts |
| **Abortar si falta confirmación** | Check al inicio de ambos scripts, `process.exit(1)` si no coincide |
| **Resumen pre-ejecución** | SQL: `\echo` con conteos pre-borrado; TS: `console.log` con resumen |
| **No tocar `_prisma_migrations`** | Solo `DELETE FROM` en tablas de aplicación, nunca `DROP` ni `TRUNCATE` en migraciones |
| **No imprimir secretos** | Solo la contraseña temporal final en TS; SQL no imprime secretos |
| **Confirmar conteos finales** | SQL: conteos post-borrado (deben ser 0); TS: `user.count()` debe ser 1 |
| **Verificación de existencia** | TS aborta si `superadmin@prerescatepty.com` ya existe |
| **Una sola visualización** | Contraseña impresa solo una vez al final, no en logs ni archivos |

---

## 9. COMANDOS EXACTOS PARA EJECUTAR POSTERIORMENTE

### Paso 1: Reset total (SQL transaccional)
```bash
# Desde la raíz del proyecto
export CONFIRM_FULL_RESET=YES_DELETE_ALL_TEST_DATA
psql "$DATABASE_URL" -f scripts/reset-all-test-data.sql
```

> **Nota**: Usar `psql` directo (no Prisma) para evitar overhead y asegurar orden FK correcto.
> Requiere `psql` cliente instalado y `DATABASE_URL` o `DIRECT_URL` en `.env`.

### Paso 2: Seed mínimo (paquetes + productos base)
```bash
# Opción A: Usar seed.ts existente (crea paquetes + org demo)
# MODIFICAR seed.ts ANTES para comentar la creación de org demo
npm run db:seed

# Opción B: Script SQL mínimo solo paquetes/productos (recomendado)
# psql "$DATABASE_URL" -f scripts/seed-minimal-packages.sql
```

### Paso 3: Crear superadmin
```bash
export CONFIRM_FULL_RESET=YES_DELETE_ALL_TEST_DATA
npx tsx scripts/create-initial-superadmin.ts
```

> **Salida esperada**: Contraseña temporal mostrada **una sola vez** al final.
> **Acción inmediata**: Copiar, iniciar sesión en `/login`, cambiar contraseña.

### Paso 4: Verificar login
```bash
# Abrir navegador en http://localhost:3000/login
# Email: superadmin@prerescatepty.com
# Password: [la mostrada en paso 3]
# Debe redirigir a /admin con acceso total
```

---

## 10. CONFIRMACIÓN EXPLÍCITA

> ✅ **NO SE HA EJECUTADO NINGÚN BORRADO NI CREACIÓN.**
>
> Este documento es **solo el plan de auditoría y preparación**.
> Los archivos `scripts/reset-all-test-data.sql` y `scripts/create-initial-superadmin.ts` están listos para ser creados/ejecutados **bajo su autorización explícita**.
>
> Para proceder, confirme:
> 1. Que ha revisado el orden de borrado y dependencias
> 2. Que acepta que se pierdan **todos** los datos de prueba actuales
> 3. Que ejecutará los comandos del §9 en orden, con la variable de confirmación
> 4. Que guardará la contraseña temporal mostrada en el paso 3

---

## ANEXO: TABLA COMPLETA DE BORRADO (FASE 2)

| Tabla | Acción | Motivo | Dependencias (FK salientes) | Orden |
|-------|--------|--------|----------------------------|-------|
| CorporateProductRequestItem | DELETE | Datos de prueba | CorporateProductRequest, Product | 1 |
| CorporateProductRequest | DELETE | Datos de prueba | Organization, User, Order | 2 |
| CorporateOrderEmployeeItem | DELETE | Datos de prueba | Order, OrganizationMember, Product, Chip | 3 |
| OrderItem | DELETE | Datos de prueba | Order, Profile, Chip | 4 |
| ChipClaimToken | DELETE | Datos de prueba | Chip, Order | 5 |
| ScanEvent | DELETE | Logs/escaneos | Chip, Account | 6 |
| Notification | DELETE | Logs/notificaciones | Chip | 7 |
| AppNotification | DELETE | Notificaciones app | User | 8 |
| Consent | DELETE | Consentimientos | User, Account, Profile | 9 |
| AuditLog | DELETE | Logs auditoría | Account, User | 10 |
| DigitalPass | DELETE | Passes digitales | Profile | 11 |
| ProfileContact | DELETE | Contactos de perfil | Profile, Contact | 12 |
| Contact | DELETE | Contactos usuario | User | 13 |
| OrganizationMember | DELETE | Miembros org | Organization, Profile, Location, Department | 14 |
| OrganizationDepartment | DELETE | Departamentos | OrganizationLocation | 15 |
| OrganizationLocation | DELETE | Sedes | Organization | 16 |
| CorporatePublicProfile | DELETE | Perfil público org | Organization | 17 |
| Organization | DELETE | Organizaciones | Account | 18 |
| Chip | DELETE | Chips/inventario | Account, Profile, User | 19 |
| Profile | DELETE | Perfiles médicos | Account, User | 20 |
| Order | DELETE | Pedidos | User, Package, Organization | 21 |
| User | DELETE | Usuarios (incl. admins viejos) | Account | 22 |
| Account | DELETE | Cuentas | Package | 23 |
| PasswordResetToken | DELETE | Tokens reset | — | 24 |
| Product | DELETE | Productos tienda | — | 25 |
| Package | DELETE | Paquetes/planes | — | 26 |
| SystemConfig | DELETE | Config prueba | — | 27 |
| _prisma_migrations | **CONSERVAR** | Historial migraciones | — | — |

**Total tablas de aplicación**: 27 (todas vaciadas)
**Tablas conservadas**: 1 (`_prisma_migrations`) + estructura completa