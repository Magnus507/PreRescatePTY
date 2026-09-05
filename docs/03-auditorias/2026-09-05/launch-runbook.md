# Lanzamiento y recuperación — auditoría 2026-09-05

No confundir el despliegue de correcciones con autorización para abrir ventas.
La falta de evidencia de una puerta crítica impide GO.

## Preflight

1. Registrar SHA de master, SHA del candidato, PR, deployment ID y alias real.
2. Comprobar que no haya nuevos cambios paralelos sin integrar/revisar.
3. Confirmar un backup recuperable de DB y una estrategia separada de Storage.
   Registrar ubicación protegida, fecha, retención, responsable y prueba de restore.
   No incluir credenciales, dumps de usuarios ni archivos privados en GitHub.
4. Para un restore, usar un proyecto aislado con salida de notificaciones/pagos
   deshabilitada y credenciales distintas. Restaurar schema, datos, roles/grants y
   objetos de Storage; comprobar recuentos e invariantes y medir RPO/RTO reales.
   Sin esa prueba: Backup/Restore permanece NOT TESTABLE, no PASS.
5. Revisar únicamente nombres/presencia y ámbito de variables según
   docs/ENVIRONMENT_VARIABLES.md. No imprimir sus valores.
6. Confirmar acceso del administrador designado, cambio de contraseña inicial,
   MFA y acceso real al correo de recuperación.
7. El responsable de negocio debe cargar catálogo/precios aprobados y unidades
   físicas reales. No ejecutar seeds de demostración sobre producción.

## CI y migraciones

8. Exigir CI verde del SHA candidato: instalación con lockfile, audit, contrato
   env, Prisma generate/validate, migraciones desde vacío, RLS, schema diff,
   TypeScript, lint, unitarios, integración PostgreSQL, cobertura y build.
9. Ejecutar scripts/audit-public-schema.sql en los entornos comparados. Esa
   huella no sustituye la revisión de Auth, Storage, funciones privadas ni grants.
10. La reconciliación 20260905_verified_history.sql es de UNA SOLA ejecución:
    valida la huella y se niega a sobrescribir un historial existente. Ya se
    aplicó en producción mediante reconcile_verified_prisma_history; no repetir.
    Verificados 38 registros y huella de nombres/checksums
    679b95e060da1346a2ed6d67deec1e92. Las fechas registran el baseline, no fechas
    históricas de ejecución que no están demostradas.
11. Para futuras migraciones: revisar datos existentes, locks, compatibilidad y
    backup antes de ejecutar `npx prisma migrate deploy` con las credenciales
    configuradas del entorno correcto. Nunca repetir DDL inicial como reparación.

## Publicación y comprobación

12. Merge solo por PR y checks protegidos; sin force push, bypass ni desactivar RLS.
13. Esperar Vercel READY y comprobar SHA y alias www.prerescatepty.com.
14. Smoke no destructivo: /, /login, /registro, páginas legales, ruta QR
    inexistente, endpoints privados anónimos y cron sin/incorrecto secreto.
    Esperar rechazo de accesos no autorizados; no contar cualquier 200 como éxito.
15. Probar en entorno aislado el E2E completo de cliente, corporativo y admin.
    En producción, solo acciones controladas y autorizadas con datos del operador.
16. Confirmar un run real de Production workers: notify, commerce y
    expire-chips/limpieza. Verificar heartbeat DB y colas, no solo workflow YAML.
17. Validar entrega externa exclusivamente a destinatarios de prueba autorizados.
    El mock del proveedor no demuestra entrega real. Reconciliar resultados
    ambiguos SMS/WhatsApp antes de cualquier reenvío manual.

## Monitoreo inicial

- Revisar 5xx, fallos de login/roles y errores DB tras el despliegue.
- Vigilar antigüedad de pending/retrying, leases expirados, dead_letter/failed,
  StorageCleanupOutbox y cron:last-success:*.
- Comprobar reservas, asignaciones y transiciones por sus invariantes de DB.
- GitHub schedule puede retrasarse: */5 no es garantía de ejecución cada 5 min.
- Mantener un operador responsable durante la ventana inicial y revisar al día
  siguiente. No hay alerta plenamente validada hasta observar su entrega.

## Rollback

- Detener promoción/apertura si hay bypass de permisos, corrupción, cobro o envío
  duplicado significativo, auth rota o errores sostenidos tras el cambio.
- Registrar deployment anterior antes de publicar. Rollback de aplicación por
  el mecanismo oficial de Vercel al deployment conocido; comprobar alias y SHA.
- No revertir DDL destructivamente por reflejo ni restaurar sobre producción sin
  un plan validado: preferir corrección forward compatible y restore aislado.
- El baseline Prisma solo agregó metadatos: un rollback de aplicación no exige
  borrarlo. No eliminar la tabla de seguimiento para solucionar migrate errors.
- Si una credencial se compromete, revocarla/rotarla en su proveedor con
  autorización y redeploy; borrar una referencia del repositorio no basta.
- Para runaway de notificaciones, pausar el scheduler por flujo autorizado y
  reconciliar proveedor/DB; no reencolar masivamente trabajos ambiguos.

## Estado externo pendiente

Backup/restore real, entrega externa, catálogo/inventario aprobado y E2E completo
no quedan certificados por este runbook. Debe adjuntarse evidencia antes de GO.
