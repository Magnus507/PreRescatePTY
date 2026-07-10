# BRAND-D4-UX3 - Fix Final de Contraste del Hero, Campana y Preview

## 1. Problema detectado

- La campana del hero se perdía contra el fondo oscuro.
- `Vista rápida` seguía viéndose débil o accidental.
- El lado derecho del hero y el preview estaban demasiado lavados.
- Los nombres, subtítulos y badges perdían fuerza visual.
- `Gestionar` se veía algo aislado del conjunto.

## 2. Qué se corrigió en la campana

- Se reforzó el fondo del botón.
- Se mejoró el contraste del ícono.
- Se ajustó el borde y el focus para que tenga más presencia sin competir con el título.
- Se mantuvo una respuesta sutil al hover.

## 3. Qué se corrigió en `Vista rápida`

- Se convirtió en un badge más sólido e intencional.
- Se redujo el tracking para mejorar lectura.
- Se aumentó la opacidad del texto.
- Se mejoró su integración con el bloque de `Perfiles médicos`.

## 4. Qué se corrigió en el preview

- Se oscureció la superficie interna del preview.
- Se redujo la fuerza del lavado rosado sobre el lado derecho.
- Se reforzó la legibilidad de los nombres.
- Se incrementó la presencia de los subtítulos y badges.
- Se mantuvo la sensación glass premium sin perder contraste.

## 5. Qué se corrigió en el degradado

- Se hizo más suave la transición del hero.
- Se bajó un poco la intensidad del acento rosado.
- Se evitó que el lado derecho apague el contenido.
- Se mantuvo la profundidad oscura como base.

## 6. Cómo se cuidó mobile-first

- No se tocó la estructura de la home.
- No se aumentó la altura del hero.
- Se mantuvo el preview legible en móvil.
- La campana sigue visible en pantallas pequeñas.
- No se tocó la barra inferior ni se generó overflow.

## 7. Skills usadas como criterio

- `prerescate-rules`
- `verification-loop`
- `impeccable`
- `brandkit`
- `design-system`
- `frontend-a11y`
- `design-taste-frontend`
- `high-end-visual-design`

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

BRAND-D4-UX3 cierra los últimos detalles de contraste del hero superior con una corrección quirúrgica: más presencia para la campana, mejor integración de `Vista rápida` y más lectura en el preview, sin rediseñar la home.
