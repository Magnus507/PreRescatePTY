# W5.40D - Simplificacion pantalla Produccion

Este cierre redujo la pantalla principal de Produccion a una vista operativa real.

## Que se quito

- Bloque visual estatica de pasos.
- Seccion de estados operativos decorativos.
- Tarjetas estaticas inferiores de guia.

## Que quedo

- Encabezado simple de Produccion.
- Subtitulo centrado en ordenes creadas desde pedidos internos o por falta de stock.
- Resumen real cuando hay datos.
- Lista de ordenes de produccion con:
  - codigo
  - origen
  - tipo de origen
  - producto
  - cantidad
  - etapa actual
  - progreso
  - accion para abrir flujo
- Empty state claro cuando no hay ordenes.

## Flujo dentro de la orden

El detalle de la orden sigue mostrando el flujo operativo real:

- Preparacion NFC / QR
- Imprenta
- Ensamblaje fisico
- QC
- Resultado

## Alcance

- No hubo cambios de backend.
- No hubo migracion.
- No se toco legacy.
- No se toco checkout legacy.
- No se toco `Order` / `Product` legacy.
- No se toco activacion legacy.
