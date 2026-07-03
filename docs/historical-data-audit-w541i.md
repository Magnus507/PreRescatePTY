# W5.41I - Auditoría protegida de data histórica inconsistente

## Objetivo

Auditar data histórica sensible sin aplicar correcciones automáticas sobre:

- pedidos aprobados/pagados sin reserva
- pedidos entregados sin despacho
- pedidos con `userId` antes de activación

## Reglas de protección

- No reparar datos.
- No borrar registros.
- No cambiar `userId`.
- No tocar `shortCode`.
- No tocar activación.
- No tocar QR / NFC.
- No tocar checkout legacy.
- No ejecutar `db push` ni `migrate reset`.

## Criterio canónico

En `Order`, `userId` se interpreta como el comprador o propietario del pedido.
No se usa como asignación de chip, ni como vínculo de activación de unidad física.

La secuencia operativa válida sigue siendo:

1. pedido
2. reserva / producción
3. despacho
4. entrega
5. activación cuando corresponda

## Auditoría ejecutable

Script:

- `scripts/audit-historical-data-w541i.ts`

Ese script es de solo lectura y clasifica filas en:

- `SAFE_TEST_DATA`
- `LEGACY_REAL_DATA`
- `NEEDS_HUMAN_REVIEW`
- `BLOCKED_DO_NOT_TOUCH`
- `CANDIDATE_FOR_PROTECTED_REPAIR`

## Hallazgos esperados

- Pedidos pagados/aprobados sin reserva: revisar si son legados reales o pruebas.
- Pedidos entregados sin despacho: no asumir error actual de flujo.
- Pedidos con `userId` antes de activación: validar semántica de propiedad del pedido antes de cualquier interpretación operativa.

## Conclusión operativa

Esta auditoría sirve como línea base protegida para diferenciar:

- data histórica real
- data de prueba
- data legacy que no debe tocarse automáticamente

## Próximo paso

W5.41I.1:

- revisar únicamente los registros clasificados como `NEEDS_HUMAN_REVIEW`
- decidir manualmente si alguno merece una reparación protegida futura
- no modificar este cierre automático de auditoría
