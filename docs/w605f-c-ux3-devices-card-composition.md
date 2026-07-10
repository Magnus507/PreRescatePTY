# W6.05F-C-UX3 - Composicion compacta de card de chip

## 1. Problema detectado

Tras W6.05F-C-UX2, el fondo ya estaba mejor resuelto, pero la card de chip activo quedo demasiado horizontal en desktop. La informacion se leia como islas separadas:

- identidad del chip a la izquierda;
- badges tecnicos al centro;
- perfil vinculado a la derecha;
- acciones fuera del foco principal.

## 2. Que se compacto

- La card paso a una composicion de dos columnas en desktop.
- La columna izquierda agrupa identidad del chip, estado, codigo publico y datos tecnicos.
- La columna derecha agrupa perfil vinculado, selector y acciones.
- Se redujo espacio muerto entre bloques.
- Se mantuvo el comportamiento vertical en mobile.

## 3. Acciones visibles

- `Ver ficha` ahora vive dentro del bloque de perfil y acciones.
- `Suspender` queda visible, pero con menor protagonismo que la ficha publica.
- `Reactivar` sigue visible cuando el chip esta suspendido.
- No se cambiaron handlers ni rutas.

## 4. Perfil vinculado

- El bloque de perfil se integro mas a la card.
- El selector conserva buen contraste.
- Si hay perfil asignado, se muestra el nombre como contexto inmediato.
- Si no hay perfil, el bloque comunica `Seleccionar perfil`.

## 5. Mobile

- La card mantiene recorrido vertical.
- Las acciones siguen siendo tactiles.
- El selector mantiene ancho completo.
- No se agrega overflow horizontal.

## 6. Que NO se toco

- No se toco el fondo del hero.
- No se rehizo la direccion visual de UX2.
- No se tocaron tabs ni navegacion.
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
- No se toco Home, layout global ni sidebar.

## 7. Skills usadas como criterio

- `prerescate-rules`
- `verification-loop`
- `design-system`
- `design-taste-frontend`
- `frontend-a11y`
- `impeccable`
- `frontend-patterns`
- `dashboard-builder`
- `high-end-visual-design`

## 8. Validaciones

- `git status --short`
- `git diff`
- `git diff --check`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`

## 9. Conclusion

W6.05F-C-UX3 hace que la card de chip se lea como una unidad completa: identidad, estado, perfil y acciones quedan conectados sin perder claridad ni mobile-first.
