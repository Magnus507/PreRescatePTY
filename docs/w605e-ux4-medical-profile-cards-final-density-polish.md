# W6.05E-UX4 - Ajuste final de densidad, acciones y jerarquía en cards móviles

## 1. Problema visual revisado

Tras W6.05E-UX3, la pantalla ya se leía mucho mejor, pero en móvil algunas cards seguían sintiéndose algo altas y cargadas:

- demasiadas líneas de acción en la misma franja;
- bloques informativos algo densos;
- el expando de contactos podía ocupar más alto del ideal;
- el botón de ficha pública competía más de lo necesario cuando el perfil ya estaba protegido.

## 2. Ajustes de densidad

- Se redujo un poco el padding del contenedor principal en móvil.
- Se compactaron los bloques de teléfono, alergias y condiciones.
- Se bajó ligeramente la altura de las tarjetas vacías de guardianes.
- Se afinó el padding del bloque expandido de contactos en móvil.

## 3. Ajustes de acciones

### Perfil con chip

- `Editar` y `Contactos` quedaron más claros como acciones principales.
- `Ficha pública` quedó visible sin dominar el conjunto.
- `Eliminar` pasó a verse como acción secundaria/peligrosa más discreta.

### Perfil sin chip

- `Vincular chip` mantiene el protagonismo cuando existe disponibilidad.
- `Editar` sigue accesible como acción secundaria importante.
- `Contactos` continúa visible sin sobrecargar la fila.
- `Eliminar` permanece al final con menos peso visual.

## 4. Ajustes de badges

- Se mantuvo visible sangre y estado de chip.
- Los badges de asistencia especial siguen presentes pero con mejor wrap visual.
- Se redujo la sensación de escalera de badges al compactar espacios y radios.

## 5. Ajustes mobile-first

- La card ahora se siente más corta y más fácil de recorrer con el pulgar.
- Las acciones principales quedan más reconocibles.
- Los bloques de datos cortos se leen rápido sin parecer una tabla.
- El flujo de guardianes expandidos sigue claro, pero menos pesado.

## 6. Qué NO se tocó

- No se tocó `MedicalProfileForm.tsx`.
- No se tocó `schema.prisma`.
- No hubo migraciones.
- No se tocó BD.
- No se tocó backend.
- No se tocó endpoints.
- No se cambió el payload de guardado.
- No se tocó W6.04.
- No se tocó la vista pública médica W6.10.
- No se tocó chips, pedidos, tienda, empresarial ni mascotas.

## 7. Skills usadas

- `prerescate-rules`
- `verification-loop`
- `frontend-a11y`
- `impeccable`
- `frontend-patterns`
- `dashboard-builder`
- `design-system`
- `brandkit`
- `design-taste-frontend`

## 8. Validaciones

- `git status --short`
- `git diff`
- `git diff --check`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`

## 9. Pendientes

- Confirmar en iPhone real que la fila de acciones ya no se siente larga.
- Verificar que la reducción de padding no haga perder aire cuando el perfil tiene muchos badges.
- Si aparece saturación futura, seguir compactando guardianes antes que volver a expandir la card.

