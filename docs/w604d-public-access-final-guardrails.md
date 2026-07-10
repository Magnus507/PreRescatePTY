# W6.04D - Cierre de Guardrails QR/Link Público y Corporativo

## Estado Final de W6.04

W6.04 queda cerrado como un conjunto de guardrails y auditorías read-only.

- W6.04A auditó el acceso público QR / shortCode / DigitalPass / Chip / Profile.
- W6.04B endureció la regla para que el acceso público dependiera de un chip activo.
- W6.04C auditó el acceso corporativo y el caso `KLFUFPK8`.
- W6.04D consolida el cierre final y documenta el comportamiento esperado.

## Regla Central

El acceso público médico válido es:

`Chip.shortCode` -> chip existe -> chip `status = activated` y `serviceStatus = active` -> `assignedProfile` existe -> mostrar perfil

No permitido como puerta pública médica:

- `Profile` directo
- `DigitalPass` aislado
- `CorporatePublicProfile` como entrada pública médica

## Helper Central

Se conserva el helper:

- `lib/public-access/resolve-public-profile-by-chip.ts`

Razones de bloqueo:

- `chip_not_found`
- `chip_not_active`
- `chip_unassigned`
- `profile_not_found`
- `profile_not_public`
- `unsupported_context`

## Rutas Protegidas

- `/api/public/[shortCode]` resuelve por `Chip.shortCode`
- `/api/public/[shortCode]/scan` resuelve por `Chip.shortCode`
- `/api/public/qr` solo genera QR
- rutas corporativas son `auth-only`

## Guardrail Corporativo

`CorporatePublicProfile` sigue siendo una entidad separada y autenticada.

`OrganizationMember` no abre por sí solo un perfil público médico.

El flujo empresarial completo sigue reservado para W6.07.

## KLFUFPK8

- sigue como `manualDecision`
- no debe usarse como base para limpieza o reasignación
- no se toca sin una auditoría específica

## Checklist Futuro

Antes de tocar QR/link/public profile, conviene verificar:

- `audit-public-access-w604a`
- `audit-public-access-w604b`
- `audit-corporate-public-access-w604c`
- `audit-w604-final-public-access`
- chip activo y asignado
- `Profile` no expuesto directamente
- corporativo `auth-only`

## Conclusión

W6.04 queda cerrado sin fuga pública corporativa detectada.

El acceso público médico sigue dependiendo de un chip activo y asignado, y el sistema corporativo permanece encapsulado detrás de rutas autenticadas.
