# Production Readiness Audit — PreRescatePTY (PRE-LAUNCH C6)

## 1) Resumen ejecutivo

- Estado general: **NO-GO condicionado**.
- El sistema está funcional y avanzado para operación real, pero aún hay riesgos críticos en seguridad operativa y gobernanza de producción.
- Clasificación global:
  - **OK**: flujo core (approve/assign-direct/activate/rehabilitate), privacidad pública principal, recuperación de cuenta con anti-enumeración.
  - **WARNING**: observabilidad básica, gobernanza de secretos/operación incompleta, y dependencia obligatoria de Upstash en producción para rate limiting.
  - **CRITICAL**: endpoint admin legacy amplio (`PATCH/DELETE /api/admin/orders`).

---

## 2) Seguridad

### Hallazgos

1. `app/api/chips/activate/route.ts` usa validación, checks de expiración/uso de token y transacción atómica.
   - Estado: **OK**

2. `app/api/public/[shortCode]/route.ts` aplica rate limit y no expone IDs internos en payload público.
   - Estado: **OK**

3. `app/api/public/[shortCode]/route.ts` ahora aplica política CORS endurecida por allowlist explícita (sin wildcard).
   - Mitigación: solo refleja `Access-Control-Allow-Origin` para orígenes permitidos.
   - Estado: **OK**

4. `app/api/admin/orders/route.ts` mantiene endpoint PATCH/DELETE legacy con gran superficie mutante y mezcla de responsabilidades.
   - Riesgo: cambios de estado, tokens y borrados en una ruta amplia incrementan probabilidad de errores operativos.
   - Estado: **CRITICAL**

---

## 3) Privacidad

### Hallazgos

1. En API pública se evita exponer explícitamente `nationalId`, `insurancePolicyNumber`, `insuranceEmergencyPhone`.
   - Estado: **OK**

2. Exposición de extras médicos sujeta a toggles (`showInsuranceProviderPublic`, etc.).
   - Estado: **OK**

3. `ProfileRepository` cifra/descifra campos sensibles en repositorio de dominio.
   - Estado: **OK**

4. Logging general (`console.error`, `logger`) no tiene política central de redacción de PII documentada.
   - Estado: **WARNING**

---

## 4) Rate limiting

### Hallazgos

1. Login, forgot-password, reset-password y perfil público sí tienen rate limit.
   - Estado: **OK**

2. `lib/rateLimit.ts` fue endurecido: en producción ya no usa fallback in-memory.
   - Política aplicada: **fail closed** si Upstash falta o falla (bloquea request con `allowed=false`).
   - Estado: **OK**

3. Endpoints admin mutantes críticos no muestran rate limit específico por operación sensible.
   - Estado: **WARNING**

4. Endpoints actualmente protegidos por `rateLimit()`:
   - Auth: login (`lib/auth.ts`), register, forgot-password, reset-password
   - Público: `/api/public/[shortCode]`, `/api/public/[shortCode]/scan`, `/api/contacts/public`, `/api/image-proxy`
   - Usuario sensible: `/api/users/account/delete`, `/api/upload`
   - Admin: `/api/admin/orders/[id]/reject`
   - Estado: **OK**

---

## 5) Protección activationCode

### Hallazgos

1. Activación valida token único, `usedAt`, `expiresAt` y usa consumo atómico.
   - Estado: **OK**

2. Se evita exposición pública de `activationCode` en ficha pública.
   - Estado: **OK**

3. Algunos flujos históricos/legacy aún pueden dejar lógica dispersa de tokenización (documentado en cleanup legacy).
   - Estado: **WARNING**

---

## 6) Protección shortCode

### Hallazgos

1. `shortCode` se usa como identificador público esperado para emergencia.
   - Estado: **OK**

2. Endpoint público endurecido a allowlist explícita para evitar wildcard global.
   - Estado: **OK**

3. Hay fast-track demo hardcoded en API pública (`DEMO-ADMIN-VIP`, etc.).
   - Riesgo de comportamiento no gobernado por flag/entorno.
   - Estado: **WARNING**

---

## 7) Logs y auditoría

### Hallazgos

1. Existe `AuditLog` en flujos críticos (activate/approve/assign-direct/rehabilitate parcial).
   - Estado: **OK**

2. Aún no existe ledger formal canónico de lifecycle (ya documentado en C5A).
   - Estado: **WARNING**

3. Logger central (`lib/logger.ts`) existe pero no hay estandarización total (coexisten `console.*`).
   - Estado: **WARNING**

---

## 8) Sentry

### Hallazgos

1. Configurado en server y edge (`sentry.server.config.ts`, `sentry.edge.config.ts`).
   - Estado: **OK**

2. `tracesSampleRate: 1` fijo en producción puede elevar costos/ruido; no se observa estrategia por entorno.
   - Estado: **WARNING**

3. No se evidencia en esta auditoría runbook operativo de alertas/on-call/reacción.
   - Estado: **WARNING**

---

## 9) RBAC

### Hallazgos

1. Existe capa central `lib/rbac.ts` con `GENERAL_ADMIN_ROLES`, `ORDER_ADMIN_ROLES`.
   - Estado: **OK**

2. Convivencia de patrón central (`requireRole`) y checks inline (`isAdmin`) en endpoints legacy.
   - Riesgo de inconsistencia futura.
   - Estado: **WARNING**

3. `PATCH/DELETE /api/admin/orders` sigue siendo superficie amplia legacy mutante.
   - Estado: **CRITICAL**

---

## 10) Secretos y configuración

### Hallazgos

1. Integraciones dependen de variables de entorno (Stripe, Resend, Redis, NextAuth).
   - Estado: **OK**

2. No se evidencia en repo documentación operativa completa de rotación de secretos / cadencia / responsables.
   - Estado: **WARNING**

3. `README.md` está genérico de Next.js y no refleja operación real de producción.
   - Estado: **WARNING**

---

## 11) Dependencias externas

### Hallazgos

1. Stripe checkout/webhook implementado con validaciones principales.
   - Estado: **OK**

2. Resend fallback en forgot-password: si falta configuración en producción se registra error, pero puede degradar experiencia real.
   - Estado: **WARNING**

3. Twilio/WhatsApp/Supabase aparecen como dependencias operativas, pero no se detecta checklist integral de health-check externo en esta auditoría.
   - Estado: **WARNING**

---

## 12) Riesgos P0 (bloqueantes)

1. **CRITICAL** — `PATCH/DELETE /api/admin/orders` legacy con alta superficie mutante.
2. **WARNING** — Dependencia fuerte de Upstash para rate limiting en producción (si falla, política fail-closed puede degradar disponibilidad).

---

## 13) Riesgos P1

1. **WARNING** — Inconsistencia de RBAC (checks inline vs helper central).
2. **WARNING** — Demo codes hardcoded en API pública sin feature-flag formal por entorno.
3. **WARNING** — Observabilidad sin runbook operativo formal (alerta/escalación).

---

## 14) Riesgos P2

1. **WARNING** — README operativo incompleto para producción.
2. **WARNING** — Estilo de logging no totalmente unificado.
3. **WARNING** — Falta checklist consolidado de readiness de proveedores externos.

---

## 15) Checklist antes de lanzamiento

- [x] Endurecer política CORS para API pública de perfil.
- [x] Definir estrategia segura cuando Upstash no esté disponible en producción (sin fallback inseguro multi-instancia).
- [ ] Reducir superficie operativa de `PATCH/DELETE /api/admin/orders` (control estricto de uso legacy).
- [ ] Formalizar runbook operativo de incidentes/alertas (Sentry + canales).
- [ ] Consolidar guía de secretos/env por entorno y responsables.
- [ ] Ejecutar runbook E2E prelaunch completo con evidencia.

---

## 16) Recomendación GO / NO-GO

**Recomendación actual: NO-GO** hasta cerrar los P0.

Condición para pasar a **GO controlado**:

1. Mantener alta disponibilidad de Upstash (monitoreo + alertas) para evitar degradación por fail-closed.
2. Establecer guardrails operativos estrictos para endpoint admin legacy mutante.

Con esos tres resueltos y validación E2E documentada, el sistema puede entrar en despliegue controlado por fases.
