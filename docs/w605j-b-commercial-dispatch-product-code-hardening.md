# W6.05J-B Commercial Dispatch Product Code Hardening

## Resumen ejecutivo

Se endureció la ruta comercial de creación de despacho para que valide explícitamente el `productCode` canónico del pedido contra las unidades reservadas antes de crear el despacho. La política de entrega no cambió: la confirmación de entrega sigue marcando las unidades como entregadas y conserva la trazabilidad operativa existente.

Esto reduce el riesgo de despachar unidades normales y empresariales mezcladas por una clasificación previa incorrecta.

## Hallazgos de J-A

- la ruta comercial de despacho ya exigía unidades reservadas;
- también exigía QA aprobado y activación pendiente;
- la entrega no activa chips ni asigna perfiles;
- la UI admin separa bien reserva, producción, despacho y entrega;
- el hueco que quedaba era la validación explícita del `productCode` canónico en la creación del despacho comercial.

## Validación `productCode` agregada

### En la ruta comercial

La ruta de creación de despacho comercial ahora:

- deriva el `productCode` canónico desde los ítems del pedido;
- rechaza pedidos con `productCode` mixto o faltante;
- compara cada unidad reservada contra el `productCode` canónico del pedido;
- rechaza el despacho si una unidad reservada no coincide.

### Errores introducidos

- `MIXED_OR_MISSING_PRODUCT_CODE`
- `PRODUCT_CODE_MISMATCH`

## Política `reservedOrderId` al entregar

Política documentada:

- la entrega conserva `reservedOrderId` como trazabilidad histórica;
- la unidad pasa a `status = delivered`;
- `delivered` la excluye de disponibilidad operativa;
- no se limpia `reservedOrderId` en la entrega porque sirve como origen histórico del despacho/entrega;
- no se cambió la ruta de entrega.

## Qué no cambió

- no se modificó `schema.prisma`;
- no se hicieron migraciones;
- no se tocó la BD;
- no se cambió el flujo de activación;
- no se cambió la confirmación de entrega;
- no se tocó reserva;
- no se tocó liberación;
- no se automatizó despacho;
- no se automatizó entrega;
- no se tocaron QR/NFC;
- no se generó `shortCode`;
- no se asignaron perfiles;
- no se activaron chips;
- no se despachó ni entregó nada real en pruebas.

## Riesgos remanentes

- pedidos mixtos siguen requiriendo tratamiento especial;
- la entrega conserva trazabilidad, pero no resuelve por sí sola una auditoría de expiración/responsable;
- la política de trazabilidad depende de eventos y estados existentes;
- sigue siendo posible un error humano en la reserva previa si el flujo operativo se usa mal.

## Validaciones

- `git status --short`
- `git diff`
- `git diff --check`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`

## Skills usadas

- `prerescate-rules`
- `verification-loop`
- `api-design`
- `backend-patterns`
- `security-review`
- `error-handling`
- `coding-standards`

## Conclusión

El despacho comercial queda más blindado contra mezclas de `productCode` y la política de entrega queda documentada sin cambiar el comportamiento de activación o asignación.
