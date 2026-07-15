# Medical Profile Data Integrity — PreRescue ID

**Última actualización:** 2026-05-06  
**Estado:** Blindaje implementado y validado

---

## Regla Fundamental

> Los datos médicos son la "cuna de oro" del sistema. Nunca deben borrarse silenciosamente, sobrescribirse con campos vacíos o perderse por cambios no relacionados.

### Convención de valores

| Valor recibido | Significado | Acción |
|---|---|---|
| `undefined` (no presente en el body) | No modificar este campo | **No tocar el valor existente** |
| `""` (string vacío explícito) | El usuario quiere borrar este campo | **Limpiar el valor** |
| `"Valor"` (string con contenido) | El usuario quiere actualizar este campo | **Guardar y cifrar** |

---

## Tipos de Perfil

| Tipo | Profile.profileType | Creado por | Editado por | Eliminado por |
|---|---|---|---|---|
| **Personal** | `personal` (default) | Registro/Join Request | `PATCH /api/users/perfiles-medicos/[id]` | `DELETE /api/users/perfiles-medicos/[id]` |
| **Familiar** | `family` (default) | `POST /api/users/perfiles-medicos` | `PATCH /api/users/perfiles-medicos/[id]` | `DELETE /api/users/perfiles-medicos/[id]` |
| **Corporate** | `corporate` | Join Request → approve | `PATCH /api/users/perfiles-medicos/[id]` | `DELETE /api/organizations/members/[id]` (delete_forever) |

> **Reglas de eliminación:**
> - Personal: nunca se puede eliminar (protegido en endpoint)
> - Familiar: se puede eliminar si no tiene chips asignados
> - Corporate: solo se puede eliminar desde empresa (no desde Perfiles Médicos)

---

## Campos Médicos Cifrados (13 campos)

| Campo | Requiere cifrado | Borrado explícito permitido |
|---|---|---|
| `bloodType` | ✅ | ⚠️ (debe tener valor, se inicializa como "Pendiente") |
| `allergies` | ✅ | ✅ |
| `chronicConditions` | ✅ | ✅ |
| `medications` | ✅ | ✅ |
| `additionalNotes` | ✅ | ✅ |
| `nationalId` | ✅ | ✅ |
| `address` | ✅ | ✅ |
| `insuranceProvider` | ✅ | ✅ |
| `insurancePolicyNumber` | ✅ | ✅ |
| `preferredHospital` | ✅ | ✅ |
| `insuranceEmergencyPhone` | ✅ | ✅ |
| `primaryDoctorName` | ✅ | ✅ |
| `primaryDoctorPhone` | ✅ | ✅ |

**Cifrado:** AES-256-CBC con IV aleatorio de 16 bytes. Formato: `hexIV:hexCiphertext`.

---

## Endpoints Autorizados para Modificar Profile

### 1. `PATCH /api/users/perfiles-medicos/[id]` ✅ (edición médica completa)
- **Campos:** Todos los campos médicos + básicos
- **Mecanismo:** `profileUpdateSchema.partial().safeParse()` + spreads con `!== undefined`
- **Protección:** Actualización parcial segura. Solo campos enviados se modifican.

### 2. `POST /api/users/perfiles-medicos` ✅ (creación de familiar)
- **Campos:** Todos los campos médicos
- **Mecanismo:** `ProfileRepository.create()`
- **Protección:** Crea nuevo registro, no modifica existentes.

### 3. `PATCH /api/users/profile` ✅ (Configuración — solo básicos)
- **Campos permitidos:** firstName, lastName, displayNamePublic, phone, nationalId, address, city, sex, birthDate, profileVisibilityStatus
- **Mecanismo:** Whitelist explícita → `ProfileRepository.upsertByUserId()`
- **Protección:** **Nunca pasa campos médicos** (doble barrera: whitelist + filtered undefined)

### 4. `PATCH /api/chips/dashboard` (asignar/reasignar chip)
- **Campos modificados:** Solo `Chip.assignedProfileId`, nunca Profile

### 5. `PATCH /api/organizations/members/[id]` (suspensión/archivo)
- **Campos modificados:** Solo `OrganizationMember.corporateStatus`, nunca Profile

---

## ProfileRepository — Protecciones Implementadas

### `update()` (líneas 166-194)

```
1. filtered = strip undefined values
2. updateData = { ...filtered }
3. Solo cifrar campos que estén DEFINIDELY definidos: data.field !== undefined
4. Guardar en Prisma
```

### `upsertByUserId()` (líneas 199-258)

```
1. filtered = strip undefined values
2. updateData = { ...filtered }
3. Solo cifrar campos que están DEFINIDELY definidos: data.field !== undefined
4. Guardar en Prisma
```

**Protección doble:**
1. Se eliminan todas las propiedades `undefined` antes de pasar a Prisma
2. Cada campo cifrado se guarda solo si `data.field !== undefined`

### `create()` (líneas 78-133)

- Solo crea registros nuevos
- Cifra todos los campos médicos
- No modifica registros existentes

---

## Flujos que NUNCA Deben Modificar Campos Médicos

| Flujo | Campos que modifica | Profile médico |
|---|---|---|
| Activar chip personal | Solo `Chip.assignedProfileId` | ❌ |
| Comprar combo/pedido | Solo `Address/City` del perfil | ⚠️ Solo non-médicos |
| Comprar accesorio personalizado | Solo `OrderItem.profileId` | ❌ |
| Subir comprobante de pago | Nada del perfil | ❌ |
| Aprobar/rechazar pago admin | Nada del perfil | ❌ |
| Suspender/reactivar chip | Solo `Chip.status` | ❌ |
| Crear solicitud corporativa | Nada del perfil | ❌ |
| Aprobar empleado | Solo `OrganizationMember` | ❌ |
| Suspender/archivar empleado | Solo `OrganizationMember` | ❌ |
| Activar chip empresarial | Solo `Chip.assignedProfileId` | ❌ |
| Subir foto | Solo `Profile.photoUrl` | ❌ |
| Agregar/eliminar contacto | Solo `ProfileContact` | ❌ |
| Cambiar plan | Solo `Account.maxChipsAllocated` | ❌ |
| Eliminar cuenta | Elimina `Account` (cascade) | ⚠️ Intencional |

---

## Cambios de Seguridad Recientes (2026-05-06)

### ca32955 — Protect corporate medical profile during loading
- **Problema:** El editor de perfil corporativo (`empresas/page.tsx`) podía guardarse antes de cargar los datos, enviando strings vacíos que sobrescribían datos existentes
- **Fix:** Spinner visible durante carga + `disabled={corpEditLoading}` en botón submit + guard defensivo en `handleCorpEdit`

### 4053f80 — Prevent account settings from clearing medical profile data
- **Problema:** `PATCH /api/users/profile` pasaba campos médicos `undefined` al repositorio. `upsertByUserId()` usaba `"field" in data` que retorna `true` para keys con valor `undefined`, causando `encrypt(undefined || "")` → `""` y sobrescritura de datos cifrados
- **Fix:** (1) Repositorio cambia `"field" in data` → `data.field !== undefined` + strip undefined values. (2) Endpoint Configuración usa whitelist explícita de campos permitidos

---

## Checklist Obligatorio para Futuros Cambios

Cuando se modifique cualquier endpoint o componente relacionado con Profile:

- [ ] ¿Este endpoint puede enviar campos médicos al repositorio?
- [ ] ¿Los campos enviados son solo los necesarios (whitelist)?
- [ ] ¿El repositorio usa `!== undefined` (no `in`) para campos cifrados?
- [ ] ¿Los campos `undefined` se eliminan antes de Prisma?
- [ ] ¿El borrado explícito (`""`) sigue funcionando?
- [ ] ¿El flujo no afecta perfiles de otros tipos (personal vs familiar vs corporate)?
- [ ] ¿El formulario frontend carga datos ANTES de renderizar el form editable?
- [ ] ¿El botón submit está disabled mientras se cargan los datos?

---

## ENCRYPTION_KEY

- **Alcance:** Debe ser idéntica en todos los entornos (local, preview, producción)
- **Riesgo:** Si la clave cambia, los datos GCM fallan con autenticación y los CBC legado dejan de descifrarse hasta corregir la clave
- **Rotación:** el formato ya es versionado; la rotación futura debe ser explícita y planificada
- **Recomendación:** mantener una sola clave estable por fase de transición y no cambiarla sin plan de migración

---

## Módulos que Pueden Congelarse

Todos los 14 módulos del panel cliente están validados y blindados:

| Módulo | Blindaje | Nota |
|---|---|---|
| Dashboard | ✅ | No modifica perfiles |
| Perfiles Médicos | ✅ | Endpoint seguro con partial + `!== undefined` |
| Mis Dispositivos | ✅ | Solo modifica `Chip.assignedProfileId` |
| Fichas Públicas | ✅ | Solo lectura |
| Mis Pedidos | ✅ | Solo address/city del perfil |
| Combos / Comprar | ✅ | No modifica perfiles |
| Tienda / Accesorios | ✅ | Solo `OrderItem.profileId` |
| Empresa empleado | ✅ | Solo `OrganizationMember` |
| Empresa empresario | ✅ | Solo `OrganizationMember` |
| Configuración | ✅ | Whitelist explícita, no médicos |
| Historial | ✅ | Solo lectura |
| Colaboradores | ✅ | Solo `OrganizationMember` |
| Empresa Perfil | ✅ | Solo `CorporatePublicProfile` |
| Login/Registro | ✅ | Solo creación inicial |
