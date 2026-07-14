# W6.08G - Auditoría y corrección de todos los callers del sync hacia Operaciones

## Resumen ejecutivo

Esta fase cerró la consistencia de los callers que sincronizan órdenes hacia Operaciones cuando ya existe `Product.operationalMapping` real.

La corrección de W6.08F dejó bien encaminado `app/api/orders/route.ts`, pero W6.08G detectó que otros callers seguían degradando la identidad operativa antes del sync, especialmente en flujos corporativos.

Resultado:

- Los callers basados en `Product.operationalMapping` quedaron alineados.
- Los flujos legacy de paquete requieren una fase separada.

## Callers auditados

Callers reales de `syncRealOrderToOperations` encontrados en el repositorio:

- [`app/api/orders/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/orders/route.ts)
- [`app/api/payments/webhook/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/payments/webhook/route.ts)
- [`app/api/orders/manual/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/orders/manual/route.ts)
- [`app/api/organizations/corporate-orders/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/organizations/corporate-orders/route.ts)
- [`app/api/organizations/corporate-orders/from-requests/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/organizations/corporate-orders/from-requests/route.ts)

## Callers corregidos

Se corrigieron los caminos que sí operan sobre `Product` y `ProductOperationalMapping`:

- [`app/api/orders/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/orders/route.ts)
- [`app/api/organizations/corporate-orders/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/organizations/corporate-orders/route.ts)
- [`app/api/organizations/corporate-orders/from-requests/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/organizations/corporate-orders/from-requests/route.ts)
- [`lib/operations/sync-real-order-to-operations.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/lib/operations/sync-real-order-to-operations.ts)

### Qué se corrigió

- El checkout ya no pierde la identidad operativa cuando arma el payload del sync.
- Los flujos corporativos ya no envían `productId` como si fuera `productCode`.
- El sync acepta un contrato expandido y usa datos ya resueltos cuando existen.
- Se mantiene fallback legacy solo para casos que no traen identidad operativa completa.

## Callers legacy no modificados

Se auditó pero no se cambió la naturaleza de estos caminos porque no operan con `Product.operationalMapping` como fuente canónica:

- [`app/api/payments/webhook/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/payments/webhook/route.ts)
- [`app/api/orders/manual/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/orders/manual/route.ts)

Estos flujos siguen atados a paquetes legacy. No se les inventó una identidad operativa falsa.

## Contrato expandido del sync

`SyncRealOrderToOperationsInput.items` ahora acepta, además de `productCode`, estos campos:

- `productId`
- `operationalMappingId`
- `operationalProductCode`
- `operationalProductName`
- `operationalFinishedGoodId`

Comportamiento:

- Si existe identidad operativa completa, el sync la usa directamente.
- Si no existe, el sync cae al helper de mapeo existente.
- Si el item queda `unmapped`, no se inventa un sticker ni se fuerza otra línea.

## Comportamiento de órdenes corporativas

Los flujos corporativos ahora consultan el `Product` real y su `operationalMapping` antes de llamar al sync.

En concreto:

- Se valida que cada producto tenga mapping publicado.
- Se propaga `finishedGoodId` correcto.
- Se propaga `productCode` correcto.
- Se transporta `operationalMappingId` como referencia trazable.
- No se usa `productId` como sustituto de `productCode`.

Esto aplica tanto a:

- creación directa de órdenes corporativas;
- creación desde solicitudes corporativas aprobadas.

## Comportamiento de `/api/orders`

[`app/api/orders/route.ts`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/api/orders/route.ts) mantiene el camino de W6.08F:

- resuelve `Product.operationalMapping` al momento del checkout;
- transporta esa identidad al sync;
- conserva `resolvedFinishedGoodId`;
- conserva `resolvedOperationalProductCode`;
- conserva `resolvedOperationalProductName`;
- conserva `resolvedMappingId`.

No se degradó ese flujo.

## Limitación estructural

`OrderItem` no persiste `productId` en el esquema actual.

Consecuencia:

- un retry o procesamiento posterior no siempre puede reconstruir el `Product` original desde `OrderItem` solo;
- si el caller no trae el contexto operativo en memoria, la trazabilidad canónica depende de otras entidades persistidas o de la identidad ya resuelta antes del sync;
- esto afecta especialmente los flujos legacy de paquete.

## Riesgo de retries sin contexto original

Se confirmó que un retry posterior puede perder el contexto que sí estaba disponible en el request original.

Riesgos:

- reconstrucción por nombre visible;
- reconstrucción por `productType`;
- reconstrucción por `packageId` en órdenes directas;
- selección incorrecta de `FinishedGood` si el item no trae identidad operativa completa.

Mitigación aplicada:

- el sync prioriza el contrato expandido cuando viene completo;
- se evita inventar un mapping alterno;
- se mantiene idempotencia por `sourceType` + `sourceId` en el sync.

## Qué no cambió

- No se modificó `schema.prisma`.
- No se crearon migraciones.
- No se tocó UI.
- No se cambió Stripe.
- No se cambió QR/NFC.
- No se alteraron reglas de negocio.
- No se cambió el motor de reserva.
- No se inventaron excepciones por producto.

## Pruebas

Se ejecutaron y pasaron:

- `npm run typecheck`
- `npx vitest run tests/lib/sync-real-order-to-operations.test.ts tests/routes/payments-webhook.test.ts`
- `npm run build`

Además, la validación de Prisma quedó correcta con `npx prisma validate`.

## Warnings preexistentes

El build reportó warnings de ESLint ya existentes en archivos ajenos a esta fase:

- uso de `<img>` en varias vistas admin/public;
- un warning de dependencias de `useCallback` en una pantalla corporativa.

No se tocaron porque no pertenecen a W6.08G.

## Conclusión

Los callers basados en `Product.operationalMapping` quedaron alineados. Los flujos legacy de paquete requieren una fase separada.
