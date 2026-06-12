# Chip Lifecycle Regression Checklist (C8)

Este checklist valida regresión funcional del lifecycle de chips/órdenes/tokens/capacidad después de C1–C7.

## Instrucciones de uso

- Ejecutar pruebas manuales en ambiente controlado (staging o producción con cuidado).
- No introducir cambios de código durante esta fase.
- Para cada caso, registrar evidencia y completar la sección **Datos a capturar**.

---

## 1) Lote e inventario

- [ ] Crear chips digitales.
- [ ] Editar etiqueta interna.
- [ ] Cambiar digital -> físico.
- [ ] Confirmar que aparecen en **Disponibles**.

## 2) Compra manual + approve

- [ ] Crear orden manual.
- [ ] Seleccionar chip físico.
- [ ] Aprobar pago.
- [ ] Confirmar que:
  - [ ] cupo chips sube
  - [ ] cupo perfiles sube
  - [ ] chip pasa `inventory -> sold`
  - [ ] token queda ligado a orden
  - [ ] chip aparece en **Vendidos/Reservados**
  - [ ] chip no aparece en **Disponibles**

## 3) Doble approve / retry

- [ ] Reintentar aprobar la misma orden.
- [ ] Confirmar que **NO** duplica cupo.
- [ ] Confirmar que **NO** duplica token.

## 4) PATCH fulfillment

- [ ] Usar flujo de PATCH (si existe en UI/admin flow).
- [ ] Confirmar que usa misma semántica de reserva/token.
- [ ] Confirmar que no duplica capacidad para `provider=manual`.

## 5) Activación cliente

- [ ] Activar con `activationCode` vigente.
- [ ] Confirmar que:
  - [ ] token marca `usedAt`
  - [ ] chip queda `activated`
  - [ ] owner/account/profile asignados
  - [ ] aparece en **Activados**
  - [ ] no aparece en **Vendidos/Reservados**

## 6) Capacidad

- [ ] Cuenta base con 1 chip/perfil.
- [ ] Compra combo 1 -> queda 2.
- [ ] Compra combo dúo -> suma correctamente.
- [ ] Activación bloquea si excede capacidad.

## 7) Revertido/devuelto

- [ ] Revertir cuenta/chip con flujo actual.
- [ ] Confirmar clasificación de **Revertidos/Devueltos** (heurística vigente).

## 8) Rehabilitación

- [ ] Rehabilitar chip returned.
- [ ] Confirmar que:
  - [ ] genera nuevo `activationCode`
  - [ ] token viejo no usable
  - [ ] sale de **Revertidos/Devueltos**
  - [ ] aparece en **Disponibles**
  - [ ] mantiene mismo `shortCode`
  - [ ] refleja nuevo `activationCode`

## 9) Reventa

- [ ] Vender chip rehabilitado otra vez.
- [ ] Confirmar flujo completo:
  - [ ] `available -> sold -> activated`

## 10) Dañado/perdido

- [ ] Marcar chip `damaged`/`lost`.
- [ ] Confirmar que aparece solo en **Dañados/Perdidos**.

## 11) QR/NFC viejo

Probar:

- `https://pre-rescate-pty.vercel.app/e/<shortCode>`
- `https://pre-rescate-pty.vercel.app/e/<shortCode>?source=nfc`

Confirmar:

- [ ] redirección a `www.prerescatepty.com`
- [ ] preserva path
- [ ] preserva query string

## 12) Estados públicos

- [ ] chip inexistente -> vínculo inválido
- [ ] chip `inventory` no activado -> “Chip aún no activado”
- [ ] chip `activated` -> ficha médica
- [ ] hidden/expired (si aplica) consistente

## 13) Privacidad ficha médica

- [ ] cédula no pública
- [ ] póliza no pública
- [ ] teléfono seguro no público
- [ ] toggles de visibilidad respetados

## 14) Inventario tabs (no solapamiento)

Validar que un mismo chip no aparezca en tabs incompatibles:

- [ ] **Disponibles** y **Vendidos/Reservados**
- [ ] **Vendidos/Reservados** y **Revertidos/Devueltos**
- [ ] **Revertidos/Devueltos** y **Disponibles** tras rehabilitar

## 15) Datos a capturar (por prueba)

Registrar para cada ejecución:

- `shortCode`
- `activationCode`
- `orderNumber`
- estado antes
- estado después
- resultado esperado
- resultado real
- aprobado/fallido

---

## Plantilla de evidencia

| Caso | shortCode | activationCode | orderNumber | Estado antes | Estado después | Esperado | Real | Resultado |
|---|---|---|---|---|---|---|---|---|
| Ej: 2) Compra manual + approve |  |  |  |  |  |  |  | ✅/❌ |
