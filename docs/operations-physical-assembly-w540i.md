# W5.40I - Ensamblaje fisico profesional por unidad

## Objetivo

Convertir el ensamblaje fisico en una secuencia operativa clara por unidad, con checklist visible y acciones que refrescan el estado despues de cada paso.

## Cambio aplicado

- La pantalla de Produccion ahora separa claramente:
  - preparacion digital
  - imprenta
  - ensamblaje fisico
  - QC
- Cada unidad fisica muestra checklist de:
  - NFC programado
  - QR preparado
  - ensamblaje fisico
  - empaque cerrado
  - unidad cerrada
- Se agregaron acciones por unidad para:
  - marcar NFC
  - marcar QR
  - ensamblar
  - marcar empaque completado
  - cerrar unidad
- El backend exige la secuencia operativa:
  - `printed` -> `assembled` -> `packaged` -> `completed`
- El envio a QC queda bloqueado hasta que todas las unidades esten cerradas.
- Cada accion refresca la orden y el estado de imprenta para mantener la vista sincronizada.

## Alcance excluido

- No se uso `prisma db push`.
- No se uso `prisma migrate reset`.
- No se tocaron migraciones historicas.
- No se toco checkout legacy.
- No se toco `Order` / `Product` legacy.
- No se toco activacion legacy.
- No se asigno usuario final desde Produccion.
- No se creo despacho.

