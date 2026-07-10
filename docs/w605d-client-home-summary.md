# W6.05D - Rediseño del Inicio / Resumen del Cliente

## 1. Alcance

Esta fase ajusta la pantalla Inicio para que gane marca, use mejor el ancho en desktop y siga sintiéndose mobile-first.

## 2. Cambios aplicados

- Se reforzó el encabezado con marca y un tono más cercano a app de cliente.
- Se amplió el uso del ancho en desktop con un hero más protagonista.
- Se incorporó un preview útil de Perfiles médicos.
- Se simplificó la pantalla retirando la tarjeta redundante de Perfiles médicos del bloque inferior.
- Se retiró la métrica de `Capacidad de cuenta` para evitar confusión con el modelo actual.
- Se conservaron las tarjetas principales:
  - Mis dispositivos
  - Tienda
  - Pedidos como acceso secundario
- Se mantuvo la acción de activar chip como CTA principal contextual.
- Se evitó el ruido visual de secciones, badges y explicaciones innecesarias.
- Se mantuvieron rutas existentes y no se tocó la lógica funcional de chips, tienda o pedidos.

## 3. Decisiones de UX

- El inicio volvió a sentirse más de marca y menos administrativo.
- El detalle operativo quedó para las páginas internas.
- La activación se separó de la compra.
- La ficha pública dejó de dominar la home.
- La tienda y los pedidos siguen accesibles sin saturar la pantalla.

## 4. Pendientes / inferencias

- La experiencia está pensada primero para celular, con tarjetas apiladas y lectura rápida.
- El detalle operativo seguirá viviendo en las páginas internas de perfiles, dispositivos, tienda y pedidos.

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
