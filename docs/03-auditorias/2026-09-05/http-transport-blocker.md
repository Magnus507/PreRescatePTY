# NEW-18 — transporte alternativo, 2026-09-06

El CLI 2.81.3 volvió a instalarse y generar migraciones correctamente. El bloqueo
de ejecución local anterior ya no impide este paso.

Se versionó `20260906012506_private_http_scheduler_transport.sql` antes de intentar
aplicarla. La transacción crea un esquema privado, instala http y revoca permisos;
una guarda comprueba tanto USAGE del esquema como EXECUTE de funciones.

Resultado: apply_migration devolvió P0001, `HTTP transport functions must not be
executable by clients`. No se omitió la guarda ni se cambió de rol privilegiado.
Verificación posterior: http_installed=false; schema_present=false. La migración
está versionada pero NO aplicada. No hubo llamadas HTTP ni nuevos cron jobs.

Esto prueba que los permisos EXECUTE directos no cumplieron el criterio de
hardening; no demuestra por sí solo una ruta de explotación, pues USAGE del
esquema es un control separado. No se clasifica como nuevo P1 de producción.

El valor corregido de Vault sigue NOT TESTABLE por este camino. Los 401 del
intento anterior no son evidencia contra el valor corregido.

## Solicitud concreta al soporte de Supabase

Proyecto: fikidmfquaxhlayxctsa. Necesitamos un transporte HTTP para pg_cron que
use un secreto Vault sin exposición de credenciales a anon/authenticated.
Con la conexión postgres, los REVOKE sobre objetos de extensiones propiedad
de supabase_admin no eliminaron los grants PUBLIC: ocurrió con la cola de pg_net
y con funciones de http. Solicitamos el procedimiento soportado para restringir
esos grants bajo el propietario autorizado. No solicitamos credenciales de
supabase_admin ni bypass de las restricciones del proveedor.

No incluir valores de Vault, Authorization headers ni credenciales en el ticket.
No se abrió ni envió un ticket desde esta sesión.

Estado: NEW-18 OPEN; auditoría NO-GO provisional. Antes de reintentar, resolver
el control de permisos o acordar un scheduler externo con configuración segura.
