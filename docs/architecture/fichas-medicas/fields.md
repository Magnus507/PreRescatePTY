# Fichas Médicas — Catálogo de Campos

Este documento lista los campos principales del dominio de fichas médicas y cómo deben entenderse.

Fuente principal actual:

- `prisma/schema.prisma` -> modelos `Profile`, `Contact`, `ProfileContact`, `OrganizationMember`, `Chip`, `ScanEvent`.

Este catálogo es documentación. No es todavía fuente de verdad ejecutable.

---

## Leyenda

Tipos de ficha:

- Personal: usuario principal de una cuenta.
- Familiar: familiar/persona protegida adicional.
- Empresarial: colaborador asociado a una organización.
- Emergencia: vista pública filtrada al escanear QR/NFC.

Visibilidad:

- Interno: solo app/backend/admin según permisos.
- Cliente: visible/editable por usuario autenticado.
- Público crítico: puede aparecer en emergencia.
- Público con toggle: solo aparece si el usuario activó visibilidad.
- No público: no debería mostrarse en la vista pública.

---

## 1. Identidad de la ficha

| Campo | Modelo | Tipo | Personal | Familiar | Empresarial | Emergencia | Notas |
|---|---|---:|---|---|---|---|---|
| `id` | `Profile` | `String` | sí | sí | sí | no público | ID interno. No exponer públicamente. |
| `accountId` | `Profile` | `String?` | sí | sí | sí | no público | Conecta ficha con cuenta. |
| `userId` | `Profile` | `String?` | sí | usualmente no | depende | no público | Usuario dueño/login. |
| `firstName` | `Profile` | `String` | sí | sí | sí | público crítico | Nombre visible en emergencia. |
| `lastName` | `Profile` | `String` | sí | sí | sí | público crítico | En emergencia se usa también para display. |
| `displayNamePublic` | `Profile` | `String?` | sí | sí | sí | público crítico | Si existe, reemplaza nombre completo público. |
| `birthDate` | `Profile` | `DateTime?` | sí | sí | sí | derivado | No exponer fecha exacta; se transforma a edad. |
| `sex` | `Profile` | `String?` | sí | sí | sí | público crítico | Actualmente se muestra o “No reportado”. |
| `phone` | `Profile` | `String?` | sí | sí | sí | revisar | Teléfono de la persona protegida, no contacto de emergencia. |
| `nationalId` | `Profile` | `String?` | sí | sí | sí | no público | Dato sensible. |
| `address` | `Profile` | `Text?` | sí | sí | sí | no público | Dato sensible. |
| `city` | `Profile` | `String?` | sí | sí | sí | no público | Puede usarse internamente. |
| `photoUrl` | `Profile` | `String?` | sí | sí | sí | público crítico | Foto pública si existe. |
| `profileType` | `Profile` | `String` | `personal` | `family`/personal | `corporate` | público | Define comportamiento lógico. |

---

## 2. Datos médicos críticos

| Campo | Modelo | Tipo | Personal | Familiar | Empresarial | Emergencia | Notas |
|---|---|---:|---|---|---|---|---|
| `bloodType` | `Profile` | `String` | sí | sí | sí | público crítico | Campo crítico. Default actual puede ser `Pendiente`. |
| `allergies` | `Profile` | `String` | sí | sí | sí | público crítico | Debe tratarse como dato médico sensible. |
| `chronicConditions` | `Profile` | `String` | sí | sí | sí | público crítico | Condiciones crónicas. |
| `medications` | `Profile` | `String` | sí | sí | sí | público crítico | Medicamentos actuales. |
| `additionalNotes` | `Profile` | `String` | sí | sí | sí | público con toggle | En emergencia sale como `emergencyInstructions` si `showAdditionalNotesPublic`. |

---

## 3. Seguro médico y doctor

| Campo | Modelo | Tipo | Personal | Familiar | Empresarial | Emergencia | Notas |
|---|---|---:|---|---|---|---|---|
| `isInsured` | `Profile` | `Boolean` | sí | sí | sí | no directo | Indica si tiene seguro. |
| `insuranceProvider` | `Profile` | `String?` | sí | sí | sí | público con toggle | Visible si `showInsuranceProviderPublic`. |
| `insurancePolicyNumber` | `Profile` | `String?` | sí | sí | sí | no público | Dato sensible. No exponer por defecto. |
| `preferredHospital` | `Profile` | `String?` | sí | sí | sí | público con toggle | Visible si `showPreferredHospitalPublic`. |
| `insuranceEmergencyPhone` | `Profile` | `String?` | sí | sí | sí | revisar | No vi exposición pública directa en ruta actual. |
| `primaryDoctorName` | `Profile` | `String?` | sí | sí | sí | público con toggle | Visible si `showPrimaryDoctorPublic`. |
| `primaryDoctorPhone` | `Profile` | `String?` | sí | sí | sí | público con toggle | Visible si `showPrimaryDoctorPhonePublic`. |

---

## 4. Privacidad de datos médicos secundarios

| Campo | Modelo | Tipo | Controla |
|---|---|---:|---|
| `showInsuranceProviderPublic` | `Profile` | `Boolean` | Mostrar aseguradora en emergencia. |
| `showPreferredHospitalPublic` | `Profile` | `Boolean` | Mostrar hospital preferido en emergencia. |
| `showPrimaryDoctorPublic` | `Profile` | `Boolean` | Mostrar nombre del doctor en emergencia. |
| `showPrimaryDoctorPhonePublic` | `Profile` | `Boolean` | Mostrar teléfono del doctor en emergencia. |
| `showAdditionalNotesPublic` | `Profile` | `Boolean` | Mostrar notas/instrucciones adicionales en emergencia. |

---

## 5. Asistencia especial

| Campo | Modelo | Tipo | Personal | Familiar | Empresarial | Emergencia | Notas |
|---|---|---:|---|---|---|---|---|
| `hasCognitiveImpairment` | `Profile` | `Boolean` | sí | sí | usualmente no público | público con toggle | Deterioro cognitivo. |
| `hasWanderingRisk` | `Profile` | `Boolean` | sí | sí | usualmente no público | público con toggle | Riesgo de deambulación/extravío. |
| `isNonVerbal` | `Profile` | `Boolean` | sí | sí | usualmente no público | público con toggle | Se muestra si aplica comunicación pública. |
| `communicationAssistance` | `Profile` | `String?` | sí | sí | usualmente no público | público con toggle | Instrucciones de comunicación. |
| `safeReturnInstructions` | `Profile` | `String?` | sí | sí | usualmente no público | público con toggle | Instrucciones de retorno seguro. |

Toggles:

| Campo | Modelo | Tipo | Controla |
|---|---|---:|---|
| `showVulnerabilityStatusPublic` | `Profile` | `Boolean` | Mostrar bloque de vulnerabilidad. |
| `showCommunicationStatusPublic` | `Profile` | `Boolean` | Mostrar estado/instrucciones de comunicación. |
| `showSafeReturnPublic` | `Profile` | `Boolean` | Mostrar instrucciones de retorno seguro. |

Nota actual:

- En `app/api/public/[shortCode]/route.ts`, estos datos se excluyen para `profileType === "corporate"`.

---

## 6. Estado operativo de la ficha

| Campo | Modelo | Tipo | Uso |
|---|---|---:|---|
| `profileVisibilityStatus` | `Profile` | `String` | Si no es `active`, la vista pública devuelve perfil oculto. |
| `lastScanAt` | `Profile` | `DateTime?` | Último escaneo conocido. |
| `lastScanLocation` | `Profile` | `String?` | Última ubicación conocida del escaneo. |
| `createdAt` | `Profile` | `DateTime` | Auditoría/orden interno. |
| `updatedAt` | `Profile` | `DateTime` | Auditoría/orden interno. |

---

## 7. Contactos de emergencia

### Contact

| Campo | Modelo | Tipo | Emergencia | Notas |
|---|---|---:|---|---|
| `id` | `Contact` | `String` | no público | ID interno. |
| `userId` | `Contact` | `String?` | no público | Dueño del contacto. |
| `fullName` | `Contact` | `String` | público crítico | Nombre del contacto. |
| `phone` | `Contact` | `String` | público crítico | Teléfono del contacto. |
| `email` | `Contact` | `String?` | no público | No se expone en vista pública actual. |
| `relationship` | `Contact` | `String` | indirecto | Puede sobreescribirse por `ProfileContact.relationship`. |
| `notifySms` | `Contact` | `Boolean` | no público | Preferencia base. |
| `notifyEmail` | `Contact` | `Boolean` | no público | Preferencia base. |
| `notifyWhatsapp` | `Contact` | `Boolean` | no público | Preferencia base. |

### ProfileContact

| Campo | Modelo | Tipo | Emergencia | Notas |
|---|---|---:|---|---|
| `profileId` | `ProfileContact` | `String` | no público | Vínculo interno. |
| `contactId` | `ProfileContact` | `String` | no público | Vínculo interno. |
| `relationship` | `ProfileContact` | `String` | público crítico | Relación mostrada en emergencia. |
| `contactType` | `ProfileContact` | `String` | no público | Default `auxilio`. |
| `priorityOrder` | `ProfileContact` | `Int` | ordena | Orden de contactos. |
| `notifySms` | `ProfileContact` | `Boolean` | no público | Preferencia por vínculo. |
| `notifyEmail` | `ProfileContact` | `Boolean` | no público | Preferencia por vínculo. |
| `notifyWhatsapp` | `ProfileContact` | `Boolean` | no público | Preferencia por vínculo. |
| `active` | `ProfileContact` | `Boolean` | filtra | Solo contactos activos salen en emergencia. |

Regla actual:

- Máximo 3 contactos por ficha al crear nuevos vínculos.

---

## 8. Contexto empresarial/corporativo

| Campo | Modelo | Tipo | Emergencia | Notas |
|---|---|---:|---|---|
| `organizationId` | `OrganizationMember` | `String` | no público | Relación interna. |
| `profileId` | `OrganizationMember` | `String` | no público | Perfil base del miembro. |
| `corporateProfileId` | `OrganizationMember` | `String?` | no público | Ficha corporativa asociada. |
| `locationId` | `OrganizationMember` | `String?` | parcial | Se usa para mostrar sede si aplica. |
| `departmentId` | `OrganizationMember` | `String?` | parcial | Se usa para mostrar departamento si aplica. |
| `employeeId` | `OrganizationMember` | `String?` | no público | ID empleado/carnet. |
| `internalCode` | `OrganizationMember` | `String?` | no público | Código interno. |
| `position` | `OrganizationMember` | `String?` | revisar | Cargo/puesto. |
| `shift` | `OrganizationMember` | `String?` | revisar | Turno. |
| `occupationalRisks` | `OrganizationMember` | `String[]` | no público actual | Riesgos laborales. |
| `medicalRestrictions` | `OrganizationMember` | `Text?` | no público actual | Restricciones médicas laborales. |
| `emergencyProtocol` | `OrganizationMember` | `Text?` | no público actual | Protocolo interno de emergencia. |
| `supervisorName` | `OrganizationMember` | `String?` | no público actual | Supervisor. |
| `supervisorPhone` | `OrganizationMember` | `String?` | no público actual | Teléfono supervisor. |
| `corporateStatus` | `OrganizationMember` | `String` | controla acceso | Debe estar `paid_active` para perfil corporativo público. |
| `memberStatus` | `OrganizationMember` | `String` | filtra | Debe estar activo para relación normal. |

Vista pública actual de organización:

- nombre de organización
- sede/ubicación resumida
- departamento

No expone protocolos internos, employee IDs ni riesgos ocupacionales completos.

---

## 9. Chip y vista de emergencia

| Campo | Modelo | Tipo | Uso |
|---|---|---:|---|
| `shortCode` | `Chip` | `String` | Identificador público del QR/NFC. |
| `assignedProfileId` | `Chip` | `String?` | Conecta chip con ficha médica. |
| `status` | `Chip` | `String` | Debe estar activado para mostrar ficha normal. |
| `serviceStatus` | `Chip` | `String` | Controla activo/expirado/inactivo. |
| `serviceStartDate` | `Chip` | `DateTime?` | Inicio servicio. |
| `serviceEndDate` | `Chip` | `DateTime?` | Fin servicio. |
| `lastScanAt` | `Chip` | `DateTime?` | Último escaneo. |
| `lastScanLocation` | `Chip` | `String?` | Última ubicación. |

Reglas actuales:

- Si el chip no existe: `not_found`.
- Si no está activado o no tiene ficha: `unactivated`.
- Si el perfil está oculto: `hidden`.
- Si el servicio está vencido y no hay datos críticos: `expired`.
- Si hay datos críticos, puede aplicar lógica humanitaria.

---

## 10. Escaneos

| Campo | Modelo | Tipo | Notas |
|---|---|---:|---|
| `chipId` | `ScanEvent` | `String` | Chip escaneado. |
| `profileId` | `ScanEvent` | `String?` | Ficha asociada si existe. |
| `accountId` | `ScanEvent` | `String?` | Cuenta asociada si existe. |
| `scannedAt` | `ScanEvent` | `DateTime` | Fecha/hora de escaneo. |
| `sourceType` | `ScanEvent` | `String` | QR/NFC/etc. |
| `ipAddress` | `ScanEvent` | `String?` | Dato sensible operacional. |
| `userAgent` | `ScanEvent` | `String?` | Dato técnico. |
| `geoLat` | `ScanEvent` | `Float?` | Ubicación si se autoriza. |
| `geoLng` | `ScanEvent` | `Float?` | Ubicación si se autoriza. |
| `geoAccuracy` | `ScanEvent` | `Float?` | Precisión. |
| `country` | `ScanEvent` | `String?` | Ubicación derivada. |
| `city` | `ScanEvent` | `String?` | Ubicación derivada. |
| `address` | `ScanEvent` | `String?` | Dirección derivada. |
| `emergencyMode` | `ScanEvent` | `Boolean` | Indica modo emergencia. |
| `notificationStatus` | `ScanEvent` | `String` | Estado de notificación. |
| `rawMetadataJson` | `ScanEvent` | `String?` | Metadata cruda; tratar con cuidado. |

---

## 11. Reglas de oro

1. No exponer IDs internos en vista pública.
2. No exponer `nationalId`, email ni fecha exacta de nacimiento en vista pública.
3. Los campos médicos críticos sí pueden aparecer en emergencia.
4. Los campos médicos secundarios deben depender de toggles.
5. Para menores, no mostrar edad exacta.
6. Los datos corporativos internos no deben aparecer automáticamente en emergencia.
7. La ficha corporativa no debe eliminarse desde el flujo normal de fichas familiares.
8. Toda edición de ficha debe verificar `accountId` del usuario autenticado.
9. Contactos deben estar limitados y ordenados por prioridad.
10. Antes de mover código, actualizar este catálogo si cambia un campo o regla.
