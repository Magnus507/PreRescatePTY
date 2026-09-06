# Puertas pendientes — corte 2026-09-06 21:45 UTC

## Resultado

NO-GO para apertura comercial. NEW-18 FIXED con evidencia runtime; no se
reabrieron secretos, Vault, pg_net ni autenticación. Esto no certifica pruebas
que no se han ejecutado.

| Puerta | Evidencia nueva | Resultado / dependencia |
| --- | --- | --- |
| Cadencia principal | cron.job_run_details: 64/64 succeeded, 16:30–21:45 UTC, max gap 300.147895 s | PASS |
| HTTP workers | net._http_response: 192 respuestas 200, cero timeout | PASS |
| Heartbeats | SystemConfig: notify 21:45:01.348, expiry 21:45:01.783, commerce 21:45:02.415 UTC | PASS |
| Alerta independiente | PR #28 merged; scripts/check-worker-readiness.py antes de recuperación; 5 tests y CI PASS | PARTIAL: falta ejecución real y entrega; GitHub no ofrece cadencia demostrada <=15m |
| E2E cliente/corporativo/admin/móvil | Registro público renderiza campos, consentimiento y enlaces legales. No se creó cuenta ni pedido | NOT TESTABLE completo: faltan credenciales de aplicación/DB aislada y fixtures sintéticos; smoke no equivale a E2E |
| Entrega externa | Los HTTP 200 prueban workers, no recepción Resend/Twilio | NOT TESTABLE: falta destinatario de prueba verificado y evidencia de recepción del proveedor |
| Backup/restore | Proyecto vgaverzjcdbkdwplsekd ACTIVE_HEALTHY, PG17.6.1.166; su existencia no demuestra restauración | NOT TESTABLE: falta copia recuperable, acceso a artefacto/Storage y restore aislado medido |
| RPO / RTO | Ninguna restauración cronometrada ni fecha del último backup verificadas | DESCONOCIDOS: no sustituir por objetivos o valores del plan comercial |
| Catálogo e inventario | COUNT Package WHERE isActive=true = 0; Chip=0; OperationFinishedGoodUnit=0 | Apertura comercial bloqueada hasta catálogo aprobado y unidades físicas reales |
| Privacidad/retención | SafeDeleteService anonimiza datos principales; OperationCommercialOrder conserva customerName/email/phone/reference; política pública no fija plazo uniforme | NEW-12 MITIGATED: definir clases/plazos y tratar proyecciones/payloads sin destruir trazabilidad contable |

## Evidencia de CI y versión

Candidato 8a0bb0351712619091e7f7d1bf4d9ea2dfd8dc43.
CI run 34061840979 / job 101563629773: observer tests, install, audit,
environment, Prisma, migrations, RLS, schema drift, lint, types, unit tests,
PostgreSQL integration, coverage y build: succeeded.
Merge protegido #28: cc7e072d91b8a5c02b7ceddd8fcd841dda05cd91.
Alias observado: 78b576df0840496d9038055a958c2d17f094263c, READY,
dpl_EaDyHwSBdUQg13gW2RJcApj7QK6x. No se certifica nuevo deployment por inferencia.

## Prueba pendiente de alerta (sin perjudicar producción)

1. Ejecutar Production workers desde master y verificar paso Observe worker health.
2. Ejecutar un drill aislado con respuesta readiness sintética degraded/heartbeat
   ausente, usando el mismo observador y la misma ruta de emisión de incidente.
3. Registrar run, resultado FAIL esperado, issue/aviso recibido y timestamp.
4. Comprobar que una recuperación posterior no suprima el incidente inicial.
5. Cerrar solo el incidente marcado como prueba; conservar evidencia sin cuerpos
   de respuesta ni credenciales. No detener pg_cron ni alterar heartbeats reales.

No hay capacidad workflow_dispatch expuesta en el conector disponible ni token
GitHub local presente; la prueba local de fallo no demuestra entrega real.

## Restore seguro y medición

Usar el runbook launch-runbook.md: copia verificada, destino aislado sin salida
a proveedores, recuperación de esquema/datos/grants y Storage, recuentos e
invariantes. RPO observado = momento del incidente simulado menos último dato
recuperado. RTO observado = inicio de recuperación hasta servicio validado.
Mantener los artefactos con PII fuera del repositorio y limitar acceso.
La decisión de retención y catálogo requiere al responsable operativo; no se
inventaron precios, existencias ni plazos legales.
