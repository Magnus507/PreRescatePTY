# W6.06D-UX1 - Home Contrast and Legibility

## Resumen
Se ajustó únicamente la legibilidad de textos y badges en la pantalla Inicio del dashboard cliente, manteniendo intactos el fondo, la composición, el layout y la lógica.

## Cambios
- Se aclaró el subtítulo del hero para mejorar lectura sobre fondo oscuro.
- Se elevó el contraste de microtextos y labels del hero.
- Se mejoró la lectura de nombres y subtítulos en la Vista rápida.
- Se ajustó el badge `SIN CHIP` para que conserve jerarquía y contraste suficiente.
- Se mantuvieron las cards inferiores, con solo un ajuste mínimo de copy relacionado con claridad.

## Componentes revisados
- `app/(app)/dashboard/page.tsx`

## Beneficios
- Mejor lectura en desktop y mobile.
- Menos fricción en la jerarquía entre título, subtítulo y metadata.
- Contraste más consistente sin caer en blanco puro excesivo en toda la pantalla.

## Qué NO cambió
- No se cambió el fondo ni la composición.
- No se cambió el layout.
- No se cambió la lógica.
- No se tocó backend, endpoints, BD, Prisma, migraciones ni otras pantallas.
- No se agregaron features nuevas.

## Validaciones
- `git diff`
- `git diff --check`
- `npm run typecheck`
- `npm run build`
