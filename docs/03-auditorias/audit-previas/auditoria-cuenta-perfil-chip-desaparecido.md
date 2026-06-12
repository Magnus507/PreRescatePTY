# Auditoría urgente — Cuenta perdió perfil/chip y muestra error de sincronización

## Resumen

**Este es un análisis de código. Para confirmar la causa exacta se necesita acceso a la base de datos del usuario afectado (email y accountId).**

Se identificaron 3 escenarios probables y 1 escenario de cache, detallados abajo.

---

## 1. Código auditado

| Archivo | Rol |
|:---|---|
| `app/(app)/dashboard/perfiles-medicos/page.tsx` (904 L) | Cliente — panel de perfiles médicos |
| `app/(app)/dashboard/chips/page.tsx` (472 L) | Cliente — panel de chips |
| `app/api/users/perfiles-medicos/route.ts` (207 L) | API — GET/POST perfiles médicos |
| `app/api/users/perfiles-medicos/[profileId]/route.ts` (228 L) | API — GET/PATCH/DELETE perfil individual |
| `app/api/chips/dashboard/route.ts` (200 L) | API — GET/PATCH chips del dashboard cliente |
| `app/api/chips/activate/route.ts` (352 L) | API — activación de chips |
| `domains/profiles/repositories/profile.repository.ts` (290 L) | Repositorio de perfiles con encrypt/decrypt |
| `domains/accounts/services/account-state.service.ts` (232 L) | Servicio de estado de cuenta con Redis |
| `domains/accounts/account.types.ts` | Tipos de AccountState |

---

## 2. Flujo de carga: Perfiles Médicos

```
GET /api/users/perfiles-medicos
  → AccountStateService.getAccountState(userId)  ← ¿tiene accountId?
    → si no: retorna { ownProfile: null, familyProfiles: [], state }
  → ProfileRepository.findAllByAccount(accountId) ← busca perfiles por accountId
    → si no: retorna []
  → Agrupa: ownProfile (userId match), familyProfiles (resto), corporateProfiles
```

**Punto crítico: `AccountStateService.getAccountState`**

En `account-state.service.ts:101`:
```ts
const user = (await prisma.user.findUnique({
  where: { id: userId },
  include: { profile: true, account: { include: { package: true } } }
})) as UserWithAccount | null;
```

Si `user.accountId` es `null` (línea 172):
```ts
accountId: user.accountId || null,
```

→ `state.accountId = null` → en GET perfiles (línea 23):
```ts
if (!state.accountId) {
  return ApiResponse.success({ ownProfile: null, familyProfiles: [], corporateProfiles: [], state });
}
```

→ **Perfiles y chips no cargan, pero tampoco hay error 500.** El frontend ve `ownProfile: null` y muestra *"Sin Configuración Médica"*.

---

## 3. Flujo de carga: Chips del dashboard

```
GET /api/chips/dashboard
  → AccountStateService.getAccountState(userId)
  → si state.accountId es null: retorna { chips: [], state }
  → si no: prisma.chip.findMany({ where: { accountId: state.accountId } })
```

**Mismo punto crítico.** Si `accountId` es null → chips vacío.

---

## 4. Posibles causas (ordenadas por probabilidad)

### 🔴 Escenario A (ALTA probabilidad): `accountId` del User es null

**Síntomas:**
- Perfiles Médicos → *"Sin Configuración Médica"*
- Chips → vacío (0 chips)
- No hay error 500 ni toast de error
- El `state` se devuelve pero con `accountId: null`

**Causas posibles:**
1. **El usuario se registró pero la transacción no completó** `User.accountId = account.id` en `register/route.ts`
2. **Un admin ejecutó** `UPDATE "User" SET "accountId" = NULL` manualmente o vía script
3. **El usuario fue creado por un flujo admin** (ej: asignación directa) sin asignarle cuenta
4. **Migración o rollback** que reseteó la columna `accountId`

**Cómo verificarlo en DB:**
```sql
SELECT id, email, "accountId", role, status FROM "User" WHERE email = '<email del usuario>';
```
Si `accountId` es `NULL` → esta es la causa.

---

### 🟡 Escenario B (MEDIA probabilidad): Perfil/Chip fueron eliminados o desvinculados

**Síntomas:**
- `User.accountId` NO es null
- `Account` existe
- `Profile` no existe para ese `accountId`

**Causas posibles:**
1. **Admin ejecutó "Rehabilitar chip"** en el chip activado → `chip.ownerUserId = null`, `chip.accountId = null`, `chip.assignedProfileId = null`, `chip.status = "inventory"`, `chip.serviceEndDate = null`
2. **Admin ejecutó "Asignar directamente"** a otro usuario → el chip se reasigna
3. **Admin eliminó el perfil médico** del usuario (DELETE en `perfiles-medicos/[profileId]`)
4. **El chip fue "devuelto" desde punto de venta** → `status = "inventory"`, se limpian datos de dueño

**Cómo verificarlo en DB:**
```sql
-- Ver perfiles de la cuenta
SELECT * FROM "Profile" WHERE "accountId" = '<accountId>';
-- Ver chips de la cuenta
SELECT * FROM "Chip" WHERE "accountId" = '<accountId>';
```

---

### 🟡 Escenario C (MEDIA probabilidad): Cache de Redis devuelve estado obsoleto

**Síntomas:**
- Datos existen en DB pero el frontend muestra vacío
- La respuesta de `GET /api/users/perfiles-medicos` tiene `state.accountId = null` pero en DB el User sí tiene accountId

**Cómo ocurre:**
1. `AccountStateService.getAccountState(userId)` guarda en Redis con TTL 5 minutos
2. Si hubo un estado anterior donde `accountId` era `null`, y el cache no se invalidó
3. La función retorna el cache (línea 94): `if (cached) return cached;`

**Sin embargo**, esto es improbable porque:
- `AccountStateService.invalidateCache(userId)` se llama en:
  - Activación de chip (`activate/route.ts:324`)
  - Asignación de chip (`dashboard/route.ts:159`)
  - Creación/edición de perfil
  - Revisión de órdenes admin
- El TTL es solo 5 minutos (línea 212): `{ ex: 300 }`

**Cómo verificarlo:** Forzar invalidación del cache ejecutando la API o esperando 5 minutos.

---

### 🟢 Escenario D (BAJA probabilidad): Error de descifrado (encryption)

**Síntomas:**
- `Profile` existe en DB
- `ProfileRepository.decryptProfile` lanza error silencioso

**Análisis:** `decryptProfile` en `profile.repository.ts:9` usa `decrypt()` de `lib/encryption.ts`. Si la clave de encriptación cambió (nueva variable `ENCRYPTION_KEY` en `.env`), el decrypt fallaría.

**Sin embargo**, el error sería en el servidor (500), no un vacío silencioso. El perfil no se mostraría pero el frontend vería un error HTTP.

---

### 🟢 Escenario E (BAJA probabilidad): Cuenta/email incorrecto

**Síntomas:**
- "Error de sincronización" o toast específico
- El usuario cree que está viendo su cuenta pero en realidad es una cuenta distinta

**Análisis:** El `userId` viene del JWT/session (`getServerSession`), que a su vez viene del login. Si el usuario inició sesión con un email diferente al que usó para activar su chip, vería una cuenta diferente sin datos.

**Cómo verificarlo:** Confirmar con el usuario qué email usó para registrarse y qué email usó para iniciar sesión.

---

## 5. Mensajes de error en el código

### "Sin Configuración Médica"
- **Archivo:** `app/(app)/dashboard/perfiles-medicos/page.tsx:450`
- **Condición:** `!ownProfile && familyProfiles.length === 0`
- **No es un error** — es un estado vacío diseñado explícitamente

### "Error al cargar los perfiles médicos"
- **Archivo:** `app/(app)/dashboard/perfiles-medicos/page.tsx:167`
- **Disparado por:** cualquier `catch` en `loadProfiles()`
- **Esto sí sería visible como toast error**

### "Error de conexión" / "Error de conexión al servidor"
- **Archivo:** `app/(app)/dashboard/perfiles-medicos/page.tsx:258, 303`
- **Disparado por:** errores de red en fetch

### "No autorizado" (401)
- **Endpoint:** `GET /api/users/perfiles-medicos` → `ApiResponse.unauthorized()`
- Solo si la sesión no existe → improbable si el usuario está logueado

### "error de sincronización"
- **NO se encontró textualmente** en ningún archivo del frontend ni backend.
- Es probable que sea una paráfrasis del usuario combinando varios síntomas, o un mensaje de consola del browser de un error de red/cache.
- También podría ser un toast genérico de Next.js/SWR cuando falla un fetch con datos cacheados.

---

## 6. ¿Qué NO puede causar este problema?

| Cambio reciente | ¿Afecta perfiles o chips del cliente? |
|:---|---:|
| commit `ae0e5a6` — token expiry 10 años | ❌ Solo cambia `expiresAt` en token creation |
| commit `ac85053` — point of sale UI | ❌ Solo admin, no toca perfiles/chips cliente |
| commit `d61cb6a` — point of sale endpoints | ❌ Solo admin |
| Migraciones de punto de venta | ❌ No afectan tablas User, Profile, Chip |
| Cualquier cambio de los últimos commits | ❌ Ninguno toca `accountId`, perfiles o chips del dashboard cliente |

---

## 7. Diagnóstico recomendado en DB

```sql
-- PASO 1: Identificar al usuario
SELECT id, email, "accountId", role, status, "createdAt"
FROM "User" WHERE email = '<email del usuario>';

-- PASO 2: Si accountId existe, ver la cuenta
SELECT * FROM "Account" WHERE id = '<accountId>';

-- PASO 3: Perfiles de la cuenta
SELECT id, "accountId", "userId", "firstName", "lastName", "profileType", "createdAt"
FROM "Profile" WHERE "accountId" = '<accountId>';

-- PASO 4: Chips de la cuenta
SELECT id, "shortCode", "serialPublic", status, "ownerUserId", "accountId", "assignedProfileId", "activatedAt"
FROM "Chip" WHERE "accountId" = '<accountId>';

-- PASO 5: Audit logs del usuario (últimas acciones)
SELECT "createdAt", action, "entityType", "entityId", "oldValuesJson", "newValuesJson"
FROM "AuditLog"
WHERE "actorUserId" = '<userId>'
ORDER BY "createdAt" DESC
LIMIT 20;
```

---

## 8. Respuestas

### 1. ¿El usuario tiene accountId?
**Depende del Escenario A.** Si `accountId` es `null` en la tabla `User`, esa es la causa raíz. Si no es `null`, pasar al Escenario B o C.

### 2. ¿Existe el perfil médico en DB?
**Depende del Escenario B.** Si `Profile` no existe para ese `accountId`, fue borrado manualmente o por admin.

### 3. ¿Existe chip activado en DB?
**Depende del Escenario B.** Si `Chip` no existe para ese `accountId`, o existe pero con `status = "inventory"` (rehabilitado), esa es la causa.

### 4. ¿El chip está ligado al usuario correcto?
Se verifica con `Chip.ownerUserId = User.id`. Si el chip pertenece a otro `accountId`, el usuario no lo ve.

### 5. ¿El perfil está ligado a la cuenta correcta?
Se verifica con `Profile.accountId = User.accountId`. Si el perfil tiene un `accountId` distinto, no aparece. Esto puede pasar si el profile fue creado bajo otra cuenta y luego el user cambió de cuenta.

### 6. ¿El frontend está mostrando vacío por error de mapeo?
**NO.** El frontend mapea correctamente:
- `perfiles-medicos/page.tsx:158-159`: `setOwnProfile(pData.ownProfile)` y `setFamilyProfiles(pData.familyProfiles || [])`
- `perfiles-medicos/page.tsx:445`: condicional `(!ownProfile && familyProfiles.length === 0)` para mostrar vacío
- `chips/page.tsx:75`: `setChips(chipData.chips || [])`

No hay bug de mapeo.

### 7. ¿AccountStateService está fallando?
**Solo si el cache de Redis está corrupto** (Escenario C). Si `getAccountState` lanza error (USER_NOT_FOUND), el endpoint retorna 500, no un estado vacío silencioso. El frontend mostraría toast.

### 8. ¿Algún cambio reciente pudo romper la lectura?
**NO.** Ninguno de los commits recientes toca:
- `AccountStateService`
- `ProfileRepository`
- `GET /api/users/perfiles-medicos`
- `GET /api/chips/dashboard`
- La lógica de `accountId` en User

### 9. ¿Se puede reparar con script de sincronización?
**SÍ, si es Escenario A (accountId null):**

```sql
UPDATE "User"
SET "accountId" = (
  SELECT id FROM "Account"
  WHERE "ownerUserId" = "User".id
  LIMIT 1
)
WHERE "accountId" IS NULL AND id = '<userId>';
```

**SÍ, si es Escenario B (datos borrados):**
- Correr `scripts/backfill-corporate-chip-profiles.ts` si aplica
- O restaurar desde backup / re-crear perfil

**SÍ, si es Escenario C (cache corrupto):**
```ts
await AccountStateService.invalidateCache(userId);
// o esperar 5 minutos a que expire el TTL
```

### 10. ¿Qué fix mínimo recomiendas?

| Caso | Fix |
|:---|---|
| **A — accountId null** | Script SQL que asigna el `accountId` correcto al User, o recrear la cuenta |
| **B — datos borrados** | Restaurar perfil/chip desde backup, o forzar al usuario a re-crear perfil y re-activar chip con nuevo código |
| **C — cache corrupto** | Invalidar cache manualmente o esperar 5 min |
| **D — encryption key** | Verificar que `ENCRYPTION_KEY` no haya cambiado en `.env` |
| **E — email incorrecto** | Confirmar con el usuario su email de registro |

**Recomendación general inmediata:**
1. Ejecutar las queries de diagnóstico en la DB real
2. Identificar cuál escenario aplica
3. Ejecutar el script de reparación correspondiente
4. Invalidar cache: `await AccountStateService.invalidateCache(userId)`

---

## 9. Riesgos de cada fix

| Fix | Riesgo |
|:---|---:|
| `UPDATE "User" SET "accountId" = X` | Bajo si el `accountId` existe y es correcto |
| Restaurar perfil desde backup | Bajo si se mantiene el mismo `id` y `accountId` |
| Re-crear perfil manualmente | Ninguno — el usuario puede crear su perfil desde la UI |
| Re-activar chip | Requiere nuevo código de activación si el anterior expiró o fue usado |
| Invalidar cache Redis | Ninguno — solo fuerza re-lectura de DB |

---

*Documento generado el 10/6/2026 — Sin modificar código. Sin hacer commit.*

---
*Originalmente en: docs/audit/*