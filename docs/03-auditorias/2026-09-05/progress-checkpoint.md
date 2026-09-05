Actualización de cierre de sesión: logout del superadmin verificado; regreso a /login y formulario visible. Sin mutaciones operativas.

# Checkpoint — auditoría todavía en curso

Este documento no es el informe definitivo ni una aprobación de lanzamiento.

Actualización posterior: login real exitoso por browserAuth, rol Super Admin visible,
vistas Operaciones/Producción/Inventario cargadas, sin errores propios en consola.
No se modificaron productos ni stock. MFA/cambio de contraseña pendientes del titular.
Vault instalado, pg_cron y pg_net disponibles/no instalados, prerescate_cron_secret
ausente. Preparación en scheduler-recovery-runbook.md; no ejecutada. CLI local no
instalado porque su autorización de red fue cancelada. No se eludió ese control.

## Actualización 15:28 UTC — prevalece sobre las notas históricas inferiores

- PR #23 fusionada por el flujo protegido, sin bypass. SHA de merge: 78b576df0840496d9038055a958c2d17f094263c.
- Candidato probado cfdd4fcb3a21f2d018d6fe1aeb4fc296d85eab0a; CI 33974628390 / job 101329052675: SUCCESS completo, 558 unitarios/rutas + 17 integración PostgreSQL 17.
- Las tres pruebas corporativas nuevas ejecutan DB real: 20 peticiones -> 1 activación, 19 rechazos, 0 duplicados; fallo de unidad física revierte token/chip/item; perfil de otra cuenta rechazado 403 sin consumo.
- master visual/performance 825b98e718704bef13f9504f22995acefd94a496 conservado sin cambios funcionales nuestros en sus archivos visuales.
- Baseline Prisma YA APLICADO: 38 entradas verificadas; huella de nombres/checksums 679b95e060da1346a2ed6d67deec1e92. No repetir baseline ni DDL inicial.
- Producción antes del merge: dpl_JBTMvF8RzZNHvjQFG3db7NsEw1Ua, SHA 825b98e; www.prerescatepty.com.
- Verificación DB actual: 66 tablas públicas, 66 RLS, 0 tablas con grants anon/authenticated. Un administrador activo. Cero paquetes activos, chips, unidades físicas y trabajos en las tres colas.
- NEW-17 (P3, legacy): auth.users mantiene v2_on_auth_user_created -> private.v2_handle_new_auth_user; referencia v2_users/v2_accounts inexistentes. EXECUTE denegado anon/authenticated. App actual usa NextAuth/public.User, no Supabase Auth; no se ha alterado ese subsistema legacy. Limpiar o reparar antes de habilitar Supabase Auth.
- Verificación autenticada en navegador exige el formulario seguro browserAuth, no permite ingresar credenciales por automatización de bajo nivel. Login real y MFA todavía pendientes; ninguna contraseña en este documento.
- Deployment del merge confirmado READY: dpl_6sEDJcMLZsjFTMgY2uHFLXpUtW3x; alias real www.prerescatepty.com, SHA 78b576d. Smoke público/privado posterior y QR inválido comprobados. No se emite GO.
- NEW-18 (P1): GitHub schedule */5 no mantiene cadencia. Últimos workers 11:58:25 y 15:03:58 UTC (runs 33964739664 y 33973659537), intervalo >3 horas. after() tras scan mitiga entrega inicial, no recuperación de fallos. Requiere scheduler fiable y alerta de ausencia. Último run observado sigue siendo anterior al merge.
- Estado consolidado y matrices: audit-status.md. NO-GO provisional; E2E autenticados, restore, entrega real y catálogo todavía pendientes.

## Fuente de verdad

- Repositorio: Magnus507/PreRescatePTY.
- PR de trabajo: https://github.com/Magnus507/PreRescatePTY/pull/23 (borrador).
- Rama: audit/adversarial-launch-2026-09-05.
- Base inicial: fe965b628b01c9751a2d6a472ebcb5dbf87cfead.
- Producción volvió a comprobarse y avanzó por trabajo visual independiente a e0665d0a7df15f0d49b43d4aab63d00315847ad7.
- Deployment observado: dpl_HpKPFCwob642GK1Ljf2eUvegNLSC, READY, https://pre-rescate-ntchcetzi-pre-rescate-pty.vercel.app; alias www.prerescatepty.com.
- Los 25 archivos del rediseño se integraron y se compararon byte a byte contra origin/master: preservados sin alteraciones.
- Candidato combinado probado: f3248f27307753d55f8bd2cbc8a95d17e6f428f8.
- Candidato siguiente: a08ee7fae1697a4dcc3ba992a4129e34bb44cd98; añade baseline SQL y prueba aislada del historial, con corrección de sintaxis BigInt compatible con el target TypeScript.

## Evidencia CI

- Run 33972564957 / job 101323554471: PASS completo para f3248f2.
- npm ci, contrato env, generación/validación Prisma, migraciones desde vacío, RLS, migrate status, schema diff, lint, TypeScript, cobertura y build: PASS.
- Unitarios/rutas: 79 archivos, 558 pruebas PASS.
- Integración PostgreSQL 17: 7 archivos, 13 pruebas PASS.
- Stock 1: 2/10/50 peticiones, una reserva en cada caso, 1/9/49 rechazos, cero efectos duplicados.
- Mismo chip: 20 peticiones, una activación, 19 rechazos, un evento ACTIVATED y token consumido una vez.
- Chips diferentes/misma capacidad: uno aceptado; el rechazado conserva token sin consumir y unidad entregada.
- 100 escaneos manuales/automáticos: una alerta pendiente, 99 suprimidas.
- 20 workers: un claim y un envío.
- 10 cron autenticados: diez respuestas 200, un claim y un envío.
- El transporte externo está simulado; estos resultados NO prueban entrega real de email/SMS/WhatsApp.
- Run 33972812624 del candidato 304d3758 falló TypeScript por literal BigInt. Corregido en a08ee7f con BigInt(38), sin cambiar el target. Recoger CI de a08ee7f antes de aplicar baseline.

## Paridad y acceso DB

- scripts/audit-public-schema.sql devuelve en producción y CI la misma huella 4280551764e73d926998c098f0676f37 / 1594 hechos de catálogo.
- Incluye columnas, restricciones, índices, RLS/policies y enums públicos. No demuestra por sí sola paridad de Auth, Storage, funciones privadas, grants o configuración del proveedor.
- SELECT directo como anon sobre User: SQLSTATE 42501, rechazado.
- SELECT directo como authenticated sobre Profile: SQLSTATE 42501, rechazado.
- public._prisma_migrations no existía. Baseline preparado con checksums de las 38 migraciones, huella obligatoria y rechazo si el historial ya existe. No aplicado a producción en este checkpoint.

## Remediación acumulada

NEW-01–07, NEW-13–14 y NEW-16: correcciones de autorización de contactos, cooldown manual persistente, revalidación de entrega, resultados ambiguos SMS, presupuesto de retries, escrituras condicionales de pedidos, serialización de activaciones/reservas y preservación de identidad/progreso. Pruebas disponibles en la PR. No confundir corrección del código candidato con corrección ya desplegada.

NEW-08–10: escape HTML, separación de permisos de imprenta/comprobantes y actualización de dependencias de desarrollo; npm audit completo reportó cero vulnerabilidades durante la remediación.

NEW-12: logs de edición sin snapshots personales; limpieza de archivos registrada atómicamente en StorageCleanupOutbox antes de anonimizar referencias; falla de Storage recuperable. Perfiles dependientes sin usuario/corporativo solo seleccionados si el usuario figura explícitamente como dueño de Account. La retención en proyecciones operativas/históricas aún necesita revisión.

El scheduler incluye ahora expire-chips/limpieza además de notify y commerce. El bootstrap nuevo trabaja con un usuario existente, default dry-run, sin reset ni contraseñas; no se ha ejecutado.

## Fallos encontrados durante la remediación

- CI inicial rechazó el tipo del mock de unidad física: corregido limitando la interfaz a los métodos realmente consumidos.
- CI posterior rechazó BOOTSTRAP_ADMIN_USER_ID no documentado: añadido a ENV_CONTRACT y documentación como parámetro opcional, solo script.
- Ejecución local de tsx bloqueada por EPERM de IPC; no se escalaron permisos. La misma validación pasó en CI.
- Builds locales sin final confirmado no se cuentan como PASS; la evidencia de build reproducible procede de CI y previews Vercel.

## Puertas todavía abiertas

Actualización: el usuario autorizó explícitamente crear una cuenta administrativa
nueva y confirmó su correo designado. Se creó en producción
con isAdmin=true, adminRole=superadmin, status=active, contraseña aleatoria y hash
bcrypt cost 12. Verificados rol, coincidencia del hash y AuditLog
INITIAL_ADMIN_BOOTSTRAP. No se sobrescribieron usuarios ni se registró la
contraseña en archivos. Esta fue una escritura productiva autorizada posterior
a las comprobaciones de solo lectura anteriores. Login real pendiente de prueba.

1. Bootstrap administrativo resuelto mediante creación explícitamente autorizada; completar login real y activación de MFA por el titular.
2. Catálogo/inventario real: producción observada con 0 paquetes activos, 0 chips, 0 unidades y 0 usuarios activos con isAdmin=true. No inventar productos, unidades ni disponibilidad.
3. Verificar backup/restore real y RPO/RTO; existencia de proyecto de restore no demuestra restauración.
4. Completar reauditoría transversal, matriz de autorización y privacidad/retención; probar atomicidad corporativa y E2E críticos no cubiertos por los tests actuales.
5. Recoger CI del baseline, revisar resultado y solo entonces valorar su aplicación de metadatos.
6. Releer master y alias productivo antes del merge: hay trabajo visual independiente en paralelo.
7. Publicar por PR/checks protegidos y verificar SHA real, cron real, smoke posterior y observabilidad. No se ha hecho merge ni despliegue productivo desde esta auditoría.
8. Emitir informe de 29 secciones con estados NOT TESTABLE/PARTIAL donde falte evidencia. No emitir GO por build o mocks.
