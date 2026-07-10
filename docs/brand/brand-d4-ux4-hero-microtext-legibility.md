# BRAND-D4-UX4 - Fix Final de Legibilidad de Microtexto en Hero

## 1. Problema detectado

- `PRERESCUE ID` se perdía en mobile por tracking y contraste muy delicados.
- El subtítulo del hero tenía demasiada opacidad baja.
- `ESTADO` no tenía suficiente presencia dentro del pill de cuenta.
- Los subtítulos del preview seguían un poco suaves sobre el fondo oscuro.

## 2. Qué se corrigió en `PRERESCUE ID`

- Se subió la opacidad del texto.
- Se redujo ligeramente el tracking para mejorar lectura en mobile.
- Se reforzó el fondo del pill sin volverlo pesado.
- Se mantuvo el punto rojo visible y reconocible.

## 3. Qué se corrigió en el subtítulo del hero

- Se elevó el contraste para que no desaparezca sobre el fondo oscuro.
- Se subió la opacidad mínima real.
- Se agregó un `text-shadow` sutil para mejorar lectura sin cambiar la composición.

## 4. Qué se corrigió en `ESTADO`

- Se reforzó la opacidad del label.
- Se conservó la jerarquía menor frente a `Cuenta activa`.
- Se mantuvo la legibilidad en mobile y desktop.

## 5. Qué se corrigió en el preview

- Se subió ligeramente el contraste de los subtítulos de perfil.
- Se mantuvo el equilibrio para que no compitan con el nombre.
- Se conservó el estilo glass premium.

## 6. Cómo se cuidó mobile-first

- Los cambios se aplicaron en la base del estilo, priorizando mobile.
- No se aumentó la altura del hero.
- No se modificó la estructura.
- No se tocó la navegación inferior ni el layout general.

## 7. Skills usadas como criterio

- `prerescate-rules`
- `verification-loop`
- `frontend-a11y`
- `impeccable`
- `brandkit`
- `design-system`
- `design-taste-frontend`

## 8. Qué NO se tocó

- No se tocó `schema.prisma`.
- No hubo migraciones.
- No se tocó BD.
- No se tocaron backend, endpoints ni lógica funcional.
- No se tocaron chips, pedidos, tienda, empresarial, mascotas ni W6.04.
- No se tocó `layout.tsx`.
- No se agregaron secciones nuevas.

## 9. Validaciones

- `git status --short`
- `git diff`
- `git diff --check`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`

## 10. Conclusión

BRAND-D4-UX4 eleva la legibilidad de los microtextos del hero sin cambiar la composición ni el carácter premium de la home. El resultado es más cómodo de leer en mobile y más firme en desktop.
