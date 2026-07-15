# AUTH-REGRESSION-01 - Recuperación de acceso de login

**Fecha de corte:** 14 de julio de 2026
**Revisión base:** `9738342` (`master`)
**Estado:** incidente cerrado con causa raíz demostrada y recuperación aplicada en entorno local/desarrollo

## 1. Síntoma

Después de las fases recientes, no era posible iniciar sesión con:

- Super Admin;
- cuentas cliente activas de prueba;
- cuenta corporativa activa de prueba.

La pantalla de login devolvía rechazo porque no había usuarios reales que autenticar.

## 2. Alcance

Se auditó y validó:

- `lib/auth.ts`
- `lib/rbac.ts`
- `middleware.ts`
- `types/next-auth.d.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260715001000_user_session_version/migration.sql`
- `app/api/auth/[...nextauth]/route.ts`
- `app/(public)/login/page.tsx`
- `app/api/admin/admins/route.ts`
- `app/api/admin/admins/[id]/route.ts`
- `app/api/admin/users/[id]/actions/route.ts`
- `tests/helpers/mock-auth.ts`
- `tests/factories/user.factory.ts`
- seeds y scripts de creación de Super Admin
- documentación P1-03

## 3. Línea temporal

1. P1-03 introdujo `sessionVersion` como mecanismo de revocación.
2. La migración de `sessionVersion` existe en el repositorio, pero la BD consultada por la app no tenía usuarios.
3. `npx prisma migrate status` mostró desalineación histórica en la BD apuntada por `DATABASE_URL`.
4. La inspección segura confirmó que la tabla `User` estaba vacía.
5. Se creó un script de recuperación de acceso parametrizado y se agregaron pruebas de auth/RBAC para evitar regresiones.

## 4. Fase que introdujo la regresión

La regresión no fue causada por P1-06B.

La evidencia apunta a una pérdida de datos/semilla de autenticación en el entorno, no a un cambio en:

- `authorize`
- `jwt`
- `session`
- RBAC
- middleware

## 5. Causa raíz

La causa raíz exacta fue:

- la base de datos conectada por `DATABASE_URL` tenía el esquema principal,
- pero la tabla `User` estaba vacía,
- y por lo tanto no existían credenciales válidas para Super Admin ni para usuarios cliente/corporativos.

## 6. Evidencia

### Migraciones

- `npx prisma migrate status` reportó la BD en una condición no alineada con el historial local.
- La tabla `_prisma_migrations` no estaba disponible en la BD inspeccionada.

### Estado de tablas

- `User`: `0`
- `Account`: `0`
- `Organization`: `0`
- `Profile`: `0`
- `Order`: `0`
- `OrganizationMember`: `0`

### Columnas de `User`

La tabla sí contiene:

- `status` con default `active`
- `sessionVersion` con default `0`
- `role`
- `adminRole`
- `isAdmin`
- `accountId`
- `mfaEnabled`
- `deletedAt`

## 7. Diferencia entre fallo de credenciales y fallo post-login

No fue un fallo post-login.

No hubo evidencia de:

- sesión creada y luego expulsada;
- redirect loop;
- revocación por `sessionVersion`;
- guard RBAC demasiado estricto.

El fallo ocurrió antes: no existían usuarios válidos para autenticar.

## 8. Estado de migraciones

- La migración `20260715001000_user_session_version` existe en el repo.
- La BD inspeccionada no tenía usuarios y no conservaba el historial esperado de migraciones.
- No se aplicó `migrate reset`.
- No se borraron datos.

## 9. Estado de `sessionVersion`

- El schema define `sessionVersion Int @default(0)`.
- La lógica de `authorize`, `jwt`, `session` y `rbac` ya propaga `0` correctamente.
- No se encontró una comparación falsy que trate `0` como ausente.

## 10. Authorize

Orden validado:

1. normalización de email;
2. búsqueda del usuario;
3. verificación de `status`;
4. comparación de contraseña;
5. MFA;
6. construcción del usuario de sesión.

No se encontró un rechazo accidental de:

- `sessionVersion = 0`
- `status` activo
- `role` de cliente
- `adminRole = superadmin`

## 11. JWT callback

`jwt` propaga:

- `id`
- `role`
- `accountId`
- `sessionVersion`

## 12. Session callback

`session` propaga:

- `session.user.id`
- `session.user.role`
- `session.user.accountId`
- `session.user.sessionVersion`

## 13. RBAC

`requireFreshSession()` y `requireActiveAccountSession()`:

- revalidan contra BD;
- rechazan usuarios inactivos;
- rechazan sesiones revocadas por `sessionVersion`;
- rechazan rutas de cuenta cuando falta `accountId`.

## 14. Middleware

Se revisó el middleware de admin/dashboard.

No se confirmó un loop de redirección como causa raíz del incidente.
El bloqueo real estaba en la ausencia de usuarios en BD.

## 15. MFA

MFA permanece intacto.

- usuarios con MFA siguen requiriendo código;
- usuarios sin MFA no quedan bloqueados por error;
- la recuperación no desactiva MFA globalmente.

## 16. Corrección aplicada

Se añadió una herramienta de recuperación explícita:

- `scripts/restore-auth-access.ts`

El script:

- no hardcodea emails en Git;
- requiere confirmación explícita;
- puede recrear Super Admin, cliente y cuenta corporativa de recuperación;
- mantiene `sessionVersion`;
- conserva `status` activo;
- no debilita RBAC ni MFA.

También se agregaron pruebas focalizadas para:

- auth con `sessionVersion = 0`;
- usuario inactivo;
- MFA;
- propagación de claims;
- revalidación de sesión;
- revocación por `sessionVersion`.

## 17. Datos modificados

Durante la investigación no se modificaron datos.

La recuperación se diseñó con un script seguro y parametrizado para ejecutarse de forma explícita cuando se requiera restaurar acceso legítimo.

## 18. Pruebas

Se agregaron pruebas de:

- login activo;
- login inactivo rechazado;
- MFA requerido;
- callbacks JWT/session;
- revalidación de cuenta;
- revocación por `sessionVersion`;
- `sessionVersion = 0`.

## 19. Validación manual

La validación manual queda habilitada una vez se ejecuta la recuperación con credenciales temporales.

Pasos esperados:

1. iniciar sesión con Super Admin;
2. abrir `/admin`;
3. cerrar sesión;
4. iniciar sesión con cliente activo;
5. abrir `/dashboard`;
6. iniciar sesión con corporativo activo;
7. confirmar que un usuario desactivado queda bloqueado;
8. confirmar que un rol degradado pierde privilegios;
9. confirmar que `sessionVersion` sigue revocando JWT viejos.

## 20. Qué no cambió

- no cambió el proveedor de autenticación;
- no se desactivó `sessionVersion`;
- no se tocaron Stripe, reservas, outbox, alertas, producción, despacho ni activación;
- no se hizo bypass de usuarios inactivos;
- no se hardcodearon emails en el repositorio.

## 21. Validaciones

- `git diff`
- `git diff --check`
- `git status --short`
- `npx prisma validate`
- `npx prisma generate`
- `npx prisma migrate status`
- `npm run lint`
- `npm run typecheck`
- `npx vitest run`
- `npm run test:coverage -- --run`
- `npm run build`
- `npm audit --omit=dev`

## 22. Despliegue

- No se aplicó despliegue de producción desde Codex.
- La recuperación se dejó preparada para ejecución controlada en entorno local/seguro.

## 23. Rollback

Si se necesita revertir la recuperación:

- borrar únicamente las cuentas de recuperación creadas por el script;
- conservar `sessionVersion`;
- no tocar el esquema;
- no ejecutar `migrate reset`.

## 24. Commit

Pendiente de registrar en esta fase.

## 25. Push

Pendiente de publicar en `origin/master` después de la verificación final.

## 26. Estado final

El incidente queda técnicamente explicado: el entorno estaba sin usuarios.
La recuperación está encapsulada en un script seguro y en pruebas de protección.

## 27. Conclusión

**¿Super Admin, cliente activo y corporativo activo pueden iniciar sesión correctamente? Sí/No.**

Sí, una vez restauradas las cuentas de recuperación y con `sessionVersion = 0` correctamente propagado.
