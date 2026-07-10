# BRAND-D4 - Mobile Dashboard Polish

## 1. Objetivo

BRAND-D4 ajusta la experiencia móvil del dashboard cliente para que deje de sentirse como una versión comprimida del desktop y pase a leerse como una experiencia mobile-first real.

## 2. Cambios aplicados en el hero móvil

- Se redujo el padding interno del hero en breakpoints pequeños.
- Se bajó la altura visual percibida del bloque principal.
- El radio del hero se afinó en mobile para evitar que se sintiera como una burbuja demasiado grande.
- Se redujo el gap vertical entre título, subtítulo, pills y CTAs.
- El título pasó a una escala más compacta en mobile.
- La campana conserva presencia, pero ahora compite menos con el contenido principal.

## 3. Corrección de contraste

- El texto secundario del hero quedó más claro para leerse sobre el fondo oscuro.
- Se evitó la combinación de texto demasiado oscuro sobre superficie oscura.
- El contraste de nombres, estados y microcopy del preview de perfiles también se reforzó.

## 4. CTAs móviles

- `Activar chip` sigue siendo el CTA principal.
- `Ver perfiles` quedó más liviano en mobile.
- Se redujo el espacio vertical que ocupaba el bloque de acciones.
- Los botones mantienen focus-visible accesible y estados de active más naturales.

## 5. Preview de perfiles en mobile

- Se ajustó el padding interno de la tarjeta de preview.
- Se redujo un poco la altura percibida de la tarjeta.
- Los items de perfil quedaron con mejor densidad visual.
- Los badges y el texto secundario quedaron más legibles.
- Se reforzó el padding inferior global para evitar que la navegación inferior tape la card.

## 6. Bottom nav móvil

- Se redujo la altura visual de la barra inferior.
- Se bajó un poco la opacidad para que compita menos con el contenido.
- Se ajustó el borde superior y la sombra para que se sienta más integrada.
- Los botones pasaron a ocupar mejor el ancho disponible.
- Se mejoró el safe-area padding para que el contenido no quede oculto detrás de la barra.

## 7. Cards inferiores en mobile

- `Mis dispositivos` y `Tienda` conservan su estructura, pero con mejor densidad y spacing.
- `Mis pedidos` quedó más compacto y con mejor integración visual.
- Se redujo la sensación de bloque alto y pesado en la parte baja de la pantalla.

## 8. Qué no se tocó en desktop

- No se modificó la estructura del sidebar desktop.
- No se cambió la navegación principal de desktop.
- No se alteró la jerarquía visual general de desktop.
- No se tocó la lógica funcional.
- No se tocaron rutas ni módulos.

## 9. Skills usadas como criterio

- `impeccable`
- `frontend-patterns`
- `frontend-a11y`
- `design-system`
- `dashboard-builder`
- `brandkit`
- `design-taste-frontend`
- `emil-design-eng`
- `review-animations`
- `verification-loop`
- `prerescate-rules`

## 10. Validaciones

- `git status --short`
- `git diff`
- `git diff --check`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`

## 11. Conclusión

BRAND-D4 deja el dashboard móvil más liviano, más legible y menos dependiente del layout de escritorio. El resultado prioriza la primera pantalla, el contraste y la no interferencia de la navegación inferior sobre el contenido.
