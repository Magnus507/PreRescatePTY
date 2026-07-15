# P1-04 - Recuperacion de contraseña segura, atomica y revocable

**Proyecto:** PreRescue ID / PreRescatePTY
**Fase:** P1-04
**Objetivo:** asegurar que la recuperacion de contraseña sea no reversible, de un solo uso, resistente a concurrencia y compatible con revocacion de sesiones.

## 1. Resumen ejecutivo

El flujo de "olvidé mi contraseña" pas&oacute; de almacenar el token en texto claro y borrarlo luego del cambio, a guardar solo un hash del token y reclamarlo en una transacci&oacute;n antes de actualizar la contrase&ntilde;a. La contrase&ntilde;a nueva incrementa `sessionVersion`, por lo que las sesiones previas quedan revocadas en la siguiente llamada protegida.

## 2. Riesgo anterior

- `PasswordResetToken.token` se almacenaba en claro.
- La confirmaci&oacute;n segu&iacute;a el patr&oacute;n `find -> update password -> delete token`.
- Dos solicitudes concurrentes pod&iacute;an competir por el mismo token.
- La respuesta de solicitud y confirmaci&oacute;n no estaba gobernada por un flujo de invalidaci&oacute;n claro.

## 3. Flujo anterior

1. Se generaba un token plano.
2. Se guardaba en `PasswordResetToken.token`.
3. Se enviaba por email.
4. La confirmaci&oacute;n buscaba el token directamente.
5. Se actualizaba la contrase&ntilde;a.
6. Se borraba el token.

## 4. Flujo nuevo

### Solicitud

1. El usuario env&iacute;a email.
2. El sistema responde de forma gen&eacute;rica.
3. Si el usuario existe:
   - se genera un token aleatorio fuerte;
   - se calcula `sha256(token)`;
   - solo el hash se persiste;
   - se invalidan tokens anteriores del mismo email;
   - el token plano se manda &uacute;nicamente por email.

### Confirmaci&oacute;n

1. El cliente env&iacute;a token + nueva contrase&ntilde;a.
2. El servidor hashea el token recibido.
3. Reclama el registro con `updateMany` condicionado por `consumedAt = null` y `expiresAt > now`.
4. Dentro de la misma transacci&oacute;n:
   - marca `consumedAt`;
   - actualiza `passwordHash`;
   - incrementa `sessionVersion`;
   - invalida otros tokens del usuario.

## 5. Generaci&oacute;n de token

- Fuente: `crypto.randomBytes(32)`.
- Codificaci&oacute;n: `base64url`.
- Entrop&iacute;a suficiente para un token de recuperaci&oacute;n.

## 6. Hash

- Se utiliza `sha256(token)` para lookup determinista.
- El token plano no se persiste.
- El hash guardado no permite reconstruir el token original.

## 7. Persistencia

- Se reutiliza `PasswordResetToken.token` para almacenar el hash.
- Se agrega `PasswordResetToken.consumedAt` para reclamar el uso de forma at&oacute;mica.
- Los tokens anteriores se invalidan al emitir uno nuevo.

## 8. Consumo atomico

- El token se reclama con `updateMany`.
- Solo un proceso puede pasar la condicion.
- Si el reclamo falla, no se cambia la contrase&ntilde;a.
- Si la actualizaci&oacute;n de contrase&ntilde;a falla, toda la transacci&oacute;n revierte.

## 9. Concurrencia

- Dos solicitudes simult&aacute;neas con el mismo token no pueden consumirse ambas.
- Una obtiene `count = 1`.
- La otra recibe respuesta gen&eacute;rica de token inv&aacute;lido o ya usado.

## 10. Expiracion

- La expiraci&oacute;n server-side sigue siendo de 1 hora.
- La validaci&oacute;n se hace con tiempo del servidor en UTC.
- El token vencido queda rechazado.

## 11. Invalidacion

- Al pedir un nuevo reset, se borran los tokens anteriores del mismo email.
- Al cambiar la contrase&ntilde;a, se incrementa `sessionVersion`.
- Las sesiones antiguas quedan revocadas en la siguiente llamada protegida.

## 12. SessionVersion

- El cambio de contraseña incrementa `sessionVersion` una vez.
- Esto invalida JWT previos sin cambiar el proveedor de autenticaci&oacute;n.

## 13. Anti-enumeracion

- La solicitud devuelve la misma respuesta exista o no exista el email.
- La ruta no expone si una cuenta existe.
- Los tiempos siguen siendo razonablemente similares.

## 14. Rate limit

- Solicitud: limit por IP y por email.
- Confirmaci&oacute;n: limit por IP.
- No se agreg&oacute; CAPTCHA.

## 15. Email

- El token plano se env&iacute;a solo por el canal de correo.
- Los tests no env&iacute;an email real.
- El enlace usa `NEXT_PUBLIC_APP_URL` o localhost de fallback.

## 16. Errores

- Solicitud: mensaje gen&eacute;rico.
- Confirmaci&oacute;n: errores seguros para token inv&aacute;lido, expirado o usado.
- No se exponen stack traces ni secretos.

## 17. Observabilidad

- Se registran eventos de solicitud y error sin incluir token ni contrase&ntilde;a.
- El email se enmascara en logs.

## 18. Compatibilidad legacy

- Los tokens antiguos en claro quedan invalidados al pasar a hash.
- No se mantiene compatibilidad insegura indefinida.

## 19. Migracion

- Cambio no destructivo.
- `prisma validate` y `prisma generate` pasan.
- La migraci&oacute;n agrega `consumedAt` sin borrar datos.

## 20. Pruebas

- helper de token fuerte y hash determinista;
- solicitud con email existente;
- solicitud con email inexistente;
- token almacenado como hash;
- confirmaci&oacute;n v&aacute;lida;
- token inv&aacute;lido;
- token expirado;
- doble consumo concurrente;
- incremento de `sessionVersion`.

## 21. Limitaciones

- La revocaci&oacute;n de sesiones previas se hace en la siguiente llamada protegida.
- Los tokens legacy anteriores no son reutilizables.

## 22. Que no cambio

- No se cambi&oacute; el proveedor de autenticaci&oacute;n.
- No se toc&oacute; MFA.
- No se toc&oacute; Stripe.
- No se toc&oacute; inventario, producci&oacute;n, despacho ni activaci&oacute;n.

## 23. Validaciones

- `git diff`
- `git diff --check`
- `git status --short`
- `npx prisma validate`
- `npx prisma generate`
- `npm run lint`
- `npm run typecheck`
- `npx vitest run`
- `npm run test:coverage -- --run`
- `npm run build`
- `npm audit --omit=dev`

## 24. Despliegue

- Publicar la migraci&oacute;n.
- Desplegar la ruta nueva.
- Forzar emisi&oacute;n de nuevos tokens de recuperaci&oacute;n bajo hash.

## 25. Rollback

- Revertir el c&oacute;digo de rutas y helper.
- Conservar la columna `consumedAt` si ya fue aplicada; no es destructiva.
- Invalidar tokens emitidos durante la ventana del cambio si se requiere.

## 26. Commits

- `feat: hash password reset tokens`
- `fix: consume reset tokens atomically`
- `test: cover password reset concurrency`
- `docs: document secure password reset`

## 27. Push

- `git push origin master`

## 28. Estado final

- Pendiente de cerrar validaciones y commit/push de la fase.
- No se tocaron los flujos fuera de recuperación de contraseña y revocación de sesiones.

## 29. Conclusion

**¿Puede el mismo token de recuperación consumirse dos veces? No.**
