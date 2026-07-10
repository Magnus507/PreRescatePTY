# W6.04C - Auditoría Read-Only de Acceso Público Corporativo / KLFUFPK8

## Arquitectura Corporativa Encontrada

El sistema corporativo no expone una ruta pública análoga a `Chip.shortCode` para abrir perfiles médicos.

Lo que existe:

- `CorporatePublicProfile` como perfil público empresarial de la organización
- `OrganizationMember` como vínculo entre organización y perfil
- `Profile` como perfil médico base
- `Chip` como identidad pública normal para `/e/[shortCode]`

## Relación Entre Modelos

- `CorporatePublicProfile` está ligado a `Organization` por `organizationId`
- `OrganizationMember` está ligado a `Organization` y `Profile`
- `OrganizationMember.corporateProfileId` puede enlazar un perfil corporativo, pero no es una puerta pública médica por sí sola
- `Chip` sigue siendo la puerta pública médica válida

## Rutas Detectadas

### Públicas

- `/api/public/[shortCode]`
- `/api/public/[shortCode]/scan`

Estas rutas resuelven por `Chip.shortCode`.

### Corporativas autenticadas

- `/api/organizations/public-profile`
- `/api/organizations/current`
- `/api/organizations/corporate-chip/activate`
- `/api/organizations/corporate-orders/*`

Estas rutas requieren sesión/autenticación y no son accesos públicos directos.

## Estado de KLFUFPK8

- `Chip.shortCode`: `KLFUFPK8`
- `Chip.status`: `activated`
- `Chip.serviceStatus`: `active`
- `assignedProfileId`: presente
- `Profile`: presente
- `OrganizationMember`: presente
- `CorporatePublicProfile`: existe para la organización
- `manualDecision`: preservado

## Riesgos Detectados

- No se encontró una ruta pública corporativa que abra `Profile` sin pasar por chip activo.
- `CorporatePublicProfile` es una entidad separada y debe seguir siendo auth-only.
- `OrganizationMember` puede parecer un puente corporativo, pero no expone por sí solo acceso público médico.
- `KLFUFPK8` sigue siendo el caso vivo que no debe tocarse.

## Recomendación

La conclusión de esta auditoría es:

- el acceso público corporativo no aparece como una vía pública independiente que rompa la regla de chip activo;
- `W6.04D` puede ser un cierre de guardrails mínimos si se desea reforzar documentación o pruebas;
- el flujo empresarial completo sigue siendo material para `W6.07` y no debe mezclarse con el acceso público médico normal.

## Verificación Final

Esta auditoría confirma que:

- no hubo escrituras en base de datos;
- `KLFUFPK8` sigue preservado;
- no apareció una ruta pública corporativa nueva que exponga perfiles sin contexto autenticado.
