# W6.05E-UX1 - Mobile Form Save Bar Polish

## 1. Problema detectado

En iPhone/Safari, la barra móvil de `Cancelar / Guardar` en perfiles médicos se percibía como demasiado invasiva:

- aparecía encima de campos del formulario;
- competía visualmente con el bottom nav;
- se cruzaba con el teclado y el autorrelleno;
- restaba contexto al campo activo;
- ocupaba demasiado espacio útil en pantalla.

## 2. Solución elegida

Se retiró el comportamiento `sticky` en móvil y se convirtió la barra de acciones en un bloque normal al final del formulario.

Además, se agregó padding inferior real al formulario para que:

- los últimos campos puedan subir por encima de la navegación inferior;
- el footer de acciones no tape contenido;
- el teclado de iPhone no convierta la edición en una experiencia cargada.

## 3. Por qué se eligió esta solución

Se priorizó la opción más simple, estable y compatible:

- menos riesgo de solapamiento con Safari;
- mejor convivencia con la bottom nav;
- menos lógica condicional;
- más predecible para crear y editar;
- mantiene el guardado visible sin flotarlo sobre los campos.

## 4. Cómo convive con teclado y bottom nav

- La barra ya no flota sobre el contenido.
- El formulario tiene padding inferior suficiente para respirar al final del scroll.
- La acción de guardar sigue siendo fácil de alcanzar con el pulgar.
- El campo activo conserva contexto porque no queda tapado por una superficie persistente.

## 5. Qué se cambió

- Se quitó `sticky` de la barra móvil de acciones.
- Se añadió padding inferior al formulario móvil.
- Se mantuvo la jerarquía de `Cancelar` y `Guardar`.
- Se preservó desktop intacto.

## 6. Qué NO se tocó

- No se tocó `schema.prisma`.
- No hubo migraciones.
- No se tocó BD.
- No se tocó backend.
- No se tocaron endpoints.
- No se tocó la lógica de guardado.
- No se tocó `layout.tsx`.
- No se tocaron chips, pedidos, tienda, empresarial, mascotas ni W6.04.
- No se cambió la vista pública W6.10.

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

## 8. Pendientes

- Revisar en ambiente que el padding inferior cubra bien los tamaños reales de iPhone.
- Confirmar que la barra final no se sienta demasiado separada del cierre del formulario.
- Mantener este patrón si otras pantallas largas necesitan una acción final similar.

