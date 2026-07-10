# W6.05E-UX2 - Simplificar recorrido móvil del formulario médico

## 1. Auditoría rápida

El formulario médico ya estaba funcional y completo, pero en mobile el recorrido se percibía más largo de lo necesario. El principal problema no era de datos, sino de jerarquía:

- el tipo de sangre quedaba demasiado abajo para un campo tan importante;
- las ayudas iniciales no dejaban claro por dónde empezar;
- las secciones opcionales se veían al mismo nivel visual que las esenciales;
- el usuario podía sentir que el formulario era más pesado de lo que realmente es.

## 2. Problema detectado

La experiencia móvil necesitaba una ruta más clara para completar primero lo mínimo útil:

1. nombre;
2. apellido;
3. tipo de sangre;
4. teléfono si aplica;
5. alergias, condiciones y medicamentos;
6. datos opcionales más adelante.

## 3. Cambios realizados

### Datos básicos

- Se movió el tipo de sangre a la sección de datos básicos.
- Se reforzó el copy inicial para que el usuario entienda qué completar primero.
- Se mantuvo el resto de identidad en el mismo bloque para no fragmentar la lectura.

### Información médica esencial

- Se dejó esta sección enfocada en alergias, condiciones, medicamentos y notas críticas.
- Se simplificó la ayuda para que no compita con el bloque de datos básicos.

### Secciones opcionales

- Se marcaron explícitamente como `Opcional`.
- Se mejoró el copy de asistencia especial, retorno seguro y seguro/médico tratante.
- Se conserva el patrón de módulos cerrados para no abrumar en móvil.

## 4. Cómo mejora mobile-first

- El usuario ve antes lo que activa un perfil útil.
- El campo más sensible para emergencias, sangre, queda arriba.
- Las secciones opcionales siguen disponibles, pero no se sienten urgentes.
- El recorrido hacia `Guardar` se vuelve más entendible porque el formulario está mejor escalonado.

## 5. Qué campos/secciones se reorganizaron

- `Tipo de sangre` pasó de información médica esencial a datos básicos.
- `Alergias`, `Condiciones`, `Medicamentos` y `Notas críticas` quedaron agrupados como bloque médico esencial.
- `Asistencia especial`, `Deterioro cognitivo`, `Retorno seguro` y `Seguro y médico tratante` quedaron señalados como opcionales.

## 6. Qué NO se tocó

- No se tocó `schema.prisma`.
- No hubo migraciones.
- No se tocó BD.
- No se tocó backend.
- No se tocaron endpoints.
- No se cambió el payload de guardado.
- No se eliminaron campos médicos.
- No se cambiaron nombres de campos usados por backend.
- No se tocó la vista pública médica.
- No se tocó W6.04.
- No se tocó chips, pedidos, tienda, empresarial ni mascotas.

## 7. Skills usadas

- `prerescate-rules`
- `verification-loop`
- `frontend-a11y`
- `impeccable`
- `frontend-patterns`
- `dashboard-builder`
- `design-system`
- `error-handling`
- `design-taste-frontend`

## 8. Validaciones

- `git status --short`
- `git diff`
- `git diff --check`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`

## 9. Pendientes

- Revisar en ambiente que el orden nuevo efectivamente reduzca fricción en iPhone.
- Confirmar que la nueva jerarquía no haga sentir al formulario más largo en desktop.
- Ajustar microcopy si el usuario todavía siente que alguna sección opcional pesa demasiado.

