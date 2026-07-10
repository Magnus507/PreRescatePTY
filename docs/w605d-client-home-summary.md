# W6.05D - Rediseño del Inicio / Resumen Operativo del Cliente

## 1. Alcance

Esta fase reorganiza la pantalla Inicio del panel cliente para que funcione como un tablero operativo claro con datos ya existentes.

## 2. Cambios aplicados

- Se redefinió el encabezado para comunicar `Inicio` y `Resumen operativo`.
- Se priorizó un CTA principal contextual según el estado de la cuenta:
  - activar chip
  - ver ficha pública
  - ir a tienda
- Se construyó un bloque de estado general con métricas claras:
  - perfiles médicos
  - perfiles protegidos
  - perfiles sin chip
  - chips activos
  - chips disponibles
  - pendientes de activar
  - capacidad de cuenta
- Se separó la vista en secciones operativas:
  - perfiles médicos
  - dispositivos / chips
  - activación rápida
  - ficha pública
  - tienda
  - pedidos recientes
- Se evitó el texto ambiguo `Límite total` en la home.
- Se mantuvieron rutas existentes y no se tocó la lógica funcional de chips, tienda o pedidos.

## 3. Decisiones de UX

- El inicio quedó arriba con estado general y CTA principal.
- Las métricas fueron convertidas en tarjetas legibles para escritorio y móvil.
- La activación se separó de la compra.
- La ficha pública se explicó como dependiente de un chip activo.
- La tienda y los pedidos quedaron como acciones claras de salida.

## 4. Pendientes / inferencias

- `Capacidad de cuenta` usa el dato de capacidad existente del backend, pero conviene seguir revisando si la fórmula refleja exactamente la capacidad operativa esperada.
- La separación visual de estados de dispositivos sigue dependiendo de lo que exponga el endpoint actual.
- `Copiar enlace` queda como CTA visualmente preparado; si el flujo final requiere una acción real distinta, se ajustará en una etapa posterior.

## 5. Confirmaciones de alcance

- No se modificó `schema.prisma`.
- No hubo migraciones.
- No hubo escrituras en BD.
- No se tocó W6.04.
- No se tocó el helper público de `Chip.shortCode`.
- No se tocó la lógica funcional de Pedidos.
- No se tocó activación/chips funcionalmente.
- No se tocó tienda funcionalmente.
- No se tocó empresarial funcionalmente.
- No se tocó mascotas.
- No se tocó KLFUFPK8.

