# W6.04A - Auditoría Read-Only de QR / ShortCode / DigitalPass / Chip / Profile / Acceso Público

## Resumen Ejecutivo

La arquitectura actual no abre perfiles médicos públicos por la sola existencia del `Profile`.
El acceso público real se resuelve por `Chip.shortCode`, valida que el chip esté activado y luego expone el `Profile` asignado.

## Modelos Relevantes

- `Profile`
- `Chip`
- `DigitalPass`
- `User`
- `Organization`
- `OrganizationMember`
- `CorporatePublicProfile`

### Campos clave observados

- `Profile`:
  - `userId`
  - `profileType`
  - `profileVisibilityStatus`
  - `digitalPass`
  - `assignedChips`
  - `organizationMembers`
- `Chip`:
  - `shortCode`
  - `status`
  - `serviceStatus`
  - `assignedProfileId`
  - `ownerUserId`
  - `activatedAt`
  - `internalLabel`
- `DigitalPass`:
  - `profileId`
  - `passType`
  - `serialNumber`
- `CorporatePublicProfile`:
  - `shortCode`
  - `status`
  - `organizationId`
- `OrganizationMember`:
  - `profileId`
  - `organizationId`
  - `memberStatus`
  - `corporateStatus`
  - `corporateProfileId`

## Rutas Públicas Actuales

Rutas encontradas:

- `/api/public/[shortCode]`
- `/api/public/[shortCode]/scan`
- `/api/public/qr`

### Comportamiento actual

- `/api/public/[shortCode]` resuelve por `Chip.shortCode`.
- Si el chip no está activado o no tiene `assignedProfile`, no abre el perfil.
- `/api/public/[shortCode]/scan` también depende del chip por `shortCode`.
- `/api/public/qr` solo genera imagen QR; no resuelve identidad.

## Activación Actual

La activación usa `ChipClaimToken.activationCode` en `/api/chips/activate`.

Comportamiento relevante:

- consume un token de activación
- valida que el chip exista y sea activable
- valida que haya una unidad terminada entregable
- asigna el chip a un `Profile`
- no crea `DigitalPass`
- no crea `Profile`
- no abre un perfil público por sí sola

## Estado de Datos Observado

- `Profile`: 1
- `Chip`: 1
- `DigitalPass`: 0
- `CorporatePublicProfile`: 1
- `OrganizationMember`: 1

### Caso manualDecision

- `KLFUFPK8`
- `Profile`: `cmq8pypfa0005js0ajdk4icfb`
- `Chip`: `cmq8qgz0q0000k30a1ho08n5l`
- Estado: activo / asignado
- Motivo: enlazado a trazas activas de `Organization` / `OrganizationMember`
- Estado de este bloque: preservado

## Seguridad Deseada para W6.04

Regla objetivo:

`QR/link` → dispositivo oficial / `DigitalPass` / `Chip` activo → `Profile` asignado → mostrar perfil

Regla no deseada:

`QR/link` → `Profile` directo → abrir perfil aunque no exista dispositivo activo

## Riesgos Detectados

- Un `Profile` existe sin `DigitalPass`, así que no conviene que el perfil sea punto de entrada público directo.
- El acceso público actual depende del chip activado, no de un pass independiente.
- `CorporatePublicProfile` existe como entidad separada y debe preservarse para el flujo empresarial.
- `KLFUFPK8` sigue vivo y no debe usarse como base para cambios de limpieza o reasignación.

## Recomendación Para W6.04B

Se recomienda:

- validar primero `Chip` activo antes de exponer un perfil;
- evitar que `Profile` sea la ruta pública primaria;
- preservar `DigitalPass` como capa de identidad asociada;
- mantener el flujo empresarial separado para W6.07;
- manejar el caso sin dispositivo activo como no publicable;
- tratar `KLFUFPK8` como `manualDecision` hasta una auditoría específica.

## Verificación Final

Esta auditoría confirma que:

- el acceso público se apoya en `Chip.shortCode`;
- el perfil no abre solo por existir;
- el riesgo principal es la existencia de perfiles sin dispositivo activo;
- no hubo escrituras en base de datos durante W6.04A.

## W6.04B - Guardrails de Acceso Público

La regla quedó endurecida para que el acceso público dependa de un chip activo y asignado:

- `Chip.shortCode` sigue siendo la entrada pública
- el chip debe existir
- el chip debe estar activo y con `serviceStatus = active`
- el chip debe tener `assignedProfileId`
- el perfil asignado debe existir
- `Profile` no es punto de entrada público directo
- `DigitalPass` sigue siendo una capa asociada, pero no abre por sí sola
- `api/public/qr` solo genera QR y no resuelve identidad
- el flujo corporativo queda preservado para W6.07
- `KLFUFPK8` sigue siendo `manualDecision`

### Helper central

Se introdujo un helper central:

- `lib/public-access/resolve-public-profile-by-chip.ts`

Responsabilidad:

- resolver por `Chip.shortCode`
- devolver una razón clara cuando el acceso no sea publicable
- centralizar el guardrail para `api/public/[shortCode]` y `api/public/[shortCode]/scan`

### Razones de bloqueo

- `chip_not_found`
- `chip_not_active`
- `chip_unassigned`
- `profile_not_found`
- `profile_not_public`
- `unsupported_context`

### Recomendación operativa

- no usar `Profile` como ruta pública primaria
- no permitir acceso por `DigitalPass` aislado
- mantener el flujo corporativo separado
- no tocar `KLFUFPK8` hasta una auditoría específica
