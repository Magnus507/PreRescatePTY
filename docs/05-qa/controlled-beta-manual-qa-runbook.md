# Controlled Beta Manual QA Runbook

> **Versión:** 1.0
> **Fecha de creación:** 2026-06-15
> **Repo:** PreRescatePTY
> **Propósito:** Validación manual controlada para beta controlada. Solo ambiente Preview/QA. Sin datos de producción.

---

## 1. Purpose and scope

- **Alcance:** Beta controlada con usuarios de prueba desechables.
- **Ambiente:** Preview/QA (no producción).
- **Datos:** Sin datos de clientes reales.
- **Stripe:** Solo test mode (`sk_test_`).
- **Cron:** Deshabilitado o controlado.
- **Email/SMS/WhatsApp:** Sandbox o deshabilitado.

---

## 2. Execution metadata

| Campo | Valor |
|-------|-------|
| **Fecha de ejecución** | __________ |
| **URL del ambiente** | __________ |
| **Commit hash** | __________ |
| **Tester** | __________ |
| **Browser/Device** | __________ |
| **Stripe mode** | test / live (NUNCA live) |
| **Resultado resumen** | __________ |

---

## 3. Severity definitions

| Severidad | Definición |
|-----------|-----------|
| **P0** | Bloqueante. No se puede lanzar beta. |
| **P1** | Mayor. Se puede lanzar con workaround. |
| **P2** | Menor. Se puede diferir. |
| **P3** | Cosmético. No afecta funcionalidad. |

---

## 4. Environment safety checklist

- [ ] Working tree limpio, commit desplegado
- [ ] Ambiente Preview/QA confirmado
- [ ] Stripe test key (`sk_test_`) confirmada
- [ ] Webhook test secret confirmado
- [ ] Email/SMS/WhatsApp sandboxed o deshabilitado
- [ ] Usuarios QA desechables disponibles
- [ ] Chips de inventario desechables disponibles
- [ ] Sin datos de clientes reales
- [ ] Cron jobs entendidos y controlados
- [ ] Contacto de rollback identificado

---

## 5. Required QA identities and data

### 5.1 Cuentas de prueba

| Rol | Propósito | Desechable? | Estado requerido | Credenciales |
|-----|-----------|-------------|------------------|--------------|
| **Normal user A** | Registro, login, dashboard, perfiles | ✅ | Activo, sin paquete | __________ |
| **Normal user B** | Cross-account access tests | ✅ | Activo, sin paquete | __________ |
| **Account owner** | Dueño de cuenta con paquete activo | ✅ | Activo, paquete activo | __________ |
| **Admin** | Aprobación/rechazo de órdenes | ✅ | Activo, rol admin | __________ |
| **Superadmin** | RBAC completo | ✅ | Activo, rol superadmin | __________ |
| **Imprenta** | Fabricación (si aplica) | ✅ | Activo, rol imprenta | __________ |
| **Corporate employee** | Flujo corporativo | ✅ | Activo, miembro organización | __________ |
| **Disposable deletion user** | Eliminación de cuenta | ✅ | Activo, sin datos reales | __________ |

### 5.2 Datos de prueba

| Dato | Cantidad | Propósito |
|------|----------|-----------|
| **Chip físico (inventario)** | 2-3 | Ciclo completo: disponible → vendido → activado |
| **Chip histórico (inventario)** | 1 | Rehabilitación |
| **Chip activado expirado** | 1 | Reactivación |
| **Activation tokens** | 2-3 | Activación de chips |
| **Family profile** | 1 | Perfil familiar con shortCode |
| **Corporate profile** | 1 | Perfil organizacional |
| **Manual order pending payment proof** | 1 | Envío de comprobante |
| **Second manual order for rejection** | 1 | Rechazo admin |
| **Stripe test package/order** | 1 | Checkout con Stripe test mode |

---

## 6. Execution cases

### Group A: Authentication and session

| Case ID | Severity | Preconditions | Steps | Expected result | Evidence | Actual | Status | Issue |
|---------|----------|---------------|-------|-----------------|----------|--------|--------|-------|
| **A-01** | P0 | No sesión | 1. Navegar a `/registro`<br>2. Completar email + contraseña<br>3. Verificar creación de cuenta | Cuenta creada, redirige a `/dashboard` | Screenshot, API response | __________ | __________ | __________ |
| **A-02** | P0 | Cuenta creada | 1. Login con credenciales válidas<br>2. Verificar JWT en DevTools | Login exitoso, JWT contiene `role` correcto | Screenshot, JWT (sin secret) | __________ | __________ | __________ |
| **A-03** | P0 | Credenciales inválidas | 1. Login con credenciales incorrectas | Error visible, no se crea sesión | Screenshot | __________ | __________ | __________ |
| **A-04** | P0 | Sesión activa | 1. Logout<br>2. Intentar acceder a `/dashboard` | Redirige a `/login` | Screenshot | __________ | __________ | __________ |
| **A-05** | P1 | Sin sesión | 1. Intentar acceder a `/dashboard` | Redirige a `/login` | Screenshot | __________ | __________ | __________ |
| **A-06** | P1 | Admin autenticado | 1. Login con rol admin<br>2. Verificar redirección a `/admin` | Redirige a `/admin` | Screenshot | __________ | __________ | __________ |

### Group B: Own profile

| Case ID | Severity | Preconditions | Steps | Expected result | Evidence | Actual | Status | Issue |
|---------|----------|---------------|-------|-----------------|----------|--------|--------|-------|
| **B-01** | P1 | Usuario autenticado | 1. Navegar a `/dashboard/configuracion`<br>2. Completar nombre, apellido, sexo, nacimiento<br>3. Guardar | Datos persisten | Screenshot, API response | __________ | __________ | __________ |
| **B-02** | P1 | Perfil guardado | 1. Recargar página | Datos se mantienen | Screenshot | __________ | __________ | __________ |
| **B-03** | P1 | Perfil existente | 1. Editar datos<br>2. Guardar | Cambios guardados | Screenshot | __________ | __________ | __________ |

### Group C: Medical profiles

| Case ID | Severity | Preconditions | Steps | Expected result | Evidence | Actual | Status | Issue |
|---------|----------|---------------|-------|-----------------|----------|--------|--------|-------|
| **C-01** | P1 | Usuario autenticado | 1. Navegar a `/dashboard/perfiles-medicos`<br>2. Crear perfil familiar | Perfil creado | Screenshot, API response | __________ | __________ | __________ |
| **C-02** | P1 | Perfil creado | 1. Completar: sangre, alergias, condiciones, medicamentos<br>2. Guardar | Datos persisten | Screenshot | __________ | __________ | __________ |
| **C-03** | P1 | Perfil con datos | 1. Activar toggles de visibilidad pública<br>2. Guardar | Toggles funcionan | Screenshot | __________ | __________ | __________ |
| **C-04** | P1 | Perfil propio | 1. Editar perfil propio<br>2. Verificar comportamiento privado/público | Reglas de privacidad aplican | Screenshot, API response | __________ | __________ | __________ |
| **C-05** | P1 | Perfil familiar | 1. Editar perfil familiar<br>2. Verificar comportamiento privado/público | Reglas de privacidad aplican | Screenshot, API response | __________ | __________ | __________ |

### Group D: Emergency contacts

| Case ID | Severity | Preconditions | Steps | Expected result | Evidence | Actual | Status | Issue |
|---------|----------|---------------|-------|-----------------|----------|--------|--------|-------|
| **D-01** | P1 | Perfil médico creado | 1. Agregar contacto de emergencia<br>2. Guardar | Contacto guardado | Screenshot | __________ | __________ | __________ |
| **D-02** | P1 | Contacto guardado | 1. Verificar en ficha pública | Contacto visible | Screenshot | __________ | __________ | __________ |

### Group E: Chip activation

| Case ID | Severity | Preconditions | Steps | Expected result | Evidence | Actual | Status | Issue |
|---------|----------|---------------|-------|-----------------|----------|--------|--------|-------|
| **E-01** | P0 | Chip en inventario, token de activación | 1. Navegar a `/dashboard/chips`<br>2. Ingresar código de activación<br>3. Confirmar activación | Chip activado, `Chip.status` = `activated` | Screenshot, API response | __________ | __________ | __________ |
| **E-02** | P0 | Chip activado | 1. Verificar `ChipClaimToken.usedAt` | Timestamp presente | API response | __________ | __________ | __________ |
| **E-03** | P0 | Chip activado | 1. Verificar `Chip.ownerUserId`<br>2. Verificar `Chip.assignedProfileId` | Owner y profile correctos | API response | __________ | __________ | __________ |
| **E-04** | P1 | Sin activar | 1. Escanear chip | Muestra perfil inactivo | Screenshot | __________ | __________ | __________ |

### Group F: Public QR/NFC profile and privacy

| Case ID | Severity | Preconditions | Steps | Expected result | Evidence | Actual | Status | Issue |
|---------|----------|---------------|-------|-----------------|----------|--------|--------|-------|
| **F-01** | P0 | Chip activado con shortCode | 1. Navegar a `/e/{shortCode}` | Ficha pública visible | Screenshot | __________ | __________ | __________ |
| **F-02** | P0 | Ficha pública | 1. Verificar datos críticos (alergias, condiciones) | Visibles sin scroll | Screenshot | __________ | __________ | __________ |
| **F-03** | P0 | Ficha pública | 1. Verificar botón de llamada | Funcional | Screenshot | __________ | __________ | __________ |
| **F-04** | P0 | Ficha pública | 1. Verificar que NO expone `nationalId`<br>2. Verificar que NO expone `insurancePolicyNumber`<br>3. Verificar que NO expone `insuranceEmergencyPhone` | No expuestos | API response, screenshot | __________ | __________ | __________ |
| **F-05** | P1 | Perfil con toggles | 1. Toggle = false + campo con valor | No aparece en API pública ni en `/e/[shortCode]` | API response | __________ | __________ | __________ |
| **F-06** | P1 | Perfil con toggles | 1. Toggle = true + campo con valor | Aparece en API pública y en `/e/[shortCode]` | API response | __________ | __________ | __________ |
| **F-07** | P1 | Perfil con toggles | 1. Toggle = true + campo vacío/null | No mostrar bloque vacío | API response | __________ | __________ | __________ |

### Group G: Assign-direct

| Case ID | Severity | Preconditions | Steps | Expected result | Evidence | Actual | Status | Issue |
|---------|----------|---------------|-------|-----------------|----------|--------|--------|-------|
| **G-01** | P0 | Admin autenticado, chip en inventario | 1. Asignar chip directamente a usuario<br>2. Verificar `Chip.status` = `sold` | Chip vendido, orden $0 creada | Screenshot, API response | __________ | __________ | __________ |
| **G-02** | P0 | Chip asignado | 1. Verificar token generado | Token único con expiración | API response | __________ | __________ | __________ |
| **G-03** | P0 | Token generado | 1. Verificar que chip NO está activado hasta que usuario consuma token | Chip no activado | API response | __________ | __________ | __________ |
| **G-04** | P1 | Sin capacidad | 1. Intentar asignar sin capacidad | Error de capacidad | API response | __________ | __________ | __________ |

### Group H: Rehabilitate

| Case ID | Severity | Preconditions | Steps | Expected result | Evidence | Actual | Status | Issue |
|---------|----------|---------------|-------|-----------------|----------|--------|--------|-------|
| **H-01** | P0 | Chip en inventario con historial | 1. Rehabilitar chip | Chip rehabilitado, nuevo `activationCode` | Screenshot, API response | __________ | __________ | __________ |
| **H-02** | P0 | Chip rehabilitado | 1. Verificar que token viejo no usable | Token neutralizado | API response | __________ | __________ | __________ |
| **H-03** | P0 | Chip rehabilitado | 1. Verificar que chip aparece en "Disponibles" | Estado correcto | API response | __________ | __________ | __________ |
| **H-04** | P0 | Chip rehabilitado | 1. Verificar que ownership/account/profile cleared | Sin owner/account/profile | API response | __________ | __________ | __________ |

### Group I: Reactivate

| Case ID | Severity | Preconditions | Steps | Expected result | Evidence | Actual | Status | Issue |
|---------|----------|---------------|-------|-----------------|----------|--------|--------|-------|
| **I-01** | P0 | Chip activado con servicio expirado | 1. Reactivar chip | `serviceStatus` = `active` | Screenshot, API response | __________ | __________ | __________ |
| **I-02** | P0 | Chip reactivado | 1. Verificar duración extendida (~2 años) | `serviceStartDate`/`serviceEndDate` correctos | API response | __________ | __________ | __________ |
| **I-03** | P1 | Chip reactivado | 1. Verificar que chip sigue activado | Chip activado | API response | __________ | __________ | __________ |

### Group J: Stripe Checkout and webhook

| Case ID | Severity | Preconditions | Steps | Expected result | Evidence | Actual | Status | Issue |
|---------|----------|---------------|-------|-----------------|----------|--------|--------|-------|
| **J-01** | P0 | Stripe test mode, paquete activo | 1. Navegar a `/comprar`<br>2. Seleccionar paquete<br>3. Proceder a checkout | Redirige a Stripe | Screenshot | __________ | __________ | __________ |
| **J-02** | P0 | Checkout Stripe | 1. Completar pago con tarjeta test | Pago procesado | Screenshot, API response | __________ | __________ | __________ |
| **J-03** | P0 | Pago procesado | 1. Verificar `Order.paymentStatus` = `paid`<br>2. Verificar `Order.orderStatus` = `completed` | Estados correctos | API response | __________ | __________ | __________ |
| **J-04** | P0 | Pago procesado | 1. Verificar `Account.status` = `active` | Cuenta activada | API response | __________ | __________ | __________ |
| **J-05** | P0 | Webhook procesado | 1. Verificar metadata: `expected_amount_cents`<br>2. Verificar metadata: `expected_currency` | Snapshot financiero presente | API response | __________ | __________ | __________ |
| **J-06** | P0 | Webhook con mismatch | 1. Simular amount mismatch | No activa cuenta, no crea orden pagada | API response | __________ | __________ | __________ |
| **J-07** | P1 | Webhook duplicado | 1. Enviar mismo evento dos veces | No crea orden duplicada | API response | __________ | __________ | __________ |

### Group K: Manual payment proof

| Case ID | Severity | Preconditions | Steps | Expected result | Evidence | Actual | Status | Issue |
|---------|----------|---------------|-------|-----------------|----------|--------|--------|-------|
| **K-01** | P1 | Orden manual creada | 1. Navegar a `/dashboard/pedidos`<br>2. Subir comprobante (JPG/PNG/WebP) | Comprobante subido | Screenshot, API response | __________ | __________ | __________ |
| **K-02** | P1 | Comprobante subido | 1. Verificar `Order.paymentProofUrl` actualizado | URL presente | API response | __________ | __________ | __________ |
| **K-03** | P1 | Comprobante subido | 1. Verificar `Order.paymentStatus` = `under_review` | Estado correcto | API response | __________ | __________ | __________ |
| **K-04** | P1 | Sin comprobante | 1. Subir archivo inválido (PDF, .exe) | Error rechazado | Screenshot | __________ | __________ | __________ |
| **K-05** | P1 | Orden con `under_review` | 1. Re-subir comprobante | Resubisión permitida | Screenshot | __________ | __________ | __________ |

### Group L: Admin approval

| Case ID | Severity | Preconditions | Steps | Expected result | Evidence | Actual | Status | Issue |
|---------|----------|---------------|-------|-----------------|----------|--------|--------|-------|
| **L-01** | P0 | Admin autenticado, orden manual con comprobante | 1. Navegar a `/admin` → Pedidos<br>2. Aprobar orden | `paymentStatus: "paid"`, `orderStatus: "completed"` | Screenshot, API response | __________ | __________ | __________ |
| **L-02** | P0 | Orden aprobada | 1. Verificar `Account.status` = `active` | Cuenta activada | API response | __________ | __________ | __________ |
| **L-03** | P0 | Orden aprobada | 1. Verificar `AuditLog` creado | `action: "order_approved"` | API response | __________ | __________ | __________ |
| **L-04** | P1 | Orden ya aprobada | 1. Intentar aprobar de nuevo | Error 400 | API response | __________ | __________ | __________ |
| **L-05** | P1 | Admin autenticado | 1. Verificar rate limit (20/min) | Rate limit funciona | API response | __________ | __________ | __________ |

### Group M: Admin rejection

| Case ID | Severity | Preconditions | Steps | Expected result | Evidence | Actual | Status | Issue |
|---------|----------|---------------|-------|-----------------|----------|--------|--------|-------|
| **M-01** | P0 | Admin autenticado, orden manual con comprobante | 1. Rechazar orden | `paymentStatus: "rejected"`, `orderStatus: "cancelled"` | Screenshot, API response | __________ | __________ | __________ |
| **M-02** | P0 | Orden rechazada | 1. Verificar `AuditLog` creado | `action: "order_rejected"` | API response | __________ | __________ | __________ |
| **M-03** | P1 | Orden ya rechazada | 1. Intentar rechazar de nuevo | Error 400 | API response | __________ | __________ | __________ |
| **M-04** | P1 | Admin autenticado | 1. Verificar rate limit (20/min) | Rate limit funciona | API response | __________ | __________ | __________ |

### Group N: Upload and image proxy

| Case ID | Severity | Preconditions | Steps | Expected result | Evidence | Actual | Status | Issue |
|---------|----------|---------------|-------|-----------------|----------|--------|--------|-------|
| **N-01** | P1 | Sesión autenticada | 1. Subir imagen JPG | URL de retorno | Screenshot, API response | __________ | __________ | __________ |
| **N-02** | P1 | Sesión autenticada | 1. Subir imagen PNG | URL de retorno | Screenshot, API response | __________ | __________ | __________ |
| **N-03** | P1 | Sesión autenticada | 1. Subir imagen WebP | URL de retorno | Screenshot, API response | __________ | __________ | __________ |
| **N-04** | P1 | Sesión autenticada | 1. Subir archivo renombrado (.exe → .png) | Rechazado por magic bytes | Screenshot | __________ | __________ | __________ |
| **N-05** | P1 | Sin sesión | 1. Subir imagen | 401 | API response | __________ | __________ | __________ |
| **N-06** | P1 | Proxy image | 1. Intentar acceder a bucket privado | Acceso denegado | API response | __________ | __________ | __________ |
| **N-07** | P1 | Proxy image | 1. Intentar path traversal | Acceso denegado | API response | __________ | __________ | __________ |

### Group O: Corporate flow

| Case ID | Severity | Preconditions | Steps | Expected result | Evidence | Actual | Status | Issue |
|---------|----------|---------------|-------|-----------------|----------|--------|--------|-------|
| **O-01** | P1 | Organización creada, miembros activos | 1. Crear organización | Organización creada | Screenshot, API response | __________ | __________ | __________ |
| **O-02** | P1 | Organización creada | 1. Agregar miembros | Miembros activos | API response | __________ | __________ | __________ |
| **O-03** | P1 | Miembros activos | 1. Crear orden corporativa | Orden creada | API response | __________ | __________ | __________ |
| **O-04** | P1 | Orden corporativa | 1. Aprobar orden corporativa | `corporateStatus: "paid_active"` | API response | __________ | __________ | __________ |
| **O-05** | P1 | Orden corporativa aprobada | 1. Verificar `CorporateProductRequest` | Estado `paid_approved` | API response | __________ | __________ | __________ |

### Group P: Public demo

| Case ID | Severity | Preconditions | Steps | Expected result | Evidence | Actual | Status | Issue |
|---------|----------|---------------|-------|-----------------|----------|--------|--------|-------|
| **P-01** | P1 | Sin sesión | 1. Navegar a `/demo` | Demo visible | Screenshot | __________ | __________ | __________ |
| **P-02** | P1 | Demo activado | 1. Verificar `isVerifiedAdmin` = false<br>2. Verificar `isDemo` = true | Valores correctos | API response | __________ | __________ | __________ |
| **P-03** | P1 | Sin sesión | 1. Intentar activar demo con alias `44R6DBNQ` | No activa demo | API response | __________ | __________ | __________ |
| **P-04** | P1 | Sin sesión | 1. Intentar activar demo con alias `demo` | No activa demo | API response | __________ | __________ | __________ |
| **P-05** | P1 | Sin sesión | 1. Intentar activar demo con alias `DEMO` | No activa demo | API response | __________ | __________ | __________ |
| **P-06** | P1 | Sin sesión | 1. Intentar activar demo con alias `showcase` | No activa demo | API response | __________ | __________ | __________ |
| **P-07** | P1 | Admin VIP | 1. Activar demo con `DEMO-ADMIN-VIP` | Demo activada | API response | __________ | __________ | __________ |

### Group Q: Rate limiting

| Case ID | Severity | Preconditions | Steps | Expected result | Evidence | Actual | Status | Issue |
|---------|----------|---------------|-------|-----------------|----------|--------|--------|-------|
| **Q-01** | P1 | Cuenta de prueba dedicada | 1. Enviar 10+ intentos de login fallidos en 15 min | `429 Demasiados intentos` | API response | __________ | __________ | __________ |
| **Q-02** | P1 | Admin autenticado | 1. Enviar 20+ approves en 1 min | `429 Demasiadas solicitudes` | API response | __________ | __________ | __________ |
| **Q-03** | P1 | Admin autenticado | 1. Enviar 20+ rejects en 1 min | `429 Demasiadas solicitudes` | API response | __________ | __________ | __________ |
| **Q-04** | P1 | Sesión autenticada | 1. Enviar 20+ uploads en 15 min | `429 Demasiadas cargas` | API response | __________ | __________ | __________ |

### Group R: Account deletion (disposable Preview account only)

| Case ID | Severity | Preconditions | Steps | Expected result | Evidence | Actual | Status | Issue |
|---------|----------|---------------|-------|-----------------|----------|--------|--------|-------|
| **R-01** | P0 | Cuenta desechable Preview | 1. Solicitar eliminación | Solicitud procesada | Screenshot, API response | __________ | __________ | __________ |
| **R-02** | P0 | Eliminación procesada | 1. Verificar que datos se anonymizan | Datos anonymizados | API response | __________ | __________ | __________ |
| **R-03** | P0 | Eliminación procesada | 1. Verificar que chips se unlink/desactivan | Chips unlink/desactivados | API response | __________ | __________ | __________ |
| **R-04** | P0 | Eliminación procesada | 1. Verificar que user status = `deleted` | Status correcto | API response | __________ | __________ | __________ |
| **R-05** | P0 | Cuenta NO desechable | 1. Intentar eliminar cuenta de producción | Error o rechazo | API response | __________ | __________ | __________ |

### Group S: Mobile/responsive/accessibility smoke checks

| Case ID | Severity | Preconditions | Steps | Expected result | Evidence | Actual | Status | Issue |
|---------|----------|---------------|-------|-----------------|----------|--------|--------|-------|
| **S-01** | P1 | iPhone 14/15 Safari | 1. Navegar a `/dashboard`<br>2. Navegar a `/e/{shortCode}` | UI responsive | Screenshot | __________ | __________ | __________ |
| **S-02** | P1 | Samsung Galaxy S23 Chrome | 1. Navegar a `/dashboard`<br>2. Navegar a `/e/{shortCode}` | UI responsive | Screenshot | __________ | __________ | __________ |
| **S-03** | P1 | iPad Safari | 1. Navegar a `/dashboard`<br>2. Navegar a `/e/{shortCode}` | UI responsive | Screenshot | __________ | __________ | __________ |
| **S-04** | P1 | Desktop Chrome | 1. Navegar a `/dashboard`<br>2. Navegar a `/e/{shortCode}` | UI responsive | Screenshot | __________ | __________ | __________ |
| **S-05** | P1 | Desktop Firefox | 1. Navegar a `/dashboard`<br>2. Navegar a `/e/{shortCode}` | UI responsive | Screenshot | __________ | __________ | __________ |

---

## 7. Required negative/security cases

| Case ID | Severity | Preconditions | Steps | Expected result | Evidence | Actual | Status | Issue |
|---------|----------|---------------|-------|-----------------|----------|--------|--------|-------|
| **N-01** | P0 | Sin sesión | 1. Intentar acceder a `/dashboard` | Redirige a `/login` | Screenshot | __________ | __________ | __________ |
| **N-02** | P0 | Usuario B autenticado | 1. Intentar acceder a perfil de Usuario A | Acceso denegado | API response | __________ | __________ | __________ |
| **N-03** | P0 | Perfil médico | 1. Verificar que `nationalId` no expuesto | No expuesto | API response | __________ | __________ | __________ |
| **N-04** | P0 | Perfil médico | 1. Verificar que `insurancePolicyNumber` no expuesto | No expuesto | API response | __________ | __________ | __________ |
| **N-05** | P0 | Perfil médico | 1. Verificar que `insuranceEmergencyPhone` no expuesto | No expuesto | API response | __________ | __________ | __________ |
| **N-06** | P0 | Token inválido | 1. Intentar activar con token inválido | Error | API response | __________ | __________ | __________ |
| **N-07** | P0 | Token usado | 1. Intentar activar con token ya usado | Error | API response | __________ | __________ | __________ |
| **N-08** | P0 | Token expirado | 1. Intentar activar con token expirado | Error | API response | __________ | __________ | __________ |
| **N-09** | P0 | Capacidad llena | 1. Intentar activar chip cuando capacidad está llena | Error de capacidad | API response | __________ | __________ | __________ |
| **N-10** | P1 | Upload | 1. Subir archivo con magic bytes inválidos | Rechazado | API response | __________ | __________ | __________ |
| **N-11** | P1 | Image proxy | 1. Intentar path traversal | Acceso denegado | API response | __________ | __________ | __________ |
| **N-12** | P0 | Stripe webhook | 1. Simular amount mismatch | No activa cuenta, no crea orden pagada | API response | __________ | __________ | __________ |
| **N-13** | P0 | Stripe webhook | 1. Simular currency mismatch | No activa cuenta, no crea orden pagada | API response | __________ | __________ | __________ |
| **N-14** | P0 | Stripe webhook | 1. Enviar mismo evento dos veces | No crea orden duplicada | API response | __________ | __________ | __________ |
| **N-15** | P0 | Admin | 1. Intentar aprobar orden ya aprobada | Error 400 | API response | __________ | __________ | __________ |
| **N-16** | P0 | Admin | 1. Intentar rechazar orden ya rechazada | Error 400 | API response | __________ | __________ | __________ |
| **N-17** | P0 | No admin | 1. Intentar aprobar/rechazar sin rol admin | 401/403 | API response | __________ | __________ | __________ |
| **N-18** | P1 | Demo | 1. Intentar activar demo con alias `44R6DBNQ` | No activa demo | API response | __________ | __________ | __________ |
| **N-19** | P1 | Demo | 1. Intentar activar demo con alias `demo` | No activa demo | API response | __________ | __________ | __________ |
| **N-20** | P1 | Demo | 1. Intentar activar demo con alias `DEMO` | No activa demo | API response | __________ | __________ | __________ |
| **N-21** | P1 | Demo | 1. Intentar activar demo con alias `showcase` | No activa demo | API response | __________ | __________ | __________ |
| **N-22** | P0 | Eliminación | 1. Intentar eliminar cuenta con confirmación incorrecta | Error | API response | __________ | __________ | __________ |
| **N-23** | P0 | Eliminación | 1. Intentar eliminar cuenta con contraseña incorrecta | Error | API response | __________ | __________ | __________ |

---

## 8. Evidence standard

Para cada caso P0/P1, se requiere:

- **Screenshot** del paso crítico
- **API response/status** (sin JWTs, passwords, webhook secrets)
- **Relevante safe log excerpt** (sin PII sensible)
- **Record IDs** (sin secrets)
- **Timestamp**
- **Device/browser**

**NO solicitar:**
- JWTs
- Passwords
- Webhook secrets
- Datos médicos sensibles

---

## 9. Blocking criteria

Si ocurre cualquiera de estos, **NO lanzar beta**:

| # | Criterio | Severidad |
|---|----------|-----------|
| 1 | No se puede activar chip válido | P0 |
| 2 | Se expone PII médica privada en ficha/API pública | P0 |
| 3 | Un chip vendido/reservado aparece como disponible | P0 |
| 4 | Se duplica capacidad en retry/doble aprobación | P0 |
| 5 | QR/NFC viejo no redirige correctamente | P0 |
| 6 | Ficha pública no carga para chip activado | P0 |
| 7 | Stripe checkout falla en test mode | P0 |
| 8 | Admin no puede aprobar/rechazar órdenes | P0 |
| 9 | Login/registro falla | P0 |
| 10 | Financial mismatch activa cuenta | P0 |
| 11 | Duplicate webhook crea orden duplicada | P0 |
| 12 | Usuario no autorizado accede a perfil médico de otro | P0 |
| 13 | Upload acepta contenido ejecutable/no-imagen | P0 |
| 14 | Eliminación de cuenta afecta a otro usuario | P0 |

---

## 10. Deferred/non-blocking findings

| # | Issue | Severidad |
|---|-------|-----------|
| 1 | UI no optimizada para tablets | P2 |
| 2 | Mensajes de error no localizados | P2 |
| 3 | Falta loading state en algunos flujos | P2 |
| 4 | Animaciones no implementadas | P3 |
| 5 | Falta dark mode | P3 |

---

## 11. Execution order

1. **Environment safety** (checklist §4)
2. **Auth** (Group A)
3. **Profiles/privacy** (Groups B, C, D)
4. **Chip lifecycle** (Groups E, G, H, I)
5. **Public emergency profile** (Group F)
6. **Uploads** (Group N)
7. **Stripe test payment** (Group J)
8. **Manual payment** (Group K)
9. **Admin approval/rejection** (Groups L, M)
10. **Corporate flows** (Group O)
11. **Public demo** (Group P)
12. **Rate limiting** (Group Q)
13. **Destructive disposable-account test** (Group R) — **LAST**
14. **Responsive/device sweep** (Group S)

---

## 12. Final beta decision

| Campo | Valor |
|-------|-------|
| **Total cases** | 64 |
| **Passed** | __________ |
| **Failed** | __________ |
| **Blocked** | __________ |
| **Open P0** | __________ |
| **Open P1** | __________ |
| **Decision** | GO / CONDITIONAL GO / NO-GO |
| **Approver names** | __________ |
| **Date** | __________ |