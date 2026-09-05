## EXECUTIVE SUMMARY

Informe de avance, no certificación definitiva. Se corrigieron y publicaron nueve
hallazgos P1 de código. El candidato pasó 558 pruebas unitarias/de rutas y 17 de
integración PostgreSQL. La producción ya corresponde al árbol probado.

Permanece un P1 operativo demostrado: el scheduler configurado cada cinco minutos
no mantiene esa cadencia. Además faltan E2E completos, restauración comprobada,
entrega externa y datos comerciales reales. NO-GO para lanzamiento comercial.
La publicación de hardening no representa apertura de ventas ni aprobación GO.

Login y logout reales del administrador confirmados mediante browserAuth;
panel Super Admin, Centro de Operaciones, Producción e Inventario accesibles sin
errores de aplicación observados. Logout regresó a /login. No se crearon datos
operativos. Esto no certifica E2E cliente/corporativo completo.
Intento NEW-18 a las 22:56 UTC: tres HTTP 401. Job nunca habilitado; rollback
versionado y aplicado por permisos net excesivos (NEW-19, P2, corregido por rollback).
Ver scheduler-runtime-attempt.md. Corregir credencial Vault; NEW-18 permanece OPEN.

## 2. VERDICT

**NO-GO provisional. Auditoría y remediación aún en curso.** No se han completado
todas las 256 fases solicitadas; las áreas no verificadas no se cuentan como PASS.

## 3. AUDITED VERSION

- Repositorio: Magnus507/PreRescatePTY; PR #23 fusionada por flujo protegido.
- Rama auditada: audit/adversarial-launch-2026-09-05.
- Candidato probado: cfdd4fcb3a21f2d018d6fe1aeb4fc296d85eab0a.
- SHA productivo de merge: 78b576df0840496d9038055a958c2d17f094263c.
- `git diff cfdd4fc origin/master`: vacío al verificar el merge.
- Deployment: dpl_6sEDJcMLZsjFTMgY2uHFLXpUtW3x, READY.
- URL: https://pre-rescate-py57oxtpn-pre-rescate-pty.vercel.app
- Dominio: https://www.prerescatepty.com
- Fecha: 2026-09-05, verificaciones posteriores a 15:28 UTC.
- Base inicial fe965b6; trabajo visual paralelo e0665d0 y 825b98e preservado.
- Node 24.19, npm 11.9, package-lock.json, Next.js 15.5.24 App Router,
  React 19, Prisma 6.19.3, Supabase PostgreSQL 17.
- Frontend Next.js -> API routes/NextAuth -> Prisma privilegiado -> PostgreSQL.
  Workers consumen outboxes y llaman Resend/Twilio; Storage guarda imágenes.
  El cliente controla inputs, nunca roles efectivos ni autorización DB.

## 4. INITIAL FINDINGS

Discovery inicial completo en discovery.md; conserva deliberadamente el estado
histórico anterior a las correcciones. Estos son los estados de las correcciones
en el árbol productivo auditado, no una garantía sobre rutas ajenas a las pruebas.

| ID | Severidad | Causa y ubicación | Corrección / prueba | Estado |
| --- | --- | --- | --- | --- |
| NEW-01 | P1 | Contacto ajeno y mass assignment; contacts/profile-link POST/PATCH y perfiles-medicos contacts | Ownership antes de escribir, esquema estricto, transacción; contact-ownership-adversarial.test.ts | FIXED |
| NEW-02 | P1 | Trigger manual eludía cooldown; emergency-alerts.ts | Mismo cooldown persistente para ambos triggers; 100 scans concurrentes | FIXED |
| NEW-03 | P1 | Destinatario/perfil/consentimiento obsoleto al entregar | Revalidación antes del proveedor; emergency-alerts.test.ts | FIXED |
| NEW-04 | P1 | Retry SMS/WhatsApp después de aceptación incierta | Resultados ambiguos a dead_letter; test de timeout ambiguo | FIXED |
| NEW-05 | P2 | Reclaim email sin presupuesto ni ventana máxima | Cinco intentos y ventana 23h; pruebas de lease/retry | FIXED |
| NEW-06 | P1 | UPDATE por ID permitía transición obsoleta; comprobante legacy | Compare-and-swap del estado y validación compartida; payment-proof, approve/reject tests | FIXED |
| NEW-07 | P1 | Capacidad no serializada y corporate item sin claim | Lock de Account y escrituras condicionales; carreras reales individuales/corporativas | FIXED |
| NEW-08 | P2 | Nombre interpolado como HTML de email | Escape HTML y URL encoding; revisión lib/notifications.ts:30-44; falta test específico de payload | FIXED |
| NEW-09 | P2 | Imprenta podía leer comprobantes de otros usuarios | Separación de rol en image-proxy.ts:88; prueba negativa | FIXED |
| NEW-10 | P2 | Siete entradas npm audit, herramientas de desarrollo | Vitest/coverage 3.2.6 y lockfile; instalación CI informa cero vulnerabilidades | FIXED |
| NEW-11 | P2 | DB sin historial Prisma | Baseline guardado de 38 checksums, probado y aplicado sin repetir DDL | FIXED |
| NEW-12 | P2 | Snapshots PII y retención incompleta al borrar cuenta | Logs minimizados y cleanup outbox atómico; retención operativa residual aún abierta | MITIGATED |
| NEW-13 | P1 | Replay comercial borraba items y reiniciaba progreso | Preservar identidad/status/fulfillment; sync-real-order-to-operations.test.ts | FIXED |
| NEW-14 | P1 | Unidad activada podía cambiar referencia o activarse disponible | Estados válidos y referencia idempotente; physical-unit-activation.test.ts | FIXED |
| NEW-15 | P2 | Helper TRUNCATE aceptaba DB remota | Restricción localhost y base de pruebas explícita; CI integración | FIXED |
| NEW-16 | P1 | Reserva/liberación/despacho sin lock común de orden | Serialización y predicados físicos al liberar; revisión y suites de reservas | FIXED |

## 5. REMEDIATION PERFORMED

49 archivos cambiados respecto a master visual 825b98e. Lista exacta reproducible:
`git diff --name-only 825b98e 78b576d`. No se desactivó RLS, no se eliminaron tests,
no se usó force push ni bypass de protección. El usuario administrativo solicitado
se creó de forma independiente, con contraseña aleatoria y bcrypt cost 12; no se
guardaron credenciales en Git. Login, lectura de paneles operativos y logout verificados.

DB: prisma/baselines/20260905_verified_history.sql crea solo metadatos históricos,
verifica huella y se niega a sobrescribir historial. Aplicado mediante
reconcile_verified_prisma_history. 38 checksums; fingerprint
679b95e060da1346a2ed6d67deec1e92. No nuevas migraciones de tablas de negocio.

## 6. FINAL FINDINGS — ABIERTOS A ESTE CORTE

| ID | Severidad | Evidencia / riesgo | Acción pendiente | Estado |
| --- | --- | --- | --- | --- |
| NEW-12 | P2 | safe-delete anonimiza Order/Profile/User, no todas las proyecciones y payloads históricos | Completar inventario y política técnica de retención; no purgar contabilidad sin definir alcance | MITIGATED |
| NEW-17 | P3 | auth.users/v2_on_auth_user_created llama función que referencia v2_users/v2_accounts inexistentes; EXECUTE no público | Limpiar subsistema legacy antes de habilitar Supabase Auth; app actual usa NextAuth | OPEN |
| NEW-18 | P1 | Schedule */5; runs 33964739664 11:58:25 y 33973659537 15:03:58 UTC; recuperación diferida >3h | Scheduler con cadencia verificada y alerta independiente de ausencia de ejecución | OPEN |

NEW-18: probabilidad observada, impacto alto en recuperación de alertas tras fallo.
Causa: depender de un scheduler sin garantía de intervalo; workflow de alertas
solo detecta una ejecución fallida, no una ejecución ausente. Mitigación parcial:
after() intenta procesar alertas tras el scan y la cola es durable. No sustituye
recovery periódico. No se rebaja severidad por tener colas vacías actualmente.

## 7. REGRESSION MATRIX

| Regresión | Resultado | Evidencia y límite |
| --- | --- | --- |
| REG-01 Dependencies | PASS | CI install/audit cero; alcance advisory observado |
| REG-02 Inventory race | PASS | Stock 1, 2/10/50 solicitudes, DB PostgreSQL real |
| REG-03 Corporate activation atomicity | PASS | 20 simultáneas y rollback después de chip/item; no E2E UI |
| REG-04 Notification duplication | PARTIAL | Claim/lease/mocks pasan; entrega externa no verificada |
| REG-05 Worker execution | FAIL | NEW-18, cadencia observada no satisface recuperación 15m |
| REG-06 Cron auth | PASS | Tests autenticados + producción rechaza anónimos; no exposición del secreto |
| REG-07 Cooldown | PASS | 100 scans mixtos, una alerta pendiente |
| REG-08 Order outbox | PASS | Tests PostgreSQL commit/recovery y replay; no pago externo |
| REG-09 RLS | PASS | 66/66 tablas, cero grants cliente; accesos directos rechazados |
| REG-10 Consent | PARTIAL | Captura transaccional versionada y tests; registro UI completo pendiente |
| REG-11 Branch protection | PASS | Ruleset 21953666 y merge protegido #23 |
| REG-12 Backup/Restore | NOT TESTABLE | Sin backup/restore demostrado; proyecto de prueba no basta |
| REG-13 Claim/Lease | PASS | 20 workers, lease expirado/budget en tests; transporte simulado |

## 8. NEW FINDINGS

NEW-01 a NEW-18 son descubrimientos de esta auditoría, no mera repetición de la
lista REG. NEW-17 y NEW-18 surgieron en la revisión final de infraestructura.

## 9. AUTH MATRIX

| Actor | Control observado | Evidencia / límite |
| --- | --- | --- |
| Anónimo | Endpoints privados y cron rechazan | Smoke 401; no prueba de cada una de las 167 rutas |
| Cliente/owner | Identidad, estado y sessionVersion DB; ownership por recurso | lib/rbac.ts:57-155; tests de IDOR; E2E propio pendiente |
| Corporativo | Perfil corporativo misma cuenta, vínculo pagado activo | Test PostgreSQL otro account -> 403 |
| Imprenta | Fulfillment permitido; revisión de pagos/comprobantes ajenos denegada | lib/rbac.ts:8-11; image-proxy test |
| Admin | Roles de fuente DB, no user_metadata | requireRole; login/logout productivo y lectura de paneles PASS |
| Superadmin | Gestión administrativa sensible | Rol DB verificado; matriz completa CRUD/EXECUTE aún pendiente |
| Prisma/service role | Privilegiado solo servidor | Requiere authz en cada endpoint; RLS no limita al backend |

## 10. RLS MATRIX

Consulta real pg_class/has_table_privilege: 66 tablas public, 66 con RLS, ninguna
con SELECT/INSERT/UPDATE/DELETE concedido a anon/authenticated. No policies cliente:
denegación por defecto intencional. User como anon y Profile como authenticated
rechazan SQLSTATE 42501. No equivale a probar autorización del servidor privilegiado.
Advisors informa RLS sin policy como INFO, no exposición demostrada.
Referencia: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

## 11. DATABASE INTEGRITY

Huella public DB y CI: 4280551764e73d926998c098f0676f37, 1594 hechos.
Comprende columnas, constraints, índices, RLS/policies y enums, no toda configuración
Auth/Storage/funciones/grants. Migraciones desde vacío y schema diff: PASS CI.
Invariantes verificadas: stock reservado una vez, capacidad no excedida, token de
activación único, evento físico único, fallo transaccional sin estado parcial.

## 12. INVENTORY

Pruebas aisladas PASS; producción observada tiene cero unidades/chips. No se
inventaron existencias ni se ejecutaron seeds productivos. Recorridos completos de
producción/despacho/retorno con operador real pendientes.

## 13. ACTIVATIONS

Individual y corporativa usan transacciones y lock de cuenta. Rechazo por capacidad
revierte token; fallo físico corporativo revierte token, chip e item; tenant ajeno
rechazado. No se probó fallo en absolutamente cada instrucción ni un bulk de 10.

## 14. NOTIFICATIONS

Scan -> registro durable -> claim -> proveedor -> ACK. Destinatario y consentimiento
se revalidan. SMS/WhatsApp ambiguo requiere reconciliación manual, no reenvío ciego.
Email conserva payload/key con presupuesto acotado. No se afirma exactly-once real.

## 15. CRON

GitHub Production workers, */5, secret obligatorio, concurrency group, timeout/retry.
Código publicado incluye notify, commerce y expiry/storage cleanup. Último run
comprobado todavía anterior al merge. NEW-18 impide declarar scheduler confiable.
Heartbeat DB notify/commerce 15:04 UTC; expiry 06:06 UTC al corte inicial post-merge.

## 16. OUTBOX

Pedidos y eventos transaccionales; tests PostgreSQL de pérdida/recovery y replay.
StorageCleanupOutbox se inserta antes de anonimizar y en la misma transacción.
Fallo externo posterior queda recuperable; no se prueba recuperación física de Storage.

## 17. CONCURRENCY TEST RESULTS

| Test | Requests | Success | Rejected/suppressed | Duplicados | Invariante |
| --- | ---: | ---: | ---: | ---: | --- |
| Stock 1 | 2 | 1 | 1 | 0 | PASS |
| Stock 1 | 10 | 1 | 9 | 0 | PASS |
| Stock 1 | 50 | 1 | 49 | 0 | PASS |
| Mismo chip individual | 20 | 1 | 19 | 0 | PASS |
| Mismo chip corporativo | 20 | 1 | 19 | 0 | PASS |
| Mismo job claim | 20 | 1 | 19 | 0 | PASS |
| Scans manual/automático | 100 | 1 alerta | 99 | 0 | PASS |
| Cron autenticado simultáneo | 10 | 10 HTTP 200 / 1 envío | 0 | 0 | PASS |

PostgreSQL 17 real aislado; identidad/transporte externos simulados. No fueron
pruebas de carga HTTP contra producción. Invariantes comprobadas por consultas DB.

## 18. DEPENDENCIES

npm ci y audit PASS en CI. Las entradas originales de Vitest UI eran dev-only,
sin ruta productiva demostrada; no se clasificaron P0 por CVSS. Lockfile actualizado.
No existe garantía contra CVEs futuros; mantener auditoría programada.

## 19. CI/CD

https://github.com/Magnus507/PreRescatePTY/actions/runs/33974628390
Job 101329052675 SUCCESS. npm ci, env:check, prisma generate/validate, migrations
desde vacío, RLS, history, schema diff, lint, typecheck, test:run, test:integration,
test:coverage y build PASS. Repetición de cobertura no duplica el total de tests.
Fallos intermedios TypeScript/contrato env se corrigieron, no se ignoraron.

## 20. VERCEL

Deployment productivo READY y alias/SHA comprobados mediante API, no inferidos por
master. Node 24, Next.js, región iad1. No nuevas migraciones destructivas al publicar.
Rollback previo: dpl_JBTMvF8RzZNHvjQFG3db7NsEw1Ua, SHA 825b98e.

## 21. SECRETS

No valores de secretos en informe, repo ni logs de evidencia. No se encontró secreto
privilegiado expuesto en la revisión previa; inspección completa de todo historial y
todos los bundles/logs no certificada. No listar valores de variables.
Contrato versionado en docs/ENVIRONMENT_VARIABLES.md; presencia/ámbito completo de
variables Vercel todavía NOT TESTABLE con los controles disponibles.

## 22. BACKUP/RESTORE

NOT TESTABLE. Falta evidencia de copia recuperable, Storage, restore aislado y RPO/RTO.
No se copió PII productiva a CI. No se afirma que la existencia de un proyecto de
restore demuestre restauración. Responsable de infraestructura debe habilitar esa
verificación antes de GO; procedimiento en launch-runbook.md.

## 23. PRIVACY

NEW-12 mitigado parcialmente: no snapshots nuevos completos y cleanup durable.
Retención de proyecciones/payloads/históricos pendiente. Consentimiento de registro
versionado se persiste con usuario en transacción (app/api/auth/register/route.ts:139).
No opinión legal definitiva; revisión de política y retención requiere responsable.

## 24. TESTS

575 casos únicos PASS (558 + 17), 0 FAIL en CI final: 79 archivos unitarios y 8 de integración.
E2E navegador completo, móvil, entrega real y backup/restore: no aprobados.
Build local no confirmado no se cuenta; build reproducible está acreditado por CI.

## 25. PRODUCTION VERIFICATION

Smoke posterior: /, /login, /registro HTTP 200; /api/admin/users, /api/users/profile,
/api/health/ready y tres cron sin secreto HTTP 401. Pantalla login visible en navegador.
La página cliente de QR inexistente devuelve shell 200 y muestra “Vínculo Inválido”
en navegador; API /api/public/audit-nonexistent-20260905 devuelve 404.
Privacidad/términos HTTP 200; los tres cron POST con secreto incorrecto devuelven 401.
Login/logout autenticados del superadmin PASS; Centro de Operaciones, Producción e Inventario accesibles. Sin mutaciones de negocio durante el smoke.
Consulta de logs del deployment (error/fatal) sin resultados al corte, no prueba de
ausencia universal de errores. Errores chrome-extension no son errores de la aplicación.

## 26. RESIDUAL RISKS

P0 conocidos abiertos 0; P1 abierto 1 (NEW-18); P2 abierto/mitigado 1 (NEW-12);
P3 abierto 1 (NEW-17). P1 corregidos 9; P2 corregidos 6; P0 corregidos 0.
Estos conteos no convierten áreas sin probar en seguras. Gates externos sin severidad
inventada: backup/restore, E2E, entrega externa, catálogo/inventario, env completo.
NEW-12: acceso restringido reduce exposición, pero retención innecesaria persiste;
resolver alcance y prueba de eliminación antes de certificar privacidad.
NEW-17: no bloquea NextAuth actual; resolver antes de usar Supabase Auth.

## 27. LAUNCH CHECKLIST

| Área | Resultado al corte |
| --- | --- |
| Build limpio | PASS CI |
| TypeScript | PASS |
| Tests | PASS, 575 |
| E2E | PARTIAL; smoke público y admin, sin flujos completos cliente/corporativo |
| Auth | PARTIAL; login/logout admin PASS, resto de flujos sin verificación completa |
| Authorization | PARTIAL, no matriz completa de 167 rutas |
| RLS | PASS alcance tablas públicas/direct grants |
| Inventario | PARTIAL, flujo operativo completo pendiente |
| Concurrencia inventario | PASS escenarios aislados |
| Activación | PASS escenarios aislados individual/corporativo |
| Notificaciones | PARTIAL, transporte externo simulado |
| Claim/Lease | PASS tests |
| Cooldown | PASS tests concurrentes |
| Cron | FAIL cadencia / PASS rechazo no autorizado |
| Outbox | PASS transacción/replay probado |
| Idempotencia | PARTIAL, entrega externa sin verificar |
| DB integrity | PARTIAL, huella e invariantes específicas PASS |
| Dependencias | PASS advisory observado |
| GitHub/CI | PASS CI y protección; scheduler FAIL |
| Vercel | PASS deployment/alias; env completo NOT TESTABLE |
| Secrets | PARTIAL, no exposición encontrada; alcance completo no certificado |
| Backup/Restore | NOT TESTABLE |
| Privacy | PARTIAL, NEW-12 |
| Consent | PARTIAL, captura server-side PASS |
| Production | PASS SHA/READY, no aprobación comercial |
| Smoke Test | PASS alcance público, rechazo anónimo y lectura autenticada admin |

- [x] SHA productivo y árbol probado identificados.
- [x] PR protegida, build, TypeScript, lint y tests.
- [x] Baseline versionado y aplicado; paridad public acotada.
- [x] Concurrencia stock/chip/corporativo/claim/cooldown.
- [ ] Scheduler fiable y alertas de ejecución ausente.
- [x] Login/logout y acceso administrativo real de lectura.
- [ ] E2E completos cliente/corporativo/admin y móvil.
- [ ] Entrega externa autorizada, backup/restore y RPO/RTO.
- [ ] Catálogo aprobado e inventario físico real; retención completa revisada.
- [ ] P1 abiertos = 0; ninguna puerta crítica sin evidencia.

## 28. ROLLBACK PLAN

launch-runbook.md contiene preflight, backup, merge, migraciones, env, deploy,
verificación, cron, monitoreo y rollback. Ante auth rota, corrupción o duplicación
significativa: detener apertura/promoción, registrar evidencia y revertir aplicación
por mecanismo oficial al deployment previo. No borrar historial Prisma ni restaurar
DB destructivamente. Reconciliar proveedor antes de reenviar trabajos ambiguos.

## 29. FINAL VERDICT DEL CORTE

**NO-GO.** Hardening publicado y verificado parcialmente; misión no terminada.
Falta resolver NEW-18 y completar las puertas anteriores. Ningún test simulado se
presenta como entrega real ni ningún documento como prueba de restauración.
