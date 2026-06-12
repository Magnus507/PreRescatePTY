# QA DESIGN — Checklist de privacidad para campos médicos y visibilidad pública por consentimiento

> **Alcance:** documento de aceptación QA para futura implementación.
>
> **Restricciones:** no cambiar código funcional, no Prisma, no migraciones.

## Datos base de prueba (recomendado)

- Usuario A (dueño) con perfil propio completo.
- Usuario A con al menos 1 perfil familiar asociado.
- `shortCode` público válido para perfil propio y familiar.
- Set de datos para pruebas:
  - Privados: `nationalId`, `insurancePolicyNumber`, `insuranceEmergencyPhone`
  - Públicos con toggle: `insuranceProvider`, `preferredHospital`, `primaryDoctorName`, `primaryDoctorPhone`, `additionalNotes`

---

## 1) Campos privados nunca públicos

**Campos:**
- `nationalId` / cédula
- `insurancePolicyNumber` / póliza
- `insuranceEmergencyPhone` / teléfono del seguro

### Casos de prueba

- [ ] **Guardar en dashboard:** al crear/editar perfil desde dashboard, los 3 campos se persisten correctamente.
- [ ] **Ver en privado:** en dashboard privado del dueño, los 3 campos se muestran correctamente.
- [ ] **No exponer por API pública:** `GET /api/public/[shortCode]` no incluye ninguna de estas llaves ni valores.
- [ ] **No exponer en ficha pública:** `/e/[shortCode]` no renderiza cédula, póliza ni teléfono de seguro.

**Resultado esperado:** datos privados accesibles solo en contexto autenticado del dueño, jamás en superficie pública.

---

## 2) Campos públicos solo con toggle

**Campos con control de visibilidad pública:**
- `insuranceProvider`
- `preferredHospital`
- `primaryDoctorName`
- `primaryDoctorPhone`
- `additionalNotes`

Para **cada campo** ejecutar la siguiente matriz:

- [ ] **Toggle = false + campo con valor** → no aparece en API pública ni en `/e/[shortCode]`.
- [ ] **Toggle = true + campo con valor** → aparece en API pública (en bloque permitido) y en `/e/[shortCode]`.
- [ ] **Toggle = true + campo vacío/null** → no mostrar bloque vacío en UI pública ni llave vacía innecesaria en payload público.

**Resultado esperado:** visibilidad pública estrictamente gobernada por consentimiento (toggle) y calidad de dato (no bloques vacíos).

---

## 3) Perfil propio y perfil familiar

- [ ] Editar perfil propio y validar comportamiento privado/público completo.
- [ ] Editar perfil familiar y validar comportamiento privado/público completo.
- [ ] Confirmar que cambios en un perfil no contaminan visibilidad del otro perfil.
- [ ] Validar shortCode de perfil propio y familiar por separado en API/UI pública.

**Resultado esperado:** mismas reglas de privacidad/consentimiento aplican de forma consistente en ambos tipos de perfil.

---

## 4) Cifrado / privacidad

- [ ] Verificar que campos sensibles (`nationalId`, `insurancePolicyNumber`, `insuranceEmergencyPhone`) pasan por `ProfileRepository` (flujo de persistencia/lectura centralizado).
- [ ] Verificar que no se imprimen logs con PII en rutas de guardado/lectura/error.
- [ ] Verificar que `auditLog` no expone cédula/póliza/teléfonos sensibles sin redacción/masking.

**Resultado esperado:** arquitectura de acceso y observabilidad no filtra PII sensible.

---

## 5) API privada

- [ ] `GET /api/users/profile` devuelve campos privados al dueño autenticado.
- [ ] `PATCH /api/users/profile` actualiza correctamente los nuevos campos (privados y públicos con toggle).
- [ ] `GET/PATCH` de perfil familiar respeta ownership (no acceso cruzado entre usuarios).
- [ ] Validar códigos HTTP esperados (200/401/403/404) según autenticación y ownership.

**Resultado esperado:** API privada funcional para dueño, protegida contra acceso no autorizado.

---

## 6) API pública

- [ ] `GET /api/public/[shortCode]` retorna solo whitelist pública.
- [ ] Confirmar ausencia total de `nationalId`, `insurancePolicyNumber`, `insuranceEmergencyPhone`.
- [ ] Confirmar que `publicMedicalExtras` respeta toggles y omite vacíos.
- [ ] Validar estructura estable del payload público (sin llaves sensibles por error de serialización).

**Resultado esperado:** contrato público mínimo, explícito y sin PII sensible.

---

## 7) UI ficha pública compacta (`/e/[shortCode]`)

- [ ] Primer pantallazo prioriza datos críticos de emergencia.
- [ ] Seguro/hospital visible solo si autorizado por toggle.
- [ ] Médico (nombre/teléfono) visible solo si autorizado por toggle.
- [ ] Instrucciones (`additionalNotes`) en bloque compacto/acordeón, legible en móvil.
- [ ] Cuando no hay autorización o dato, no dejar huecos visuales/confusos.

**Resultado esperado:** ficha pública clara, compacta y alineada a consentimiento explícito.

---

## 8) Casos borde

- [ ] Usuario sin seguro (sin proveedor/póliza/teléfonos de seguro).
- [ ] Usuario con seguro pero todos los toggles en `false`.
- [ ] Usuario con campos incompletos (nulos/parciales).
- [ ] Texto largo en `additionalNotes` (render, truncado/colapso y usabilidad).
- [ ] Caracteres especiales/acentos/símbolos en aseguradora y hospital.
- [ ] Validación cross-browser móvil: Safari iOS y Chrome Android.

**Resultado esperado:** comportamiento robusto ante datos reales e incompletos sin exposición accidental.

---

## 9) SQL/checks sugeridos para verificar no exposición

> Estos checks son de **verificación QA** (lectura/inspección), no implican migraciones.

### 9.1 Checks de Profile (persistencia privada)

- [ ] Verificar que consultas internas de Profile que alimentan dashboard privado sí recuperan campos sensibles para el dueño.
- [ ] Verificar que selectores/proyecciones usados para endpoints públicos excluyen campos sensibles.

### 9.2 Checks de API pública

- [ ] Ejecutar `GET /api/public/[shortCode]` para múltiples perfiles y confirmar ausencia de:
  - `nationalId`
  - `insurancePolicyNumber`
  - `insuranceEmergencyPhone`
- [ ] Confirmar que solo campos autorizados por whitelist/toggle aparecen en `publicMedicalExtras`.

**Resultado esperado:** separación explícita entre modelo privado y payload público.

---

## 10) Criterios de aceptación final

- [ ] Todos los casos 1–9 ejecutados con evidencia (capturas, payloads, notas de prueba).
- [ ] Cero exposición de cédula/póliza/teléfonos sensibles en API o UI pública.
- [ ] Toggling de campos públicos funciona por campo, en perfil propio y familiar.
- [ ] No hay bloques vacíos en ficha pública cuando toggle=true y campo vacío.
- [ ] Logs/auditoría sin PII sensible en claro.
- [ ] Resultado final firmado por QA como **APROBADO** para salida a implementación.

---

## Evidencia recomendada por caso

- Captura de dashboard privado (con datos de prueba anonimizados).
- Respuesta JSON de `GET /api/public/[shortCode]` (con inspección de llaves).
- Captura de `/e/[shortCode]` en desktop y móvil.
- Registro de prueba de ownership (usuario dueño vs no dueño).
- Extracto de logs/auditoría validando redacción de PII.
