# W6.05F-D - Unificar navegacion de chips dentro de Mis Dispositivos

## 1. Decision UX

`Activar chip` deja de comportarse como una seccion principal del panel cliente. La activacion vive dentro de `Mis dispositivos` como tab/accion de la misma pantalla.

El modelo queda:

- `Mis dispositivos`
- `Mis chips`
- `Activar chip`
- `Vincular perfil`
- `Ver ficha publica`
- `Suspender/Reactivar chip`
- `Accesorios vinculados` si aplica

## 2. Sidebar cliente

El sidebar del panel cliente queda con una sola entrada principal para chips:

- `Mis dispositivos`

Ya no se expone `Activar chip` como item independiente.

## 3. Mobile nav

El menu movil tambien conserva `Mis dispositivos` como entrada principal. La activacion se mantiene accesible desde la pantalla de dispositivos.

## 4. Compatibilidad

Se mantiene compatibilidad con:

- `/dashboard/chips?activate=true`
- `/activar`, que redirige a `/dashboard/chips?activate=true`
- CTAs existentes de la home que apuntan a `/dashboard/chips?activate=true`

La pantalla `/dashboard/chips` sigue leyendo `activate=true` y abre la tab interna `Activar chip`.

## 5. Que NO se toco

- No se toco `schema.prisma`.
- No hubo migraciones.
- No se toco BD.
- No se toco backend.
- No se tocaron endpoints.
- No se cambiaron payloads.
- No se cambio logica funcional.
- No se activo, suspendio, asigno ni reactivo ningun chip.
- No se toco W6.04.
- No se toco W6.10.
- No se toco el helper publico de `Chip.shortCode`.
- No se tocaron pedidos, tienda, empresarial, mascotas ni `KLFUFPK8`.
- No se tocaron estilos de fondo/card de `Mis dispositivos`.

## 6. Skills usadas como criterio

- `prerescate-rules`
- `verification-loop`
- `dashboard-builder`
- `frontend-patterns`
- `frontend-a11y`
- `design-system`
- `impeccable`

## 7. Validaciones

- `git status --short`
- `git diff`
- `git diff --check`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`

## 8. Conclusion

W6.05F-D deja la navegacion de chips mas clara: el usuario entra por `Mis dispositivos` y desde ahi puede ver chips, activar uno nuevo, vincular perfiles y gestionar acciones del chip sin duplicar modulos en el sidebar.
