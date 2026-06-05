# AUDITORÍA P0 — INTEGRIDAD DE PERFILES MÉDICOS

**Fecha:** 6 de mayo 2026  
**Método:** Revisión exhaustiva de código fuente (read-only)  
**Objetivo:** Determinar si los datos médicos pueden perderse, sobrescribirse o eliminarse silenciosamente

---

## 1. Veredicto Ejecutivo

| Indicador | Resultado |
|---|---|
| ¿Existe pérdida real confirmada? | **No** — no se encontró evidencia de pérdida real |
| ¿Existe riesgo de sobrescritura? | **Sí, condicional** — ver sección de hallazgos |
| ¿Existe problema de carga visual? | **Sí, posible** — ver hallazgo H3 |
| **Gravedad** | **P1** (riesgo potencial con condiciones específicas, no pérdida masiva) |

---

## 2. Mapa de Datos Médicos

### Campos cifrados en Profile (13 campos)

| Campo | Tipo | Almacenado | Cifrado |
|---|---|---|---|
| `bloodType` | String | Encriptado (AES-256-CBC) | ✅ |
| `allergies` | String @default("") | Encriptado | ✅ |
| `chronicConditions` | String @default("") | Encriptado | ✅ |
| `medications` | String @default("") | Encriptado | ✅ |
| `additionalNotes` | String @default("") | Encriptado | ✅ |
| `nationalId` | String? @default("") | Encriptado | ✅ |
| `address` | String? @db.Text | Encriptado | ✅ |
| `insuranceProvider` | String? | Encriptado | ✅ |
| `insurancePolicyNumber` | String? | Encriptado | ✅ |
| `preferredHospital` | String? | Encriptado | ✅ |
| `insuranceEmergencyPhone` | String? | Encriptado | ✅ |
| `primaryDoctorName` | String? | Encriptado | ✅ |
| `primaryDoctorPhone` | String? | Encriptado | ✅ |

### Relaciones y cascades en Schema (Prisma)

| Relación | onDelete | Puede borrar Profile | Riesgo |
|---|---|---|---|
| `Profile.contacts` (ProfileContact) | `Cascade` | ❌ Solo elimina ProfileContact | Bajo |
| `Profile.assignedChips` (Chip) | Ninguna (Chip.assignedProfileId → Profile.id, no cascade) | ❌ Solo asigna null a chip.assignedProfileId | Bajo |
| `Profile.organizationMembers` (OrganizationMember) | `Cascade` en OrganizationMember.profileId | ❌ Organización se elimina, no Profile | Bajo |
| `Profile.corporateProfileOf` (OrganizationMember) | `Cascade` en OrganizationMember.corporateProfileId | **⚠️ Sí, si se elimina OrganizationMember con `delete` explícito (ej. delete_forever), y corporateProfileId apunta a este Profile, Prisma cascade elimina el Profile** | **Medio** |
| `Profile.user` (User) | User.profile no tiene cascade directo | ❌ | Bajo |
| `Profile.account` (Account) | No hay cascade Account→Profile | ❌ | Bajo |
| `Profile.orderItems` (OrderItem) | No cascade | ❌ | Bajo |
| `Profile.digitalPass` (DigitalPass) | Cascade | ❌ Solo elimina DigitalPass | Bajo |

### Análisis de cascadas críticas

**OrganizaciónMember.corporateProfileId (línea 432-433):**
```
organizationMember:
  profile Profile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  corporateProfile Profile? @relation("CorporateProfileOwner", fields: [corporateProfileId], references: [id])
```
No hay `onDelete` explícito en `corporateProfileId`. El comportamiento depende de Prisma. Si se elimina `OrganizationMember` y `corporateProfileId` apunta a un Profile, sin cascade explícito el Profile quedaría huérfano (no se elimina). Esto es **correcto** — el perfil corporativo no se elimina en cascada.

En `delete_forever` (members/[id] route.ts líneas 86-109), la transacción:
1. Setea `corporateProfileId = null` en OrganizationMember (línea 93)
2. Luego elimina el `corporateProfile` explícitamente con `prisma.profile.delete({ where: { id: corporateProfileId } })` (línea 98)
3. Luego elimina OrganizationMember (línea 104)

**Esto es seguro** porque solo elimina el perfil corporativo, nunca el personal.

---

## 3. Endpoints que Crean/Modifican/Eliminan Profile

### Endpoints de perfil médico (autorizados)

| Endpoint | Método | Campos aceptados | ¿Update parcial? | ¿Puede escribir null/""? | Valida ownership |
|---|---|---|---|---|---|
| `/api/users/perfiles-medicos` | POST | Todos los campos médicos | N/A (create) | Sí, usa encrypt("") si vacío | ✅ accountId |
| `/api/users/perfiles-medicos/[id]` | GET | N/A (read) | N/A | N/A | ✅ accountId |
| `/api/users/perfiles-medicos/[id]` | PATCH | Todos los campos médicos | **✅ Sí** (partial().safeParse + spreads con `!== undefined`) | **⚠️ Sí, si el frontend envía el campo como `""`** | ✅ accountId |
| `/api/users/perfiles-medicos/[id]` | DELETE | N/A | N/A | N/A | ✅ profileType != corporate, no chips |
| `/api/users/profile` | PATCH | phone, firstName, lastName, nationalId, address, city | ✅ Sí | Sí, pero no son campos médicos | ✅ userId |

### Endpoints que NO deben modificar datos médicos (verificados)

| Endpoint | ¿Modifica Profile? | Evidencia |
|---|---|---|
| `POST /api/orders` | Solo address/city del perfil (no médicos) | ✅ Correcto |
| `POST /api/chips/activate` | No modifica Profile | ✅ Correcto |
| `PATCH /api/chips/dashboard` | No modifica Profile | ✅ Correcto |
| `POST /api/organizations/join-request` | Crea Profile solo si es nuevo, no modifica existente | ✅ Correcto |
| `PATCH /api/organizations/members/[id]` | Solo modifica OrganizationMember, nunca Profile | ✅ Correcto |
| `DELETE /api/organizations/members/[id] (delete_forever)` | Elimina corporateProfile explícito, nunca personal | ✅ Correcto |
| `POST /api/orders/manual` | No modifica Profile | ✅ Correcto |
| `POST /api/users/account/delete` | Elimina Account (cascade a Profile) | ⚠️ Intencional |
| Admin order approve/reject | No modifica Profile | ✅ Correcto |
| Upload foto | Solo photoUrl | ✅ Correcto |

---

## 4. Formularios y Riesgos

### MedicalProfileForm (usado en perfiles-medicos y empresa)

| Aspecto | Evaluación |
|---|---|
| Inicialización add | `emptyForm` con strings vacíos. Al hacer submit de un perfil nuevo, los vacíos se cifran como "". **Correcto para creación.** |
| Inicialización edit | `openEdit()` mapea todos los campos del profile al form. **Correcto.** |
| Submit | Envía `addForm` o `editForm` completo. **Todos los campos se envían, incluso los no editados.** |
| Race condition | Existe riesgo si el usuario edita un perfil, abre otro, y el formulario muestra datos del anterior antes de cargar. Pero `openEdit()` se llama en onClick, y el modal se renderiza después. **Riesgo bajo.** |
| Campos no visibles | Todos los campos del form se envían, incluso los que no están en la UI visible actualmente. Esto evita pérdida de datos no mostrados. **Correcto.** |

### Configuración (user profile edit)

| Aspecto | Evaluación |
|---|---|
| Campos enviados | Solo phone, firstName, lastName, nationalId, address, city. **No envía campos médicos.** |
| Riesgo | **Ninguno.** No puede sobrescribir datos médicos. |

### Empresa corporate profile editor

| Aspecto | Evaluación |
|---|---|
| Inicialización | `setCorpEditForm({ ...emptyProfileForm })` antes de cargar datos → estado vacío mientras `corpEditLoading=true` |
| Riesgo | **⚠️ P1:** El formulario se muestra con el modal abierto mientras carga (`corpEditLoading=true` pero no bloquea el botón submit). Si el usuario hace clic en submit antes de que carguen los datos (1-2s), se enviarían campos vacíos sobrescribiendo datos existentes. Sin embargo, el botón submit ejecuta `handleCorpEdit` que llama al PATCH, y este usa `!== undefined` checks. Si los campos están vacíos `""`, **sí se sobrescribirán**. |
| Mitigación actual | El botón submit no tiene `disabled={corpEditLoading}`. **Debe agregarse.** |

---

## 5. Cifrado

| Aspecto | Evaluación |
|---|---|
| Algoritmo | AES-256-CBC, IV aleatorio de 16 bytes |
| Formato | `hexIV:hexCiphertext` |
| `encrypt()` con text="" | Retorna `""` (vacío). **No cifra vacío.** |
| `decrypt()` con fallo | Retorna el texto original (no cifrado) si falla el descifrado. **No pierde datos, retorna el ciphertext raw.** |
| `decrypt()` con texto no cifrado | Lo retorna tal cual si no contiene ":". |
| ENCRYPTION_KEY | `process.env.ENCRYPTION_KEY`. En dev usa fallback `"dev-only-pre-rescue-id-encryption-key"`. |
| Producción sin key | Lanza error: "ENCRYPTION_KEY is required in production" |
| Rotación de claves | **No existe.** Si se cambia ENCRYPTION_KEY, los datos existentes no se pueden descifrar (decrypt retorna ciphertext). |
| Versionado | **No existe.** No hay versión en los datos cifrados. |

### Riesgo de ENCRYPTION_KEY

Si la clave es diferente entre entornos (local ≠ Vercel ≠ producción), `decrypt()` retornará el texto cifrado como texto plano:
- `bloodType` se vería como `"a1b2c3d4:ef5678..."` 
- Este valor se mostraría en la UI
- Si el usuario hace clic en "Guardar" sin modificar, el PATCH enviaría ese ciphertext como el nuevo valor
- `ProfileRepository.update()` lo "cifraría" (doble cifrado) con la clave actual
- El resultado sería ilegible permanentemente

**Esto es un riesgo si ENCRYPTION_KEY no es consistente.**
Sin embargo, en producción esto no debería ocurrir porque solo hay un entorno de producción con una clave. En dev/local, aunque la clave sea distinta, los datos vienen de la misma DB de desarrollo.

---

## 6. Flujos Externos que NO deben tocar Profile (verificados)

| Flujo | ¿Modifica Profile? | Campos | Correcto |
|---|---|---|---|
| Comprar combo | ❌ No | — | ✅ |
| Comprar accesorio | ❌ No | — | ✅ |
| Subir comprobante | ❌ No | — | ✅ |
| Aprobar/rechazar pago | ❌ No | — | ✅ |
| Activar chip personal | ❌ No | — | ✅ |
| Activar chip empresarial | ❌ No | — | ✅ |
| Reasignar chip | ❌ No | — | ✅ |
| Suspender/reactivar chip | ❌ No | — | ✅ |
| Vincularse a empresa | ❌ No (crea corporateProfile nuevo) | — | ✅ |
| Aprobar/rechazar empleado | ❌ No (solo corporateStatus) | — | ✅ |
| Suspender/archivar empleado | ❌ No (solo corporateStatus) | — | ✅ |
| Crear solicitud corporativa | ❌ No | — | ✅ |
| Cancelar pedido | ❌ No | — | ✅ |
| Cambiar plan | ❌ No | — | ✅ |
| Upload foto | ✅ Sí | solo `photoUrl` | ✅ |
| Agregar/eliminar contacto | ✅ Sí | solo contactos (ProfileContact), no médicos | ✅ |
| Eliminar cuenta | ✅ Sí | Elimina Account → cascade elimina Profile, chips, etc. | ⚠️ Intencional con confirmación doble |

---

## 7. Eliminaciones y Cascades

| Archivo | Acción | Qué afecta | Requiere confirmación | Riesgo |
|---|---|---|---|---|
| `perfiles-medicos/[id]/route.ts` DELETE | `prisma.profile.delete()` | Perfil personal/familiar | ✅ confirm() en frontend + validaciones backend (no chips, no corporate) | Bajo |
| `members/[id]/route.ts` "delete_forever" | Transacción: null corporateProfileId + delete corporateProfile + delete OrganizationMember | Solo perfil corporativo | ✅ confirm() en frontend | Bajo |
| `configuracion/page.tsx` handleDeleteAccount | `POST /api/users/account/delete` → elimina Account | Account completo + todos los perfiles, chips, órdenes | ✅ Confirmación doble (texto + contraseña) | Bajo |
| `schema.prisma` Cascade Account→Profile | Automático si se elimina Account | Todos los perfiles de la cuenta | N/A (ya va por delete account) | Bajo (intencional) |

---

## 8. Bugs Confirmados

| ID | Prioridad | Evidencia | Cómo ocurre | Impacto |
|---|---|---|---|---|
| H1 | **P1** | `empresas/page.tsx` líneas 769-810: `openCorporateProfileEditor()` setea `corpEditForm = { ...emptyForm }` antes de cargar. El modal se muestra inmediatamente. Botón submit no tiene `disabled={corpEditLoading}`. | Usuario abre editor de perfil corporativo → datos cargan en 1-2s → si hace clic en Guardar inmediatamente, se envían campos vacíos que sobrescriben datos médicos existentes | **Pérdida de datos médicos corporativos** en condiciones específicas de latency de red + usuario rápido. |
| H2 | **P2** | `lib/encryption.ts` línea 49-50: `decrypt()` que falla retorna el texto cifrado raw. Si este valor se re-guarda (por un PATCH que incluya el campo), se produce doble cifrado. | ENCRYPTION_KEY cambia entre entornos, o dato corrupto. Decrypt falla → retorna ciphertext → si se guarda, se cifra de nuevo → dato permanentemente ilegible. | **Pérdida permanente** de datos médicos si se re-guarda un campo cuyo descifrado falló. Baja probabilidad porque requiere cambio de clave + escritura posterior. |
| H3 | **P2** | `perfiles-medicos/[id]/route.ts` PATCH líneas 73-122: usa `!== undefined` para cada campo. Si el frontend envía `allergies: ""` (válido, no undefined), **se sobrescribe** el valor existente con encrypt("") = "". | Formulario envía campo vacío intencionalmente por el usuario (borrar alergias). **Este comportamiento es deseado** — si el usuario quiere borrar un campo, debe poder hacerlo. | **Intencional.** No es bug, es funcionalidad. El usuario puede limpiar campos. |
| H4 | **P3** | No existe versionado de cifrado ni rotación de claves. ENCRYPTION_KEY no se puede cambiar sin perder acceso a datos existentes. | Cambio de clave en producción. | Toda la DB de perfiles quedaría ilegible. |

---

## 9. Riesgos Potenciales

| ID | Prioridad | Condición | Mitigación |
|---|---|---|---|
| R1 | **P1** | `openCorporateProfileEditor` envía campos vacíos si se guarda antes de carga completa. | Agregar `disabled={corpEditLoading}` al botón submit del corporate profile editor. |
| R2 | **P2** | Decrypt failure retorna ciphertext, que podría re-guardarse. | Agregar validación en `ProfileRepository.update()`: si un campo cifrado existe en DB y el nuevo valor no es ":"-formatted ni está cifrado, no sobrescribir. |

---

## 10. Protecciones Actuales

- ✅ **Updates parciales seguros** — `profileUpdateSchema.partial()` + spreads con `!== undefined` en PATCH.
- ✅ **Ownership checks** — todos los endpoints validan `accountId` del usuario.
- ✅ **Profile personal no se puede eliminar** si tiene `userId`.
- ✅ **Profile con chips no se puede eliminar** (excepto corporate).
- ✅ **Corporate profile no se puede eliminar desde Perfiles Médicos**.
- ✅ **Audit log** en cada actualización de perfil (create, update).
- ✅ **Encrypt de campos vacíos** como `""` en creación — consistente.
- ✅ **Flujos no relacionados no tocan Profile** — verificado para chips, empresa, pedidos.
- ✅ **Eliminar cuenta requiere** confirmación doble (texto + contraseña).
- ✅ **delete_forever** solo elimina corporateProfile, nunca personal.

---

## 11. Protecciones Faltantes

| Protección | Estado | Prioridad |
|---|---|---|
| Botón submit deshabilitado mientras carga editor corporate | ❌ Falta | **P1** |
| Validación contra doble cifrado en ProfileRepository.update() | ❌ Falta | P2 |
| Soft delete para perfiles | ❌ No existe | P3 |
| Versionado de perfil médico (historial de cambios) | ❌ No existe | P3 |
| Tests de no-regresión para integridad de perfiles | ❌ No existen | P3 |
| Regla formal: "Ningún endpoint ajeno a edición explícita modifica campos médicos" | ❌ No documentada | P2 |
| Regla formal: "Ninguna actualización parcial puede borrar campos no enviados" | ✅ Se cumple en código | — |
| Regla formal: "Ningún valor vacío puede reemplazar datos existentes sin acción explícita" | ⚠️ Se cumple (el usuario debe enviar el campo vacío explícitamente) | — |

---

## 12. Recomendación Inmediata

**B. Fix pequeño en formulario/API — específicamente en el editor corporate profile**

### Único fix urgente:

En `app/(app)/dashboard/empresas/page.tsx`, en la función `openCorporateProfileEditor()` y el modal de edición:

1. **Deshabilitar el botón submit mientras carga:**
   - En el JSX del botón "Actualizar Perfil" dentro del modal corporate editor, agregar `disabled={corpEditLoading || corpEditSaving}`

2. **No renderizar el formulario editable hasta que los datos estén listos:**
   - Mostrar un spinner mientras `corpEditLoading` es true, en lugar de renderizar inputs vacíos

### Confirmaciones de seguridad adicionales:

3. Verificar que `ENCRYPTION_KEY` es la misma en todos los entornos (local, preview, producción).

4. Agregar reglas formales al `INSTRUCTIONS.md` o `BITACORA.md`:
   - Ningún endpoint ajeno a la edición explícita del perfil médico debe modificar campos médicos
   - Ninguna actualización parcial puede borrar campos no enviados
   - Ningún valor vacío puede reemplazar datos existentes sin una acción explícita del usuario

---

## 13. Próximo Prompt Recomendado

**CORREGIR R1 EN EMPRESA/EDITOR CORPORATE PROFILE**

1. En `app/(app)/dashboard/empresas/page.tsx`, localizar el botón submit del modal corporate editor y agregar `disabled={corpEditLoading}`.
2. Agregar spinner/loader mientras `corpEditLoading` es true.
3. Verificar que `ENCRYPTION_KEY` existe en producción (check en `.env.production` o dashboard Vercel).
4. Agregar reglas de integridad a INSTRUCTIONS.md.
5. Typecheck + build para confirmar.

**No tocar ningún otro módulo.** El resto del panel cliente ya fue auditado y congelado.