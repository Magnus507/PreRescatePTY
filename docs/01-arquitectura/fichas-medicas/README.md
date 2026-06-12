# Feature — Fichas Médicas

Esta carpeta es el punto de entrada lógico para entender y, en el futuro, ordenar todo lo relacionado con fichas médicas.

Actualmente este directorio empieza como documentación de dominio. No reemplaza todavía los archivos existentes en `app/`, `components/`, `domains/` o `lib/`.

Mapa completo actual:

- `docs/01-arquitectura/fichas-medicas.md`

---

## Qué significa “ficha médica” en este proyecto

Una ficha médica es el perfil de salud y emergencia asociado a una persona protegida por PreRescatePTY.

Puede existir como:

1. Ficha médica personal
2. Ficha médica familiar
3. Ficha médica empresarial/corporativa
4. Vista de emergencia pública para paramédico o tercero que escanea un QR/NFC

La vista de emergencia no es una tabla separada: es una versión filtrada de la ficha médica.

---

## Subdominios recomendados

La estructura futura recomendada es:

```txt
features/fichas-medicas/
  README.md
  fields.md
  personal/
  familiar/
  empresarial/
  vista-emergencia/
  contactos-emergencia/
```

Por ahora solo existe este README para iniciar el orden sin mover código.

---

## Ubicación actual del código relacionado

### Pantallas

- `app/(app)/dashboard/perfiles-medicos/page.tsx`
- `app/(public)/e/[shortCode]/page.tsx`
- `app/(public)/e/[shortCode]/_components/IndustrialProfileView.tsx`
- `components/forms/MedicalProfileForm.tsx`

### APIs

- `app/api/users/perfiles-medicos/route.ts`
- `app/api/users/perfiles-medicos/[profileId]/route.ts`
- `app/api/users/perfiles-medicos/[profileId]/contacts/route.ts`
- `app/api/public/[shortCode]/route.ts`
- `app/api/public/[shortCode]/scan/route.ts`

### Backend/dominio

- `domains/profiles/repositories/profile.repository.ts`
- `domains/accounts/services/account-state.service.ts`
- `lib/validations.ts`
- `lib/encryption.ts`

### Base de datos

- `prisma/schema.prisma`
  - `Profile`
  - `Contact`
  - `ProfileContact`
  - `Chip`
  - `OrganizationMember`
  - `ScanEvent`

---

## Categorías de campos

### Identidad

- `firstName`
- `lastName`
- `displayNamePublic`
- `birthDate`
- `sex`
- `phone`
- `nationalId`
- `address`
- `city`
- `photoUrl`

### Datos médicos críticos

- `bloodType`
- `allergies`
- `chronicConditions`
- `medications`

### Información adicional médica

- `additionalNotes`
- `isInsured`
- `insuranceProvider`
- `insurancePolicyNumber`
- `preferredHospital`
- `insuranceEmergencyPhone`
- `primaryDoctorName`
- `primaryDoctorPhone`

### Asistencia especial

- `hasCognitiveImpairment`
- `hasWanderingRisk`
- `isNonVerbal`
- `communicationAssistance`
- `safeReturnInstructions`

### Privacidad pública

- `showInsuranceProviderPublic`
- `showPreferredHospitalPublic`
- `showPrimaryDoctorPublic`
- `showPrimaryDoctorPhonePublic`
- `showAdditionalNotesPublic`
- `showVulnerabilityStatusPublic`
- `showCommunicationStatusPublic`
- `showSafeReturnPublic`

### Contactos de emergencia

- `Contact.fullName`
- `Contact.phone`
- `Contact.email`
- `ProfileContact.relationship`
- `ProfileContact.priorityOrder`
- `ProfileContact.notifySms`
- `ProfileContact.notifyEmail`
- `ProfileContact.notifyWhatsapp`
- `ProfileContact.active`

### Contexto empresarial

- `OrganizationMember.employeeId`
- `OrganizationMember.internalCode`
- `OrganizationMember.position`
- `OrganizationMember.shift`
- `OrganizationMember.occupationalRisks`
- `OrganizationMember.medicalRestrictions`
- `OrganizationMember.emergencyProtocol`
- `OrganizationMember.supervisorName`
- `OrganizationMember.supervisorPhone`
- `OrganizationMember.corporateStatus`
- `OrganizationMember.memberStatus`

---

## Regla mental para trabajar este dominio

Si un cambio afecta datos médicos, contactos de emergencia, privacidad pública, vista de escaneo QR/NFC o perfiles corporativos de emergencia, debe revisarse desde este dominio.

Antes de cambiar código, revisar:

1. ¿Afecta ficha personal, familiar, empresarial o vista emergencia?
2. ¿Afecta campos médicos críticos?
3. ¿Afecta qué ve el público al escanear un QR/NFC?
4. ¿Afecta qué puede ver una empresa?
5. ¿Afecta datos cifrados?
6. ¿Afecta contactos de emergencia o notificaciones?
7. ¿Afecta chips asignados?

---

## Próximos archivos recomendados

1. `features/fichas-medicas/fields.md`
   - Catálogo oficial de campos.
   - Debería indicar tipo, origen, visibilidad, cifrado y uso.

2. `features/fichas-medicas/personal/README.md`
   - Qué es una ficha personal.

3. `features/fichas-medicas/familiar/README.md`
   - Qué es una ficha familiar.

4. `features/fichas-medicas/empresarial/README.md`
   - Qué es una ficha empresarial.

5. `features/fichas-medicas/vista-emergencia/README.md`
   - Qué ve un paramédico/tercero al escanear.

6. `features/fichas-medicas/contactos-emergencia/README.md`
   - Cómo funcionan guardianes/contactos y límites.

---

## Regla de migración futura

No mover código de golpe.

Orden recomendado:

1. Documentar.
2. Crear estructura vacía.
3. Extraer componentes pequeños.
4. Extraer hooks.
5. Extraer servicios cliente.
6. Validar typecheck/lint.
7. Repetir por subdominio.

La carpeta `app/` debe seguir siendo la capa de rutas de Next.js.
La carpeta `features/` debe convertirse gradualmente en la capa de negocio/producto.
