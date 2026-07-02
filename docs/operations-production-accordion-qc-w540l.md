# W5.40L - Acordeon progresivo de Produccion con QC integrado

## Objetivo

Convertir Produccion en un flujo real por etapas, con QC dentro de la misma pantalla y con etapas previas/futuras controladas por estado operativo.

## Cambio aplicado

- Se agrego un acordeon real por etapas:
  - identidad
  - imprenta
  - ensamblaje
  - QC
  - resultado
- La etapa actual se abre automaticamente y las anteriores se contraen.
- Las etapas futuras permanecen ocultas hasta que corresponden.
- `Enviar a QC` abre el flujo de QC dentro de Produccion.
- `Pass QC` y `Fail QC` operan sobre la unidad trazable correcta.
- La salida final sigue respetando el origen de la orden:
  - pedido interno -> `available`
  - pedido comercial/empresa -> `reserved`

## Alcance excluido

- No se toco checkout legacy.
- No se toco `Order` / `Product` legacy.
- No se toco activacion legacy.
- No se uso `prisma db push`.
- No se uso `prisma migrate reset`.
