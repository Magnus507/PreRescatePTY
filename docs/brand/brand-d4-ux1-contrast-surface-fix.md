# BRAND-D4-UX1 - Fix de Contraste, Texto Blanco y Superficies Lavadas

## 1. Problema detectado

La home ya tenía buena dirección visual, pero algunas superficies seguían lavando el contraste en mobile y desktop. El caso más visible era `Mis dispositivos`, donde el fondo superior aclaraba demasiado la tarjeta, el badge `Activo` perdía presencia y el CTA quedaba menos consistente de lo deseado.

## 2. Qué se corrigió en `Mis dispositivos`

- Se oscureció la base del gradiente para eliminar zonas claras detrás del texto blanco.
- Se reforzó la lectura del título y del número central.
- Se hizo más legible el badge de estado.
- Se ajustó el CTA para que no quedara ambiguo sobre la superficie.
- Se mantuvo la profundidad premium sin introducir una tarjeta plana.

## 3. Qué se revisó en `Tienda`

- Se mantuvo el bloque comercial sobrio.
- Se verificó que el badge siguiera leyendo bien sobre fondo oscuro.
- Se preservó el CTA rojo sin tocar la estructura.
- No se rediseñó la card si ya estaba funcionando correctamente.

## 4. Qué se revisó en hero y preview

- Se revisó el texto secundario del hero para evitar pérdida de contraste.
- Se mantuvieron los microtextos `Vista rápida` y `Gestionar` con contraste suficiente.
- Se reforzó la legibilidad de los estados `Protegido` y `Sin chip`.
- No se alteró la composición del hero ni la preview de perfiles.

## 5. Cómo se aseguró mobile-first

- El ajuste se hizo directamente en `page.tsx`, sin tocar la estructura de navegación.
- Se priorizó el bloque de dispositivos en ancho completo sin overflow.
- Se evitó aumentar la altura general del hero o de las cards.
- Se cuidó la legibilidad en la navegación inferior y el contenido cercano al safe-area.

## 6. Skills usadas como criterio

- `prerescate-rules`
- `verification-loop`
- `impeccable`
- `brandkit`
- `design-system`
- `frontend-a11y`
- `design-taste-frontend`
- `high-end-visual-design`

## 7. Qué NO se tocó

- No se tocó `schema.prisma`.
- No hubo migraciones.
- No se tocó BD.
- No se tocaron chips, pedidos, tienda, empresarial, mascotas ni W6.04.
- No se cambiaron rutas ni estructura funcional.
- No se tocó `layout.tsx`.

## 8. Validaciones

- `git status --short`
- `git diff`
- `git diff --check`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`

## 9. Conclusión

BRAND-D4-UX1 corrige la pérdida de legibilidad en superficies lavadas sin mover la arquitectura de la home. El resultado mantiene el look premium, pero con contraste más confiable en desktop y mobile.
