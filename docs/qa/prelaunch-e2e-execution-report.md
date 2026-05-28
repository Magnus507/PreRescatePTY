# PreLaunch E2E Execution Report — Dry-Run Técnico (C7A)

- Fecha/hora ejecución: 2026-05-28 (America/Panama)
- Tipo de ejecución: **Dry-run técnico** (sin credenciales reales ni datos operativos productivos)
- Fuente: `docs/qa/prelaunch-e2e-runbook.md`
- Alcance: validación técnica de rutas, guardrails, compilación y consistencia de flujo; sin evidencia funcional real de usuario final.

---

## Criterio de estados usado

- **PASS**: verificado técnicamente en código/rutas/build.
- **FAIL**: bug reproducible detectado en esta ejecución.
- **BLOCKED**: requiere credenciales reales, datos de prueba reales o ejecución manual operativa (UI/API autenticada) no disponible en este dry-run.

---

## Ejecución por caso

### 1) Cuenta nueva
- Estado: **BLOCKED**
- Pasos ejecutados: revisión técnica de `app/api/auth/register/route.ts`.
- Esperado: registro exitoso y creación account/user/profile.
- Real: flujo implementado; no se ejecutó alta real por falta de datos operativos.
- Evidencia: lectura de ruta + build/typecheck.
- Severidad: P1 (si fallara en ejecución real).

### 2) Login
- Estado: **BLOCKED**
- Pasos ejecutados: revisión técnica de `lib/auth.ts`.
- Esperado: login con rate-limit y validaciones.
- Real: implementación presente; no validado con cuenta real.
- Evidencia: lectura de auth + build/typecheck.
- Severidad: P0 (si fallara real).

### 3) Crear perfil médico
- Estado: **BLOCKED**
- Pasos ejecutados: revisión de rutas de perfil y formulario abiertos en proyecto.
- Esperado: persistencia de perfil.
- Real: no ejecutado por falta de sesión/datos reales.
- Evidencia: estructura/rutas presentes.
- Severidad: P1.

### 4) Guardar alergias
- Estado: **BLOCKED**
- Pasos ejecutados: revisión de pipeline pública/privada en API pública.
- Esperado: persistir alergias y exponerse según diseño clínico.
- Real: no validado en runtime.
- Evidencia: `app/api/public/[shortCode]/route.ts`.
- Severidad: P1.

### 5) Guardar medicamentos
- Estado: **BLOCKED**
- Pasos ejecutados: verificación técnica en payload público.
- Esperado: persistencia y lectura controlada.
- Real: no ejecutado funcionalmente.
- Evidencia: route pública + build.
- Severidad: P1.

### 6) Guardar condiciones
- Estado: **BLOCKED**
- Pasos ejecutados: revisión técnica de lectura pública de condiciones.
- Esperado: persistencia y exposición prevista.
- Real: no validación en UI real.
- Evidencia: route pública.
- Severidad: P1.

### 7) Guardar seguro médico
- Estado: **BLOCKED**
- Pasos ejecutados: revisión de campos/toggles públicos en route pública.
- Esperado: campos guardados y controlados por toggles.
- Real: no ejecutado funcionalmente.
- Evidencia: mapping `publicMedicalExtras`.
- Severidad: P1.

### 8) Guardar médico tratante
- Estado: **BLOCKED**
- Pasos ejecutados: revisión técnica de campos doctor público.
- Esperado: persistencia y toggle correcto.
- Real: no ejecutado real.
- Evidencia: route pública.
- Severidad: P1.

### 9) Toggles públicos
- Estado: **PASS** (técnico)
- Pasos ejecutados: verificación de condicionales `showInsuranceProviderPublic`, `showPreferredHospitalPublic`, `showPrimaryDoctorPublic`, `showPrimaryDoctorPhonePublic`, `showAdditionalNotesPublic`.
- Esperado: whitelist estricta por toggle.
- Real: condicionales presentes y explícitos.
- Evidencia: `app/api/public/[shortCode]/route.ts`.
- Severidad: P0 si se rompe.

### 10) Verificar persistencia
- Estado: **BLOCKED**
- Pasos ejecutados: solo revisión estática.
- Esperado: datos persisten tras recarga.
- Real: no validado en sesión real.
- Evidencia: N/A (requiere ejecución real).
- Severidad: P1.

### 11) Assign-direct real
- Estado: **BLOCKED**
- Pasos ejecutados: revisión técnica del endpoint `assign-direct`.
- Esperado: crear order $0, reservar chip/token con reglas.
- Real: no ejecutado por falta de credenciales y dataset.
- Evidencia: route y validaciones existentes.
- Severidad: P0.

### 12) Verificar order $0
- Estado: **BLOCKED**
- Pasos ejecutados: revisión estática del create order en assign-direct.
- Esperado: amount 0 y estado aprobado/pagado.
- Real: no validación en DB real.
- Evidencia: `app/api/admin/chips/[chipId]/assign-direct/route.ts`.
- Severidad: P1.

### 13) Verificar token generado
- Estado: **BLOCKED**
- Pasos ejecutados: revisión técnica de creación de token.
- Esperado: token único con expiración.
- Real: no ejecución real.
- Evidencia: código de assign-direct/activate.
- Severidad: P0.

### 14) Inventario cambia disponible→reservado
- Estado: **BLOCKED**
- Pasos ejecutados: revisión de flujos inventory/reserved en rutas admin.
- Esperado: transición consistente de estado.
- Real: no comprobado en instancia real.
- Evidencia: rutas y docs de state machine.
- Severidad: P0.

### 15) Activación real
- Estado: **BLOCKED**
- Pasos ejecutados: revisión técnica de `app/api/chips/activate/route.ts`.
- Esperado: consumo atómico de token + activación chip.
- Real: no ejecutado con token real.
- Evidencia: lógica transaccional presente.
- Severidad: P0.

### 16) Verificar capacidad
- Estado: **BLOCKED**
- Pasos ejecutados: revisión de enforcement `USED_CAPACITY_CHIP_STATUSES`.
- Esperado: bloqueo al exceder plan.
- Real: no validación runtime.
- Evidencia: activate/approve/assign-direct.
- Severidad: P0.

### 17) Verificar owner/profile linkage
- Estado: **BLOCKED**
- Pasos ejecutados: revisión de update en activación.
- Esperado: `ownerUserId/accountId/assignedProfileId` correctos.
- Real: no ejecutado real.
- Evidencia: `activate/route.ts`.
- Severidad: P0.

### 18) Abrir ficha pública
- Estado: **PASS** (técnico)
- Pasos ejecutados: validación de ruta pública y página `/e/[shortCode]`.
- Esperado: endpoint y UI disponibles.
- Real: rutas presentes y build exitoso.
- Evidencia: `app/api/public/[shortCode]/route.ts`, `app/(public)/e/[shortCode]/page.tsx`.
- Severidad: P0 si falla real.

### 19) Verificar whitelist pública
- Estado: **PASS** (técnico)
- Pasos ejecutados: auditoría de payload público permitido.
- Esperado: exponer solo campos whitelisted.
- Real: implementación alinea con documento oficial.
- Evidencia: route pública + `docs/official/chip-token-order-state-machine.md`.
- Severidad: P0.

### 20) Verificar NO exposición (`nationalId`, `insurancePolicyNumber`, `insuranceEmergencyPhone`)
- Estado: **PASS** (técnico)
- Pasos ejecutados: inspección de payload de salida pública.
- Esperado: nunca expuestos.
- Real: no aparecen en respuesta pública.
- Evidencia: `app/api/public/[shortCode]/route.ts`.
- Severidad: P0.

### 21) Verificar ficha industrial si existe caso
- Estado: **BLOCKED**
- Pasos ejecutados: revisión de componente industrial y branch de organization.
- Esperado: render industrial para perfil organizacional.
- Real: no dataset real para validación final.
- Evidencia: `IndustrialProfileView.tsx`.
- Severidad: P1.

### 22) Reversión
- Estado: **BLOCKED**
- Pasos ejecutados: revisión documental/arquitectónica.
- Esperado: transición controlada a inventory con traza.
- Real: no ejecución operativa con caso real.
- Evidencia: docs oficiales.
- Severidad: P0.

### 23) Rehabilitación
- Estado: **BLOCKED**
- Pasos ejecutados: revisión técnica de endpoint rehabilitate.
- Esperado: reset operativo y token nuevo.
- Real: no validado en entorno real.
- Evidencia: `app/api/admin/chips/[chipId]/rehabilitate/route.ts`.
- Severidad: P0.

### 24) Nuevo activationCode
- Estado: **BLOCKED**
- Pasos ejecutados: revisión estática de `getUniqueActivationCode()` en rehabilitación.
- Esperado: código nuevo usable.
- Real: no probado runtime.
- Evidencia: route rehabilitate.
- Severidad: P0.

### 25) Reventa
- Estado: **BLOCKED**
- Pasos ejecutados: revisión documental del ciclo esperado.
- Esperado: retorno a sold/reserved y luego activación.
- Real: no ejecutado con datos reales.
- Evidencia: state machine oficial.
- Severidad: P1.

### 26) Nueva activación
- Estado: **BLOCKED**
- Pasos ejecutados: revisión de flujo de activación posterior a rehabilitación.
- Esperado: token nuevo activable.
- Real: no validación real.
- Evidencia: activate + rehabilitate routes.
- Severidad: P0.

### 27) Redirect QR legado
- Estado: **PASS** (técnico)
- Pasos ejecutados: revisión de redirect por host en `next.config.ts`.
- Esperado: `pre-rescate-pty.vercel.app` redirige a `www.prerescatepty.com` preservando path.
- Real: regla configurada.
- Evidencia: `next.config.ts`.
- Severidad: P1.

---

## Resumen final

- PASS total: **5**
- FAIL total: **0**
- BLOCKED total: **22**

## Clasificación

**GO WITH FIXES (condicionado a ejecución real con credenciales/datos operativos).**

Motivo: en dry-run técnico no se detectaron bugs nuevos reproducibles, pero la mayoría de casos críticos requieren ejecución funcional real y evidencia runtime.

---

## Hallazgos

En esta corrida **no se detectó bug nuevo reproducible** (FAIL=0).

### Riesgos/pendientes no funcionales observados

1. Cobertura E2E real incompleta por falta de credenciales y datos operativos.
   - Archivo probable: N/A (limitación de ejecución).
   - Impacto: imposibilidad de cerrar GO definitivo.
   - Propuesta mínima: rerun completo con usuario admin + usuario cliente + chips de prueba y evidencia por caso.

2. Casos de reversión/rehabilitación/reventa necesitan dataset real con historial.
   - Archivo probable: rutas admin chips/orders (operativo).
   - Impacto: riesgo de encontrar defectos solo en datos reales.
   - Propuesta mínima: ejecutar bloque 22–26 en staging con trazas de DB y capturas.
