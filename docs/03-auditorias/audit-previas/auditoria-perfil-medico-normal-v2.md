# Auditoría — Perfil Médico Normal v2 y Ficha Médica Normal v2

> **Fecha:** 2026-10-06  
> **Propósito:** Auditar el estado actual de perfiles médicos normales (personales + familiares) y la ficha pública normal `/e/[shortCode]`, y diseñar la implementación de nuevos campos de vulnerabilidad, menores, comunicación asistida y retorno seguro.  
> **Regla fundamental:** NO tocar perfiles empresariales, fichas corporativas, panel empresa, colaboradores, flujo corporativo ni pedidos corporativos.

---

## 1. Alcance y exclusiones empresariales

### INCLUIDO (Solo normal)
| Componente | Archivo/Ruta |
|---|---|
| Gestor de perfiles normales | `app/(app)/dashboard/perfiles-medicos/page.tsx` |
| Formulario de perfil médico | `components/forms/MedicalProfileForm.tsx` |
| API perfiles normales (GET) | `app/api/users/perfiles-medicos/route.ts` |
| API perfil normal (GET/PATCH/DELETE) | `app/api/users/perfiles-medicos/[profileId]/route.ts` |
| Ficha pública normal | `app/(public)/e/[shortCode]/page.tsx` |
| API pública ficha | `app/api/public/[shortCode]/route.ts` |
| Schema Prisma (Profile) | `prisma/schema.prisma` (model Profile) |
| Validaciones Zod | `lib/validations.ts` |
| ProfileRepository | `domains/profiles/repositories/profile.repository.ts` |

### EXCLUIDO (No tocar)
| Componente | Razón |
|---|---|
| `app/(app)/dashboard/empresas/page.tsx` | Panel empresa |
| `app/(app)/dashboard/colaboradores/page.tsx` | Colaboradores corporativos |
| `app/(public)/e/[shortCode]/_components/IndustrialProfileView.tsx` | Ficha corporativa |
| `app/api/organizations/*` | Endpoints corporativos |
| `domains/orders/*` (flujo corporativo) | Pedidos corporativos |
| Cualquier lógica con `profileType: "corporate"` | Perfiles empresariales |

**Estado actual de separación:**  
- `ProfileRepository.findAllByAccount()` ya filtra `profileType: { not: "corporate" }`  
- La API `GET /api/users/perfiles-medicos` devuelve `corporateProfiles` en una propiedad separada, no mezclada con `ownProfile`/`familyProfiles`  
- La ficha pública `/e/[shortCode]` redirige perfiles `profileType === "corporate"` a `IndustrialProfileView`  
- Los endpoints de contacto (`[profileId]/contacts`) no discriminan por tipo de perfil → **riesgo bajo** pero tocar validar

---

## 2. Estado actual del gestor de perfiles normales

### `app/(app)/dashboard/perfiles-medicos/page.tsx`
- **Props del formulario (`emptyForm`)**: 24 campos (identidad, sangre, alergias, condiciones, medicamentos, seguro, médico, privacidad)
- **Interface `FamilyProfile`**: 23 campos + `assignedChips` + `profileType?`
- **Operaciones**: CRUD completo (crear, editar, eliminar), vinculación de chips, gestión de contactos de emergencia
- **Separación visual**: Muestra el perfil propio (`ownProfile`) y los perfiles familiares (`familyProfiles`). Los corporativos se cargan aparte pero **no se renderizan** en el listado principal.
- **Flujo mobile vs desktop**: Mobile usa wizard inline, desktop usa modal. El `MedicalProfileForm` detecta responsive y cambia entre wizard/grid.

### `components/forms/MedicalProfileForm.tsx`
- **Steps actuales (4)**:
  1. Identidad (nombre, alias, teléfono, cédula, sexo, fecha de nacimiento)
  2. Alerta médica (tipo de sangre, alergias, condiciones, medicamentos)
  3. Seguro y médico (aseguradora, póliza, hospital, médico)
  4. Privacidad (toggles de visibilidad pública)
- **Sin sección de vulnerabilidad / asistencia especial**
- **El paso 3** contiene dos sub-secciones: seguro y médico tratante + notas adicionales
- **Privacidad actual**: 5 toggles (aseguradora, hospital, médico, teléfono médico, notas adicionales)

### Campos actuales almacenados en BD (Prisma Profile):
```
firstName, lastName, displayNamePublic, birthDate, sex, bloodType,
allergies, chronicConditions, medications, additionalNotes,
isInsured, insuranceProvider, insurancePolicyNumber,
preferredHospital, insuranceEmergencyPhone,
primaryDoctorName, primaryDoctorPhone,
showInsuranceProviderPublic, showPreferredHospitalPublic,
showPrimaryDoctorPublic, showPrimaryDoctorPhonePublic,
showAdditionalNotesPublic,
phone, nationalId, address, city,
profileVisibilityStatus, photoUrl,
profileType (personal / family / corporate)
```

---

## 3. Estado actual de la ficha médica normal

### `app/(public)/e/[shortCode]/page.tsx`

**Interface `EmergencyProfile`:**
```typescript
interface EmergencyProfile {
  firstName, lastName, displayName, sex, age, profileType?,
  bloodType, allergies, chronicConditions, medications,
  photoUrl, isVerifiedAdmin?,
  emergencyContacts: { fullName, relationship, phone }[],
  organization?: { name, location, department } | null,
  publicMedicalExtras?: {
    insuranceProvider, preferredHospital,
    primaryDoctorName, primaryDoctorPhone,
    emergencyInstructions
  }
}
```

**Flujo actual:**
1. Pregunta "¿Eres paramédico?" → define `isParamedic`
2. Si `profileType === "corporate"` → renderiza `IndustrialProfileView` (excluido)
3. Si NO es paramédico → vista ciudadano
4. Si es paramédico → vista médica extendida

**Vista Ciudadano:**
- Botón 911
- `PatientMedicalCard` (foto, nombre, sangre, edad, sexo)
- Protocolo ciudadano (instrucciones genéricas)
- Contactos de emergencia (teléfono + WhatsApp)
- Sin badges de vulnerabilidad

**Vista Paramédico:**
- `PatientMedicalCard` (igual que ciudadano)
- Detalle alergias/condiciones/medicamentos (visible en desktop e info adicional)
- `publicMedicalExtras` (seguro, hospital, médico, instrucciones) **solo si toggles activados**
- Contactos de emergencia al final
- Sin badges de vulnerabilidad / minor / no verbal

**Campos que se muestran actualmente:**
- **Siempre:** nombre, alias, sangre, sexo, edad
- **Condicional (toggles de privacidad):** aseguradora, hospital, médico, teléfono médico, instrucciones especiales
- **Solo paramédico:** alergias, condiciones, medicamentos
- **Nunca:** email, birthDate exacta, IDs internos

---

## 4. Separación con perfiles empresariales

Confirmado que la separación actual es correcta:

| Aspecto | Normal | Corporativo |
|---|---|---|
| `profileType` | `"personal"` o `"family"` | `"corporate"` |
| findAllByAccount | Filtra `NOT corporate` | No se incluye |
| Ficha pública | Renderiza página normal | Renderiza `IndustrialProfileView` |
| GET perfiles-medicos | `ownProfile` + `familyProfiles` | `corporateProfiles` (prop separada) |
| DELETE perfil | Permite eliminar (con restricciones) | Bloquea eliminación |
| OrganizationMember | No aplica | Vinculado vía `corporateProfileId` |

**Conclusión:** La separación es sólida. Los nuevos campos solo deben aplicarse a perfiles con `profileType !== "corporate"`. Esto debe validarse en:
- Backend (repositorio/controladores)
- Frontend (formulario, ficha pública)
- Validaciones Zod (no aplicar validaciones nuevas a corporate)

---

## 5. Campos nuevos propuestos — Validación

| Campo Propuesto | Tipo | Requiere Migración | ¿Cifrar? | ¿Público? | Toggle Privacidad | Recomendación |
|---|---|---|---|---|---|---|
| `cognitiveImpairment` | Boolean default false | ✅ Sí | ❌ No | ❌ No directamente | Solo badges controlados por `showVulnerabilityStatusPublic` | ✅ APROBADO. Renombrar a `hasCognitiveImpairment` para claridad semántica (prefijo `has`) |
| `isVulnerable` | Boolean default false | ✅ Sí | ❌ No | ❌ No directamente | Mismo toggle `showVulnerabilityStatusPublic` | ⚠️ REDUNDANTE. `cognitiveImpairment` + `wanderingRisk` + `isNonVerbal` ya cubren vulnerabilidad. Eliminar o fusionar. **Propuesta: Eliminar `isVulnerable`, usar combinación de flags + `isMinor` como indicador compuesto** |
| `wanderingRisk` | Boolean default false | ✅ Sí | ❌ No | ❌ No directamente | Mismo toggle `showVulnerabilityStatusPublic` | ✅ APROBADO. Renombrar a `hasWanderingRisk` |
| `isMinor` | Boolean default false | ✅ Sí | ❌ No | ❌ No (pero afecta visualización) | No aplica toggle. Se deriva de `birthDate` + flag manual | ⚠️ DISCUTIBLE. `isMinor` debería **calcularse automáticamente** desde `birthDate` y no ser un campo BD independiente para evitar inconsistencia. **Propuesta: NO almacenar `isMinor` en BD. Calcular edad en backend/frontend. Agregar `showMinorProtection` (Boolean) como toggle de privacidad para ocultar edad exacta.** |
| `isNonVerbal` | Boolean default false | ✅ Sí | ❌ No | ❌ No directamente | Controlado por `showCommunicationStatusPublic` | ✅ APROBADO. Renombrar a `isNonVerbal` (se mantiene) |
| `communicationAssistance` | String? | ✅ Sí | ✅ Sí (dato sensible) | ✅ Solo si `showCommunicationStatusPublic = true` | Mismo toggle `showCommunicationStatusPublic` | ✅ APROBADO. Se cifra como los demás campos médicos |
| `emergencyContactInstructions` | String? | ✅ Sí | ✅ Sí (contiene datos familiares) | ✅ Solo si hay toggle | Agregar toggle `showSafeReturnPublic` | ⚠️ RENOMBRAR a `safeReturnInstructions` para alinearse con concepto "Retorno seguro" |
| `showVulnerabilityStatusPublic` | Boolean default false | ✅ Sí | ❌ No | Controla visibilidad de badges de vulnerabilidad | N/A (es el toggle mismo) | ✅ APROBADO |
| `showCommunicationStatusPublic` | Boolean default false | ✅ Sí | ❌ No | Controla visibilidad de badges de comunicación | N/A (es el toggle mismo) | ✅ APROBADO. Agregar también `showSafeReturnPublic` (Boolean default false) |

### Campos finales recomendados (9 nuevos en Prisma):

```prisma
// Asistencia especial / Vulnerabilidad
hasCognitiveImpairment  Boolean  @default(false)
hasWanderingRisk        Boolean  @default(false)
isNonVerbal             Boolean  @default(false)

// Comunicación asistida
communicationAssistance String?  // Cifrado

// Retorno seguro
safeReturnInstructions  String?  // Cifrado

// Toggles de privacidad
showVulnerabilityStatusPublic  Boolean  @default(false)
showCommunicationStatusPublic  Boolean  @default(false)
showSafeReturnPublic           Boolean  @default(false)
```

**CAMPO ELIMINADO:** `isVulnerable` (redundante)  
**CAMPO NO ALMACENADO:** `isMinor` (se calcula desde `birthDate`)  
**CAMPO AGREGADO:** `showSafeReturnPublic` (toggle de privacidad faltante)

---

## 6. Migración Prisma requerida

### Archivo: `prisma/schema.prisma` — Modelo `Profile`

Agregar después de `showAdditionalNotesPublic` (línea 140 aprox.):

```prisma
// === ASISTENCIA ESPECIAL (v2) ===
hasCognitiveImpairment           Boolean   @default(false)
hasWanderingRisk                 Boolean   @default(false)
isNonVerbal                      Boolean   @default(false)
communicationAssistance          String?
safeReturnInstructions           String?

// === Toggles de privacidad (v2) ===
showVulnerabilityStatusPublic    Boolean   @default(false)
showCommunicationStatusPublic    Boolean   @default(false)
showSafeReturnPublic             Boolean   @default(false)
```

**Notas:**
- `communicationAssistance` y `safeReturnInstructions` deben **cifrarse** como los demás campos médicos (en `ProfileRepository`)
- Los Boolean con `@default(false)` no requieren backfill
- Crear migración: `npx prisma migrate dev --name add_assistencia_especial_v2`
- Los campos NO deben agregarse al modelo `CorporatePublicProfile`
- No se requiere migración en modelos corporativos

---

## 7. Cambios necesarios en APIs normales

### `app/api/users/perfiles-medicos/route.ts` (POST)
- Agregar los 9 nuevos campos al `safeBody` destructuring
- Pasarlos a `ProfileRepository.create()`
- Validar que `profileType` NO sea corporativo (ya implícito porque siempre crea perfiles normales)

### `app/api/users/perfiles-medicos/[profileId]/route.ts` (PATCH)
- Agregar los 9 nuevos campos al destructuring
- Pasarlos a `ProfileRepository.update()`
- Validar que el perfil existente NO sea corporativo antes de actualizar

### `app/api/users/perfiles-medicos/[profileId]/route.ts` (DELETE)
- No requiere cambios (ya bloquea corporate)

### API Pública `app/api/public/[shortCode]/route.ts` (GET)
- Agregar campos al `publicProfile` response:
  ```typescript
  vulnerabilityStatus: {
    hasCognitiveImpairment: profile.showVulnerabilityStatusPublic ? profile.hasCognitiveImpairment : null,
    hasWanderingRisk: profile.showVulnerabilityStatusPublic ? profile.hasWanderingRisk : null,
    isNonVerbal: profile.showCommunicationStatusPublic ? profile.isNonVerbal : null,
    communicationAssistance: profile.showCommunicationStatusPublic ? decrypt(profile.communicationAssistance) : null,
  },
  safeReturn: profile.showSafeReturnPublic ? {
    instructions: decrypt(profile.safeReturnInstructions),
  } : null,
  isMinor: calculateMinor(profile.birthDate), // Siempre calculado, nunca almacenado
  ```
- **NO mostrar edad exacta si `isMinor === true`** → cambiar a mostrar rango ("Menor de edad")
- Solo corporate: mantener exclusión explícita (no agregar estos campos a respuesta corporativa)

### `lib/validations.ts` — `profileUpdateSchema`
Agregar:
```typescript
hasCognitiveImpairment: z.boolean().optional(),
hasWanderingRisk: z.boolean().optional(),
isNonVerbal: z.boolean().optional(),
communicationAssistance: z.string().max(500).optional().nullable(),
safeReturnInstructions: z.string().max(1000).optional().nullable(),
showVulnerabilityStatusPublic: z.boolean().optional(),
showCommunicationStatusPublic: z.boolean().optional(),
showSafeReturnPublic: z.boolean().optional(),
```

### `domains/profiles/repositories/profile.repository.ts`
- Agregar `communicationAssistance` y `safeReturnInstructions` a:
  - `decryptProfile()` (descifrar)
  - `create()` (cifrar)
  - `update()` (cifrar condicional)
  - `upsertByUserId()` (cifrar)
- Los booleanos (`hasCognitiveImpairment`, `hasWanderingRisk`, `isNonVerbal`, toggles) NO se cifran

---

## 8. Cambios necesarios en formulario normal

### `components/forms/MedicalProfileForm.tsx`

**Opción recomendada:** Agregar un **nuevo paso (Step 5)** en el wizard y una **nueva sección** en grid:

**Nuevo paso: "Asistencia especial"** (entre paso 3 "Seguro y médico" y paso 4 "Privacidad")
- Los pasos actuales pasarían de 4 a 5
- Step 5: Privacidad (se mantiene, ahora sería step 5)

**Contenido del nuevo paso/sección "Asistencia especial":**

```
Sección: "Asistencia especial"
Descripción: "Información sobre condiciones que requieren atención especial durante una emergencia."

Checks:
☐ Persona vulnerable (deterioro cognitivo, Alzheimer, demencia)
  → Campo: hasCognitiveImpairment
☐ Riesgo de desorientación / extravío
  → Campo: hasWanderingRisk
☐ Persona no verbal / comunicación asistida
  → Campo: isNonVerbal
  → (condicional) Instrucciones de comunicación:
    TextArea → communicationAssistance

Sección: "Retorno seguro"
Descripción: "Instrucciones para ayudar a la persona a regresar con su familia."
  → TextArea: safeReturnInstructions
  → Toggle: showSafeReturnPublic

Nota: "Menor de edad" se detecta automáticamente por la fecha de nacimiento.
  → Toggle: showVulnerabilityStatusPublic (controla badges de vulnerabilidad)
  → Toggle: showCommunicationStatusPublic (controla badges de comunicación)
```

**Impacto en wizard:**
- Steps cambiarían de 4 a 5:
  1. Identidad
  2. Alerta médica
  3. Seguro y médico (se unifica: seguro + médico + notas adicionales)
  4. **Asistencia especial (NUEVO)**
  5. Privacidad (se agregan los nuevos toggles)

**Impacto en grid:**
- Nueva tarjeta "Asistencia especial" entre "Instrucciones especiales" y "Privacidad y visibilidad"
- En privacidad: agregar toggles para `showVulnerabilityStatusPublic`, `showCommunicationStatusPublic`, `showSafeReturnPublic`

**Impacto en interfaz `ProfileFormProps`:**
Agregar al interface:
```typescript
hasCognitiveImpairment: boolean;
hasWanderingRisk: boolean;
isNonVerbal: boolean;
communicationAssistance: string;
safeReturnInstructions: string;
showVulnerabilityStatusPublic: boolean;
showCommunicationStatusPublic: boolean;
showSafeReturnPublic: boolean;
```

**Actualizar `emptyForm` en `page.tsx`:**
Agregar los 7 nuevos campos (los boolean en false, strings en "")

### `app/(app)/dashboard/perfiles-medicos/page.tsx`
- Agregar campos al `emptyForm`
- Agregar campos al `editForm` mapping
- Agregar campos al `FamilyProfile` interface
- Opcional: mostrar badges en `ProfileCard` si están activos (e.g., "Persona vulnerable" tag)

---

## 9. Cambios necesarios en ficha pública normal

### `app/(public)/e/[shortCode]/page.tsx`

**Interface `EmergencyProfile` — agregar:**
```typescript
vulnerabilityStatus?: {
  hasCognitiveImpairment: boolean | null;
  hasWanderingRisk: boolean | null;
  isNonVerbal: boolean | null;
  communicationAssistance: string | null;
} | null;
safeReturn?: {
  instructions: string | null;
} | null;
isMinor: boolean;
```

**Vista Ciudadano — agregar:**
- Badge "🛡️ Persona vulnerable" (si `showVulnerabilityStatusPublic && (hasCognitiveImpairment || hasWanderingRisk)`)
- Badge "👶 Menor de edad" (si `isMinor`)
- Badge "🔇 Comunicación asistida" (si `showCommunicationStatusPublic && isNonVerbal`)
- Sección "Retorno seguro" con instrucciones (si `showSafeReturnPublic`)
- Ocultar edad exacta si `isMinor`, mostrar "Menor de edad"

**Vista Paramédico — agregar:**
- Mismos badges que ciudadano
- `communicationAssistance` como instrucción visible
- `safeReturnInstructions` como instrucción visible
- Detalle de condición cognitiva en sección médica

**Reglas de visualización:**

| Badge/Info | Ciudadano | Paramédico | Requiere toggle |
|---|---|---|---|
| "Persona vulnerable" | ✅ Sí | ✅ Sí | `showVulnerabilityStatusPublic` |
| "Riesgo de extravío" | ✅ Sí | ✅ Sí | `showVulnerabilityStatusPublic` |
| "Menor de edad" | ✅ Siempre | ✅ Siempre | No (derivado de birthDate) |
| "Comunicación asistida" | ✅ Sí | ✅ Sí | `showCommunicationStatusPublic` |
| Instrucciones de comunicación | ❌ No | ✅ Sí | `showCommunicationStatusPublic` |
| Retorno seguro | ✅ Sí (botón/sección) | ✅ Sí | `showSafeReturnPublic` |
| Edad exacta si menor | ❌ Ocultar | ❌ Ocultar | No aplica |

---

## 10. Vista ciudadano vs paramédico — Diseño final

### Vista Ciudadano (en orden):
1. Banner 911
2. **PatientMedicalCard** (foto, nombre, sangre, edad*)
   - *si `isMinor`: "Menor de edad" en vez de edad numérica
3. **Badges de vulnerabilidad** (si toggles activados)
   - "Persona vulnerable" (si cognitiveImpairment || wanderingRisk)
   - "Riesgo de desorientación" (si wanderingRisk)
   - "Menor de edad" (si isMinor)
   - "Comunicación asistida" (si isNonVerbal)
4. Protocolo ciudadano
5. **Retorno seguro** (si showSafeReturnPublic)
   - Botón: "Ayudar a esta persona a contactar a su familia"
   - Instrucciones de retorno
6. Contactos de emergencia
7. Footer PreRescate

### Vista Paramédico (en orden):
1. Banner 911
2. **PatientMedicalCard** (foto, nombre, sangre, edad*)
   - *si `isMinor`: "Menor de edad"
3. **Badges de vulnerabilidad** (si toggles activados)
4. Tarjeta médica (alergias, condiciones, medicamentos)
5. Información adicional (seguro, hospital, médico)
6. **Instrucciones de comunicación** (si showCommunicationStatusPublic)
7. **Retorno seguro** (si showSafeReturnPublic)
8. Contactos de emergencia
9. Footer PreRescate

---

## 11. Privacidad y riesgos

### Análisis de riesgos

| Dato | Riesgo | Clasificación |
|---|---|---|
| Condición cognitiva (Alzheimer/demencia) | Alto: estigma social, discriminación | **Sensible.** Solo mostrar si toggle activado. Nunca mostrar en vista pública sin consentimiento explícito. |
| Riesgo de extravío | Medio: seguridad personal | Mostrar solo si toggle activado. Puede ser útil para ciudadanos que encuentren a la persona. |
| Menor de edad | Alto: seguridad infantil, privacidad | **Nunca mostrar edad exacta.** Mostrar "Menor de edad". No mostrar dirección. Fecha de nacimiento nunca pública. |
| Persona no verbal | Medio: condición médica | Mostrar solo si toggle activado. Instrucciones de comunicación solo a paramédicos. |
| Instrucciones de retorno seguro | Bajo: útil para rescate | Mostrar solo si toggle activado. Incluir solo información de contacto del familiar, no dirección. |
| Dirección | Alto: seguridad física | **Nunca mostrar dirección en ficha pública.** Actualmente no se muestra. Mantener así. |

### Matriz de visibilidad definitiva

| Dato | Siempre visible | Solo paramédico | Solo con toggle | Nunca visible |
|---|---|---|---|---|
| Nombre completo | ✅ | — | — | — |
| Alias público | ✅ | — | — | — |
| Tipo de sangre | ✅ | — | — | — |
| Edad (no exacta si menor) | ✅ | — | — | — |
| Sexo | ✅ | — | — | — |
| Foto | ✅ | — | — | — |
| Alergias | — | ✅ | — | — |
| Condiciones crónicas | — | ✅ | — | — |
| Medicamentos | — | ✅ | — | — |
| Aseguradora | — | — | ✅ showInsuranceProviderPublic | — |
| Hospital preferido | — | — | ✅ showPreferredHospitalPublic | — |
| Médico tratante | — | — | ✅ showPrimaryDoctorPublic | — |
| Teléfono médico | — | — | ✅ showPrimaryDoctorPhonePublic | — |
| Instrucciones especiales | — | — | ✅ showAdditionalNotesPublic | — |
| **Condición cognitiva** | — | ✅ (solo badge si toggle) | ✅ showVulnerabilityStatusPublic | — |
| **Riesgo extravío** | — | ✅ (solo badge si toggle) | ✅ showVulnerabilityStatusPublic | — |
| **Menor de edad (badge)** | ✅ (ocultar edad) | ✅ | — | Edad exacta |
| **No verbal (badge)** | — | — | ✅ showCommunicationStatusPublic | — |
| **Instrucciones comunicación** | — | ✅ | ✅ showCommunicationStatusPublic | — |
| **Retorno seguro** | — | — | ✅ showSafeReturnPublic | — |
| Dirección | — | — | — | ❌ NUNCA |
| Email | — | — | — | ❌ NUNCA |
| Fecha nacimiento exacta | — | — | — | ❌ NUNCA |
| Cédula/ID | — | — | — | ❌ NUNCA |
| Contactos de emergencia | — | ✅ | — | — |

---

## 12. Plan de implementación por commits

### Commit 1: Prisma + Backend (campos + migración)
**Archivos:**
- `prisma/schema.prisma` — Agregar 9 campos al modelo Profile
- `domains/profiles/repositories/profile.repository.ts` — Cifrado/descifrado de `communicationAssistance` y `safeReturnInstructions`
- `lib/validations.ts` — Agregar validación Zod de los 9 campos
- `app/api/users/perfiles-medicos/route.ts` — Agregar campos al POST
- `app/api/users/perfiles-medicos/[profileId]/route.ts` — Agregar campos al PATCH
- `app/api/public/[shortCode]/route.ts` — Agregar campos a respuesta pública + lógica `isMinor`

**Tiempo estimado:** 1-2 horas

### Commit 2: Formulario Perfil Médico normal
**Archivos:**
- `components/forms/MedicalProfileForm.tsx` — Nuevo paso "Asistencia especial" + nuevos toggles en privacidad
- `app/(app)/dashboard/perfiles-medicos/page.tsx` — Actualizar interfaces, emptyForm, editForm mapping

**Tiempo estimado:** 2-3 horas

### Commit 3: Ficha pública normal (badges + retorno seguro)
**Archivos:**
- `app/(public)/e/[shortCode]/page.tsx` — Badges de vulnerabilidad, badge menor, badge no verbal, sección retorno seguro, ocultar edad si menor

**Tiempo estimado:** 2-3 horas

### Commit 4: Ajustes de privacidad + validación final
**Archivos:**
- Validar que todos los endpoints normales excluyan `profileType: "corporate"` para estos campos
- Verificar que la ficha corporativa (`IndustrialProfileView`) NO reciba estos campos
- Pruebas de regresión
- Revisión de seguridad

**Tiempo estimado:** 1-2 horas

**Total estimado:** 6-10 horas de desarrollo efectivo

---

## 13. P0 / P1 / P2

### P0 — Imprescindible para lanzamiento
- [ ] Migración Prisma (9 campos)
- [ ] Backend: cifrado/descifrado en ProfileRepository
- [ ] Backend: validación Zod
- [ ] Backend: APIs POST/PATCH actualizadas
- [ ] Frontend: formulario con campos de vulnerabilidad
- [ ] Frontend: ficha pública muestra badges
- [ ] Privacidad: ocultar edad exacta si menor

### P1 — Importante pero no bloqueante
- [ ] Frontend: sección "Retorno seguro" en ficha pública
- [ ] Frontend: instrucciones de comunicación para paramédicos
- [ ] Frontend: toggles de privacidad en formulario

### P2 — Mejora futura
- [ ] Badges visuales en ProfileCard del dashboard
- [ ] Detección automática de menor de edad desde birthDate (frontend)
- [ ] Indicador visual en wizard mobile

---

## 14. Veredicto final

### Estado actual
El sistema de perfiles médicos normales y ficha pública está **bien estructurado y correctamente separado** de la lógica corporativa. La eliminación de perfiles corporativos del listado normal ya está implementada en `ProfileRepository.findAllByAccount()`. La ficha pública ya redirige correctamente los perfiles corporativos a una vista separada.

### Los campos propuestos originalmente requieren ajustes:
1. ❌ **Eliminar `isVulnerable`** — redundante, se compone de otros flags
2. ❌ **No almacenar `isMinor` en BD** — calcular desde `birthDate`
3. ✅ **Renombrar `cognitiveImpairment` → `hasCognitiveImpairment`**
4. ✅ **Renombrar `wanderingRisk` → `hasWanderingRisk`**
5. ✅ **Renombrar `emergencyContactInstructions` → `safeReturnInstructions`**
6. ✅ **Agregar `showSafeReturnPublic`** (toggle faltante)
7. ✅ **Mantener `isNonVerbal` y `communicationAssistance`**
8. ✅ **Cifrar** `communicationAssistance` y `safeReturnInstructions`

### Campos finales: 7 en BD + 2 calculados
**En BD (9 campos nuevos):**
1. `hasCognitiveImpairment Boolean default false`
2. `hasWanderingRisk Boolean default false`
3. `isNonVerbal Boolean default false`
4. `communicationAssistance String?` (cifrado)
5. `safeReturnInstructions String?` (cifrado)
6. `showVulnerabilityStatusPublic Boolean default false`
7. `showCommunicationStatusPublic Boolean default false`
8. `showSafeReturnPublic Boolean default false`

**Calculados (no en BD):**
- `isMinor` — calculado desde `birthDate`
- `isVulnerable` — `hasCognitiveImpairment || hasWanderingRisk` (indicador compuesto)

### Riesgos identificados
1. **Menores de edad**: No almacenar `isMinor` evita inconsistencias, pero requiere calcular en cada consulta pública
2. **Dirección**: Actualmente no se muestra en ficha pública. Mantener así.
3. **Condición cognitiva**: Dato altamente sensible. El toggle `showVulnerabilityStatusPublic` debe estar **desactivado por defecto** y el formulario debe advertir al usuario.
4. **Corporate exclusion**: Verificar que `GET /api/public/[shortCode]` no exponga estos campos para perfiles corporativos (actualmente corporate tiene su propio flujo, pero validar que no se filtren)
5. **Backfill**: Los nuevos booleanos tienen `@default(false)`, no requieren backfill. Los nuevos String son opcionales.

### Conclusión
El proyecto está listo para implementar. La arquitectura actual soporta los cambios sin necesidad de refactor mayor. La separación normal/corporativo es correcta y se mantiene. Se recomienda seguir el plan de 4 commits respetando el orden P0 → P1 → P2.

---
*Originalmente en: docs/audit/*