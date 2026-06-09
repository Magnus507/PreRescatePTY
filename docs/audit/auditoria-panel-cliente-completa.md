# Auditoría completa — Panel Cliente

> **Fecha:** 6 de junio de 2026  
> **Propósito:** Documentar TODO el panel cliente actual para cerrar esta etapa y conocer exactamente qué debe controlar el admin  
> **Versión auditada:** commit `6fb02b8` (rama principal)  
> **No se modificó código ni se hizo commit.**

---

## 1. Mapa general de navegación

### Sidebar Consumidor (usuario normal)

| Nombre visible | URL | Propósito | Quién la usa |
|---|---|---|---|
| Perfil | `/dashboard` | Dashboard principal con resumen de cuenta, chips, perfiles | Cliente normal |
| Ajuste de Perfil | `/dashboard/configuracion` | Editar datos de cuenta, foto, seguridad, plan | Cliente normal |
| Empresa | `/dashboard/empresas` | Vincularse a empresa o ver estado corporativo | Cliente normal / Empleado |
| Perfiles Médicos | `/dashboard/perfiles-medicos` | CRUD de perfiles médicos + contactos de emergencia | Cliente normal / Familiar |
| Mis Dispositivos | `/dashboard/chips` | Ver chips, activar, asignar perfil, suspender/reactivar | Cliente normal |
| Historial de PreRescue ID | `/dashboard/historial` | Ver escaneos recibidos con geolocalización | Cliente normal / Empresa |
| Tienda | `/dashboard/compras` | Comprar combos de chips | Cliente normal |
| Accesorios | `/dashboard/tienda` | Comprar accesorios personalizados (llaveros, tarjetas, brazaletes) | Cliente normal |
| Mis Pedidos | `/dashboard/pedidos` | Rastrear pedidos, subir comprobantes, ver tokens de activación | Cliente normal |

### Sidebar Corporativo (cuenta empresa)

| Nombre visible | URL | Propósito | Quién la usa |
|---|---|---|---|
| Perfil | `/dashboard/empresa-perfil` | Perfil público de la empresa | Admin empresa |
| Panel de Empresa | `/dashboard/empresas` | Gestión de colaboradores, solicitudes, pedidos corporativos | Admin empresa |
| Colaboradores | `/dashboard/colaboradores` | CRUD de miembros vinculados a la organización | Admin empresa |
| Historial de Escaneos | `/dashboard/historial` | Ver escaneos de chips corporativos | Admin empresa |

### Navegación mobile (bottom nav)
- Consumidor: Dashboard, Mis Dispositivos, Tienda, Más (menú expandible)
- Corporativo: Perfil, Panel Empresa, Colaboradores, Historial

### Sidebar corporate (cuenta empresa)
- Muestra sección "Gestión Corporativa" con links a Perfil, Panel Empresa, Colaboradores, Historial
- NO muestra Configuración

---

## 2. Dashboard principal

**Archivo:** `app/(app)/dashboard/page.tsx` (621 líneas)

### Componentes visuales

**Header:**
- Logo "PRE RESCUE ID" con estilos
- Botón campana de notificaciones (refresca datos, muestra badge rojo si hay no-leídas)
- Badge de tipo de cuenta: "PROTECCIÓN", "MULTIUSUARIO" o "CORPORATIVA"

**Notificaciones del sistema:**
- Lista de notificaciones no leídas con botón "Entendido" (PATCH a `/api/users/notifications`)

**Logística: (Hardware en tránsito)**
- Banner que aparece si `state.physicalChipsInTransitCount > 0`
- Mensaje: "Tienes X dispositivo(s) físicos vinculados a tu cuenta siendo procesados para envío."

**Combo & Status Card:**
- Muestra nivel de protección: "Inactiva", "Cuenta activa" o "Expirado"
- Contadores: `activeChipsCount` / `maxChipsAllocated`
- Link a activación: `/dashboard/chips?activate=true`

**Banner de cuenta inactiva:**
- Si `state.isInactive`: banner grande con gradiente + link a `/comprar`
- Mensaje: "Activa tu Escudo Digital hoy mismo."

**Banner empleado corporativo:**
- Si `isEmployee`: banner informativo "Cuenta Institucional"

**Sección Perfiles Médicos:**
- Muestra `ownProfile` como card principal (con foto, sangre, chips)
- Muestra `familyProfiles` como cards adicionales si `state.isFamily`
- Cada card (ProfileCard):
  - Foto con upload inline (POST a `/api/upload`)
  - Nombre completo, badge "Principal"/"Perfil Adicional"/"Colaborador"
  - Tipo de sangre, conteo de chips
  - Indicador de completitud (check verde vs alerta ámbar)
  - Botón "Ver Pantallazo del Chip" (abre `/e/{shortCode}`)
  - Link a gestión de perfiles

**Upsell Sections:**
- Si no es familiar: card "¿Proteges a más personas?" con link a `/dashboard/upgrade`
- Card "Chips Extra" con precio `BUSINESS_RULES.EXTRA_CHIP_PRICE` ($25) y link a `/dashboard/compras`

### APIs consumidas
- `GET /api/account/state` → AccountState
- `GET /api/users/perfiles-medicos` → ownProfile + familyProfiles + state
- `GET /api/users/notifications` → notificaciones
- `PATCH /api/users/notifications` → marcar como leída
- `POST /api/upload` → subir foto de perfil

### Estados
- `loading`: spinner + "Sincronizando con PreRescue ID Control..."
- `error`: mensaje + botón reintentar + link a soporte
- `isOrganization` redirect: redirige a `/dashboard/empresas`
- Empty state (sin perfiles): mensaje "Sin Configuración Médica"

### Datos que muestra el dashboard
- `state.activeChipsCount`, `state.maxChipsAllocated`, `state.isInactive`, `state.isExpired`
- `state.isFamily`, `state.isOrganization`, `state.isOwner`, `state.isCorporate`
- `state.physicalChipsInTransitCount`
- `state.setupChecklist` (definido pero no se usa en el render)
- `ownProfile` y `familyProfiles` con datos sumarizados

---

## 3. Perfil Médico

**Archivo página:** `app/(app)/dashboard/perfiles-medicos/page.tsx` (877 líneas)  
**Archivo formulario:** `components/forms/MedicalProfileForm.tsx` (633 líneas)  
**Endpoint GET (lista):** `app/api/users/perfiles-medicos/route.ts`  
**Endpoint GET/PATCH/DELETE (individual):** `app/api/users/perfiles-medicos/[profileId]/route.ts`  
**Endpoint contacts:** `app/api/users/perfiles-medicos/[profileId]/contacts/route.ts`

### Campos del formulario (33 campos)

| Sección | Campo | Tipo | Requerido |
|---|---|---|---|
| Identidad | firstName | text | Sí |
| Identidad | lastName | text | Sí |
| Identidad | displayNamePublic | text | No (alias público) |
| Identidad | phone | tel | No |
| Identidad | nationalId | text | No |
| Identidad | sex | select (M/F/No Definido) | No |
| Identidad | birthDate | date picker | No |
| Alerta médica | bloodType | select (8 tipos + Pendiente) | Sí |
| Alerta médica | allergies | textarea | No |
| Alerta médica | chronicConditions | textarea | No |
| Alerta médica | medications | textarea | No |
| Seguro | isInsured | toggle | No |
| Seguro | insuranceProvider | text | No (condicional) |
| Seguro | insurancePolicyNumber | text | No (condicional) |
| Seguro | preferredHospital | text | No |
| Seguro | insuranceEmergencyPhone | text | No |
| Médico | primaryDoctorName | text | No |
| Médico | primaryDoctorPhone | text | No |
| Notas | additionalNotes | textarea | No |
| Privacidad | showInsuranceProviderPublic | toggle | No |
| Privacidad | showPreferredHospitalPublic | toggle | No |
| Privacidad | showPrimaryDoctorPublic | toggle | No |
| Privacidad | showPrimaryDoctorPhonePublic | toggle | No |
| Privacidad | showAdditionalNotesPublic | toggle | No |

### Secciones del formulario
1. **Identidad** — nombre, apellido, alias, teléfono, cédula, sexo, fecha de nacimiento
2. **Alerta médica** — tipo de sangre, alergias, condiciones, medicamentos
3. **Seguro y médico** — aseguradora, póliza, hospital, médico tratante, notas adicionales
4. **Privacidad** — 5 toggles de visibilidad pública

### Modos de visualización
- **Desktop (grid):** 2 columnas, todos los campos visibles
- **Mobile (wizard):** 4 pasos con navegación "Siguiente/Atrás", progreso, botón "Guardar" en el último paso
- El wizard usa CSS para ocultar los botones del padre (Cancelar/Guardar) mediante selector `[data-wizard-active="true"] + div.flex.gap-6`

### Acciones disponibles por perfil
- **Crear:** formulario inline (mobile) o modal (desktop)
- **Editar:** formulario inline (mobile) o modal (desktop)
- **Eliminar:** solo perfiles adicionales (no el propio), con confirmación
- **Ver/ocultar contactos:** expandible inline dentro del ProfileCard
- **Vincular chip:** selector de chips disponibles (los que no tienen `assignedProfileId` y status "activated")
- **Ver perfil público:** link a `/e/{shortCode}`

### Endpoints usados en perfiles

| Método | Ruta | Propósito |
|---|---|---|
| GET | `/api/users/perfiles-medicos` | Listar perfiles propios + familiares + corporativos |
| POST | `/api/users/perfiles-medicos` | Crear perfil familiar |
| GET | `/api/users/perfiles-medicos/[profileId]` | Obtener perfil individual (descifrado) |
| PATCH | `/api/users/perfiles-medicos/[profileId]` | Actualizar perfil |
| DELETE | `/api/users/perfiles-medicos/[profileId]` | Eliminar perfil (solo si sin chips asignados) |
| GET | `/api/users/perfiles-medicos/[profileId]/contacts` | Listar contactos del perfil |
| POST | `/api/users/perfiles-medicos/[profileId]/contacts` | Añadir contacto |
| PATCH | `/api/users/perfiles-medicos/[profileId]/contacts` | Actualizar vínculo |
| DELETE | `/api/users/perfiles-medicos/[profileId]/contacts?id=X` | Eliminar contacto |
| PATCH | `/api/chips/dashboard` | Asignar/desasignar chip a perfil |

### Datos cifrados
El endpoint GET individual (`[profileId]/route.ts`) llama a `ProfileRepository.findById(profile.id)` que descifra los datos. El endpoint de listado (`perfiles-medicos/route.ts`) llama a `ProfileRepository.findAllByAccount(state.accountId)` que también descifra. Los campos cifrados incluyen datos sensibles del perfil médico.

### Relación con chip
- Un perfil puede tener múltiples chips asignados (`assignedChips`)
- Se asigna desde la página de perfiles médicos (select) o desde la página de chips (select)
- La activación de un chip requiere perfil completo (nombre, apellido, tipo de sangre)

### Relación con perfil empresarial
- Los perfiles corporativos (`profileType: "corporate"`) no pueden eliminarse desde perfiles médicos
- Si un perfil está vinculado como `corporateProfileId` en OrganizationMember, no se puede eliminar
- Los perfiles corporativos se excluyen de la asignación de chips desde la UI de perfiles médicos

### Validaciones importantes
- Límite técnico: `MAX_PERSONAL_PROFILES_TECHNICAL_LIMIT = 50` (anti-abuso)
- No se puede eliminar el perfil propio
- No se puede eliminar perfil corporativo desde perfiles médicos
- Se requieren chips desasignados para eliminar perfil
- Límite de 3 contactos de emergencia por perfil

### Mobile vs Desktop
- Crear/editar: **mobile** → formulario inline con wizard, **desktop** → modal
- Contactos: expandibles inline en ambos
- Botones de acción: íconos con tooltip en ambas vistas

---

## 4. Contactos de Emergencia

**Datos:** Gestionados dentro de `app/(app)/dashboard/perfiles-medicos/page.tsx`  
**Endpoints:** `app/api/users/perfiles-medicos/[profileId]/contacts/route.ts`

### Campos del contacto
| Campo | Tipo | Requerido |
|---|---|---|
| fullName | text | Sí |
| relationship | select (8 opciones) | Sí |
| phone | tel | Sí |
| email | email | No |
| priorityOrder | number | Auto (1-based) |
| notifySms | boolean | No (default false) |
| notifyEmail | boolean | No (default true) |
| notifyWhatsapp | boolean | No (default false) |

### Acciones disponibles
- **Añadir:** formulario modal con nombre, parentesco, teléfono, email
- **Eliminar:** con confirmación, DELETE al endpoint
- **Editar vínculo:** PATCH con datos actualizados
- Límite: **máximo 3 contactos por perfil** (validado en frontend y backend)

### Relación con perfil
- Los contactos se almacenan en tabla `Contact` (global) y se vinculan mediante `ProfileContact`
- Un contacto puede estar vinculado a múltiples perfiles (sistema de pool)
- Al eliminar se borra el registro `Contact` completo (no solo el vínculo)

### Reglas de visibilidad pública
- Los contactos NO se muestran en la ficha pública del chip
- Se usan para notificaciones de escaneo (SMS/Email/WhatsApp)

---

## 5. Mis Dispositivos

**Archivo página:** `app/(app)/dashboard/chips/page.tsx` (472 líneas)  
**Endpoint dashboard:** `app/api/chips/dashboard/route.ts`  
**Endpoint activación:** `app/api/chips/activate/route.ts`

### Qué chips muestra
- Chips personales (filtrados: excluye chips corporativos)
- Excluye chips con `profileType === "corporate"` o con `corporateOrderItems.length > 0`
- Datos: id, serialPublic, shortCode, status, activatedAt, serviceStatus, serviceEndDate, lastScanAt

### Estados posibles de chip
| Estado | Descripción | Acciones disponibles |
|---|---|---|
| activated | Chip activo | Suspender, asignar perfil |
| suspended | Chip suspendido | Reactivar |
| inventory | En inventario | Reactivar (recupera propiedad) |

### Campos de cada chip en UI
- Serial público (ej: PRP-XXXX-XXXX)
- Código corto (shortCode)
- Estado (Activo/Suspendido)
- Service status (limited → badge "Solo Lectura")
- Conteo de escaneos
- Fecha de expiración
- Perfil asignado (selector desplegable)
- Accesorios vinculados (orderItems)
- Botones: Ver Perfil Público, Suspender/Reactivar

### Botones y enlaces
- **Ver Perfil:** abre `/e/{shortCode}` en nueva pestaña
- **Suspender/Reactivar:** PATCH a `/api/chips/dashboard` con action
- **Vincular perfil:** select con profiles del usuario
- **Activar nuevo:** tab "Activar Nuevo" con formulario de código

### Activación de chip (tab "Activar Nuevo")
- Código de 12 dígitos formato XXXX-XXXX-XXXX
- Selector de perfil (si hay múltiples)
- POST a `/api/chips/activate`
- Validaciones:
  - Token no usado
  - Token no expirado
  - Chip en estado activable
  - Perfil médico completo
  - Cuenta no expirada
  - Límite de chips no excedido
- Flujo corporativo vs normal (detectado internamente)
- Auto-confirma delivery de orden si aplica

### Relación con perfil
- Un chip se asigna a un perfil mediante `assignedProfileId`
- La activación requiere perfil completo (firstName, lastName, bloodType)
- Se puede reasignar entre perfiles

### Escaneos
- `_count.scanEvents` en cada chip
- `ScanMonitor` componente global que pollea scans cada 10s y muestra toast de alerta

### Accesorios vinculados
- Se muestran los `orderItems` del chip con producto, cantidad, precio, estado del pedido
- Si no hay accesorios: "Aún no tienes accesorios vinculados a este chip."

### Lo que NO muestra todavía
- Chip alias personalizable (aunque existe en BD)
- Historial de cambios de estado
- Métricas de uso por período
- Asignación directa desde el dashboard (solo desde perfiles o chips)
- Chips corporativos (excluidos del listado)

---

## 6. Tienda / Accesorios / Compras

### Compras (Combos)

**Archivo:** `app/(app)/dashboard/compras/page.tsx` (366 líneas)  
**Endpoint:** `app/api/orders/manual/route.ts`

**Productos:**
- Combos de chips obtenidos de `GET /api/public/packages`
- Cada combo tiene: id, name, price, maxChips

**Checkout:**
- Formulario con: nombre, email, teléfono, dirección, ciudad, notas, método de pago (Yappy/Transferencia)
- Método de pago: Yappy (default) o bank_transfer
- Total calculado del combo seleccionado
- POST a `/api/orders/manual`

**Payload que envía:**
```json
{
  "packageId": "...",
  "customerName": "...",
  "customerEmail": "...",
  "customerPhone": "...",
  "shippingAddress": "...",
  "shippingCity": "...",
  "shippingNotes": "...",
  "paymentMethod": "yappy|bank_transfer"
}
```

**Mobile vs Desktop:**
- Mobile: combos primero, luego formulario (colapsable)
- Desktop: formulario a la izquierda, combos a la derecha

### Accesorios (Tienda)

**Archivo:** `app/(app)/dashboard/tienda/page.tsx` (847 líneas)  
**Endpoint:** `app/api/orders/route.ts` (POST)

**Productos:**
- Obtenidos de `GET /api/products`
- Tipos: sticker, llavero, tarjeta, brazalete, combo
- Cada producto: id, name, description, price, category, stock, image, productType, estimatedProductionTime, requiresPersonalization

**Checkout:**
- Productos en grid con imagen (proxy `/api/image-proxy`), nombre, precio, tiempo de producción
- Si `requiresPersonalization`: selector de perfil médico obligatorio
- Advertencia si perfil no tiene chip: confirmación "¿Deseas continuar?"
- Formulario de envío: dirección, ciudad, notas
- Total del producto
- Método de pago: Yappy Manual (fijo, no seleccionable)
- POST a `/api/orders`

**Comprobante de pago:**
- Después de crear orden: modal de éxito con información de pago
- QR Yappy + datos bancarios (de `GET /api/public/config`)
- Upload de comprobante: POST a `/api/upload` + POST a `/api/orders/[id]/payment-proof`
- Máx 5MB, formatos JPG/PNG/WebP
- Alternativa: "subir después desde Mis Pedidos"

**Mobile vs Desktop:**
- Mobile: checkout inline, success inline
- Desktop: checkout modal, success modal

**Advertencias:**
- Perfil sin chip: confirmación antes de continuar
- Sin perfiles: mensaje "No tienes perfiles médicos configurados"
- Stock agotado: "Suministros agotados temporalmente"

---

## 7. Mis Pedidos

**Archivo:** `app/(app)/dashboard/pedidos/page.tsx` (433 líneas)  
**Endpoint GET:** `app/api/orders/route.ts`  
**Endpoint payment-proof:** `app/api/orders/[id]/payment-proof/route.ts`  
**Componentes:**
- `app/(app)/dashboard/pedidos/_components/OrderStatusBadge.tsx`
- `app/(app)/dashboard/pedidos/_components/RejectionReasonBox.tsx`
- `app/(app)/dashboard/pedidos/_components/PaymentInstructions.tsx`
- `app/(app)/dashboard/pedidos/_components/PaymentProofForm.tsx`

### Estados de pedido
| orderStatus | Descripción |
|---|---|
| pending | Pendiente |
| processing | En proceso |
| shipped | Enviado |
| completed | Completado |
| cancelled | Cancelado |

### Estados de pago
| paymentStatus | Descripción |
|---|---|
| pending | Pendiente de pago |
| under_review | Comprobante en revisión |
| paid | Pagado |
| rejected | Rechazado |

### Estados de revisión admin
| adminReviewStatus | Descripción |
|---|---|
| pending | Pendiente de revisión admin |
| approved | Aprobado por admin |
| rejected | Rechazado por admin |

### Botones y acciones disponibles
- **Copiar número de pedido:** clipboard
- **Subir comprobante:** file upload (máx 5MB)
- **Enviar referencia Yappy:** input + submit
- **Cancelar pedido:** PATCH a `/api/orders/[id]` (solo si `canCustomerCancelManual`)
- **Ver comprobante:** link al archivo subido
- **Activar chip:** desde tokens de activación (chipClaimTokens)

### Comprobantes
- Upload directo desde la UI de pedidos
- Input de referencia de pago manual
- Ambos se envían a `POST /api/orders/[id]/payment-proof`
- Actualizan `paymentStatus → under_review`, `orderStatus → processing`, `adminReviewStatus → pending`

### Accesorios personalizados
- Cada item del pedido puede tener perfil asociado y chip asociado
- Muestra: producto, cantidad, precio, perfil personalizado, QR asignado
- Si el perfil no tiene chip: "Este accesorio aún no tiene chip/QR asociado."

### Tokens de activación
- Cuando el pedido está "shipped" o "completed" y tiene `chipClaimTokens`
- Muestra cada token con serialPublic
- Instrucción: "Activar con código físico"

### Lo que puede hacer el cliente
- Ver todos sus pedidos
- Subir comprobante de pago
- Enviar referencia de pago
- Cancelar pedido (si aplica)
- Copiar link del QR
- Ver tokens de activación

### Lo que queda solo para admin
- Aprobar/rechazar comprobantes
- Cambiar estado de pedido (shipped, completed)
- Asignar chips a pedidos
- Aprobar/rechazar pagos
- Actualizar fulfillment de accesorios

---

## 8. Empresa / Corporativo

**Archivo:** `app/(app)/dashboard/empresas/page.tsx` (2629 líneas, archivo más grande del panel cliente)  
**Endpoint my-status:** `app/api/organizations/my-status/route.ts`  
**Endpoint members:** `app/api/organizations/members/route.ts`  
**Endpoint join-request:** `app/api/organizations/join-request/route.ts`  
**Endpoint public-profile:** `app/api/organizations/public-profile/route.ts`  
**Endpoint corporate-orders:** `app/api/organizations/corporate-orders/route.ts`  
**Endpoint product-requests:** `app/api/organizations/product-requests/route.ts`

### Vista empleado (no admin empresa)

**Ingresar código empresarial:**
- Formulario con: companyCode, firstName, lastName, employeeNationalId, employeeAge, employeePhone, employeePosition, employeeDepartment, employeeInternalId, employeeNote
- POST a `/api/organizations/join-request`
- Validación: código existe, no duplicado

**Estado de solicitud (status card):**
| corporateStatus | Descripción |
|---|---|
| pending_company_review | Solicitud enviada — empresa revisa |
| approved_unpaid | Aprobada — pendiente de pago corporativo |
| rejected_by_company | Rechazada por empresa |
| paid_active | Vinculación activa |
| suspended | Suspendida |
| archived | Archivada |

**Perfil médico empresarial:**
- Sección expandible con datos del perfil corporativo
- Botón "Editar Perfil Empresarial" → formulario MedicalProfileForm
- Contactos de emergencia corporativos (máx 3)
- Chip corporativo asignado
- Productos corporativos vinculados

**Productos empresariales (solicitudes):**
- Catálogo de productos activos de la empresa
- Selector con cantidad y nota opcional
- POST a `/api/organizations/product-requests`
- Estados: pending_company_approval, approved_pending_payment, rejected_by_company, payment_under_review, paid_approved, cancelled
- Mis solicitudes: listado con fecha, items, total, estado

**Activar chip corporativo:**
- Si el empleado tiene chip asignado no activado
- Input de código de activación + botón "Activar chip"
- POST a `/api/chips/activate` (detecta flujo corporativo internamente)

### Vista admin empresa

**Tabs de gestión:**
1. Solicitudes de productos (product-requests)
2. Aprobados sin pagar (approved_unpaid)
3. Pagos enviados
4. Pagados / activos (paid_active)
5. Rechazados (rejected_by_company)
6. Archivados (archived)
7. Suspendidos (suspended)

**Solicitudes de productos (admin empresa):**
- Revisar solicitudes de colaboradores
- Aprobar o rechazar con motivo opcional
- Solicitudes aprobadas quedan pendientes de pago

**Pagos corporativos:**
- Seleccionar solicitudes aprobadas para crear orden corporativa
- Subir comprobante de pago
- POST a `/api/organizations/corporate-orders/from-requests`
- Cancelar órdenes corporativas

**Perfil público de empresa:**
- CRUD de perfil público (CorporatePublicProfile)
- Campos: displayName, legalName, ruc, industry, description, slogan, phone, whatsapp, email, website, address, mainServices, mainProducts, securityContactName, securityPhone, emergencyProcedure, customEmployeeMessage
- Toggles de visibilidad para cada campo
- POST/PATCH a `/api/organizations/public-profile`

### Diferencias con perfil personal

| Aspecto | Perfil personal | Perfil empresarial |
|---|---|---|
| Creado por | Usuario auto-registro | Admin empresa asigna |
| Tipo | profileType personal/family | profileType corporate |
| Editable por | Usuario dueño | Usuario empleado (si paid_active) |
| Chip asignable | Cualquier chip personal | Chip corporativo exclusivo |
| Eliminable | Sí (propio no) | No desde perfiles médicos |
| Contactos | Hasta 3 por perfil | Hasta 3 por perfil corporativo |
| Productos | Compra directa | Solicitud a empresa |

---

## 9. Configuración

**Archivo:** `app/(app)/dashboard/configuracion/page.tsx` (516 líneas)  
**Endpoint:** `GET/PATCH /api/users/profile`

### Campos editables
| Campo | Tipo | Notas |
|---|---|---|
| firstName | text | Editable |
| lastName | text | Editable |
| nationalId | text | Editable |
| phone | tel | Editable |
| address | text | Editable |
| city | text | Editable |
| photoUrl | file upload | Subida a `/api/upload` |

### Campos NO editables (solo lectura)
| Campo | Tipo | Notas |
|---|---|---|
| email | text | Read-only, "Email de Acceso" |
| universalId | text | Read-only, "USR-{userId[:8]}" |

### Secciones
1. **Perfil de Cuenta** — foto, identidad, cédula, teléfono, dirección
2. **Seguridad & Acceso** — restablecer contraseña (link a `/forgot-password`), gestión de sesiones (próximamente)
3. **Notificaciones de Emergencia** — SMS, Email, sonido (todos disabled, "Próximamente")
4. **Suscripción & Plan** — estado del plan, fechas, botón "Gestionar / Mejorar Plan"
5. **Zona Crítica** — eliminar cuenta con confirmación en dos pasos

### Botones
- **Guardar Cambios:** PATCH a `/api/users/profile`
- **Restablecer contraseña:** link externo
- **Eliminar Cuenta Permanentemente:** prompt + password + POST a `/api/users/account/delete`

### Seguridad actual
- No hay 2FA
- No hay gestión de sesiones activas
- Contraseña se cambia externamente (forgot-password)
- Eliminación de cuenta requiere password actual

---

## 10. Flujos completos del cliente

### A. Usuario nuevo sin chip
1. Se registra → redirigido a `/dashboard`
2. Dashboard muestra banner "Bienvenido a PreRescue ID" con link a `/comprar`
3. Estado `isInactive = true`
4. Sin perfiles, sin chips, sin pedidos

### B. Usuario compra chip/combo
1. Va a `/dashboard/compras`
2. Selecciona combo → llena datos → POST a `/api/orders/manual`
3. Orden creada con `orderStatus: pending`, `paymentStatus: pending`
4. Redirigido a `/dashboard/pedidos`

### C. Usuario sube comprobante
1. En `/dashboard/pedidos` ve orden "Pendiente"
2. Sube archivo de comprobante → POST a `/api/upload` + POST a `/api/orders/[id]/payment-proof`
3. Orden pasa a `paymentStatus: under_review`, `adminReviewStatus: pending`, `orderStatus: processing`

### D. Admin aprueba
1. Admin ve orden en panel admin
2. Admin aprueba pago → `paymentStatus: paid`
3. Sistema procesa fulfillment → crea chipClaimToken
4. Orden → `orderStatus: completed`

### E. Usuario activa chip
1. En `/dashboard/chips` tab "Activar Nuevo"
2. Ingresa código de activación (XXXX-XXXX-XXXX) → POST a `/api/chips/activate`
3. Chip pasa a `status: activated`, se asigna a perfil
4. Aparece en "Mis Dispositivos"

### F. Usuario llena perfil médico
1. Va a `/dashboard/perfiles-medicos`
2. Crea perfil con datos mínimos (nombre, apellido, sangre) o completos
3. POST/PATCH a `/api/users/perfiles-medicos`
4. Perfil aparece en dashboard como "Completo"

### G. Usuario compra accesorio personalizado
1. Va a `/dashboard/tienda`
2. Selecciona producto con `requiresPersonalization: true`
3. Selecciona perfil (debe tener nombre, apellido, sangre)
4. Advertencia si perfil no tiene chip
5. Llena dirección → POST a `/api/orders`
6. Orden creada con profileId y chipId (si existe)

### H. Usuario ve accesorio en Mis Pedidos
1. En `/dashboard/pedidos` ve item con perfil personalizado
2. Muestra QR asignado si el chip ya está asignado
3. Si no: "Este accesorio aún no tiene chip/QR asociado"

### I. Usuario ve accesorio en Mis Dispositivos
1. En `/dashboard/chips` cada chip muestra sus `orderItems` (accesorios vinculados)
2. Muestra producto, cantidad, precio, estado del pedido

### J. Usuario se vincula a empresa
1. Va a `/dashboard/empresas`
2. Ingresa código empresarial → POST a `/api/organizations/join-request`
3. Estado: `pending_company_review`
4. Admin empresa aprueba → `approved_unpaid`
5. Admin empresa procesa pago corporativo → `paid_active`
6. Usuario ve perfil empresarial, puede editarlo

### K. Usuario edita perfil empresarial
1. En `/dashboard/empresas` (vista empleado)
2. Botón "Editar Perfil Empresarial"
3. Formulario MedicalProfileForm con datos del perfil corporativo
4. PATCH a `/api/users/perfiles-medicos/[corpProfileId]`

### L. Usuario solicita productos empresariales
1. En `/dashboard/empresas` (vista empleado, paid_active)
2. Botón "Solicitar productos"
3. Selecciona productos del catálogo con cantidad
4. POST a `/api/organizations/product-requests`
5. Admin empresa aprueba/rechaza
6. Si aprueba: `approved_pending_payment` → admin procesa pago

---

## 11. Estados vacíos y errores

### Dashboard
- **Sin perfiles:** banner de bienvenida + link a comprar
- **Sin chips:** "No tienes dispositivos" + botón "Activar Sticker Ahora"
- **Sin pedidos:** "No tienes órdenes activas"
- **Sin empresa:** formulario de código empresarial
- **Error de carga:** mensaje + reintentar + soporte

### Perfiles Médicos
- **Sin perfiles:** "Sin Configuración Médica" con icono
- **Sin contactos:** slots vacíos con botón "Añadir Guardián"
- **Error carga:** toast "Error al cargar los perfiles médicos"
- **Error guardar:** mensaje inline rojo

### Chips
- **Sin chips:** "No tienes dispositivos" + botón activar
- **Sin accesorios:** "Aún no tienes accesorios vinculados"
- **Error activación:** mensaje inline en formulario

### Tienda
- **Sin productos:** "Suministros agotados temporalmente"
- **Sin perfiles:** "No tienes perfiles médicos configurados"
- **Sin chip en perfil:** confirmación antes de continuar
- **Error carga:** toast + spinner

### Pedidos
- **Sin pedidos:** "No tienes órdenes activas"
- **Pago rechazado:** RejectionReasonBox con notas del admin
- **Error upload:** toast "Error al subir el comprobante"

### Empresa
- **Sin empresa:** formulario de código
- **Sin productos catálogo:** "No hay productos disponibles"
- **Sin solicitudes:** "Todavía no has solicitado productos"
- **Sin miembros:** "No hay colaboradores en esta pestaña"
- **Error join:** "El código empresarial ingresado no existe"

### Configuración
- **Loading:** spinner + "Cargando Ajustes..."
- **Error guardar:** toast con mensaje
- **Eliminar cuenta:** confirmación en dos pasos

### General
- **Sesión inválida:** middleware redirige a `/login`
- **Admin accediendo:** error 403 "Panel de administrador"
- **Error 401:** redirect a login
- **Error 500:** mensaje genérico + opción reintentar

---

## 12. Interconexión con Admin

Para cada cosa que el cliente hace, el admin debe ver/controlar:

| Cliente hace | Admin ve/controla |
|---|---|
| Crea perfil médico | Ver perfiles de usuarios |
| Edita perfil médico | Ver datos médicos (cifrados) |
| Crea orden de compra | Ver pedidos, tracking |
| Sube comprobante | Revisar comprobante, aprobar/rechazar pago |
| Paga con Yappy | Verificar pago |
| Activa chip | Ver chips activados, estado |
| Suspende chip | Ver chips suspendidos |
| Solicita vinculación empresa | Aprobar/rechazar solicitud |
| Solicita producto corporativo | Aprobar/rechazar solicitud |
| Edita perfil empresarial | Ver perfil corporativo |
| Sube foto de perfil | Ver foto en perfil |
| Elimina cuenta | No controla (automatizado) |
| Compra accesorio personalizado | Ver items, fulfillment, asignar QR |
| Ve escaneos | Ver escaneos globales |
| Recibe notificación escaneo | Ver notificaciones enviadas |

### Lo que requiere acción admin
1. **Órdenes manuales:** revisar comprobante → aprobar/rechazar pago → cambiar estado
2. **Activación de chips:** no requiere admin (automatizado con token)
3. **Vinculación empresa:** aprobar/rechazar solicitudes de empleados
4. **Solicitudes corporativas:** aprobar/rechazar productos solicitados
5. **Órdenes corporativas:** revisar comprobante de pago corporativo
6. **Fulfillment de accesorios:** asignar chips/QR a accesorios personalizados
7. **Perfil público empresa:** gestionado por admin empresa, no por superadmin

---

## 13. Problemas encontrados (verificados)

### P0 — Crítico (reales)

| # | Problema | Archivo | Descripción | Estado |
|---|---|---|---|---|
| 1 | **Empresas page.tsx es monolítica (2629 líneas)** | `empresas/page.tsx` | Un solo archivo contiene toda la lógica de empleado y admin empresa. Mezcla vistas, estados, formularios, lógica de negocios. Extremadamente difícil de mantener y testear. | ⚠️ REAL |
| 2 | **Rate limiting ausente en chips/activate** | `app/api/chips/activate/route.ts` | No importa ni usa `rateLimit`. No hay control de frecuencia en activaciones. Riesgo de fuerza bruta sobre códigos de activación. | ⚠️ REAL |
| 3 | **Rate limiting ausente en orders/route.ts** | `app/api/orders/route.ts` | POST no tiene rate limiting. Un atacante podría crear cientos de órdenes. | ⚠️ REAL |

### P0 — Falso positivo (mitigado/incorrecto)

| # | Problema original | Archivo | Resultado |
|---|---|---|---|
| ~~2~~ | **Datos médicos viajan por GET sin protección adicional** | `perfiles-medicos/[profileId]/route.ts` | ✅ **FALSO POSITIVO**. `getAuthorizedProfile()` verifica `accountId` correctamente: busca el `accountId` del usuario y luego solo devuelve el perfil si pertenece a esa misma cuenta. La protección es correcta. |
| ~~3~~ | **No hay rate limiting en join-request** | `organizations/join-request/route.ts` | ✅ **FALSO POSITIVO**. El endpoint SÍ tiene rate limiting: `rateLimit("join-request", session.user.id, { limit: 5, windowMs: 60_000 })`. 5 solicitudes por minuto por usuario. |

### P1 — Importante (reales)

| # | Problema | Archivo | Descripción | Estado |
|---|---|---|---|---|
| 4 | **Chips corporativos ocultos del dashboard** | `chips/dashboard/route.ts` | El filtro excluye chips corporativos. No hay enlace cruzado desde chips a empresas. | ⚠️ REAL |
| 5 | **Sin perfiles = sin acceso a tienda** | `tienda/page.tsx` | El mensaje de error no ofrece crear perfil directamente desde la tienda. | ⚠️ REAL |
| 6 | **No hay cache busting consistente** | Varios | Algunas llamadas usan `_t=${Date.now()}`, otras no. | ⚠️ REAL |
| 7 | **Wizard mode CSS hack frágil** | `MedicalProfileForm.tsx` | Usa selector CSS con `!important` para ocultar botones del padre. | ⚠️ REAL |
| 8 | **Los contactos se eliminan permanentemente (con matices)** | `contacts/route.ts` | El DELETE en línea 240 hace `prisma.contact.delete()` que borra el registro `Contact` completo, no solo el vínculo `ProfileContact`. Sin embargo, la UI actual solo permite crear contactos individuales por perfil, por lo que en la práctica es improbable que un contacto esté compartido. El código podría mejorarse eliminando solo el `ProfileContact` en lugar del `Contact`. | ⚠️ REAL (bajo impacto práctico) |
| 9 | **No hay confirmación al cancelar pedido (partial)** | `pedidos/page.tsx` | `handleCancel` tiene confirmación simple pero no valida si el pedido ya tiene chips asignados. | ⚠️ REAL |
| 10 | **No hay manejo de error en upload de foto** | `dashboard/page.tsx` | El `ProfileCard` usa `alert()` para errores, no toast consistente. | ⚠️ REAL |

### P2 — Mejora

| # | Problema | Archivo | Descripción |
|---|---|---|---|
| 11 | **Dashboard no usa setupChecklist** | `dashboard/page.tsx` | `state.setupChecklist` se define pero no se renderiza. Hay componente `SetupItem` sin usar. |
| 12 | **Campana de notificaciones solo refresca** | `dashboard/page.tsx` | No abre un panel de notificaciones, solo dispara refresh. |
| 13 | **Sin feedback de carga en subida de comprobante** | `tienda/page.tsx` | No hay indicador de progreso durante upload. |
| 14 | **No hay paginación en pedidos** | `pedidos/page.tsx` | Si el usuario tiene muchos pedidos, se cargan todos. |
| 15 | **No hay paginación en escaneos** | `historial/page.tsx` | Similar, todos los escaneos se cargan sin límite. |
| 16 | **No hay búsqueda en pedidos** | `pedidos/page.tsx` | No hay filtro por estado, fecha o número. |
| 17 | **No hay skeleton loaders** | Todos | Todos los estados de carga son spinners genéricos. |
| 18 | **No hay test unitarios visibles** | — | No se encontraron tests para componentes del panel cliente. |
| 19 | **Empresa page mezcla responsabilidades** | `empresas/page.tsx` | Vista empleado y admin empresa en el mismo archivo con condicional `isCorporateAccount`. |
| 20 | **MedicalProfileForm tiene lógica de submit** | `MedicalProfileForm.tsx` | El wizard usa `form.requestSubmit()` para disparar submit del padre, lo que es frágil. |

### P3 — Limpieza

| # | Problema | Archivo | Descripción |
|---|---|---|---|
| 21 | **CSS hack con `!important`** | `MedicalProfileForm.tsx` | Línea 264: `display: none !important` |
| 22 | **Código comentado "Stats removed"** | `dashboard/page.tsx` | Línea 411: comentario sin código. |
| 23 | **Imports no usados** | Varios | Varios archivos importan íconos que no se usan (ej: `School`, `LayoutDashboard` en `dashboard/page.tsx`). |
| 24 | **console.log(product) en perfil médico** | Backend | Posible fuga de datos en producción. |
| 25 | **`any` types dispersos** | `empresas/page.tsx` | Múltiples `useState<any>` y casts a `any`. |
| 26 | **PaymentInstructions y otros componentes no auditados** | `pedidos/_components/` | No se revisaron los subcomponentes. |

---

## 14. Recomendación final

### Estado del panel cliente: **Listo con pendientes menores**

El panel cliente está funcionalmente completo y cubre todos los flujos core:
- Registro y autenticación
- Gestión de perfiles médicos con cifrado
- Contactos de emergencia
- Activación y gestión de chips
- Compra de combos y accesorios
- Historial de escaneos con alertas en tiempo real
- Vinculación empresarial completa
- Configuración de cuenta

### Lo que debe resolverse antes de cerrar esta etapa

1. **Refactor urgente:** Dividir `empresas/page.tsx` (2629 líneas) en componentes más pequeños (P0 real)
2. **Rate limiting en chips/activate** y **orders** (P0 real — 2 endpoints sin protección)
3. **Validar que el DELETE de contactos no rompa vínculos compartidos** — mejora recomendada, aunque el impacto real es bajo porque la UI actual crea contactos individuales (P1)
4. **Agregar link para crear perfil desde la tienda** cuando no hay perfiles (P1)
5. ~~Revisar protecciones de datos cifrados~~ → **FALSO POSITIVO**: `getAuthorizedProfile()` valida accountId correctamente
6. ~~Rate limiting en join-request~~ → **FALSO POSITIVO**: ya implementado (5 req/min)

### Lo que puede esperar (mejoras post-cierre)
- Skeleton loaders en lugar de spinners
- Paginación en pedidos y escaneos
- Tests unitarios para componentes core
- Panel de notificaciones en lugar de solo badge
- Cache busting consistente
- Refactor del wizard de MedicalProfileForm

### Recomendación para el panel admin
Basado en lo que el cliente hace, el admin necesita controlar:

| Sección admin | Basado en cliente |
|---|---|
| **Usuarios** | Ver todos los usuarios, perfiles, chips |
| **Órdenes** | Listar todas, revisar comprobantes, aprobar/rechazar pagos, cambiar estados |
| **Chips** | Ver todos los chips, asignar, transferir, revocar |
| **Perfiles médicos** | Ver datos médicos (con autorización), gestionar emergencias |
| **Empresas** | Gestionar organizaciones, aprobar solicitudes, ver colaboradores |
| **Productos** | Gestionar catálogo, precios, stock |
| **Pagos** | Ver historial, comprobantes, estados |
| **Notificaciones** | Ver log de notificaciones enviadas |
| **Escaneos** | Ver todos los escaneos con geolocalización |
| **Reportes** | Métricas de uso, activaciones, pedidos |

---

*Fin del informe de auditoría.*  
*Documentación generada el 6 de junio de 2026. Verificación de hallazgos completada el mismo día.*
