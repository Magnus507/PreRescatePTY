# W5.40M - Hotfix habilitar Pass/Fail QC dentro de Produccion

## Problema

En Produccion, las unidades aparecian con:

- `QA: pending`
- `Inventario: qa_pending`

pero los botones `Pass QC` y `Fail QC` seguian quedando bloqueados o sin una explicacion util.

Tambien seguia apareciendo `Enviar a QC` dentro del bloque QC aunque la orden ya estaba en QC.

## Correccion

- Se endurecio la validacion visual para habilitar QC solo cuando la unidad esta realmente en `qa_pending`.
- `Pass QC` y `Fail QC` usan el `unit.id` real de `OperationFinishedGoodUnit`.
- QC ahora se presenta como etapa directa de revision, sin accion separada de envio.
- Si una unidad no puede aprobarse o rechazarse, la UI muestra un motivo explicito.

## Resultado esperado

- Pedido interno con `Pass QC`:
  - `qaStatus = passed`
  - `status = available`
- Pedido comercial/empresa con `Pass QC`:
  - `qaStatus = passed`
  - `status = reserved`
- `Fail QC`:
  - `qaStatus = failed`
  - `status = qa_failed`
- No se asigna usuario final desde Operaciones.
- No se activa desde Operaciones.
- No se crea despacho automatico.

## Alcance excluido

- No se toco checkout legacy.
- No se toco `Order` / `Product` legacy.
- No se toco activacion legacy.
- No se uso `prisma db push`.
- No se uso `prisma migrate reset`.
