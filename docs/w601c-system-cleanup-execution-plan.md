# W6.01C - Plan Exacto de Limpieza Real

## Objetivo

Dejar el sistema operativo limpio para una primera etapa de producción/venta real, preservando catálogo, productos terminados, usuarios, cuentas, organizaciones y configuración base. Este plan define qué se limpiaría en una ejecución futura controlada y qué debe quedar intacto.

## Estado previo confirmado

- W6.01A auditado y publicado en `origin/master`
- W6.01B dry-run auditado y publicado en `origin/master`
- No hubo escritura en BD en esas fases
- El catálogo, productos, usuarios y configuración base no fueron tocados

## Alcance exacto propuesto

### A. Pedidos cliente

Se propone limpiar los pedidos cliente detectados como data operativa de prueba o como residuos de reinicios previos.

Pedidos candidatos detectados en el dry-run:

- `PR-2026-000655`
- `PR-2026-000489`
- `PR-2026-000316`
- `PR-2026-000261`
- `PR-2026-000154`

Notas:

- `PR-2026-000655` debe tratarse como candidato de prueba, pero solo debe limpiarse si el usuario confirma que fue una corrida completa de prueba.
- Para un reinicio inicial de producción, todos los pedidos actuales pueden considerarse data de prueba salvo que el usuario indique lo contrario.

### B. Pedidos operativos / internos

Se propone limpiar los 9 candidatos detectados en `operationCommercialOrder`.

Listado detectado:

- `OP-CLI-PR-2026-000655`
- `INT-0003`
- `INT-0002`
- `OP-CLI-PR-2026-000558`
- `OP-CLI-PR-2026-000489`
- `OP-CLI-PR-2026-000316`
- `INT-0001`
- `OP-CLI-PR-2026-000261`
- `OP-CLI-PR-2026-000154`

Relación operativa:

- Los `INT-*` representan pedidos internos / de inventario.
- Los `OP-CLI-*` representan órdenes operativas ligadas a pedidos cliente.
- El orden recomendado debe eliminar primero dependencias y luego las órdenes madre.

### C. Dispatches

Se detectaron 2 dispatches candidatos:

- `DSP-OP-CLI-PR-2026-000655`
- `DSP-OP-CLI-PR-2026-000558`

Ambos aparecen como `delivered` y además fueron marcados como huérfanos en la relación consultada del dry-run.

Notas:

- En producción real, un dispatch entregado nunca debería borrarse sin revisión.
- En este reinicio controlado, sí puede eliminarse si el usuario confirma que son dispatches de prueba.
- Si se decide preservar alguno por trazabilidad histórica, debe salir de este plan antes de ejecutar.

### D. Unidades físicas

Se detectaron 4 unidades físicas:

- `PROD-INT-0003-0003` - `available`
- `PROD-INT-0003-0002` - `delivered`
- `PROD-INT-0003-0001` - `delivered`
- `PROD-INT-0001-0001` - `reserved`

Estrategia propuesta:

1. Opción conservadora para arranque limpio:
   - eliminar unidades operativas de prueba
   - dejar inventario físico en `0`
2. Opción alternativa:
   - resetear solo las unidades `available` y `reserved` a `available`
   - mantener `delivered` para revisión manual

Recomendación:

- Para un arranque limpio real, conviene eliminar las unidades de prueba y dejar inventario en `0`, porque la producción real generará inventario nuevo.
- Las unidades `delivered` no deben borrarse sin confirmación expresa; quedan como `manualDecision`.

### E. Perfiles / shortCodes / links públicos

Se detectaron:

- 4 perfiles sin `DigitalPass`
- 11 `shortCodes` / links públicos

Perfiles detectados:

- `Gean Carlos Cusatti`
- `Gean Jr Cusatti`
- `Gean Carlos Cusatti`
- `PreRescatePTY`

Propuesta:

- Limpiar perfiles de prueba y enlaces públicos de prueba para que no queden accesos antiguos.
- No asumir limpieza automática de todo perfil o link si hay duda de identidad o trazabilidad.
- En producción real esto solo se haría con confirmación individual.

## Secuencias

Secuencias/propuestas detectadas en el dry-run:

- Cliente: `PR-2026-000001`
- Operativos: `OP-CLI-PR-2026-000001`
- Producción: `PROD-INT-0001`
- Dispatches: `DSP-OP-CLI-PR-2026-000001`
- Labels internos: `needsManualDecision`

Interpretación:

- Si las secuencias se infieren por último registro, limpiar los registros de prueba ayudará a reiniciarlas naturalmente.
- Si existen claves en `SystemConfig`, deben revisarse antes de tocar nada.
- `labels internos` quedan pendientes porque pueden depender del lote/producción nueva y no conviene forzarlos sin confirmar el mecanismo exacto.

## Orden exacto recomendado de limpieza real

Este orden respeta dependencias y reduce el riesgo de rupturas:

1. Public links / `shortCodes` dependientes si aplica
2. `DigitalPass` / activaciones si existieran
3. Perfiles de prueba confirmados
4. Dispatch details / hijos si existen
5. Dispatches
6. Producción / hijos si existen
7. Pedidos operativos / internos
8. Reservas / unidades operativas de prueba
9. Pedidos cliente
10. Secuencias controladas
11. Auditoría post-cleanup

## Confirmaciones requeridas antes de ejecutar

Estas preguntas deben responderse de forma explícita antes de cualquier ejecución real:

- ¿Confirmas que todos los pedidos actuales son de prueba y pueden limpiarse?
- ¿Confirmas que `PR-2026-000655` fue prueba completa y puede limpiarse?
- ¿Confirmas que las 4 unidades físicas actuales son de prueba y pueden eliminarse/resetearse?
- ¿Confirmas que los 4 perfiles y 11 `shortCodes` / links públicos son de prueba y pueden limpiarse?
- ¿Confirmas que quieres reiniciar secuencias a `001`?
- ¿Confirmas que el catálogo, productos, usuarios y organizaciones se preservan?

## Token requerido para ejecución real

La limpieza real no puede ejecutarse sin este token exacto:

`CONFIRM_W601C_SYSTEM_CLEANUP`

## Propuesta de script futuro

Diseñar después, pero no crear todavía:

`scripts/execute-system-cleanup-w601c.ts`

Requisitos previstos:

- argumento o env var con el token exacto
- modo dry-run por defecto
- ejecución real solo con token
- logs por paso
- reporte post-cleanup en `tmp/`
- rollback no prometido, por eso la confirmación previa debe ser obligatoria

## Auditoría post-cleanup

Después de la limpieza real, la validación debe repetir:

- W6.01A
- W6.01B

Y además generar un reporte post-cleanup para confirmar:

- `orders = 0`
- `operationCommercialOrders = 0`
- `dispatches = 0`
- `units = 0` o el estado decidido
- `profiles / shortCodes = 0` si se confirma la limpieza
- `Product` preservado
- `User` preservado
- `SystemConfig` preservado salvo secuencias

## Riesgos

- `shortCodes` existentes: 11
- `profiles`: 4
- `unidades delivered`: 2
- `unidad reserved`: 1
- `dispatches delivered`: 2
- Posible relación entre el pedido real `PR-2026-000655` y pruebas
- Las secuencias no deben reiniciarse sin confirmar tabla o método exacto

## Decisión manual pendiente

Queda como `manualDecision` cualquier elemento que no sea claramente de prueba o que tenga trazabilidad viva:

- pedidos terminados que podrían ser reales
- dispatches entregados
- unidades entregadas
- perfiles sin `DigitalPass` pero con posible uso real
- cualquier ajuste de secuencia que dependa de `SystemConfig`

## Recomendación final

Revisar este plan con el usuario y no ejecutar ninguna limpieza real hasta recibir aprobación explícita.
