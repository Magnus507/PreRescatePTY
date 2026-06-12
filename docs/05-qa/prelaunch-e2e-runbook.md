# PreLaunch E2E QA Runbook — PreRescatePTY

Este runbook define la validación punta a punta obligatoria antes de lanzamiento.

## 0) Objetivo y alcance

- Validar ciclo completo: cuenta → perfil → compra → aprobación → inventario → activación → ficha pública → reversión/rehabilitación/reventa.
- Validar privacidad médica pública.
- Validar consistencia de capacidad y tabs de inventario.

---

## 1) Mapeo real de inventario admin (fuente de verdad)

### 1.1 Archivo exacto de tabs de inventario
- `app/(admin)/admin/_components/sections/InventorySection.tsx`

### 1.2 Servicio frontend usado
- `app/(admin)/admin/_services/domains/chips.service.ts`

### 1.3 Endpoints usados por inventario/tabs
- `GET /api/admin/chips?view=available|reserved|activated|returned|damaged`
- `PATCH /api/admin/chips/inventory` (guardar etiqueta interna)
- `PATCH /api/admin/chips/[chipId]` (toggle digital/físico, otros ajustes)
- `POST /api/admin/chips/[chipId]/rehabilitate`
- `POST /api/admin/chips` (crear lote)

### 1.4 Tabs reales detectados
- Disponibles
- Vendidos / Reservados
- Activados
- Revertidos / Devueltos
- Dañados / Perdidos

---

## 2) Precondiciones de prueba

1. Ambiente definido (`staging` o `producción controlada`).
2. Cuenta admin disponible (rol admin/superadmin y, si aplica, imprenta).
3. Usuario cliente de prueba limpio.
4. Al menos 2 chips físicos en inventario para ciclo completo.
5. Canales para evidencia (capturas + bitácora).

---

## 3) Checklist E2E ejecutable

## 3.1 Cuenta / login
- [ ] Registrar cuenta de prueba.
- [ ] Login exitoso.
- [ ] Verificar acceso dashboard cliente.

## 3.2 Perfil médico
- [ ] Completar: nombre, apellido, sexo, nacimiento, sangre.
- [ ] Completar: alergias, condiciones, medicamentos.
- [ ] Guardar y recargar: persistencia correcta.

## 3.3 Seguro / toggles
- [ ] Activar `isInsured`.
- [ ] Guardar aseguradora, hospital, médico, teléfono médico.
- [ ] Guardar póliza y teléfono de seguro (privados).
- [ ] Probar toggles ON/OFF de visibilidad pública.

## 3.4 Compra manual
- [ ] Crear orden manual con chips.
- [ ] Registrar comprobante/referencia.

## 3.5 Aprobación con chip
- [ ] Aprobar por endpoint/camino canónico (`/api/admin/orders/[id]/approve`).
- [ ] Confirmar:
  - [ ] estado pago/orden/revisión correcto
  - [ ] token ligado a orden
  - [ ] chip pasa a vendido/reservado
  - [ ] capacidad incrementa una vez

## 3.6 Inventario tabs
- [ ] Validar clasificación correcta en tabs.
- [ ] Confirmar no solapamientos incompatibles.
- [ ] Validar contador summary por tab.

## 3.7 Activación
- [ ] Activar con código vigente.
- [ ] Verificar `usedAt`, `status=activated`, vínculo account/profile.

## 3.8 Ficha pública normal
- [ ] Abrir `/e/[shortCode]` de perfil no industrial.
- [ ] Verificar campos clínicos críticos y contactos.

## 3.9 Ficha pública industrial
- [ ] Abrir `/e/[shortCode]` de perfil con organización.
- [ ] Verificar vista industrial + contexto organizacional.

## 3.10 Reversión
- [ ] Ejecutar flujo operativo actual de reversión/devolución.
- [ ] Confirmar comportamiento en tab Revertidos/Devueltos.

## 3.11 Rehabilitación
- [ ] Rehabilitar chip revertido/devuelto.
- [ ] Confirmar nuevo activationCode y neutralización del anterior.

## 3.12 Reventa
- [ ] Revender chip rehabilitado.
- [ ] Confirmar ciclo `available -> reserved/sold -> activated`.

## 3.13 QR/NFC viejo
- [ ] Probar dominio viejo con `/e/<shortCode>`.
- [ ] Confirmar redirección a `www.prerescatepty.com` preservando path/query.

## 3.14 Privacidad
- [ ] Confirmar que nunca se exponen públicamente:
  - [ ] `nationalId`
  - [ ] `insurancePolicyNumber`
  - [ ] `insuranceEmergencyPhone`
- [ ] Confirmar que toggles públicos se respetan exactamente.

## 3.15 Capacidad acumulativa
- [ ] Aprobar compra manual 1 (sube capacidad).
- [ ] Reintentar approve (no duplica capacidad).
- [ ] Validar bloqueo de activación al exceder cupo.

---

## 4) Datos de evidencia a capturar por prueba

Registrar por cada caso:

- Fecha/hora
- Ambiente
- Tester
- Usuario/email de prueba
- `orderNumber`
- `shortCode`
- `activationCode` enmascarado (ej. `***A9K2`)
- Estado inicial
- Estado final
- Resultado esperado
- Resultado real
- Captura (URL/archivo)
- Aprobado/Fallido
- Notas

---

## 5) Plantilla de evidencia (copiar/pegar)

```md
### Caso: <nombre>
- Fecha:
- Ambiente:
- Tester:
- Usuario/email prueba:
- orderNumber:
- shortCode:
- activationCode (masked):
- Estado inicial:
- Estado final:
- Resultado esperado:
- Resultado real:
- Captura:
- Estado: ✅ Aprobado / ❌ Fallido
- Notas:
```

Matriz opcional:

| Caso | Fecha | Ambiente | Tester | Usuario | orderNumber | shortCode | activationCode (masked) | Estado inicial | Estado final | Esperado | Real | Captura | Resultado | Notas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

---

## 6) Criterios de bloqueo para lanzamiento (P0)

Si ocurre cualquiera de estos, **NO lanzar**:

1. No se puede activar chip válido.
2. Se expone PII médica privada en ficha/API pública.
3. Un chip vendido/reservado aparece como disponible.
4. Se duplica capacidad en retry/doble aprobación.
5. QR/NFC viejo no redirige correctamente.
6. Ficha pública no carga para chip activado.

---

## 7) Criterios de cierre QA prelaunch

- 100% de casos del checklist ejecutados.
- 0 fallos P0 abiertos.
- Fallos P1/P2 documentados con owner y fecha compromiso.
- Evidencia completa en repositorio operativo/drive interno.
