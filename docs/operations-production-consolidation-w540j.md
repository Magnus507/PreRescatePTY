# W5.40J - Produccion como flujo madre de nacimiento de unidades

## Objetivo

Consolidar Produccion como la ventana principal donde nace cada unidad trazable, manteniendo Imprenta y QA como soporte interno y no como destinos principales del menu.

## Cambio aplicado

- El menu principal de Operaciones ya no expone `Imprenta` ni `Calidad / QA` como tabs principales.
- `Produccion` queda como acceso madre al flujo de nacimiento de unidades.
- Dentro de Produccion el operador recorre el flujo completo:
  - identidad digital / QR / NFC
  - imprenta
  - ensamblaje fisico
  - empaque
  - marcar lista para QC
  - QC
  - salida a inventario
- El detalle de la orden ya concentra el trabajo operativo real por unidad.
- La navegacion secundaria de Produccion se redujo a una unica entrada operativa.

## W5.40M - Hotfix QC en Produccion

- El flujo de Produccion mantiene el acordeon progresivo introducido en W5.40L.
- La etapa QC ahora habilita `Pass QC` y `Fail QC` cuando la unidad esta en `qa_pending` con su `unit.id` real.
- QC ya no depende de un boton de envio previo dentro de la misma etapa.
- El inventario final sigue respetando el origen operativo:
  - interno -> `available`
  - comercial/empresa -> `reserved`
- No se reabrio la pestaña `Calidad / QA`.
- No se asigno usuario final desde Produccion.
- No se creo despacho automatico.

## Seguridad de identidad

- `shortCode` sigue siendo la identidad publica unica real.
- El QR y el NFC siguen usando `/e/<shortCode>`.
- No se regenera ni se edita el `shortCode` despues de imprenta.
- No se cambia la identidad canónica después del cierre de impresiòn.

## Alcance excluido

- No se uso `prisma db push`.
- No se uso `prisma migrate reset`.
- No se tocaron migraciones historicas.
- No se toco checkout legacy.
- No se toco `Order` / `Product` legacy.
- No se toco activacion legacy.
- No se activo desde operaciones.
- No se asigno usuario final desde operaciones.

## Inventario trazable

- La salida de Produccion sigue terminando en unidades fisicas trazables.
- `available` sigue significando listo para reserva operativa.
- `reserved` sigue significando reservado para pedido, no usuario final.
- El `shortCode` sigue siendo canónico y no se regenera en Inventario.
- Pedidos usa esta salida para reservar etiqueta interna o para fabricar cuando no hay stock suficiente.
