# W6.05D - Rediseño del Inicio / Resumen del Cliente

## 1. Alcance

Esta fase simplifica la pantalla Inicio del panel cliente para que vuelva a sentirse rápida, clara, visual y mobile-first.

## 2. Cambios aplicados

- Se simplificó el encabezado para usar marca y un subtítulo breve.
- Se dejó un hero principal claro con pocas métricas.
- Se conservaron las tarjetas principales:
  - Perfiles médicos
  - Mis dispositivos
  - Tienda
  - Pedidos como acceso secundario
- Se mantuvo la acción de activar chip como CTA principal contextual.
- Se retiró la ficha pública como bloque grande independiente.
- Se evitó el ruido visual de demasiadas secciones, badges y explicaciones.
- Se mantuvieron rutas existentes y no se tocó la lógica funcional de chips, tienda o pedidos.

## 3. Decisiones de UX

- El inicio volvió a sentirse más de marca y menos administrativo.
- El detalle operativo quedó para las páginas internas.
- La activación se separó de la compra.
- La ficha pública dejó de dominar la home.
- La tienda y los pedidos siguen accesibles sin saturar la pantalla.

## 4. Pendientes / inferencias

- `Capacidad de cuenta` se conserva como métrica útil, pero el cálculo operativo seguirá revisándose en iteraciones posteriores.
- La experiencia está pensada primero para celular, con tarjetas apiladas y lectura rápida.

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
