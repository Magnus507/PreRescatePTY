# NEW-18 — scheduler verificado en runtime

## Corte vigente: 2026-09-06 21:50 UTC

NEW-18 FIXED / PASS. 65/65 succeeded, 0 fallos, 195 HTTP 200 sin timeout,
max gap 300.147895 s. Heartbeats notify 21:50:03.273, expiry 21:50:02.359,
commerce 21:50:04.247 UTC. Producción cc7e072d91b8a5c02b7ceddd8fcd841dda05cd91,
READY, dpl_C1qUby6cWnB2B3iuumVnkyoeDgJF; CI push 34062063626 SUCCESS.
Monitor independiente desplegado; NEW-20 MITIGATED pendiente solo de prueba
de recepción real. P1 conocidos abiertos = 0.

## Historial de activación y cortes anteriores

2026-09-06. Deployment histórico de activación dpl_EaDyHwSBdUQg13gW2RJcApj7QK6x,
READY, SHA 78b576df0840496d9038055a958c2d17f094263c.

Prueba manual única después del redeploy: request IDs 9,10,11; tres HTTP 200,
sin timeout, creados 16:29:41.557829 UTC. Heartbeats reales:
notify 16:29:44.652, commerce 16:29:44.754, expire 16:29:44.722 UTC.
Se activó por nombre el job previamente versionado e inactivo con:

```sql
select cron.alter_job(jobid, active := true)
from cron.job where jobname='prerescate-worker-recovery' and not active;
```

Primer ciclo automático: runid 1, succeeded, 16:30:00.158799 a
16:30:00.169821 UTC. Request IDs 12,13,14: HTTP 200, timed_out=false.
Cadencia PASS en la ventana observada; evidencia adicional a continuación.
GitHub conserva su workflow y CRON_SECRET como respaldo; no fue modificado.

Rollback operativo (sin eliminar datos, extensiones ni secretos):

```sql
select cron.alter_job(jobid, active := false)
from cron.job where jobname='prerescate-worker-recovery' and active;
```

La migración rechazada de http no figura en el historial aplicado, verificado
contra supabase_migrations.schema_migrations. Se conserva como
rejected-http-transport.sql fuera del directorio de migraciones para evitar
que un replay futuro intente instalar una arquitectura descartada.

No se imprimieron headers, Authorization ni valores secretos. La autenticación
funciona después del redeploy; no se cambió la construcción de headers ni Vault.

## Cierre runtime de cadencia — 21:32 UTC

Ventana 16:30:00.158799 a 21:30:00.078703 UTC (cinco horas):
61 runs, 61 succeeded, cero fallos SQL. Mayor hueco 300.147895 segundos.
61 lotes HTTP, exactamente tres respuestas por lote, 183 HTTP 200, cero timeouts.
Se consultaron únicamente estados/fechas/conteos, sin headers ni contenido PII.
Heartbeats: notify 21:30:01.018; commerce 21:30:02.262; expire 21:30:03.153 UTC.

NEW-18 FIXED para autenticación, ejecución y cadencia en esta ventana. No es
una garantía perpetua ni demuestra entrega de notificaciones a proveedores reales.
Se conserva la necesidad de alerta independiente de ausencia de heartbeat como
NEW-20 P2 OPEN: con scheduler operativo se reduce el riesgo de interrupción actual,
pero una caída futura de DB/cron podría pasar inadvertida. Mitigación disponible:
health autenticado y revisión diaria de heartbeats; automatizar alerta antes de
operar sin supervisión. No se afirmó recepción de alertas ni recuperación de backup.

Siguiente puerta revisada: proyecto de restore vgaverzjcdbkdwplsekd ACTIVE_HEALTHY,
65 tablas public. Esto NO demuestra que provengan de un backup restaurado ni RPO/RTO.
Backup/restore continúa NOT TESTABLE con la evidencia disponible en este corte.
