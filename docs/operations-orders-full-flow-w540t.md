# W5.40T - Pedidos como flujo operativo completo

## Objetivo

Cerrar el flujo operativo de Pedidos para cliente, empresa e internos sin tocar activacion legacy ni asignacion de usuario final.

## Flujo

### Pedido cliente / empresa

1. Revisar datos, items, pago y referencia operativa.
2. Aceptar, rechazar o cancelar.
3. Si hay stock disponible, reservar etiqueta interna.
4. Si no hay stock suficiente, enviar a Produccion.
5. Cuando existan unidades reservadas, permitir crear despacho.

### Pedido interno

1. Crear la intención de fabricacion.
2. Enviar a Produccion.
3. QC Pass termina en inventario disponible.
4. No hay reserva previa de inventario ni despacho.

## Reglas

- Reservar etiqueta interna no asigna usuario final.
- Despacho solo ocurre despues de reserva.
- Activacion ocurre fuera de Operaciones.
- No se uso `prisma db push`.
- No se uso `prisma migrate reset`.
- No se tocaron migraciones historicas.

## Campos faltantes detectados

- Direccion formal estructurada para pedidos comerciales.
- Pago detallado / referencia de pago mas rica.
- Contacto formal separado de referencia operativa.
