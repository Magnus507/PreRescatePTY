# AUDITORÍA COMPLETA — FICHAS MÉDICAS PÚBLICAS
**PreRescatePTY** · 6 de febrero de 2026

---

## 1. RESUMEN EJECUTIVO

| Concepto | Resultado |
|---|---|
| **Rutas de ficha médica pública** | 1 ruta: `/e/[shortCode]` |
| **API pública** | `GET /api/public/[shortCode]` |
| **4 variantes esperadas** | **NO están todas soportadas correctamente** |
| **Variantes que existen:** | Ciudadano normal, Paramédico normal, Empresarial (unificada) |
| **Variantes faltantes:** | Ciudadano empresarial, Paramédico empresarial |

### Las 4 variantes reales vs esperadas

| Variante esperada | ¿Existe? | Comentario |
|---|---|---|
| Ciudadano normal | ✅ Sí | `!profile.organization && !isParamedic` |
| Paramédico normal | ✅ Sí | `!profile.organization && isParamedic` |
| Ciudadano empresarial | ❌ **NO** | IndustrialProfileView se renderiza sin toggle ciudadano/paramédico |
| Paramédico empresarial | ❌ **NO como variante separada** | IndustrialProfileView muestra todo a cualquier visitante |

---

## 2. ARQUITECTURA ACTUAL

### 2.1 Rutas
```
app/(public)/e/[shortCode]/page.tsx                     → Componente principal EmergencyPage
app/(public)/e/[shortCode]/_components/IndustrialProfileView.tsx  → Vista empresarial
```

### 2.2 API
```
GET  /api/public/[shortCode]     → Retorna perfil público (no requiere auth)
POST /api/public/[shortCode]/scan → Registra escaneo (no requiere auth)
```

### 2.3 Cómo se decide normal vs empresarial

**En el API (`/api/public/[shortCode]/route.ts`):**
- Se consulta `chip.assignedProfile` con includes `organizationMembers` donde `memberStatus === "active"`
- Si existe `organizationMembers[0]`, se incluye `organization: { name: orgMember.organization.legalName }` (SOLO legalName)
- Si `profile.profileType === "corporate"`, se valida adicionalmente que `corporateStatus === "paid_active"`

**En la UI (`page.tsx`):**
```typescript
// Línea 357-359
if (profile.organization) {
  return <IndustrialProfileView profile={profile} scanLocation={scanLocation} />;
}
```
- Si `profile.organization` es truthy → renderiza IndustrialProfileView
- Si no → renderiza vista ciudadano/paramédico normal

### 2.4 Cómo se decide ciudadano vs paramédico

**No hay lógica del lado del servidor.** Es 100% client-side mediante un modal:

```typescript
// Líneas 333-355: Modal de elección
<button onClick={() => setIsParamedic(true)}>SÍ, soy Paramédico</button>
<button onClick={() => setIsParamedic(false)}>No, soy un Ciudadano</button>
```

- No existe query param, token, rol ni código que determine automáticamente la vista.
- **Cualquier persona puede autodeclararse paramédico** sin verificación.
- No hay rate limit ni auditoría de cuántas veces se accede en modo paramédico.

### 2.5 Componentes

| Componente | ¿Cuándo se renderiza? | ¿Qué contiene? |
|---|---|---|
| `EmergencyPage` (default) | Siempre | Orquesta toda la página, maneja loading/error/unactivated/choice |
| `PatientMedicalCard` | Vista normal (ambos roles) | Hero con foto, nombre, sangre, edad, sexo |
| `CriticalMedicalSummary` | (definido pero no usado en el flujo principal) | Resumen compacto sangre/edad/sexo + alergias/condiciones/meds |
| `IndustrialProfileView` | Perfiles con `profile.organization` | Hero empresarial + datos médicos + contactos |

---

## 3. MAPA DE CAMPOS (API → UI)

### 3.1 Lo que el API retorna (`/api/public/[shortCode]`)

```typescript
const publicProfile = {
  firstName, lastName, displayName, sex, age,
  bloodType, allergies, chronicConditions, medications,
  photoUrl, isVerifiedAdmin,
  organization: orgMember ? { name: orgMember.organization.legalName } : null,
  emergencyContacts: [ { fullName, relationship, phone } ],
  publicMedicalExtras: {
    insuranceProvider,           // respeta showInsuranceProviderPublic
    preferredHospital,           // respeta showPreferredHospitalPublic
    primaryDoctorName,           // respeta showPrimaryDoctorPublic
    primaryDoctorPhone,          // respeta showPrimaryDoctorPhonePublic
    emergencyInstructions,       // respeta showAdditionalNotesPublic
  },
};
```

### 3.2 Lo que NO retorna el API (correctamente excluido)

| Campo | ¿Excluido? | Correcto |
|---|---|---|
| `nationalId` | ✅ No retornado | ✅ |
| `insurancePolicyNumber` | ✅ No retornado | ✅ |
| `phone` | ✅ No retornado | ✅ |
| `email` | ✅ No retornado | ✅ |
| `employeeNationalId` | ✅ No retornado | ✅ |
| `employeeDepartment` | ✅ No retornado | ✅ |
| `employeePhone` | ✅ No retornado | ✅ |
| `accountId` | ✅ No retornado | ✅ |
| `userId` / `profile.id` | ✅ No retornado | ✅ |

### 3.3 Lo que el API NO retorna PERO la UI espera (BUG)

El tipo `EmergencyProfile` en `page.tsx` espera:
```typescript
organization?: {
  name: string;
  location: string | null;    // ← NUNCA se retorna desde el API
  department: string | null;  // ← NUNCA se retorna desde el API
} | null;
```

El API solo retorna `{ name: orgMember.organization.legalName }`.

**Impacto:** En `IndustrialProfileView`, las líneas 88-91 intentan mostrar `org.location` y `org.department`, que siempre serán `undefined`.

---

## 4. TABLA DE 4 VISTAS — MAPA COMPLETO DE CAMPOS

| Campo | Ciudadano normal | Paramédico normal | Ciudadano empresarial | Paramédico empresarial |
|---|---|---|---|---|
| **Nombre** (firstName + lastName) | ✅ Sí | ✅ Sí | ✅ Sí | ✅ Sí |
| **Alias** (displayName) | ✅ Sí (si≠inicial) | ✅ Sí (si≠inicial) | ✅ Sí (si≠inicial) | ✅ Sí (si≠inicial) |
| **Foto** (photoUrl) | ✅ Sí | ✅ Sí | ✅ Sí | ✅ Sí |
| **Edad** | ✅ Sí | ✅ Sí | ✅ Sí | ✅ Sí |
| **Sexo** | ✅ Sí | ✅ Sí | ✅ Sí | ✅ Sí |
| **Sangre** | ✅ Sí ⚠️ | ✅ Sí | ✅ Sí | ✅ Sí |
| **Alergias** | ❌ No | ✅ Sí | ✅ Sí ⚠️ | ✅ Sí |
| **Condiciones** | ❌ No | ✅ Sí | ✅ Sí ⚠️ | ✅ Sí |
| **Medicamentos** | ❌ No | ✅ Sí | ✅ Sí ⚠️ | ✅ Sí |
| **Aseguradora** | ❌ No | ✅ Sí (si toggle ON) | ✅ Sí (si toggle ON) ⚠️ | ✅ Sí (si toggle ON) |
| **Hospital preferido** | ❌ No | ✅ Sí (si toggle ON) | ✅ Sí (si toggle ON) ⚠️ | ✅ Sí (si toggle ON) |
| **Médico tratante** | ❌ No | ✅ Sí (si toggle ON) | ✅ Sí (si toggle ON) ⚠️ | ✅ Sí (si toggle ON) |
| **Teléfono médico** | ❌ No | ✅ Sí (si toggle ON) | ✅ Sí (si toggle ON) ⚠️ | ✅ Sí (si toggle ON) |
| **Instrucciones especiales** | ❌ No | ✅ Sí (si toggle ON) | ✅ Sí (si toggle ON) ⚠️ | ✅ Sí (si toggle ON) |
| **Contactos de emergencia** | ✅ Sí | ✅ Sí | ✅ Sí | ✅ Sí |
| **Organización** | N/A | N/A | ✅ Sí | ✅ Sí |
| **Ubicación** (org.location) | N/A | N/A | ❌ **Siempre null** (API bug) | ❌ **Siempre null** (API bug) |
| **Departamento** (org.department) | N/A | N/A | ❌ **Siempre null** (API bug) | ❌ **Siempre null** (API bug) |

### Leyenda
- ✅ Sí = Se muestra correctamente
- ❌ No = No se muestra
- ⚠️ = Posible problema de privacidad o bug
- N/A = No aplica

---

## 5. HALLAZGOS CRÍTICOS

### 🔴 HALLAZGO 1: IndustrialProfileView no separa ciudadano vs paramédico (CRÍTICO)

**Archivo:** `app/(public)/e/[shortCode]/page.tsx` línea 357-359

```typescript
if (profile.organization) {
  return <IndustrialProfileView profile={profile} scanLocation={scanLocation} />;
}
```

**Problema:** Esta condición corta toda la lógica de `isParamedic`. El IndustrialProfileView muestra **todo el contenido médico** (alergias, condiciones, medicamentos, seguro, médico, hospital) **a cualquier persona**, sin importar si es ciudadano o paramédico.

**Las 4 variantes esperadas no existen. Solo existen 3:**
1. Ciudadano normal (contenido restringido ✅)
2. Paramédico normal (contenido completo ✅)
3. **Empresarial (sin distinción de rol — contenido completo para todos ❌)**

**Riesgo:** Un ciudadano escanea un chip empresarial y ve datos médicos sensibles sin restricción.

---

### 🔴 HALLAZGO 2: Sangre visible en vista ciudadano normal (ALTO)

**Archivo:** `app/(public)/e/[shortCode]/page.tsx` líneas 126-129

En la vista ciudadano, `PatientMedicalCard` se renderiza mostrando **tipo de sangre** en el hero. Aunque es un dato relativamente bajo en sensibilidad, el diseño conceptual pareciera haber querido que sangre se viera solo en vista paramédico, o al menos debería tener toggle (no existe `showBloodTypePublic` en el modelo).

---

### 🟡 HALLAZGO 3: Falta organización.location y organization.department en API (MEDIO)

**Archivo:** `app/api/public/[shortCode]/route.ts` líneas 210-212

```typescript
organization: orgMember ? {
  name: orgMember.organization.legalName,
} : null,
```

**Problema:** El API no retorna `location` ni `department`, pero el componente `IndustrialProfileView` los usa:
```typescript
{org.location || "Sede Central"}
{org.department || "Operaciones"}
```

Siempre mostrará los valores por defecto "Sede Central" / "Operaciones".

---

### 🟡 HALLAZGO 4: El modal paramédico no tiene verificación (MEDIO)

Cualquier persona puede hacer clic en "SÍ, soy Paramédico" y ver datos médicos completos. No hay:
- Autenticación
- Token temporal
- Validación de identidad
- Audit trail de acceso en modo paramédico
- Rate limit específico para cambios de rol

---

### 🟢 HALLAZGO 5: Sin bloqueo corporativo por estados intermedios (BAJO)

El API (líneas 125-142) bloquea cualquier `corporateStatus !== "paid_active"` con 403. Pero la UI no muestra un mensaje descriptivo que diferencie entre:
- `suspended` → "Suspendido por la empresa"
- `archived` → "Dado de baja"
- `rejected_by_company` → "Rechazado"
- `pending_company_review` → "Pendiente de aprobación"
- `approved_unpaid` → "Aprobado pero sin pago"

Todos reciben el mismo mensaje genérico: "Perfil empresarial no disponible".

---

### 🟢 HALLAZGO 6: No se puede iniciar llamada 911 desde vista empresarial (BAJO)

IndustrialProfileView tiene botón de llamada a 911, pero no tiene el botón "Soy personal médico" que sí tiene la vista normal para cambiar de ciudadano a paramédico. Como no hay toggle, la vista empresarial es idéntica para todos.

---

### 🟢 HALLAZGO 7: Contactos de emergencia visibles para ciudadano y paramédico en todas las vistas (BAJO-MEDIO)

Los contactos de emergencia aparecen en TODAS las vistas:
- Ciudadano normal: ✅ Puede ser deseable
- Paramédico normal: ✅ Necesario
- Ciudadano empresarial: ⚠️ Datos personales expuestos en contexto empresarial
- Paramédico empresarial: ✅ Necesario

**Riesgo:** En contexto empresarial, los contactos personales se exponen a compañeros de trabajo que escanean el chip y se declaran "ciudadanos".

---

## 6. AUDITORÍA DE PRIVACIDAD Y SEGURIDAD

### 6.1 Toggles de privacidad

| Toggle en BD | ¿Se respeta? | ¿Dónde? |
|---|---|---|
| `showInsuranceProviderPublic` | ✅ Sí | API línea 221 |
| `showPreferredHospitalPublic` | ✅ Sí | API línea 222 |
| `showPrimaryDoctorPublic` | ✅ Sí | API línea 223 |
| `showPrimaryDoctorPhonePublic` | ✅ Sí | API línea 224 |
| `showAdditionalNotesPublic` | ✅ Sí | API línea 225 |

**NO existen toggles para:**
- `showBloodTypePublic` (sangre siempre visible)
- `showAllergiesPublic` (alergias siempre visibles para paramédico)
- `showMedicationsPublic` (medicamentos siempre visibles para paramédico)
- `showConditionsPublic` (condiciones siempre visibles para paramédico)
- `showEmergencyContactsPublic` (contactos siempre visibles en todas las vistas)

### 6.2 Protección de datos sensibles

| Dato sensible | ¿Exposición? | ¿Controlado? |
|---|---|---|
| `nationalId` (cédula) | ❌ No expuesto | ✅ |
| `insurancePolicyNumber` | ❌ No expuesto | ✅ |
| `employeeNationalId` | ❌ No expuesto | ✅ |
| `employeeDepartment` | ❌ No expuesto | ✅ |
| `employeePhone` | ❌ No expuesto | ✅ |
| `phone` (personal) | ❌ No expuesto | ✅ |
| `email` | ❌ No expuesto | ✅ |
| `internal IDs` (profile.id, chip.id) | ❌ No expuesto | ✅ |

### 6.3 Estados del chip

| Estado del chip | ¿Qué pasa? | ¿Correcto? |
|---|---|---|
| `status !== ACTIVATED` | Retorna `{ status: "unactivated" }` | ✅ |
| `serviceStatus === "expired"` o `"inactive"` sin datos críticos | Retorna 403 `"Protocolo inactivo"` | ✅ |
| `serviceStatus === "expired"` con datos críticos | Muestra datos (humanitarian overwrite) | ✅ (diseño intencional) |
| `profileVisibilityStatus !== "active"` | Retorna 403 `"Perfil desactivado"` | ✅ |
| Chip `lost` / `damaged` | No hay manejo especial | ❓ Debería bloquearse |

### 6.4 Rate limiting y seguridad

| Medida | ¿Implementada? |
|---|---|
| Rate limit perfil (5/min/IP) | ✅ (API pública) |
| Rate limit scan (10/min/IP) | ✅ (API scan) |
| CORS controlado | ✅ (solo orígenes permitidos) |
| Validación de datos de entrada | ✅ (zod schemas) |

---

## 7. ESTADOS CORPORATIVOS

| Estado | ¿Manejado? | Mensaje |
|---|---|---|
| `pending_company_review` | ✅ Bloqueado (403) | "Perfil empresarial no disponible" |
| `approved_unpaid` | ✅ Bloqueado (403) | "Perfil empresarial no disponible" |
| `paid_active` | ✅ Permitido | Muestra datos |
| `suspended` | ✅ Bloqueado (403) | "Perfil empresarial no disponible" |
| `archived` | ✅ Bloqueado (403) | "Perfil empresarial no disponible" |
| `rejected_by_company` | ✅ Bloqueado (403) | "Perfil empresarial no disponible" |

**Problema:** Todos los estados bloqueados reciben el mismo mensaje. No hay diferenciación UX.

---

## 8. CONTACTOS DE EMERGENCIA

| Escenario | Contactos mostrados | Origen de datos | ¿Correcto? |
|---|---|---|---|
| Chip personal → Ciudadano | ✅ `profile.emergencyContacts` | `assignedProfile.contacts[].contact` | ✅ |
| Chip personal → Paramédico | ✅ `profile.emergencyContacts` | Mismo origen | ✅ |
| Chip empresarial → IndustrialProfileView | ✅ `profile.emergencyContacts` | **Mismo origen** (contactos del perfil personal) | ⚠️ ¿Deberían ser contactos corporativos? |

**Hallazgo:** En chips empresariales, los contactos que se muestran son los del `assignedProfile` (perfil personal). Si existe un `corporateProfile`, sus contactos NO se cargan porque la relación `corporateProfile → OrganizationMember.corporateProfileId` no se incluye en la consulta.

---

## 9. RIESGOS

### 🔴 Alto
1. **Vista empresarial sin restricción de rol**: Cualquier persona que escanea un chip empresarial ve datos médicos completos (alergias, condiciones, medicamentos, seguro, médico). Esto es una violación del concepto de "mínima información necesaria para un ciudadano".
2. **Cualquier persona puede autodeclararse paramédico**: Sin verificación, un ciudadano curioso puede ver datos médicos sensibles.

### 🟡 Medio
3. **Contactos personales expuestos en contexto empresarial**: Colegas de trabajo pueden ver números de teléfono personales y relaciones familiares.
4. **Tipo de sangre visible para ciudadanos normales**: Sin toggle de privacidad.
5. **organization.location y organization.department siempre nulos**: Bug de datos que afecta la experiencia empresarial.

### 🟢 Bajo
6. **Estados corporativos sin mensajes diferenciados**: UX pobre pero no crítico.
7. **Layout de IndustrialProfileView compacto pero sin botón de cambio de rol**: Podría ser deseable que el paramédico empresarial tenga una vista con más detalles.

---

## 10. RECOMENDACIONES

### Prioridad: **C. Requiere backend/API fix + D. Requiere refactor de fichas**

El problema principal es arquitectónico: la ficha empresarial usa `IndustrialProfileView` que no implementa el toggle ciudadano/paramédico, y la bifurcación en `page.tsx` (línea 357-359) corta todo el flujo de control de roles.

### Acciones recomendadas:

1. **CRÍTICO**: IndustrialProfileView debe implementar el mismo toggle ciudadano/paramédico que la vista normal, o al menos respetar `isParamedic` para ocultar datos médicos cuando el visitante es ciudadano.

2. **CRÍTICO**: Se debe agregar lógica en el API para retornar datos médicos reducidos cuando la vista es ciudadana (o que el frontend filtre según `isParamedic`).

3. **ALTO**: Agregar verificación de paramédico (por ejemplo: código de acceso temporal, token de un solo uso, o al menos un captcha/confirmación).

4. **MEDIO**: Corregir el API para retornar `organization.location` y `organization.department` desde la relación `OrganizationMember → OrganizationLocation → OrganizationDepartment`.

5. **MEDIO**: Agregar toggle `showBloodTypePublic` al modelo Profile para que el tipo de sangre también respete privacidad.

6. **BAJO**: Diferenciar mensajes de error para cada estado corporativo bloqueado.

7. **BAJO**: Evaluar si los contactos de emergencia en vista empresarial deberían cargarse desde el `corporateProfile` en lugar del perfil personal.

---

## 11. PRÓXIMO PROMPT RECOMENDADO

Basado en los hallazgos:

```
Implementar toggle ciudadano/paramédico en IndustrialProfileView.
La lógica debe:
- Si el visitante es ciudadano: ocultar alergias, condiciones, medicamentos,
  seguro, médico, hospital e instrucciones especiales en la vista empresarial.
- Si el visitante es paramédico: mostrar datos médicos completos.
- Reutilizar el mismo flujo de isParamedic de EmergencyPage.
- En el API, retornar organization.location y organization.department correctamente.
- NO modificar Prisma schema.
- NO crear migraciones.
```

---

## 12. ARCHIVOS AFECTADOS (solo referencia, no modificar)

| Archivo | Rol |
|---|---|
| `app/(public)/e/[shortCode]/page.tsx` | Página principal de ficha — requiere cambios en bifurcación corporate |
| `app/(public)/e/[shortCode]/_components/IndustrialProfileView.tsx` | Vista empresarial — requiere toggle ciudadano/paramédico |
| `app/api/public/[shortCode]/route.ts` | API pública — requiere retornar location/department |