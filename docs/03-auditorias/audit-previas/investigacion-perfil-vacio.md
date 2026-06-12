# INVESTIGACIÓN FORENSE — INCIDENTE PERFIL MÉDICO VACÍO

**Fecha:** 6 de mayo 2026  
**Método:** Revisión exhaustiva de código fuente (read-only)  
**Incidente:** Usuario actualizó perfil médico la semana pasada. Hoy apareció vacío.

---

## 0. Estado del Repo

| Ítem | Resultado |
|---|---|
| **Branch** | `master` |
| **Último commit** | `ca32955` — Protect corporate medical profile during loading |
| **Working tree** | ✅ Limpio (solo docs sin commit) |
| **Typecheck** | ✅ Sin errores |
| **Sync con origin** | `0 0` |

---

## 1. Veredicto

**A. Datos realmente sobrescritos en DB — causa confirmada**

Se identificó un **bug concreto** en `ProfileRepository.upsertByUserId()` que puede sobrescribir campos médicos cifrados con strings vacíos cuando un usuario guarda cambios NO médicos desde Configuración.

**Gravedad: P1** (no P0 porque requiere una acción específica del usuario y no afecta a todos los perfiles siempre)

---

## 2. La Causa Raíz: `in` operator vs `!== undefined`

### El bug

En `domains/profiles/repositories/profile.repository.ts`, método `upsertByUserId()` (líneas 194-248):

```typescript
const updateData: any = { ...data };
if ("bloodType" in data) updateData.bloodType = encrypt(data.bloodType || "");
if ("allergies" in data) updateData.allergies = encrypt(data.allergies || "");
// ... same for 13 encrypted fields
```

**Problema:** El operador `in` verifica si la **key** existe en el objeto, no si el **valor** es distinto de `undefined`. Cuando un objeto se construye por destructuring, todas las keys están presentes incluso si sus valores son `undefined`.

### Cómo ocurre

1. Usuario va a **Configuración** (`/dashboard/configuracion`)
2. Edita solo el nombre o teléfono (campos no médicos)
3. El frontend envía `PATCH /api/users/profile` con body `{ firstName: "Juan", lastName: "Pérez", phone: "+507..." }`
4. El backend (api/users/profile/route.ts líneas 96-124) llama:
```typescript
const profile = await ProfileRepository.upsertByUserId(userId, {
  firstName,        // "Juan"
  lastName,         // "Pérez"  
  bloodType,        // undefined (no enviado)
  allergies,        // undefined (no enviado)
  chronicConditions, // undefined (no enviado)
  // ... todos los campos médicos son undefined
});
```
5. `upsertByUserId` recibe `{ firstName: "Juan", bloodType: undefined, allergies: undefined, ... }`
6. `"bloodType" in data` → **`true`** (la key existe, aunque el valor sea `undefined`)
7. `encrypt(undefined || "")` → `encrypt("")` → **`""`**
8. Prisma escribe `bloodType: ""` en DB → **EL DATO CIFRADO ORIGINAL SE PIERDE**

### Por qué pasa solo a veces

- No todos los usuarios usan Configuración
- Si el usuario nunca edita desde Configuración después de crear su perfil, los datos médicos se conservan
- Si el usuario edita nombre/teléfono/dirección desde Configuración, **todos los campos médicos se sobrescriben con vacío**
- Esto explica por qué es intermitente y difícil de reproducir

### Diferencia con el otro endpoint

El endpoint `PATCH /api/users/perfiles-medicos/[profileId]` **SÍ es seguro** porque usa:
```typescript
...(bloodType !== undefined && { bloodType }),
```
Este patrón excluye keys `undefined`, por lo que `in` nunca las encuentra.

---

## 3. ¿A qué perfiles afecta?

| Perfil | ¿Afectado? | Explicación |
|---|---|---|
| **Personal** (propio del usuario) | **✅ Sí** | Configuración edita `/api/users/profile` que llama a `upsertByUserId` |
| **Familiar** | ❌ No | Configuración nunca toca perfiles familiares |
| **Corporate** | ❌ No | Configuración nunca toca perfiles corporativos |

**El incidente reportado corresponde a un perfil PERSONAL** (propio del usuario), no corporate ni familiar.

---

## 4. ¿Por qué "la semana pasada"?

- El usuario hizo un cambio en Configuración (nombre, teléfono, dirección o foto)
- Al guardar, `upsertByUserId` sobrescribió sus campos médicos con vacío
- Hoy, al revisar su perfil, nota que los campos están vacíos
- No hay pérdida progresiva — fue una sola escritura destructiva

---

## 5. ¿Hay otros caminos peligrosos?

### 5.1 AccountStateService — NO modifica perfiles
Revisado: solo lectura, nunca escribe. ✅

### 5.2 Scripts/backfills — Solo tocan `chip.assignedProfileId`
`scripts/backfill-corporate-chip-profiles.ts` solo modifica `Chip.assignedProfileId`, nunca `Profile`. ✅

### 5.3 Organizaciones/actions/route.ts — Usa `||` en vez de `??`
Líneas 217-229: 
```typescript
bloodType: bloodType || member.profile.bloodType,
allergies: allergies ?? member.profile.allergies,
```
- `bloodType` usa `||`: si el frontend envía `""`, se pierde (porque `""` es falsy). **Riesgo menor.**
- `allergies` usa `??`: seguro, preserva valor existente si no se envía.

### 5.4 Upload de foto — Solo modifica `photoUrl`
✅ Correcto, solo `profile.update({ photoUrl })`.

### 5.5 Escaneo público — Solo modifica `lastScanAt` y `lastScanLocation`
✅ Correcto.

### 5.6 Orden de compra — Solo address/city
`api/orders/route.ts` solo actualiza `address` y `city` del perfil. ✅

---

## 6. Confirmación del flujo completo del bug

```
PATCH /api/users/profile
  → profileUpdateSchema.partial().safeParse(body)  // Zod solo valida campos presentes
  → destructuring de body (firstName, lastName, bloodType, allergies... todos undefined excepto los enviados)
  → ProfileRepository.upsertByUserId(userId, { firstName, lastName, bloodType: undefined, ... })
    → const updateData: any = { ...data }  // { firstName: "Juan", lastName: "Pérez", bloodType: undefined }
    → if ("bloodType" in data) → TRUE (undefined IS in the object)
    → encrypt(undefined || "") → encrypt("") → ""
    → prisma.profile.upsert({ update: { bloodType: "" } })  // DATO BORRADO
```

---

## 7. ¿Por qué no se detectó antes?

- El patrón `"field" in data` es sutil: funciona correctamente cuando los valores vienen de un objeto JSON parseado (como en `perfiles-medicos/[profileId]` donde el body se pasa directamente), pero falla cuando se construye un objeto por destructuring con variables undefined
- El otro endpoint (`perfiles-medicos/[profileId]`) usa el patrón seguro `!== undefined`
- Ninguna prueba unitaria captura este caso

---

## 8. Recomendación Inmediata

### Fix en `ProfileRepository.upsertByUserId()`

Cambiar el chequeo de `"field" in data` a `data.field !== undefined`:

```typescript
// ANTES (BUG):
if ("bloodType" in data) updateData.bloodType = encrypt(data.bloodType || "");

// DESPUÉS (FIX):
if (data.bloodType !== undefined) updateData.bloodType = encrypt(data.bloodType || "");
```

Aplicar el mismo cambio para los 13 campos cifrados.

### Fix adicional en `api/users/profile/route.ts`

Alternativamente, o además, pasar solo los campos realmente presentes en lugar de destructurearlos todos:

```typescript
// Opción más limpia: construir el objeto con solo los campos que vinieron en el body
const updateFields: Record<string, unknown> = {};
if (firstName !== undefined) updateFields.firstName = firstName;
if (lastName !== undefined) updateFields.lastName = lastName;
// ... solo incluir campos que el frontend puede enviar realmente

const profile = await ProfileRepository.upsertByUserId(userId, updateFields);
```

### Verificar ENCRYPTION_KEY

Confirmar que `ENCRYPTION_KEY` es idéntica en todos los entornos. Si es distinta, `decrypt()` fallará retornando ciphertext raw, que también haría aparecer campos "vacíos" (ilegibles).

---

## 9. Prioridad

| Bug | Prioridad | Impacto |
|---|---|---|
| `upsertByUserId` sobrescribe campos con vacío | **P1** | Pérdida de datos médicos personales al guardar en Configuración |
| `actions/route.ts` usa `\|\|` para bloodType | **P2** | Similar pero solo aplica a acción organizacional específica |
| ENCRYPTION_KEY no versionada | **P3** | Riesgo de migración futura |

---

## 10. Próximo Paso Recomendado

**CORREGIR ProfileRepository.upsertByUserId()**

1. Cambiar `"field" in data` → `data.field !== undefined` para los 13 campos cifrados.
2. Opcional: en `api/users/profile/route.ts`, no pasar campos no solicitados.
3. Ejecutar typecheck + build.
4. Commit + push.

**No modificar ningún otro módulo.** El resto del panel cliente está listo para congelar.

---
*Originalmente en: docs/audit/*