# W5.41I.1 - Revisión protegida de pedidos legacy reales sin reserva/despacho

## 1. Objetivo

Revisar, sin modificar datos, los pedidos legacy reales detectados por la auditoría W5.41I para preparar una recomendación segura por pedido.

## 2. Reglas de solo lectura

- No reparar data.
- No crear despachos.
- No reservar unidades.
- No activar chips.
- No cambiar `shortCode`.
- No cambiar `userId`.
- No borrar pedidos.
- No borrar unidades.
- No usar `db push`.
- No usar `migrate reset`.

## 3. Recordatorio canónico

- `userId` en `Order` = comprador/propietario.
- `userId` no es asignación de chip.
- La entrega física no activa el chip.
- La activación ocurre por el flujo de activación del producto, no por la entrega.

## 4. Tabla de revisión

| orderCode | status | payment | qty | reserved | dispatch | activation | classification | recommendation | risk |
| --- | --- | --- | ---: | ---: | --- | --- | --- | --- | --- |
| ver script | ver script | ver script | ver script | ver script | ver script | ver script | ver script | ver script | ver script |

## 5. Resumen por pedido

Cada pedido debe analizarse con:

- estado
- pago
- cantidad operativa
- reserva
- despacho
- activación
- riesgo
- recomendación

## 6. Decisión futura recomendada

La opción más segura para la mayoría de los casos legacy sin trazabilidad completa es mantenerlos como histórico.

Solo si un pedido queda explícitamente validado por operador, con trazabilidad suficiente y sin riesgo para activación, QR/NFC o `shortCode`, podría pasar a un bloque futuro de reparación protegida.

## 7. Plan futuro W5.41I.2 - Reparación protegida opcional

### A. Mantener como histórico

- agregar nota o metadata visual de pedido previo al flujo operativo
- no tocar inventario

### B. Crear despacho histórico

Solo si:

- pedido real confirmado
- entregado confirmado
- no hay despacho formal
- no hay conflicto con unidades
- confirmación explícita del operador
- dry-run primero

### C. Reservar unidades históricas

Solo si:

- producto y cantidad están claros
- hay unidades físicas disponibles
- no están activadas
- no están reservadas
- confirmación explícita

### D. No tocar

Si existe riesgo de afectar:

- QR / NFC
- `shortCode`
- activación
- trazabilidad real
- integridad del pedido

