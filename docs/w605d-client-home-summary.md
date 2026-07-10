# W6.05D - Rediseño del Inicio / Resumen del Cliente

## 1. Alcance

Esta fase simplifica la pantalla Inicio del panel cliente para que vuelva a sentirse rápida, clara y fácil de leer.

## 2. Cambios aplicados

- Se simplificó el encabezado para mostrar `Inicio` con un subtítulo breve y directo.
- Se redujo la cantidad de métricas visibles en la parte superior.
- Se mantuvo un CTA principal contextual sin convertir la home en un panel técnico.
- Se conservaron las tarjetas principales:
  - Perfiles médicos
  - Mis dispositivos
  - Activar chip
  - Tienda
  - Pedidos como acceso secundario
- Se retiró la ficha pública como bloque grande independiente.
- Se evitó el ruido visual de demasiadas badges, métricas y explicaciones.
- Se mantuvieron rutas existentes y no se tocó la lógica funcional de chips, tienda o pedidos.

## 3. Decisiones de UX

- El inicio volvió a una lectura más simple para cliente final.
- El detalle operativo quedó para las páginas internas.
- La activación se separó de la compra.
- La ficha pública quedó como un mensaje sutil dentro del contexto, no como bloque principal.
- La tienda y los pedidos siguen accesibles sin saturar la home.

## 4. Pendientes / inferencias

- `Capacidad de cuenta` se conserva como métrica útil, pero el cálculo operativo seguirá revisándose en iteraciones posteriores.
- El detalle de estados de dispositivos, perfiles y pedidos queda mejor atendido en sus páginas internas.

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

## 6. Revisión visual

- Esta versión fue simplificada tras revisión visual para dar una sensación más clara y menos densa.
- El objetivo es que el cliente entienda lo esencial de un vistazo y siga a las páginas internas para el detalle.
