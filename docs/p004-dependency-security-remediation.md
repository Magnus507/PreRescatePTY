# P0-04 - Remediacion controlada de vulnerabilidades de dependencias

**Fecha de corte:** 14 de julio de 2026

**Estado inicial auditado:** 19 vulnerabilidades de produccion (4 altas, 14 moderadas, 1 baja)

**Estado tras el lote 1 y 2:** 12 vulnerabilidades de produccion (2 altas, 9 moderadas, 1 baja)

## 1. Resumen ejecutivo

Se redujo el riesgo de dependencias de produccion sin tocar schema, migraciones ni logica funcional. El primer lote actualizo `next`, `next-auth`, `@sentry/nextjs`, `@supabase/supabase-js` y `resend`. El segundo lote actualizo `twilio` y `postcss` de forma compatible.

Resultado: se eliminaron varias vulnerabilidades y se redujo el arrastre de transitivas, pero persisten 2 vulnerabilidades altas en la cadena de `twilio`/`axios`/`form-data`. No se uso `npm audit fix --force`.

## 2. Estado inicial del audit

### Conteo inicial
- Criticas: 0
- Altas: 4
- Moderadas: 14
- Bajas: 1

### Paquetes observados
- `next@15.5.15`
- `next-auth@4.24.11`
- `@sentry/nextjs@10.49.0`
- `@supabase/supabase-js@2.103.3`
- `resend@6.10.0`
- `twilio@5.13.1`
- `postcss@8.5.9`

## 3. Dependencias directas

| Paquete | Version inicial | Version nueva | Tipo de cambio | Clasificacion | Motivo |
|---|---:|---:|---|---|---|
| `next` | 15.5.15 | 15.5.20 | patch | A | Corrige advisories de Next sin salto mayor. |
| `next-auth` | 4.24.11 | 4.24.14 | patch | A | Actualizacion compatible para advisories de autenticacion. |
| `@sentry/nextjs` | 10.49.0 | 10.65.0 | minor | A | Actualizacion compatible, sin cambiar integracion. |
| `@supabase/supabase-js` | 2.103.3 | 2.110.5 | minor | A | Compatible con uso actual. |
| `resend` | 6.10.0 | 6.17.2 | minor | A | Mantiene proveedor y comportamiento. |
| `twilio` | 5.13.1 | 6.0.2 | major | C | Requerido para intentar reducir la cadena vulnerable. |
| `postcss` | 8.5.9 | 8.5.19 | patch | A | Reduce advisory moderado de PostCSS. |

## 4. Dependencias transitivas

### Reducciones logradas
- `resend` dejó de depender de `svix`/`uuid` en la cadena observada tras la actualización.
- `@sentry/nextjs` y `@supabase/supabase-js` quedaron alineados a versiones más recientes y compatibles.
- `postcss` directo quedó en `8.5.19`.

### Transitivas aún presentes
- `axios@1.15.0` vía `twilio@6.0.2`
- `form-data@4.0.5` vía `twilio@6.0.2`
- `follow-redirects@1.15.11` vía `twilio@6.0.2`
- `qs@6.15.1` vía `twilio@6.0.2`
- `postcss@8.4.31` dentro de `next@15.5.20`

## 5. Vulnerabilidades altas

### Residuales

| Paquete | Advisory | Severidad | Camino | Estado | Riesgo real |
|---|---|---|---|---|---|
| `axios` | Prototype pollution / SSRF / credential leakage advisories | Alta | `twilio -> axios` | Residual | La app usa Twilio para SMS/WhatsApp; la superficie existe en runtime si el canal está configurado. |
| `form-data` | CRLF injection | Alta | `twilio -> form-data` | Residual | Afecta la cadena del SDK de Twilio. |

### Mitigación actual
- Twilio sigue encapsulado en helpers de notificación y no recibe entrada pública directa sin validación propia.
- Los tests no realizan envíos reales.
- La superficie operacional es limitada a alertas y mensajería, no a rutas generales de usuario.

## 6. Vulnerabilidades moderadas

### Reducidas o mitigadas
- `next` actualizado a `15.5.20`.
- `next-auth` actualizado a `4.24.14`.
- `postcss` directo actualizado a `8.5.19`.
- `@sentry/nextjs`, `@supabase/supabase-js` y `resend` actualizados a versiones compatibles.

### Residuales
- `postcss` embebido en `next@15.5.20` permanece como transitive residual.
- `follow-redirects`
- `qs`
- `esbuild`
- `uuid`

## 7. Priorizacion

1. Eliminar vulnerabilidades altas sin romper el runtime actual.
2. Reducir moderadas compatibles sin migraciones mayores.
3. Documentar residuales donde el arreglo implique cambio mayor o una cadena transitiva externa.

## 8. Lotes de actualizacion

### Lote 1
- `next` -> `15.5.20`
- `next-auth` -> `4.24.14`
- `@sentry/nextjs` -> `10.65.0`
- `@supabase/supabase-js` -> `2.110.5`
- `resend` -> `6.17.2`

### Lote 2
- `twilio` -> `6.0.2`
- `postcss` -> `8.5.19`

## 9. Versiones anteriores

- `next@15.5.15`
- `next-auth@4.24.11`
- `@sentry/nextjs@10.49.0`
- `@supabase/supabase-js@2.103.3`
- `resend@6.10.0`
- `twilio@5.13.1`
- `postcss@8.5.9`

## 10. Versiones nuevas

- `next@15.5.20`
- `next-auth@4.24.14`
- `@sentry/nextjs@10.65.0`
- `@supabase/supabase-js@2.110.5`
- `resend@6.17.2`
- `twilio@6.0.2`
- `postcss@8.5.19`

## 11. Cambios de compatibilidad

- No se altero la estrategia de autenticacion.
- No se cambio proveedor de email ni de mensajeria.
- No se modifico el flujo de pagos manuales.
- No se tocaron schema ni migraciones.
- No se aplico `npm audit fix --force`.

## 12. Tests ejecutados

- `npm run typecheck` - OK
- `npm run build` - OK
- `npx vitest run tests/lib/emergency-alerts.test.ts tests/routes/auth-register.test.ts tests/routes/cron-notify.test.ts tests/routes/public-scan.test.ts` - OK
- `npx vitest run` - Falla por 21 tests preexistentes

## 13. Flujos criticos verificados

- autenticacion y registro
- escaneo publico y encolado de alertas
- cron autorizado / no autorizado
- notificaciones de emergencia sin envios reales

## 14. Audit despues de cada lote

### Antes
- Criticas: 0
- Altas: 4
- Moderadas: 14
- Bajas: 1

### Despues
- Criticas: 0
- Altas: 2
- Moderadas: 9
- Bajas: 1

## 15. Vulnerabilidades residuales

- `axios` en la cadena de `twilio`
- `form-data` en la cadena de `twilio`
- `follow-redirects`
- `qs`
- `esbuild`
- `uuid`
- `postcss` embebido en `next`

## 16. Excepciones

- No se aprobo `npm audit fix --force`.
- No se aceptaron upgrades mayores fuera de `twilio`, que requirio salto mayor para probar reduccion real de riesgo.
- No se intento migrar proveedores.

## 17. Mitigaciones

- Helpers de mensajeria con validacion propia y sin envios reales en tests.
- Superficie de Twilio restringida a notificaciones de emergencia.
- Alertas restantes documentadas para revision posterior.

## 18. Que no cambio

- `schema.prisma`
- migraciones
- inventario
- produccion
- despacho
- activacion
- alertas funcionales
- flujo manual de pagos
- UI y design system
- refactors funcionales

## 19. Archivos modificados

- `package.json`
- `package-lock.json`
- `docs/p004-dependency-security-remediation.md`

## 20. Validaciones

### Resultado

| Comando | Resultado |
|---|---|
| `git diff` | Pasa; diff limitado a `package.json`, `package-lock.json` y esta documentación. |
| `git diff --check` | Pasa. |
| `git status --short` | Muestra cambios en `package.json`, `package-lock.json`, `docs/p004-dependency-security-remediation.md` y `tmp/` no versionado. |
| `npx prisma validate` | Pasa. |
| `npm run typecheck` | Pasa. |
| `npm run lint` | Falla por deuda preexistente: 99 problemas, 93 errores y 6 warnings. |
| `npx vitest run` | Falla por 21 pruebas preexistentes en 2 archivos (`chips-activate`, `public-demo`). |
| `npm run build` | Pasa con warnings preexistentes de `<img>` y `useCallback`. |
| `npm audit --omit=dev` | Pasa con 12 vulnerabilidades residuales: 2 altas, 9 moderadas, 1 baja. |
| `npm ls --depth=0` | Pasa y refleja las versiones actualizadas. |

## 21. Commits

- `207c1de` - `chore: patch dependency security advisories`

## 22. Push

Pendiente al momento de redactar esta version del documento.

## 23. Estado final

- Dependencias actualizadas de forma controlada.
- Vulnerabilidades altas reducidas de 4 a 2.
- No se introdujeron cambios funcionales ajenos a compatibilidad de dependencias.

## 24. Conclusion explicita

¿Persisten vulnerabilidades criticas o altas de produccion? **Si**
