# P1-05 - Cifrado autenticado y versionado con AES-256-GCM

**Proyecto:** PreRescue ID / PreRescatePTY
**Fase:** P1-05
**Estado:** implementado y listo para verificación

## 1. Resumen ejecutivo

La base del cifrado sensible fue migrada desde un formato CBC sin autenticación hacia un formato versionado con AES-256-GCM para nuevas escrituras.

El cambio cierra el riesgo principal identificado por la auditoría maestra:

- antes, `decrypt()` podía confundir plaintext, datos corruptos o ciphertext legacy;
- ahora, el formato nuevo es autenticado;
- la manipulación del ciphertext nuevo falla de forma segura;
- los datos CBC existentes siguen siendo legibles durante la transición;
- el sistema deja de devolver ciphertext como si fuera plaintext.

## 2. Riesgo anterior

El helper previo usaba AES-256-CBC, sin tag de autenticación, y ante error devolvía el texto original. Eso podía ocultar corrupción, manipulación o configuración incorrecta.

## 3. Inventario de campos

Campos sensibles que hoy pasan por el helper central:

- `Profile.bloodType`
- `Profile.allergies`
- `Profile.chronicConditions`
- `Profile.medications`
- `Profile.additionalNotes`
- `Profile.nationalId`
- `Profile.address`
- `Profile.insuranceProvider`
- `Profile.insurancePolicyNumber`
- `Profile.preferredHospital`
- `Profile.insuranceEmergencyPhone`
- `Profile.primaryDoctorName`
- `Profile.primaryDoctorPhone`
- `Profile.communicationAssistance`
- `Profile.safeReturnInstructions`
- `Profile.safeReturnLocationName`
- `Profile.safeReturnAddress`
- `Profile.safeReturnContactName`
- `Profile.safeReturnContactPhone`
- `User.mfaSecret`

Lectura pública y repositorio de perfiles usan descifrado controlado. MFA usa descifrado estricto.

## 4. Formato CBC anterior

Formato heredado reconocido:

- `ivHex:ciphertextHex`

Ese formato sigue siendo legible en la transición, pero se marca internamente como legacy.

## 5. Formato GCM nuevo

Formato actual de nuevas escrituras:

- `v2:gcm:<iv>:<authTag>:<ciphertext>`

Propiedades:

- IV aleatorio por escritura;
- auth tag obligatorio;
- payload autocontenido y serializable en `String`;
- no incluye clave;
- no reutiliza IV.

## 6. Versionado

El helper distingue:

- `v2` para GCM actual;
- `legacy-cbc` para ciphertext heredado;
- `plaintext` solo cuando el caller permite compatibilidad temporal;
- `unknown` para formatos no reconocidos.

## 7. Clave

`ENCRYPTION_KEY` sigue siendo la clave operativa de transición.

Comportamiento:

- la clave debe existir;
- debe ser 32 bytes estables;
- se acepta como 64 caracteres hex o 32 bytes UTF-8;
- si el formato no es válido, el helper falla con `invalid_key`;
- no hay hashing silencioso de la clave;
- no hay rotación automática en esta fase.

## 8. IV / nonce

- GCM usa nonce aleatorio de 12 bytes;
- CBC legacy sigue usando IV de 16 bytes;
- no se reutiliza IV;
- el helper no usa IV fijo.

## 9. Auth tag

El formato GCM incluye el authentication tag completo. La manipulación del tag o del ciphertext invalida el descifrado.

## 10. AAD

Se usa AAD estático por aplicación para reforzar el contexto criptográfico.

Justificación:

- no depende de IDs mutables;
- no bloquea migraciones;
- no expone datos de negocio;
- permite extender el contrato más adelante.

## 11. Errores

Errores internos reconocidos:

- `malformed_ciphertext`
- `unsupported_version`
- `authentication_failed`
- `invalid_key`
- `legacy_decryption_failed`
- `plaintext_not_allowed`

Estos errores no se exponen al usuario final como detalle criptográfico.

## 12. Lectura legacy

Comportamiento definido:

1. GCM válido: se descifra.
2. GCM manipulado: falla con autenticación.
3. CBC válido: se lee y se marca como `needsMigration`.
4. CBC corrupto: falla.
5. Plaintext legacy permitido: se devuelve solo cuando el caller lo autoriza.
6. Plaintext no permitido: falla.
7. Formato desconocido: falla.
8. Clave ausente: falla.
9. Clave incorrecta: falla.
10. Auth tag incorrecto: falla.

## 13. Escritura nueva

Toda escritura nueva de datos sensibles usa GCM.

Eso aplica a:

- creación de perfil;
- edición de perfil;
- perfil corporativo;
- importación o rehidratación vía repositorio;
- formularios compartidos que persisten perfil;
- seeds y fixtures que pasen por el helper.

## 14. Repositorios

El repositorio de perfiles quedó como punto de escritura/lectura central para los campos sensibles.

Además:

- el perfil público usa descifrado permitido para compatibilidad temporal;
- MFA usa lectura estricta;
- no hay cifrado ad hoc en rutas;
- no se expone ciphertext al cliente.

## 15. Migración progresiva

Estrategia elegida:

- nuevas escrituras en GCM;
- lecturas compatibles con CBC legacy;
- migración progresiva al regrabar un registro;
- cierre final de CBC en una fase futura cuando el legado llegue a cero.

No se ejecutó una migración destructiva masiva.

## 16. Script

No se introdujo un script batch destructivo en esta fase.

La estrategia quedó preparada para una migración posterior por lotes si el negocio la necesita.

## 17. Dry-run

No se ejecutó dry-run contra producción.

El código actual permite validar localmente el comportamiento de lectura y escritura antes de planificar cualquier migración masiva.

## 18. Datos corruptos

Los datos corruptos o manipulados no vuelven como plaintext.

Se tratan como falla segura.

## 19. Rotación futura

El formato versionado permite introducir una rotación futura sin cambiar el contrato de almacenamiento.

No se implementó rotación automática de claves en esta fase.

## 20. Privacidad

Se mantuvo el principio de minimización:

- no se registran datos médicos completos en logs;
- no se muestran valores cifrados al usuario;
- los tests usan datos sintéticos;
- no se cambió el modelo legal o de consentimiento.

## 21. Logs

Los logs solo deben registrar errores y agregados operativos.

No deben incluir:

- plaintext;
- ciphertext completo;
- datos médicos;
- claves;
- auth tag.

## 22. Tests

Cobertura agregada de esta fase:

- cifrado GCM válido;
- descifrado GCM válido;
- IV distinto para el mismo plaintext;
- auth tag correcto;
- ciphertext manipulado;
- auth tag manipulado;
- IV manipulado;
- formato truncado;
- versión desconocida;
- clave inválida;
- clave ausente;
- CBC legacy válido;
- CBC legacy con `needsMigration`;
- CBC corrupto;
- plaintext permitido;
- plaintext no permitido;
- nuevas escrituras con GCM;
- lectura pública compatible;
- repositorio de perfiles alineado.

## 23. Compatibilidad

Compatibilidad mantenida:

- CBC legacy sigue siendo legible;
- perfiles públicos siguen funcionando;
- MFA no cambió de flujo;
- el helper continúa exportando `encrypt`, `decrypt` e `isEncrypted` para compatibilidad de código.

## 24. Limitaciones

- la rotación de clave no quedó automatizada;
- la migración por lotes no se ejecutó;
- el ciphertext legacy seguirá coexistiendo hasta que se reescriban los registros;
- rollback de un binario antiguo solo es seguro antes de nuevas escrituras GCM.

## 25. Qué no cambió

- no se cambió el modelo funcional de perfiles médicos;
- no se rediseñaron formularios;
- no se tocó Stripe;
- no se tocó reserva;
- no se tocó producción;
- no se tocó despacho;
- no se tocó activación;
- no se tocó dinero ni estados;
- no se cambió `sessionVersion`;
- no se tocó password reset.

## 26. Validaciones

Validaciones previstas y/o ejecutadas para la fase:

- `git diff`
- `git diff --check`
- `git status --short`
- `npx prisma validate`
- `npm run lint`
- `npm run typecheck`
- `npx vitest run`
- `npm run test:coverage -- --run`
- `npm run build`
- `npm audit --omit=dev`

## 27. Despliegue

Orden recomendado:

1. desplegar el código lector compatible con CBC y GCM;
2. mantener la clave actual estable;
3. habilitar escrituras GCM;
4. verificar métricas;
5. ejecutar dry-run de migración;
6. migrar por lotes si hace falta;
7. verificar la tasa residual de legacy;
8. retirar soporte CBC en una fase futura.

## 28. Rollback

Después de nuevas escrituras GCM:

- un binario antiguo que solo entienda CBC no podrá leer esos valores;
- por eso, el rollback debe usar un release anterior compatible o un forward fix;
- no se recomienda rollback ciego.

## 29. Commits

La fase queda preparada para cerrarse con commits separados de implementación, pruebas y documentación.

## 30. Push

El push debe realizarse solo cuando el árbol esté validado y el staging sea explícito.

## 31. Estado final

El árbol debe quedar limpio salvo `tmp/`.

## 32. Conclusión

¿Puede el sistema detectar manipulación de datos cifrados? Sí.
