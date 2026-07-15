# P1-03 - Revocacion y revalidacion de sesiones/JWT

**Proyecto:** PreRescue ID / PreRescatePTY  
**Fase:** P1-03  
**Objetivo:** reducir la ventana de acceso cuando cambian estado, rol o pertenencia organizacional, sin cambiar el proveedor de autenticacion.

## 1. Alcance

Esta fase no reemplaza `next-auth` ni cambia el esquema de login. Introduce una capa hibrida:

- claims de sesion para UX y navegacion;
- revalidacion en base de datos para acciones sensibles;
- invalidacion de sesiones mediante `sessionVersion` cuando cambian privilegios o pertenencia;
- conservacion de la experiencia de usuario para lecturas no criticas.

## 2. Modelo aplicado

### Claims de sesion conservados

- `id`
- `email`
- `role`
- `adminRole`
- `accountId`
- `sessionVersion`

### Mecanismo de revocacion

- `User.sessionVersion` se agrega en Prisma.
- La sesion firma y devuelve `sessionVersion`.
- `requireRole()` y `requireActiveAccountSession()` comparan la sesion contra el estado actual del usuario en DB.
- Cuando un cambio administrativo afecta acceso, `bumpUserSessionVersion()` invalida todas las sesiones anteriores del usuario.

## 3. Efecto operativo

### ¿Cuanto tarda en perder acceso?

- Si el usuario ejecuta una accion sensible, el corte ocurre en la siguiente llamada al backend porque la ruta revalida contra DB.
- Si el cambio toca privilegios globales, la siguiente verificacion detecta el `sessionVersion` revocado y responde `401`.
- Para rutas que solo leen la sesion sin revalidacion, el acceso persiste hasta que esas rutas sean migradas o la sesion expire.

### Resolucion por tipo de cambio

- Cambio de `status` a inactivo: corta acceso en la siguiente ruta protegida por `requireRole()` o `requireActiveAccountSession()`.
- Cambio de `role` o `adminRole`: corta acceso en la siguiente ruta protegida; `bumpUserSessionVersion()` refuerza el corte inmediato.
- Cambio de `accountId` o pertenencia organizacional: corta acceso en rutas de organizacion revalidadas contra DB.

## 4. Callers actualizados

- `lib/auth.ts`
- `lib/rbac.ts`
- `app/api/admin/admins/route.ts`
- `app/api/admin/admins/[id]/route.ts`
- `app/api/admin/users/[id]/actions/route.ts`
- `app/api/organizations/current/route.ts`
- `app/api/organizations/members/[id]/route.ts`
- `app/api/organizations/corporate-orders/route.ts`
- `app/api/organizations/corporate-orders/from-requests/route.ts`
- `app/api/organizations/corporate-orders/[id]/delivery/route.ts`
- `app/api/organizations/product-requests/route.ts`
- `app/api/organizations/corporate-chip/activate/route.ts`
- `app/api/users/profile/route.ts`
- `app/api/users/account/delete/route.ts`

## 5. Callers que siguen dependiendo de la sesion para UX

Estas rutas siguen usando la sesion como punto de entrada, pero no son el mecanismo final de autorizacion:

- vistas y layouts de admin;
- rutas de lectura no sensibles;
- componentes cliente que renderizan estado local de sesion.

## 6. Lo que no cambio

- No se cambio el proveedor de autenticacion.
- No se introdujeron refresh tokens.
- No se modifico la politica de expiracion natural del JWT.
- No se toco inventario, produccion, despacho ni activacion mas alla de la revalidacion de acceso.

## 7. Riesgos residuales

- Las rutas no migradas a `requireRole()` o `requireActiveAccountSession()` siguen confiando en claims de sesion hasta que se actualicen.
- El logout forzado global depende de que el backend reciba una nueva solicitud; no existe push instantaneo al cliente.
- La revocacion por `sessionVersion` requiere que todas las rutas criticas comparen el valor actual.

## 8. Validaciones

Ejecutar y conservar:

- `git diff`
- `git diff --check`
- `git status --short`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`

## 9. Conclusion

La ventana de acceso queda acotada a la siguiente llamada protegida para rutas migradas y a la expiracion natural solo para superficies no migradas.
La estrategia es consistente con el objetivo de no cambiar de proveedor y si permite revocacion utilizable por estado, rol y pertenencia.
