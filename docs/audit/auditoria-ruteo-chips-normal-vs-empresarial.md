# AUDITORÍA — RUTEO DE CHIPS Y PERFILES MÉDICOS NORMAL VS EMPRESARIAL
**PreRescatePTY** · 6 de febrero de 2026

---

## 1. RESUMEN EJECUTIVO

| Concepto | Resultado |
|---|---|
| **Chip personal apunta a** | `Profile` con `profileType: "personal"` o `"family"` |
| **Chip empresarial apunta a** | `Profile` con `profileType: "corporate"` (es el `corporateProfileId` de `OrganizationMember`) |
| **¿Hay mezcla de datos?** | ❌ **No** — Los chips están correctamente segregados por `assignedProfileId` |
| **¿Coinciden contactos?** | ⚠️ **Parcialmente** — Los contactos de la ficha pública empresarial se cargan del `assignedProfile` (personal), NO del `corporateProfile` |
| **Filtrado en dashboard** | ✅ **Correcto** — Cada vista filtra correctamente su tipo |

---

## 2. ARQUITECTURA DE ASIGNACIÓN

### 2.1 Modelo `Chip` → `Profile`

```
Chip.assignedProfileId ──────► Profile (id)
                                  │
                                  ├── profileType: "personal" | "family" | "corporate"
                                  │
                                  ├── contacts[] (ProfileContact → Contact)  ← contactos personales
                                  │
                                  └── organizationMembers[]
                                        │
                                        └── OrganizationMember.corporateProfileId ──► Profile (corporate)
                                                                                          │
                                                                                          └── contacts[] (corporate)
```

### 2.2 Chip Personal: Cómo se asigna `assignedProfileId`

**Activación** (`app/api/chips/activate/route.ts`):
1. Usuario ingresa `activationCode` + `profileId`
2. Se valida `ChipClaimToken`
3. Se asigna: `chip.assignedProfileId = profileId` (perfil personal/familiar)

**Reasignación posterior** (`app/api/chips/dashboard/route.ts` — PATCH):
- Usuario reasigna chip a otro perfil de su cuenta
- `chip.assignedProfileId` se actualiza

**Conclusión:** `assignedProfileId` del chip personal SIEMPRE apunta a `profileType: "personal"` o `"family"`.

### 2.3 Chip Empresarial: Flujo completo

| Paso | Endpoint | Acción sobre `assignedProfileId` |
|---|---|---|
| 1. Solicitud de vinculación | `POST /api/organizations/join-request` | Crea `OrganizationMember` con `profileId` = perfil personal. `corporateProfileId` = null. |
| 2. Admin aprueba | `PATCH /api/organizations/members/[id]` | Crea nuevo `Profile` con `profileType: "corporate"`. Lo vincula como `OrganizationMember.corporateProfileId`. |
| 3. Admin asigna chip | `POST /api/admin/orders/[id]/corporate-assign` | Actualiza `CorporateOrderEmployeeItem.chipId`. Llama a `OrderFulfillmentService.reserveAssignedChipsForOrder()`. |
| 4. Orden fulfillment | `order-fulfillment.service.ts:250` | **`assignedProfileId: null`** — el chip se limpia al pasar a `status: "sold"`. |
| 5. Entrega | `PATCH /api/admin/orders/[id]/corporate-delivery` | Solo actualiza `corporateDeliveryStatus` de la Order. **NO toca el chip**. |
| 6. Activación ítem | `PATCH /api/admin/orders/[id]/corporate-items/[itemId]/fulfillment` | Maneja transición a `"activated"`. **No se encontró código que actualice `assignedProfileId`**. |

### 2.4 🔴 HALLAZGO CRÍTICO: `assignedProfileId` queda en NULL

En `domains/orders/services/order-fulfillment.service.ts` (línea 244-251):

```typescript
const moved = await tx.chip.updateMany({
  where: { id: chipId, status: "inventory" },
  data: {
    status: "sold",
    ownerUserId: null,
    accountId: null,
    assignedProfileId: null,    // ← ELIMINA assignedProfileId
  },
});
```

**Impacto en ficha pública** (`/api/public/[shortCode]/route.ts` línea 114):
```typescript
if (chip.status !== CHIP_STATUS.ACTIVATED || !chip.assignedProfile) {
  return publicJson(req, { status: "unactivated", message: "Chip aún no activado" });
}
```

Si `assignedProfileId === null`, la respuesta retorna `"Chip aún no activado"` aunque el chip esté correctamente asignado a un colaborador corporativo. **La ficha pública del chip empresarial se rompe.**

---

## 3. TABLA COMPARATIVA CHIP PERSONAL VS EMPRESARIAL

| Área | Chip personal | Chip empresarial |
|---|---|---|
| **Dónde se ve en dashboard** | Mis Dispositivos (`/dashboard/chips`) | Empresa (`/dashboard/empresas`) |
| **Quién lo gestiona** | Usuario (owner) | Admin de la empresa |
| **`assignedProfileId` apunta a** | Profile personal/familiar (`profileType: "personal"` o `"family"`) | ⚠️ Se pone NULL en fulfillment |
| **`profileType` esperado** | `personal` / `family` | `corporate` (vía `corporateProfileId`) |
| **Contactos usados** | Contactos del perfil personal (ProfileContact → Contact) | Mismos contactos personales (desde `assignedProfile`) |
| **Ruta pública** | `/e/[shortCode]` | `/e/[shortCode]` |
| **Ficha ciudadana** | `PatientMedicalCard` + protocolo ciudadano | `IndustrialProfileView` con `isParamedic=false` |
| **Ficha paramédico** | `PatientMedicalCard` + datos médicos completos | `IndustrialProfileView` con `isParamedic=true` |
| **¿Aparece en Mis Dispositivos?** | ✅ Sí | ❌ No (filtrado por `profileType !== "corporate"` y `corporateOrderItems.length === 0`) |
| **¿Aparece en Empresa?** | ❌ No | ✅ Sí (solo si hay vinculación activa) |

---

## 4. CONTACTOS DE EMERGENCIA

| Escenario | Contactos mostrados | Origen | ¿Correcto? |
|---|---|---|---|
| Chip personal → Ciudadano | `profile.emergencyContacts` | `assignedProfile.contacts[].contact` | ✅ |
| Chip personal → Paramédico | `profile.emergencyContacts` | Mismo origen | ✅ |
| Chip empresarial → IndustrialProfileView | `profile.emergencyContacts` | **assignedProfile** (personal) ⚠️ | ⚠️ Muestra contactos personales, NO corporativos |

**Problema:** La ficha pública empresarial usa `profile.emergencyContacts` que vienen del `assignedProfile` (perfil personal). Pero el `corporateProfile` (OrganizationMember.corporateProfileId) puede tener sus propios contactos. La API pública nunca incluye la relación para cargar contactos corporativos.

---

## 5. DASHBOARDS — SEGREGACIÓN

### 5.1 Mis Dispositivos (`/api/chips/dashboard/route.ts`)

```typescript
// Líneas 37-43
const personalChips = chips.filter((chip) => {
  const isCorporateProfile = chip.assignedProfile?.profileType === "corporate";
  const hasCorporateOrderItems = chip.corporateOrderItems && chip.corporateOrderItems.length > 0;
  return !isCorporateProfile && !hasCorporateOrderItems;
});
```

**✅ Correcto:** Filtra chips que tengan `profileType === "corporate"` o `corporateOrderItems.length > 0`.

### 5.2 Perfiles Médicos (`/api/users/perfiles-medicos/route.ts`)

```typescript
// Línea 29-30
const ownProfile = allProfiles.find((p) => p?.userId === userId) ?? null;
const familyProfiles = allProfiles.filter((p) => p && p.userId !== userId);

// Línea 42-51 — Corporate profiles se cargan por separado
const corporateMembers = await prisma.organizationMember.findMany({
  where: { profile: { userId: user.id }, corporateProfileId: { not: null } },
  include: { corporateProfile: true, organization: { select: { id: true, displayName: true, legalName: true } } },
});
```

**✅ Correcto:** Separa `ownProfile`, `familyProfiles` y `corporateProfiles`. Cada tipo se retorna agrupado.

### 5.3 Empresa (`/dashboard/empresas/page.tsx`)

**✅ Correcto:** Solo muestra la vista empresarial cuando hay un `OrganizationMember` activo (vía `/api/organizations/my-status`). No hay riesgo de que chips personales aparezcan aquí.

---

## 6. FICHA PÚBLICA — `/e/[shortCode]`

### 6.1 Cómo resuelve el perfil

1. Busca chip por `shortCode`
2. Incluye `assignedProfile` con:
   - `contacts[]` (del perfil personal)
   - `organizationMembers[]` (para determinar si es corporate)
3. Si `profileType === "corporate"`, verifica `corporateStatus === "paid_active"`
4. Construye `publicProfile` con datos del `assignedProfile`

### 6.2 Cómo decide entre normal vs empresarial

**Decisión del lado del frontend** (después del commit `dbb3919`):

```typescript
if (profile.organization) {
  return <IndustrialProfileView profile={profile} scanLocation={scanLocation} isParamedic={isParamedic} />;
}
```

- Depende de `profile.organization` (objeto con `name`)
- El API retorna `organization: { name }` si existe `organizationMembers[0]`
- No depende de `profileType === "corporate"` directamente

### 6.3 Riesgos en la decisión

| Escenario | ¿Riesgo? |
|---|---|
| `profile.organization` presente en perfil familiar | ❌ No debería ocurrir (solo corporate tiene organizationMembers) |
| `organizationMembers` con `memberStatus !== "active"` | ⚠️ El API filtra `where: { memberStatus: "active" }`, correcto |
| `profileType === "corporate"` pero `organization` null | ❌ No debería ocurrir (si tiene corporateProfile, tiene OrganizationMember) |
| `assignedProfileId === null` | 🔴 Ficha retorna "Chip aún no activado" |

---

## 7. TABLA DE EJEMPLOS AUDITADOS

| shortCode | chip.status | assignedProfileId | profileType | Contactos usados | Vista esperada |
|---|---|---|---|---|---|
| PRP-QQFG-WAN5 (normal) | activated | Profile personal | personal | Contactos personales | Ciudadano o Paramédico normal |
| JSR4SSLT (empresarial) | ⚠️ Depende de fulfillment | ⚠️ NULL tras assign | corporate vía corporateProfileId | Contactos personales (no corporativos) | IndustrialProfileView |

---

## 8. HALLAZGOS

### 🔴 Crítico
1. **Chip empresarial tiene `assignedProfileId = null` tras fulfillment** (order-fulfillment.service.ts:250). La ficha pública retorna "Chip aún no activado".
2. **La ficha pública empresarial usa contactos del perfil personal, no del corporateProfile.** La API nunca incluye `OrganizationMember.corporateProfile.contacts`.

### 🟡 Medio
3. **La decisión empresarial depende de `profile.organization` (presencia de `organizationMembers`) y no de `profileType === "corporate"`.** En teoría un perfil familiar podría tener organizationMembers si el flujo lo permite (aunque no es el caso actual).
4. **El corporate delivery route no actualiza `assignedProfileId`** ni el `chip` en absoluto — solo actualiza metadatos de la orden.

### 🟢 Bajo
5. **Filtrado en Mis Dispositivos** es correcto (filtra por `profileType === "corporate"` y `corporateOrderItems.length > 0`).
6. **Perfiles Médicos** separa correctamente personal/familiar/corporate.
7. **Empresa** solo muestra lo corporativo, no hay mezcla.

---

## 9. RIESGOS

| Riesgo | Severidad | Descripción |
|---|---|---|
| Chip empresarial sin ficha pública | 🔴 Alta | `assignedProfileId = null` → ficha pública retorna "Chip aún no activado" |
| Contactos personales expuestos en contexto empresarial | 🟡 Media | La ficha pública empresarial muestra contactos personales en vez de corporativos |
| Perfil corporativo sin assignedProfileId | 🟡 Media | El chip no tiene un assignedProfile claro, la ficha pública no puede cargar datos |
| Datos inconsistentes | 🟢 Baja | corporateProfile se crea como copia del perfil personal, pero si el usuario actualiza su perfil personal, el corporateProfile no se sincroniza |

---

## 10. RECOMENDACIÓN

### Prioridad: **C. Requiere backend/API fix**

Hay bugs funcionales que afectan la operación de chips empresariales:

1. **🔴 CRÍTICO: Arreglar `assignedProfileId` en chips empresariales.**  
   En `corporate-assign/route.ts` o en `corporate-items/[itemId]/fulfillment/route.ts`, al activar el chip corporativo, debe asignarse `chip.assignedProfileId = organizationMember.corporateProfileId`.

2. **🔴 CRÍTICO: La API pública debe cargar contactos correctos.**  
   Si el chip es empresarial, la API debe incluir los contactos del `corporateProfile`, no los del perfil personal. O alternativamente, incluir ambos.

3. **🟡 MEDIO: Decidir si `profile.organization` o `profileType`.**  
   Estandarizar la decisión: usar `profileType === "corporate"` como flag principal para la vista empresarial, no la presencia de `organizationMembers`.

4. **🟢 BAJO: En Mis Dispositivos, agregar indicación visual** de que ciertos chips están asignados a la empresa.

---

## 11. PRÓXIMO PROMPT RECOMENDADO

```
Fix corporate chip assignedProfileId and contacts in public API.

Changes:
1. At corporate chip activation/fulfillment, set chip.assignedProfileId 
   to OrganizationMember.corporateProfileId.
2. In GET /api/public/[shortCode], if chip is corporate, include 
   emergencyContacts from the corporateProfile's contacts instead of 
   (or in addition to) the personal profile's contacts.
3. Ensure the IndustrialProfileView receives the correct contacts.

NOT modifying Prisma schema, NOT creating migrations, NOT touching Supabase.