# Arquitectura — Fichas Médicas

Estado: documento de orden interno.
Fecha: 2026-06-10.
Propósito: que cualquier persona pueda entrar aquí y entender qué existe alrededor de las fichas médicas sin buscar por todo el proyecto.

Este documento no cambia la lógica de la app. Es un mapa del dominio actual.

---

## 1. Definición del dominio

Una ficha médica es el conjunto de datos personales, médicos, de emergencia y privacidad asociados a una persona protegida por PreRescatePTY.

En el sistema actual, la ficha médica vive principalmente en el modelo Prisma `Profile`.

La ficha puede funcionar en varios contextos:

1. Ficha médica personal
   - Pertenece al usuario principal de una cuenta.
   - Suele tener `Profile.userId` asignado.
   - Se administra desde el dashboard del cliente.

2. Ficha médica familiar
   - Pertenece a la misma cuenta, pero no necesariamente a un usuario login.
   - Suele tener `Profile.accountId` asignado y `Profile.userId = null`.
   - Se administra desde el dashboard del cliente.

3. Ficha médica corporativa / empresarial
   - Representa el perfil médico de un colaborador dentro de una organización.
   - Usa `Profile.profileType = "corporate"`.
   - Se vincula a `OrganizationMember.corporateProfileId`.
   - Puede tener contexto laboral adicional.

4. Vista de emergencia pública
   - No es un modelo separado.
   - Es una respuesta filtrada y segura construida desde `Profile`, `Chip`, `ProfileContact` y `OrganizationMember`.
   - Se usa cuando alguien escanea un QR/NFC: `/e/[shortCode]`.

---

## 2. Archivos principales actuales

### Pantallas cliente

- `app/(app)/dashboard/perfiles-medicos/page.tsx`
  - Pantalla principal de gestión de fichas médicas del cliente.
  - Actualmente mezcla UI, estado, formularios y llamadas API.
  - Candidato fuerte para dividir en componentes y hooks.

- `components/forms/MedicalProfileForm.tsx`
  - Formulario reutilizable de datos médicos.
  - Debe considerarse parte del dominio `fichas-medicas`.

### Vista pública de emergencia

- `app/(public)/e/[shortCode]/page.tsx`
  - Página pública que ve un tercero/paramédico al escanear el chip.

- `app/(public)/e/[shortCode]/_components/IndustrialProfileView.tsx`
  - Vista especializada para perfil industrial/corporativo.

### APIs de usuario

- `app/api/users/perfiles-medicos/route.ts`
  - `GET`: lista `ownProfile`, `familyProfiles`, `corporateProfiles` y `state`.
  - `POST`: crea una ficha familiar.

- `app/api/users/perfiles-medicos/[profileId]/route.ts`
  - `GET`: obtiene una ficha específica autorizada por cuenta.
  - `PATCH`: actualiza datos médicos.
  - `DELETE`: elimina ficha familiar si no tiene chips y no es corporativa.

- `app/api/users/perfiles-medicos/[profileId]/contacts/route.ts`
  - `GET`: lista contactos de emergencia.
  - `POST`: crea/vincula contacto.
  - `PATCH`: actualiza preferencias del vínculo.
  - `DELETE`: desvincula contacto del perfil.

### APIs públicas de emergencia

- `app/api/public/[shortCode]/route.ts`
  - Construye la respuesta pública segura de una ficha médica por `Chip.shortCode`.
  - Aplica reglas de visibilidad, servicio activo/inactivo, perfil corporativo y datos mínimos.

- `app/api/public/[shortCode]/scan/route.ts`
  - Registra escaneo/evento público del chip.

### Dominio/backend

- `domains/profiles/repositories/profile.repository.ts`
  - Repositorio de perfiles. Centraliza parte de lectura/escritura y cifrado/descifrado.

- `domains/accounts/services/account-state.service.ts`
  - Calcula estado de la cuenta, límites y perfiles disponibles.

- `lib/validations.ts`
  - Contiene schemas de validación como `profileUpdateSchema` y `contactSchema`.

- `lib/encryption.ts`
  - Cifrado/descifrado de campos sensibles.

---

## 3. Modelos Prisma involucrados

### `Profile`

Modelo central de la ficha médica.

Campos de identidad:

- `id`
- `accountId`
- `userId`
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
- `profileType`

Campos médicos críticos:

- `bloodType`
- `allergies`
- `chronicConditions`
- `medications`
- `additionalNotes`

Campos de seguro / doctor:

- `isInsured`
- `insuranceProvider`
- `insurancePolicyNumber`
- `preferredHospital`
- `insuranceEmergencyPhone`
- `primaryDoctorName`
- `primaryDoctorPhone`

Toggles de privacidad médica pública:

- `showInsuranceProviderPublic`
- `showPreferredHospitalPublic`
- `showPrimaryDoctorPublic`
- `showPrimaryDoctorPhonePublic`
- `showAdditionalNotesPublic`

Campos de asistencia especial v2:

- `hasCognitiveImpairment`
- `hasWanderingRisk`
- `isNonVerbal`
- `communicationAssistance`
- `safeReturnInstructions`

Toggles de privacidad de asistencia especial:

- `showVulnerabilityStatusPublic`
- `showCommunicationStatusPublic`
- `showSafeReturnPublic`

Campos operativos:

- `profileVisibilityStatus`
- `lastScanAt`
- `lastScanLocation`
- `createdAt`
- `updatedAt`

Relaciones relevantes:

- `account`
- `user`
- `contacts`
- `assignedChips`
- `organizationMembers`
- `corporateProfileOf`
- `digitalPass`
- `orderItems`

### `Contact`

Contacto reutilizable de emergencia asociado a un usuario.

Campos:

- `id`
- `userId`
- `fullName`
- `phone`
- `email`
- `relationship`
- `notifySms`
- `notifyEmail`
- `notifyWhatsapp`
- `createdAt`
- `updatedAt`

### `ProfileContact`

Tabla de vínculo entre una ficha médica y un contacto.

Campos:

- `id`
- `profileId`
- `contactId`
- `relationship`
- `contactType`
- `priorityOrder`
- `notifySms`
- `notifyEmail`
- `notifyWhatsapp`
- `active`
- `createdAt`
- `updatedAt`

Regla actual:

- Hay un límite lógico de 3 contactos por perfil en `app/api/users/perfiles-medicos/[profileId]/contacts/route.ts`.

### `Chip`

No es ficha médica, pero conecta el QR/NFC con una ficha.

Campos relevantes:

- `assignedProfileId`
- `shortCode`
- `nfcUrl`
- `qrUrl`
- `status`
- `serviceStatus`
- `serviceStartDate`
- `serviceEndDate`
- `lastScanAt`
- `lastScanLocation`

Relación:

- `assignedProfile` apunta a `Profile`.

### `OrganizationMember`

Aporta contexto empresarial/corporativo.

Campos relevantes para ficha empresarial:

- `organizationId`
- `profileId`
- `corporateProfileId`
- `locationId`
- `departmentId`
- `employeeId`
- `internalCode`
- `position`
- `shift`
- `occupationalRisks`
- `medicalRestrictions`
- `emergencyProtocol`
- `supervisorName`
- `supervisorPhone`
- `corporateStatus`
- `employeeNationalId`
- `employeeAge`
- `employeePhone`
- `employeePosition`
- `employeeDepartment`
- `employeeInternalId`
- `employeeNote`
- `memberStatus`

### `ScanEvent`

Registra escaneos.

Campos relevantes:

- `chipId`
- `profileId`
- `accountId`
- `scannedAt`
- `sourceType`
- `ipAddress`
- `userAgent`
- `geoLat`
- `geoLng`
- `geoAccuracy`
- `country`
- `city`
- `address`
- `emergencyMode`
- `notificationStatus`
- `rawMetadataJson`

---

## 4. Tipos de ficha médica recomendados para el lenguaje del proyecto

### 4.1 Ficha médica personal

Representa al usuario dueño de la cuenta.

Características:

- Tiene `userId`.
- Se administra desde el dashboard del cliente.
- Puede tener chips asignados.
- Puede tener contactos de emergencia.

### 4.2 Ficha médica familiar

Representa a un familiar o persona protegida adicional.

Características:

- Puede no tener `userId`.
- Pertenece a la misma `accountId`.
- Puede tener chips asignados.
- Puede tener contactos propios.
- No debe eliminarse si tiene chips activos/no inventario.

### 4.3 Ficha médica empresarial

Representa a un colaborador asociado a una organización.

Características:

- Usa `profileType = "corporate"`.
- Puede aparecer en `corporateProfiles` dentro de `/api/users/perfiles-medicos`.
- Tiene relación con `OrganizationMember.corporateProfileId`.
- Puede tener contexto de empresa, sede y departamento.
- No debe gestionarse/eliminarse igual que una ficha familiar normal.

### 4.4 Vista paramédico / emergencia

No es una ficha distinta en base de datos.

Es una vista filtrada, generada desde:

- `Chip.shortCode`
- `Chip.assignedProfile`
- `Profile`
- `ProfileContact`
- `OrganizationMember`

Archivo principal:

- `app/api/public/[shortCode]/route.ts`

---

## 5. Campos por categoría lógica

### Identificación pública controlada

- `firstName`
- `lastName`
- `displayNamePublic`
- `sex`
- `birthDate` -> se transforma a edad, con ocultamiento para menores
- `photoUrl`

### Datos médicos críticos

- `bloodType`
- `allergies`
- `chronicConditions`
- `medications`

Estos datos son los más importantes para emergencia.

### Datos médicos secundarios / instrucciones

- `additionalNotes`
- `primaryDoctorName`
- `primaryDoctorPhone`
- `preferredHospital`
- `insuranceProvider`
- `insurancePolicyNumber`
- `insuranceEmergencyPhone`

### Asistencia especial

- `hasCognitiveImpairment`
- `hasWanderingRisk`
- `isNonVerbal`
- `communicationAssistance`
- `safeReturnInstructions`

### Contactos de emergencia

Desde `Contact` y `ProfileContact`:

- `fullName`
- `relationship`
- `phone`
- `priorityOrder`
- `notifySms`
- `notifyEmail`
- `notifyWhatsapp`
- `active`

### Contexto empresarial

Desde `OrganizationMember`, `OrganizationLocation`, `OrganizationDepartment`:

- organización
- sede
- ciudad
- departamento
- cargo
- turno
- riesgos ocupacionales
- restricciones médicas
- protocolo interno
- supervisor

Importante: la API pública actual NO expone todos estos datos empresariales. Solo expone un subconjunto seguro.

---

## 6. Reglas de visibilidad pública actuales

Archivo:

- `app/api/public/[shortCode]/route.ts`

La respuesta pública incluye:

- `firstName`
- `lastName`
- `displayName`
- `sex`
- `age`, excepto menores
- `isMinor`
- `profileType`
- `bloodType`
- `allergies`
- `chronicConditions`
- `medications`
- `photoUrl`
- `emergencyContacts`

Incluye `organization` solo si:

- hay contexto empresarial
- `profile.profileType === "corporate"`

No expone en la vista pública normal:

- email
- fecha exacta de nacimiento
- IDs internos
- `nationalId`
- `insurancePolicyNumber`
- protocolos internos empresariales completos
- employee IDs internos
- riesgos ocupacionales completos

Campos opcionales según privacidad:

- `insuranceProvider` si `showInsuranceProviderPublic`
- `preferredHospital` si `showPreferredHospitalPublic`
- `primaryDoctorName` si `showPrimaryDoctorPublic`
- `primaryDoctorPhone` si `showPrimaryDoctorPhonePublic`
- `additionalNotes` como `emergencyInstructions` si `showAdditionalNotesPublic`
- vulnerabilidad/asistencia especial según toggles de privacidad

Regla especial:

- Para menores, la edad exacta se oculta (`age: null`) pero se indica `isMinor`.

---

## 7. Reglas de servicio / estado

La vista pública depende de:

- `chip.status`
- `chip.serviceStatus`
- `profile.profileVisibilityStatus`
- `profile.profileType`
- `OrganizationMember.corporateStatus` para perfiles corporativos

Reglas observadas:

- Si el chip no está activado o no tiene perfil asignado, devuelve estado `unactivated`.
- Si la ficha corporativa no tiene vínculo empresarial, devuelve `corporate_inactive`.
- Si el vínculo corporativo no está en `paid_active`, devuelve `corporate_inactive`.
- Si el servicio está inactivo/expirado pero hay datos críticos, la lógica humanitaria puede permitir mostrar datos críticos.
- Si `profileVisibilityStatus !== "active"`, la ficha pública queda oculta.

---

## 8. Reglas de autorización actuales

### Dashboard cliente

Rutas protegidas con sesión:

- `app/api/users/perfiles-medicos/route.ts`
- `app/api/users/perfiles-medicos/[profileId]/route.ts`
- `app/api/users/perfiles-medicos/[profileId]/contacts/route.ts`

Patrón de seguridad:

- Se obtiene `session.user.id`.
- Se verifica que el perfil pertenezca a la misma `accountId` del usuario.

### Vista pública emergencia

Rutas públicas por diseño:

- `app/api/public/[shortCode]/route.ts`
- `app/api/public/[shortCode]/scan/route.ts`

Protección usada:

- Rate limit.
- CORS allowlist.
- Respuesta filtrada.
- No se devuelven IDs internos ni email/birthdate exacta.

---

## 9. Propuesta de organización futura

Crear esta estructura progresiva:

```txt
features/
  fichas-medicas/
    README.md
    fields.md
    personal/
      README.md
      components/
      hooks/
      services/
    familiar/
      README.md
      components/
      hooks/
      services/
    empresarial/
      README.md
      components/
      hooks/
      services/
    vista-emergencia/
      README.md
      components/
      services/
    contactos-emergencia/
      README.md
      components/
      services/
```

Regla recomendada:

- `app/` mantiene rutas Next.js.
- `features/fichas-medicas/` concentra el lenguaje del negocio, componentes grandes, documentación, hooks y servicios específicos.
- `domains/profiles/` puede mantenerse como backend/repository por ahora.
- `lib/` mantiene utilidades transversales: auth, prisma, encryption, validations, rate limit.

No se recomienda mover todo de golpe.

---

## 10. Candidatos de refactor futuro

### Alta prioridad de orden

- `app/(app)/dashboard/perfiles-medicos/page.tsx`
  - Extraer a `features/fichas-medicas/personal/components/MedicalProfilesPage.tsx`.
  - Extraer hooks de carga/estado.
  - Separar componentes de cards, modales y contactos.

- `components/forms/MedicalProfileForm.tsx`
  - Mover o reexportar desde `features/fichas-medicas/shared/components/MedicalProfileForm.tsx`.

- `app/(public)/e/[shortCode]/page.tsx`
  - Extraer vista paramédico/emergencia a `features/fichas-medicas/vista-emergencia/`.

### Mantener por ahora

- `app/api/users/perfiles-medicos/**`
  - Puede quedarse en `app/api` por convención Next.js.
  - Si crece, extraer lógica a services dentro de `features/fichas-medicas` o `domains/profiles`.

- `domains/profiles/repositories/profile.repository.ts`
  - Ya es un buen punto de concentración backend.

---

## 11. Preguntas abiertas

1. ¿Queremos llamar oficialmente al dominio “fichas médicas” o “perfiles médicos”?
   - Recomendación: usar “fichas médicas” para negocio/producto.
   - Mantener “Profile” en Prisma por ahora para no romper nada.

2. ¿La ficha empresarial debe ser un subtipo de Profile o un modelo separado en el futuro?
   - Por ahora es subtipo de `Profile` vía `profileType = "corporate"`.
   - No cambiar sin una migración bien planeada.

3. ¿Qué campos deben estar cifrados siempre?
   - Requiere auditoría específica de `ProfileRepository` y `lib/encryption.ts`.

4. ¿Qué campos puede ver exactamente un paramédico?
   - Hoy la respuesta pública ya filtra, pero conviene convertirlo en una política documentada.

5. ¿Qué campos puede ver una empresa sobre un colaborador?
   - Necesita una matriz de permisos separada.

---

## 12. Próximo paso recomendado

Crear un catálogo oficial de campos:

- `features/fichas-medicas/fields.md`

Con columnas:

- Campo
- Modelo Prisma
- Tipo
- Categoría
- Ficha personal
- Ficha familiar
- Ficha empresarial
- Vista emergencia
- Cifrado
- Público por defecto
- Público con toggle
- Notas

Esto sería la pieza que más ayuda a evitar confusión cuando el proyecto siga creciendo.
