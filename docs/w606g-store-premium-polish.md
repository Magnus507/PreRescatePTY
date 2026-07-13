# W6.06G - Store Premium Polish

## Resumen
Se elevó únicamente la pantalla `Tienda` del dashboard cliente para que se sienta más premium, más clara y más coherente con el nuevo lenguaje visual del producto.

## Cambios
- Se refinó el hero para conservar presencia de marca, pero con mejor legibilidad, jerarquía y contraste.
- Se unificó la superficie de las cards de producto con más aire, mejor separación y un acabado más limpio.
- Se mejoró la jerarquía de precios, stock, cantidad y total dentro de cada card.
- Se ajustó la legibilidad del checkout, el selector de perfiles y los estados de pago.
- Se mejoraron los estados vacíos, loading y confirmación para mantener la misma línea visual.
- Se reforzó el foco visible en CTAs y controles interactivos clave.

## Componentes afectados
- `app/(app)/dashboard/tienda/page.tsx`

## Beneficios
- La Tienda se percibe como parte del mismo producto que Inicio, Perfiles y Dispositivos.
- La lectura mejora en desktop y mobile sin tocar la lógica.
- El flujo de compra se siente más ordenado y confiable.
- Los estados de soporte ya no se sienten tan planos ni administrativos.

## Qué NO se tocó
- backend
- endpoints
- BD
- Prisma
- migraciones
- Stripe
- activación
- chips
- QR
- NFC
- shell
- sidebar
- Inicio
- Perfiles médicos
- Mis dispositivos
- Mis pedidos
- Empresa
- Ajustes
- lógica operacional

## Validaciones
- `git diff`
- `git diff --check`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`
