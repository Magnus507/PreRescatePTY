# W6.10A - Auditoría de Perfiles Médicos Normales, Formulario y Vista Pública

## Resumen Ejecutivo

W6.10A confirma que los perfiles médicos normales ya tienen una base funcional amplia dentro de `Profile`, con formulario privado estructurado y una vista pública que separa ciudadano y personal médico en la UX.

La arquitectura no está completamente normalizada por tablas separadas; gran parte de la base médica vive en `Profile` y en relaciones auxiliares como `ProfileContact`/`Contact`.

## Arquitectura Actual

### Modelos y campos relevantes

- `Profile` contiene identidad, sangre, alergias, condiciones crónicas, medicamentos, notas adicionales, teléfono, fecha de nacimiento, sexo, seguros, médico tratante, toggles de visibilidad, vulnerabilidad, comunicación asistida y retorno seguro.
- `ProfileContact` y `Contact` modelan los contactos de emergencia.
- `Chip` sigue siendo la identidad pública técnica para la vista por `shortCode`.
- `DigitalPass` existe como capa asociada, no como puerta pública primaria.
- `CorporatePublicProfile` y `OrganizationMember` no forman parte del perfil médico normal.

### Campos detectados en `Profile`

- `firstName`
- `lastName`
- `displayNamePublic`
- `sex`
- `bloodType`
- `allergies`
- `chronicConditions`
- `medications`
- `additionalNotes`
- `phone`
- `profileVisibilityStatus`
- `birthDate`
- `address`
- `city`
- `isInsured`
- `insuranceProvider`
- `insurancePolicyNumber`
- `preferredHospital`
- `insuranceEmergencyPhone`
- `primaryDoctorName`
- `primaryDoctorPhone`
- `showInsuranceProviderPublic`
- `showPreferredHospitalPublic`
- `showPrimaryDoctorPublic`
- `showPrimaryDoctorPhonePublic`
- `showAdditionalNotesPublic`
- `profileType`
- `hasCognitiveImpairment`
- `hasWanderingRisk`
- `isNonVerbal`
- `communicationAssistance`
- `safeReturnInstructions`
- `showVulnerabilityStatusPublic`
- `showCommunicationStatusPublic`
- `showSafeReturnPublic`
- `showSafeReturnLocationPublic`

## Formulario Privado Actual

La pantalla de gestión vive en:

- `app/(app)/dashboard/perfiles-medicos/page.tsx`
- `components/forms/MedicalProfileForm.tsx`
- `app/api/users/perfiles-medicos/route.ts`
- `app/api/users/perfiles-medicos/[profileId]/route.ts`

### Estructura detectada

- Formulario tipo wizard / grid híbrido.
- Paso de identidad.
- Paso de alerta médica.
- Paso de seguro y médico tratante.
- Paso de asistencia especial y retorno seguro.
- Paso de visibilidad.

### Campos que ya se piden

- nombre y apellido
- alias público
- teléfono
- cédula / identificación
- sexo
- fecha de nacimiento
- tipo de sangre
- alergias
- condiciones crónicas
- medicamentos
- seguro médico
- médico tratante
- notas adicionales
- necesidades especiales
- retorno seguro
- visibilidad pública
- contactos de emergencia
- asignación de chip

### Lo que falta para W6.10

- una capa más explícita de base médica común por bloques
- un selector claro de variantes de perfil normal si se quiere distinguir menor, adulto mayor, autismo o demencia como contexto
- un editor más estructurado de contactos de emergencia
- separación visual más fuerte entre datos esenciales y datos opcionales

## Vista Pública Actual

La vista pública vive en:

- `app/(public)/e/[shortCode]/page.tsx`
- `app/(public)/e/[shortCode]/client.tsx`
- `app/api/public/[shortCode]/route.ts`
- `app/api/public/[shortCode]/scan/route.ts`

### Pantalla inicial

La pantalla inicial actual pregunta:

- `¿Cómo puedes ayudar?`

Y separa la vista en:

- `Emergencia médica`
- `Soy un ciudadano`
- `Persona perdida / necesita asistencia`

### Separación de vistas

- La separación ciudadano / paramédico existe.
- Ambas vistas viven dentro de la misma experiencia pública.
- El modo paramédico muestra más información que el ciudadano.
- Hay una tercera vía para asistencia especial / retorno seguro.

### Riesgo de UX

- La pantalla inicial todavía mezcla demasiados modos para un primer acceso.
- El usuario objetivo de W6.10 pide dos acciones principales:
  - ciudadano
  - médico / paramédico
- Los tipos de perfil deben quedar como badges/contexto, no como la primera decisión del usuario.

## Base Médica Común

### Lo que sí existe

- identidad básica
- tipo de sangre
- alergias
- condiciones médicas
- medicamentos
- notas adicionales
- seguros
- médico tratante
- contactos de emergencia
- asistencia especial
- retorno seguro

### Lo que no se encontró como entidad separada

- `EmergencyContact`
- `MedicalInfo`
- `Allergy`
- `Medication`
- `Condition`

La base médica común existe, pero está mayormente embebida en `Profile` y `ProfileContact`.

## Capas Especiales

### Menor de edad

- Hay soporte por `birthDate`.
- La vista pública calcula minoría de edad.
- Existen badges y textos de asistencia especial.

### Adulto mayor / dependiente

- Hay soporte parcial con `hasCognitiveImpairment`, `hasWanderingRisk` y `safeReturnInstructions`.

### Autismo

- Hay soporte parcial vía `isNonVerbal` y `communicationAssistance`.

### Alzheimer / demencia

- Hay soporte parcial vía `hasCognitiveImpairment` y `hasWanderingRisk`.

### Condición especial / discapacidad

- No se encontró un selector o modelo específico.
- Hoy se resuelve de forma general con campos y texto libre.

## Riesgos

- Formulario demasiado largo para usuarios nuevos.
- Información sensible mezclada con información operativa.
- La pantalla pública tiene más de una intención de uso.
- La separación entre ciudadano y paramédico aún es UX, no arquitectura totalmente separada.
- La normalización por tablas separadas no existe aún para la base médica común.
- `KLFUFPK8` no es parte de este bloque y debe permanecer intacto.

## Recomendación Para W6.10B

La siguiente fase debería:

- simplificar la entrada al perfil normal
- separar mejor base médica común y capas especiales
- dar más claridad a la vista pública inicial
- mantener ciudadanía vs paramédico como decisión principal
- no tocar perfiles empresariales ni mascotas

