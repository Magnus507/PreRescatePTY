# W6.06C - Client Dashboard Shell Polish

## Resumen
Se refinó únicamente el shell compartido del dashboard cliente para que navegación, sidebar, navegación mobile y contenedor principal se perciban como un solo producto alineado al Design System oficial.

## Cambios
- Se unificó el lenguaje visual del sidebar con superficies más limpias, más aire y mejor jerarquía.
- Se normalizó el estado activo, hover y focus de la navegación principal.
- Se suavizó y ordenó la tarjeta inferior de usuario, con mejor separación y branding.
- Se ajustó la navegación mobile para ganar legibilidad, consistencia y accesibilidad táctil.
- Se armonizó el área principal con padding, gradientes y safe areas más consistentes.
- Se mejoró el feedback de carga inicial del layout compartido.

## Componentes afectados
- `app/(app)/dashboard/layout.tsx`
- `lib/dashboard/client-design-system.ts` como referencia oficial de diseño

## Beneficios
- El dashboard ahora se siente más cohesivo entre módulos.
- Hay menos ruido visual y más sensación premium.
- La navegación responde mejor en desktop y mobile.
- El shell respeta mejor la experiencia de uso prolongado y lectura.

## Qué NO se tocó
- Inicio
- Tienda
- Mis pedidos
- Empresa
- Ajustes
- Perfiles
- Dispositivos
- `schema.prisma`
- migraciones
- endpoints
- backend
- Stripe
- activación
- QR
- NFC
- lógica operacional
- BD

## Validaciones
- `git diff`
- `git diff --check`
- `npm run typecheck`
- `npm run build`
