# W6.05F-A - Auditoría de Mis Dispositivos / Chips del Cliente

## 1. Mapa de archivos

### Frontend

- [app/(app)/dashboard/chips/page.tsx](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(app)/dashboard/chips/page.tsx)
- [app/(app)/dashboard/layout.tsx](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(app)/dashboard/layout.tsx)
- [app/(app)/dashboard/page.tsx](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(app)/dashboard/page.tsx)

### API

- [app/api/chips/dashboard/route.ts](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/chips/dashboard/route.ts)
- [app/api/chips/activate/route.ts](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/chips/activate/route.ts)
- [app/api/chips/scans/route.ts](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/chips/scans/route.ts)
- [app/api/admin/chips/route.ts](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/admin/chips/route.ts)
- [app/api/admin/chips/[chipId]/route.ts](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/admin/chips/[chipId]/route.ts)
- [app/api/admin/chips/[chipId]/assign-direct/route.ts](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/admin/chips/[chipId]/assign-direct/route.ts)
- [app/api/admin/chips/[chipId]/reactivate/route.ts](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/admin/chips/[chipId]/reactivate/route.ts)
- [app/api/admin/chips/[chipId]/rehabilitate/route.ts](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/admin/chips/[chipId]/rehabilitate/route.ts)
- [app/api/admin/chips/available/route.ts](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/admin/chips/available/route.ts)

### Helpers y dominio

- [lib/public-access/resolve-public-profile-by-chip.ts](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/lib/public-access/resolve-public-profile-by-chip.ts)
- [lib/identifiers.ts](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/lib/identifiers.ts)
- [domains/chips/chip-lifecycle.constants.ts](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/domains/chips/chip-lifecycle.constants.ts)
- [domains/chips/token-lifecycle.helpers.ts](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/domains/chips/token-lifecycle.helpers.ts)
- [domains/chips/chip-lifecycle.constants.ts](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/domains/chips/chip-lifecycle.constants.ts)

### Prisma relevante

- `Chip`
- `Profile`
- `ChipClaimToken`
- `ScanEvent`
- `Account`
- `CorporateOrderEmployeeItem`
- `Order`
- `OrganizationMember`

## 2. Flujo actual del usuario

### Carga inicial

- La vista `Mis dispositivos` carga chips desde `GET /api/chips/dashboard`.
- También carga perfiles médicos desde `GET /api/users/perfiles-medicos`.
- Si hay un parámetro `?activate=true`, abre la pestaña de activación.

### Lista de chips

- Cada chip muestra `serialPublic`, `shortCode`, estado, expiración, perfil vinculado, escaneos y accesorios asociados.
- El usuario puede ver el perfil público con `shortCode`.
- El usuario puede asignar un perfil al chip con un selector.
- El usuario puede suspender o reactivar el chip si el estado lo permite.

### Activación

- El usuario ingresa un `activationCode` en `/api/chips/activate`.
- El sistema busca `ChipClaimToken` por `activationCode`.
- La activación requiere:
  - token válido y no usado;
  - producto listo para activación;
  - estado del chip compatible;
  - cuenta con cupo;
  - perfil médico completo.

### Escaneos

- `GET /api/chips/scans` devuelve eventos de escaneo para los chips del usuario.
- La relación pública usa `shortCode` y la propiedad visible para el usuario es `serialPublic`.

### Estado vacío

- Si no hay chips, la pantalla muestra un estado vacío con CTA hacia activar un chip.

### Casos importantes

- Si un chip está activo pero sin perfil, el selector de asignación es la vía principal.
- Si un perfil existe pero no tiene chip, la siguiente acción debería ser activar o vincular.
- Si hay varios chips, la pantalla actual muestra una lista completa y puede sentirse pesada en desktop.

## 3. Vocabulario actual

### Términos detectados

- `chip`
- `sticker`
- `NFC`
- `código de emergencia`
- `dispositivo`
- `serial público`
- `shortCode`
- `internalLabel`
- `código interno`
- `accesorio`

### Observaciones

- `chip`, `sticker` y `NFC` aparecen mezclados como si fueran lo mismo.
- `shortCode` es un identificador público útil para compartir, pero no debería verse como un dato técnico principal.
- `internalLabel` y `código interno` son operativos y no deberían ser protagonistas para el cliente.
- `serialPublic` sí puede ser la referencia visible principal porque ya actúa como identificador de hardware comprensible.
- `accesorio` aparece como relación de orden, pero no debe competir con el concepto principal de chip.

### Vocabulario recomendado para usuario final

- `Dispositivo`
- `Chip activo`
- `Vincular perfil`
- `Ver ficha pública`
- `Activar chip`
- `Suspender chip`
- `Código público`

### Recomendación semántica

- Mostrar `serialPublic` como referencia visible del dispositivo.
- Reservar `shortCode` para ficha pública y enlaces.
- Reservar `internalLabel` para contexto operativo interno.

## 4. Estados visuales actuales

### Estados detectados

- `activated`
- `suspended`
- `inventory`
- `reserved`
- `sold`
- `expired`
- `not_activated`

### Dónde aparecen

- En la lista de `Mis dispositivos`.
- En la activación, cuando el chip no está listo.
- En admin, cuando se gestionan chips de inventario, suspensión o reactivación.

### Lectura visual actual

- `Activo` y `Suspendido` se entienden, pero el resto del vocabulario técnico aparece mezclado con etiquetas de producto.
- Existe riesgo de que `activo` se confunda con `vinculado`.
- La pantalla actual no separa con suficiente claridad:
  - estado del chip;
  - estado del perfil;
  - estado del servicio;
  - estado de visibilidad pública.

## 5. Acciones actuales

### Ver perfil

- Ruta pública: `/e/{shortCode}`
- Depende de `Chip.shortCode` y de la resolución pública.
- Es segura mientras el chip esté activo y el perfil asignado según la lógica pública.

### Activar nuevo

- Desde la pestaña de activación en `/dashboard/chips`.
- Usa `POST /api/chips/activate`.
- Requiere código válido y perfil médico completo.

### Vincular con perfil médico

- Usa `PATCH /api/chips/dashboard` con `action: "assign"`.
- Asigna o desasigna un perfil dentro de la misma cuenta.

### Suspender

- Usa `PATCH /api/chips/dashboard` con `action: "suspend"`.
- Actualmente está demasiado visible como acción peligrosa.

### Reactivar

- Usa `PATCH /api/chips/dashboard` con `action: "reactivate"`.
- También existe reactivación en admin.

### Seguridad de acciones

- Las acciones principales requieren sesión.
- La asignación respeta `accountId`.
- La activación valida cupo, token y perfil.
- La suspensión debería estar más escondida visualmente en cliente.

## 6. Mobile-first

### Riesgos detectados

- Tarjetas demasiado horizontales para pantalla pequeña.
- Mucha mezcla visual entre:
  - estado;
  - código;
  - perfil;
  - accesorios;
  - acciones.
- El botón `Suspender` compite demasiado con la navegación hacia `Ver perfil`.
- La pantalla puede sentirse larga si hay varias tarjetas.

### Lo que debería pasar en móvil

- Una card por chip con jerarquía clara.
- Estado arriba.
- `serialPublic` visible.
- `Editar/Vincular perfil` claro.
- `Ver perfil` como acción útil.
- `Suspender` oculto visualmente o reducido a acción secundaria/peligrosa.
- Tabs cortas y entendibles.

## 7. Desktop

### Riesgos detectados

- La tarjeta se estira demasiado horizontalmente.
- Hay espacio visual desperdiciado.
- Los bloques de texto y acciones están muy dispersos.

### Oportunidad

- Convertir la pantalla en un dashboard de dispositivo claro, con más resumen arriba y menos mezcla de términos técnicos.

## 8. Seguridad y W6.04

### Confirmaciones

- `GET /api/public/[shortCode]` resuelve por `Chip.shortCode`.
- `GET /api/public/[shortCode]/scan` también resuelve por `Chip.shortCode`.
- La ficha pública exige chip activo y perfil asignado según la lógica de resolución pública.
- No debe exponerse `internalLabel` al usuario final como identificador principal.
- No se debe romper el flujo de `W6.04`.
- Las rutas de chips usan sesión y `accountId` para proteger asignación y suspensión.

## 9. Propuesta para W6.05F-B

### Estructura propuesta

- Header corto y claro.
- Resumen superior con cantidad de chips, activos y pendientes.
- Lista de cards más compactas.
- Estado del chip arriba.
- `serialPublic` como protagonista.
- Perfil vinculado como contexto.
- Acciones primarias:
  - `Ver perfil`
  - `Vincular perfil`
  - `Activar chip`
- Acción peligrosa:
  - `Suspender`, oculta o muy secundaria.

### Vocabulario recomendado

- `Mis dispositivos`
- `Chip activo`
- `Vincular perfil`
- `Ver ficha pública`
- `Activar chip`
- `Suspender chip`

### Casos a resolver después

- chip sin perfil;
- perfil sin chip;
- varios chips;
- chip suspendido;
- chip corporativo;
- estado vacío.

## 10. Riesgos

- Tocar activación sin respetar validación de cupo y perfil.
- Confundir `shortCode` con identificador operativo interno.
- Mostrar `internalLabel` al cliente como dato principal.
- Mezclar chip personal y corporativo sin separación visual.
- Dar demasiada visibilidad a `Suspender`.
- Romper W6.04 al tocar la resolución pública.

## 11. Qué NO se tocó

- No se tocó código.
- No se tocó backend.
- No se tocaron endpoints.
- No se tocó `schema.prisma`.
- No hubo migraciones.
- No se ejecutó `db push`.
- No se activó, suspendió ni asignó ningún chip real.
- No se tocó W6.04.
- No se tocó la vista pública médica W6.10.
- No se tocó pedidos, tienda, empresarial, mascotas ni KLFUFPK8.

## 12. Skills usadas

- `prerescate-rules`
- `verification-loop`
- `frontend-a11y`
- `impeccable`
- `frontend-patterns`
- `dashboard-builder`
- `design-system`
- `brandkit`
- `design-taste-frontend`
- `high-end-visual-design`
- `api-design`
- `backend-patterns`
- `error-handling`
- `security-review`

