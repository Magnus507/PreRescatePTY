# Auditoría — Rediseño de flujos PreRescue

> **Documento:** Auditoría Maestra de Rediseño de Flujos
> **Fecha:** 6 de octubre 2026
> **Propósito:** Auditar el sistema actual, detectar huecos, proponer flujos nuevos y planificar implementación por fases
> **Estado:** ⚠️ NO implementar — solo análisis y diseño funcional

---

## 1. Resumen Ejecutivo

El sistema PreRescue ha evolucionado desde un modelo simple (chip → activación → perfil) hacia una plataforma multifacética que incluye perfiles médicos detallados, fichas públicas de emergencia, activación por código, flujo corporativo completo y venta retail. Sin embargo, el crecimiento orgánico ha dejado:

- **Campos faltantes** en el esquema Prisma (Alzheimer, comunicación asistida, vulnerabilidad)
- **Código legado visible** en Admin (métodos de asignación manual que ya no aplican)
- **WhatsApp sin ubicación real** en el mensaje de emergencia
- **Sin soporte retail** (venta física sin pedido online)
- **Lógica de accesorios** sin validación estricta de chip activo
- **Flujo corporativo** con pasos redundantes en Admin

### Archivos revisados en esta auditoría

| Archivo | Estado |
|---------|--------|
| `prisma/schema.prisma` | ✅ Revisado |
| `components/forms/MedicalProfileForm.tsx` | ✅ Revisado |
| `app/(app)/dashboard/perfiles-medicos/page.tsx` | ✅ Revisado |
| `app/(public)/e/[shortCode]/page.tsx` | ✅ Revisado |
| `app/api/public/[shortCode]/scan/route.ts` | ✅ Revisado |
| `app/api/chips/activate/route.ts` | ✅ Revisado |
| `domains/orders/services/order-fulfillment.service.ts` | ✅ Revisado |
| `app/api/admin/orders/[id]/approve/route.ts` | ✅ Revisado |
| `app/(admin)/admin/_components/sections/PedidosSection.tsx` | ✅ Revisado |
| `app/(admin)/admin/_components/sections/InventorySection.tsx` | ⬜ Pendiente |
| `app/(admin)/admin/_components/sections/CreateBatchSection.tsx` | ⬜ Pendiente |
| `app/(admin)/admin/_components/details/OrgDetail.tsx` | ⬜ Pendiente |

---

## 2. Perfil Médico v2

### A) Lo que ya existe

El modelo `Profile` en Prisma actualmente soporta:
- firstName, lastName, displayNamePublic, birthDate, sex
- bloodType (obligatorio), allergies, chronicConditions, medications
- additionalNotes
- isInsured, insuranceProvider, insurancePolicyNumber, preferredHospital, insuranceEmergencyPhone
- primaryDoctorName, primaryDoctorPhone
- 5 toggles de privacidad:
  - `showInsuranceProviderPublic`
  - `showPreferredHospitalPublic`
  - `showPrimaryDoctorPublic`
  - `showPrimaryDoctorPhonePublic`
  - `showAdditionalNotesPublic`
- phone, nationalId
- profileType: "personal" | "family" | "corporate"
- photoUrl, address, city

El formulario `MedicalProfileForm.tsx` implementa wizard mobile + grid desktop con 4 pasos:
1. Identidad (nombre, apellido, alias, teléfono, cédula, sexo, fecha nacimiento)
2. Alerta médica (tipo sangre, alergias, condiciones, medicamentos)
3. Seguro y médico (seguro toggle + condicional, médico tratante, notas adicionales)
4. Privacidad (5 toggles de visibilidad pública)

### B) Lo que NO existe (requiere migración + UI)

| Campo faltante | Tipo propuesto | Justificación |
|---|---|---|
| `hasAlzheimer` o `cognitiveImpairment` | `Boolean @default(false)` | Deterioro cognitivo / Alzheimer |
| `isVulnerable` | `Boolean @default(false)` | Persona vulnerable general |
| `wanderingRisk` | `Boolean @default(false)` | Riesgo de desorientación o extravío |
| `isMinor` | `Boolean @default(false)` | Menor de edad (separado de edad calculada) |
| `isNonVerbal` | `Boolean @default(false)` | Persona no verbal |
| `communicationAssistance` | `String?` | Tipo de comunicación asistida (lenguaje de señas, pictogramas, dispositivo) |
| `emergencyContactInstructions` | `String?` | Instrucciones específicas para el contacto en emergencia |

### C) Campos condicionales requeridos

- Si `isNonVerbal = true` → mostrar `communicationAssistance` como obligatorio
- Si `isVulnerable = true` → mostrar selector de tipo de vulnerabilidad
- Si `hasAlzheimer = true` o `wanderingRisk = true` → mostrar badge prioritario en ficha pública

### D) Toggles de privacidad adicionales

Se requieren 3 toggles extra en el paso 4 (Privacidad):

| Nuevo toggle | Campo en Profile |
|---|---|
| Mostrar condición de vulnerabilidad | `showVulnerabilityStatusPublic` |
| Mostrar estado de comunicación asistida | `showCommunicationStatusPublic` |
| Mostrar instrucciones de emergencia (ya existe como `showAdditionalNotesPublic`) | — |

### E) Lo que requiere migración Prisma

```prisma
// Nuevos campos a agregar al modelo Profile
cognitiveImpairment          Boolean  @default(false)
isVulnerable                 Boolean  @default(false)
wanderingRisk                Boolean  @default(false)
isMinor                      Boolean  @default(false)
isNonVerbal                  Boolean  @default(false)
communicationAssistance      String?
emergencyContactInstructions String?
showVulnerabilityStatusPublic    Boolean @default(false)
showCommunicationStatusPublic    Boolean @default(false)
```

### F) UI — Nuevos badges en ficha pública

En `app/(public)/e/[shortCode]/page.tsx` se deben agregar:

- **Badge "Persona vulnerable"** (rojo/anaranjado, junto al nombre)
- **Badge "Menor de edad"** (amarillo, si `isMinor = true`)
- **Badge "No verbal / Comunicación asistida"** (azul, si `isNonVerbal = true`)
- **Badge "Riesgo de extravío"** (púrpura, si `wanderingRisk = true`)

---

## 3. Ficha Pública v2

### A) Lo que ya existe en `/e/[shortCode]`

La ficha pública actual (`app/(public)/e/[shortCode]/page.tsx`) muestra:

**Pantalla de entrada:**
- Pregunta si el usuario es paramédico o ciudadano
- Si el chip no está activado: pantalla "Chip aún no activado" con link a `/activar`

**Vista Ciudadano:**
- Nombre completo + alias público
- Tipo de sangre, edad, sexo
- Botón "Llamar al 911" (grande, rojo, fijo)
- Protocolo ciudadano (instrucciones de seguridad)
- Contactos de emergencia (con botones Llamar y WhatsApp)
- Información médica adicional (si el usuario la activó): aseguradora, hospital preferido, médico

**Vista Paramédico:**
- Misma info de identidad
- Alergias, condiciones, medicamentos (en tarjetas de colores)
- Contactos de emergencia (con botones Llamar y WhatsApp)
- Información médica adicional (seguro, hospital, médico, notas)

**Lo que NO aparece actualmente:**
- ❌ Badge "Persona vulnerable"
- ❌ Badge "Menor de edad"
- ❌ Badge "Riesgo de desorientación"
- ❌ Badge "No verbal / comunicación asistida"
- ❌ Botón "Retorno seguro" (Safe Return)
- ❌ Sección de ubicación del scan (solo se captura pero no se muestra)

### B) Riesgos de privacidad identificados

1. **Edad calculada**: se muestra edad exacta. Riesgo si es menor de edad. Debería mostrar "Menor de edad" en lugar de la edad exacta si `isMinor = true`.
2. **Sexo mostrado siempre**: incluso para ciudadanos. Considerar toggle de privacidad.
3. **Foto de perfil**: se muestra sin verificación de permisos adicionales.
4. **Alias público**: puede exponer información personal si el usuario pone su nombre real.
5. **Contactos visibles para ciudadanos**: cualquier persona que escanee el chip puede ver los contactos. Considerar si deberían ser solo para paramédicos.

### C) Flujo propuesto para la ficha pública v2

**Primer vistazo (ciudadano/paramédico) — badges visibles:**
```
[Persona vulnerable 🛡️] [Menor de edad 👶] [Riesgo extravío 🧭] [No verbal 🗣️]
```

**Sección "Retorno Seguro":**
- Botón grande: "Ayudar a esta persona a volver a casa"
- Solo visible si: `wanderingRisk = true` o `hasAlzheimer = true` o `cognitiveImpairment = true`
- Muestra: "Esta persona puede tener dificultades para orientarse. Si parece desorientada:"
  - Instrucciones paso a paso
  - Botón para llamar al contacto de emergencia
  - Botón para compartir ubicación con el contacto

**Sección visible solo si el usuario la activa:**
- Datos de seguro, médico, notas adicionales → controlados por toggles de privacidad existentes
- Nuevos datos (vulnerabilidad, comunicación) → controlados por nuevos toggles

### D) Lo que debe cambiar en `app/(public)/e/[shortCode]/page.tsx`

- [ ] Agregar badges condicionales en el header del perfil
- [ ] Agregar sección "Retorno Seguro" condicional
- [ ] Reemplazar edad exacta por "Menor de edad" cuando corresponda
- [ ] Agregar `publicMedicalExtras` → incluir campos nuevos
- [ ] Considerar ocultar contactos para vista ciudadano (solo paramédico)

---

## 4. WhatsApp con ubicación

### A) Mensaje actual generado

En `app/(public)/e/[shortCode]/page.tsx` (líneas 511-512):

```typescript
const locInfo = formatEmergencyLocation(scanLocation);
const whatsappMessage = locInfo.text
  ? `Hola ${contact.fullName}, ${personName} podría necesitar ayuda. Su ficha PreRescue ID fue escaneada recientemente.\n\n${locInfo.text}\n\nPor favor intenta contactarle o verifica si necesita asistencia.`
  : `Hola ${contact.fullName}, ${personName} podría necesitar ayuda. Su ficha PreRescue ID fue escaneada recientemente. Por favor intenta contactarle o verifica si necesita asistencia.`;
```

### B) Por qué NO aparece la ubicación

Rastreando el flujo:

1. **Captura GPS** (líneas 223-254 de la página pública):
   ```typescript
   navigator.geolocation.getCurrentPosition(
     (pos) => {
       const locationLabel = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
       setScanLocation(locationLabel);  // ← se guarda en estado local
       fetch(`/api/public/${shortCode}/scan`, {  // ← se envía al servidor
         body: JSON.stringify({ geoLat, geoLng, geoAccuracy }),
       });
     },
     () => { /* fallback sin ubicación */ },
     { timeout: 3000 }
   );
   ```

2. **Problema**: `setScanLocation(locationLabel)` se ejecuta ASYNC en el callback de geolocalización, que compite con el fetch del perfil. Pero el mensaje de WhatsApp se construye en el RENDER con `scanLocation`, que es el estado local.

   El problema real está en que `scanLocation` se inicializa vacío (`""`), y el callback de geolocalización lo actualiza DESPUÉS de que el perfil ya se cargó. El enlace de WhatsApp se genera al renderizar, con `scanLocation` vacío.

3. **El servidor SÍ guarda la ubicación** en `ScanEvent` (en `scan/route.ts` líneas 57-74 y 83-97):
   ```typescript
   // Guarda geoLat, geoLng
   // Luego en after(): hace reverse geocoding y actualiza el ScanEvent
   ```

4. **Problema de raíz**: El mensaje de WhatsApp se genera en cliente, antes de que el callback de geolocalización haya terminado. `formatEmergencyLocation(scanLocation)` recibe `""` la mayoría de las veces.

### C) Solución propuesta — Generar link en servidor

**Flujo actual (roto):**
1. Usuario escanea QR
2. Se dispara fetch de perfil + fetch de scan simultáneamente
3. Geolocalización se pide pero no se espera
4. El perfil se renderiza con `scanLocation = ""`
5. Los links de WhatsApp se generan sin ubicación

**Flujo propuesto:**
1. El scan guarda `geoLat`, `geoLng`, `address` en `ScanEvent`
2. El endpoint `api/public/[shortCode]` devuelve también la última ubicación conocida del chip (`lastScanLocation`)
3. O mejor: generar el mensaje de WhatsApp desde el servidor
4. Nuevo endpoint: `GET /api/public/[shortCode]/whatsapp-links`
   - Recibe `scanId`
   - Devuelve links pre-generados con ubicación + Google Maps
   - Incluye fallback si no hay ubicación

### D) Mensaje propuesto con Google Maps

```
🚨 ALERTA PRE-RESCUE
{personName} podría necesitar ayuda.
📍 Ubicación: {address or coordinates}
🗺️ Google Maps: https://maps.google.com/?q={lat},{lng}
🔗 Ficha pública: {publicProfileUrl}

Por favor intenta contactarle o verifica si necesita asistencia.

— PreRescue Panamá
```

### E) Fallback si no hay ubicación

```
🚨 ALERTA PRE-RESCUE
{personName} podría necesitar ayuda. 
Su ficha PreRescue ID fue escaneada recientemente pero no fue posible determinar la ubicación.

🔗 Ficha pública: {publicProfileUrl}
📱 Contacto del portador: {profilePhone (solo a paramédicos)}

Por favor intenta contactarle o verifica si necesita asistencia.

— PreRescue Panamá
```

### F) ScanEvent — datos actuales

El modelo `ScanEvent` ya incluye:
- `geoLat`, `geoLng`, `geoAccuracy`
- `country`, `city`, `address` (reverse geocoded en background)
- `emergencyMode` (siempre `true`)
- `notificationStatus` (actualmente `"disabled"`)

Lo que falta:
- ❌ `notificationStatus` está hardcodeado como `"disabled"`. Debería activarse cuando se genera un WhatsApp.
- ❌ No hay vínculo entre `ScanEvent` y las notificaciones realmente enviadas.

---

## 5. Venta física / retail

### A) Contexto actual

El sistema actual asume:
1. Cliente compra online → se crea `Order` con `provider: "manual"` y `orderType: "manual"`
2. Admin revisa comprobante de pago
3. Admin asigna chips del inventario
4. Cliente recibe código de activación y lo activa en `activar/`

### B) Escenario retail: Cliente compra en tienda

**Actores:**
- Cliente: compra presencialmente un paquete/sticker/chip
- Admin: vendedor en tienda
- Sistema: debe reflejar la venta sin pedido online, sin comprobante

**Lo que el sistema actual NO soporta:**
1. ❌ No hay orden sin comprobante de pago (el endpoint `POST /api/admin/orders/[id]/approve` espera `provider: "manual"`)
2. ❌ El picking requiere seleccionar chips físicos del inventario
3. ❌ El estado "chip vendido en tienda" no existe como flujo directo
4. ❌ No hay generación automática de código de activación para venta retail
5. ❌ Se asume que el cliente tiene cuenta y la crea después

### C) Flujo propuesto — Venta física

**Paso 1:** Admin registra venta en tienda
- Nuevo botón "Venta en tienda" en Admin > Pedidos
- Formulario: nombre, email/teléfono del cliente, paquete, monto recibido
- Sin comprobante (o foto opcional)
- Marca automáticamente pago como `paid`

**Paso 2:** Admin entrega chip físico
- Escanea o selecciona chip del inventario
- El chip se marca como `sold`
- Se genera `ChipClaimToken` con código de activación
- Se imprime o entrega el código al cliente

**Paso 3:** Cliente activa en casa
- Cliente crea/usa su cuenta
- Ingresa código de activación en `activar/`
- Chip se vincula automáticamente al usuario

### D) Estado correcto del chip en retail

Flujo propuesto de estados del chip:
```
inventory → sold (retail) → activated (cuando el cliente activa)
```

El estado `sold` indicaría "vendido en tienda, pendiente de activación".

### E) ¿El sistema actual lo soporta?

**Soporte parcial.** Actualmente:
- ✅ El chip puede pasar de `inventory` a `sold` a `activated`
- ✅ El `ChipClaimToken` ya existe
- ✅ La activación por código ya funciona
- ❌ No hay endpoint para "registrar venta retail sin pedido online"
- ❌ No hay forma de generar orden sin comprobante (el approve espera `provider: "manual"`)
- ❌ El Admin no tiene UI para venta retail directa
- ✅ La activación por código vincula al usuario que activa (no requiere que admin asigne)

**Solución:** Crear un endpoint `POST /api/admin/retail/register` que:
1. Cree `Order` con `provider: "retail"` y `orderType: "retail"`
2. Marque `paymentStatus: "paid"` automáticamente
3. Marque chip como `sold` y genere `ChipClaimToken`
4. Retorne el código de activación para imprimir/entregar

---

## 6. Pedido normal y activación por código

### A) Flujo actual (ya implementado)

```
Cliente compra paquete → Order creada (provider: "manual", paymentStatus: "pending")
  → Admin revisa comprobante → Admin aprueba pago → Order pasa a "paid"
  → Admin selecciona picking de chips físicos → Chips pasan a "sold"
  → Se generan ChipClaimTokens con códigos de activación
  → Admin marca como "Enviado" o "Completado"
  → Cliente recibe código → Cliente activa en /activar
  → Chip se vincula al usuario que activa (ownerUserId, accountId, assignedProfileId)
```

### B) ¿Admin todavía debe asignar chips antes de entregar?

**SÍ, actualmente** el Admin debe:
1. Abrir el detalle del pedido
2. En la sección "Picking Físico", seleccionar chips uno por uno
3. Marcar como enviado/completado
4. Los códigos de activación se generan automáticamente al aprobar el pago (en `reserveAssignedChipsForOrder`)

### C) Flujo propuesto simplificado

**Opción A (recomendada): Asignación automática + entrega por código**
1. Admin aprueba pago → todos los chips se asignan automáticamente del inventario
2. Se genera token para cada chip
3. Admin imprime/entrega los stickers con códigos
4. Cliente activa → chip se vincula automáticamente

**Opción B: Admin asigna explícitamente**
Mantener el picking manual si hay chips personalizados o específicos para ciertos clientes.

**Recomendación:** Usar Opción A por defecto, con Opción B como override para casos especiales.

### D) Auto-vinculación en activación

Actualmente en `app/api/chips/activate/route.ts` (líneas 253-262):
```typescript
// Normal activation: fallback to own profile by userId
profile = await tx.profile.findFirst({ where: { userId } });
assignedProfileId = profile.id;
```

✅ El chip se vincula al perfil del usuario que activa. Correcto.
✅ Si se provee `profileId`, se vincula a ese perfil específico. Correcto.

### E) Mejora propuesta para activación por código

- [ ] Cuando se activa por código, verificar que el chip no tenga ya un `ownerUserId`
- [ ] Si el chip ya está asignado a otro usuario, rechazar activación
- [ ] Mostrar nombre del perfil al que se va a vincular antes de confirmar

---

## 7. Flujo corporativo nuevo

### A) Lo que ya existe

**Modelos involucrados:**
- `Organization` (empresa)
- `OrganizationMember` (empleado, vinculado a Profile)
- `OrganizationLocation`, `OrganizationDepartment`
- `CorporatePublicProfile` (perfil público corporativo)
- `CorporateOrderEmployeeItem` (productos por empleado en orden corporativa)
- `CorporateProductRequest` (solicitud de producto por empleado)
- `Chip` (con `ownerUserId`, `assignedProfileId`)

**Flujo corporativo actual:**
1. Admin crea empresa (Organization + cuenta corporativa)
2. Admin agrega ubicaciones, departamentos
3. Admin invita miembros (o los crea manualmente)
4. Admin o empresa crea pedido corporativo
5. Admin aprueba pago corporativo → miembros pasan a `paid_active`
6. Admin asigna chips a cada miembro
7. Miembro activa chip → se vincula al empleado que activa

### B) Lo que debe cambiar

**Nuevo flujo corporativo propuesto:**
```
Empresa solicita productos/chips → Admin recibe solicitud
  → Admin cotiza/aprueba → Empresa paga
  → Admin entrega paquetes físicos a la empresa
  → Empresa reparte los códigos/stickers entre sus empleados
  → Empleado activa código desde su cuenta personal
  → Chip se vincula al empleado que activa (ownerUserId = empleado)
  → El chip queda asociado a la organización (accountId = org account)
```

### C) Revisión del Admin — ¿Qué sobra?

**Debe permanecer:**
- ✅ Crear/editar empresas
- ✅ Aprobar pagos corporativos
- ✅ Ver estado de pedidos corporativos
- ✅ Ver empleados y sus chips
- ✅ Reportes de activación

**Debe eliminarse/ocultarse de la UI:**

| Módulo actual | Decisión | Razón |
|---|---|---|
| **Vinculación por código manual** | ❌ ELIMINAR | Los empleados auto-activan desde su cuenta |
| **Asignación masiva de chips** | ❌ ELIMINAR | Ya no se asigna desde Admin; se entrega código |
| **Crear lote** | ❌ ELIMINAR (de UI Admin) | Los lotes son operación de inventario, no de Admin |
| **Invitar miembro manual** | ⚠️ CAMBIAR | La empresa debe auto-gestionar sus miembros |
| **Botones de fulfillment individual** (Marcar listo, Entregar, Fabricación) | ❌ ELIMINAR | El fulfillment se gestiona a nivel de orden, no por item individual |
| **Asignación de chip principal a empleado** | ❌ ELIMINAR | El chip se auto-asigna al activar el código |

### D) Nuevos endpoints requeridos

1. `POST /api/organizations/requests` — Empleado solicita producto a su empresa
2. `POST /api/admin/organizations/[id]/approve-request` — Admin aprueba solicitud
3. `GET /api/organizations/[id]/members/me` — Empleado ve su estado
4. `POST /api/organizations/invite` — Empresa invita empleado (desde UI empresa, no Admin)

### E) Módulos a agregar en UI de empresa (dashboard cliente)

- [ ] Solicitar productos/chips
- [ ] Ver estado de solicitudes
- [ ] Activar código corporativo
- [ ] Ver perfil corporativo vinculado
- [ ] Invitar/agregar colaboradores (para admin de empresa)

---

## 8. Accesorios personalizados

### A) Regla actual identificada en código

En `app/api/admin/orders/[id]/approve/route.ts` (líneas 144-147):
```typescript
const isPersonalizedAccessoryOrder =
  !order.packageId &&
  order.items.length > 0 &&
  order.items.every((item) => item.profileId || item.chipId);
```

Si todos los items tienen `profileId` o `chipId`, se trata como orden de accesorio personalizado y se salta el incremento de capacidad y picking.

### B) Confirmación de reglas

**Regla 1: Solo se pueden pedir accesorios si el usuario ya tiene chip activo**
- ⚠️ **NO verificada explícitamente en código.** La validación existe implícitamente porque se requiere `profileId` o `chipId` en los items.
- ✅ **Propuesta:** Agregar validación explícita: "No puedes ordenar un accesorio personalizado sin tener al menos un chip activo."

**Regla 2: Selección obligatoria de chip**
- ⚠️ **No validada en el frontend.** El formulario de compra de accesorios debe exigir seleccionar un chip activo.
- ❌ Si el usuario no selecciona chip, el item se crea sin `chipId` y no se puede fabricar el accesorio.

**Regla 3: Si el usuario tiene varios chips**
- ⚠️ **No hay UI para elegir.** El usuario debería poder seleccionar a qué chip vincular el accesorio.
- ✅ **Propuesta:** Mostrar lista de chips activos del usuario y obligar a seleccionar uno.

**Regla 4: Accesorio queda ligado a `chipId`/`profileId`**
- ✅ Ya se guarda en `OrderItem.chipId` y `OrderItem.profileId`.

**Regla 5: Diferenciar producto principal vs accesorio**
- ✅ `productType` en `Product` model: "sticker_nfc_qr", "llavero", "tarjeta", "credencial", "brazalete", etc.
- ✅ En `PedidosSection.tsx` se filtran items con `profile || chip` como personalizados.

### C) Lo que falta implementar

- [ ] Validación `POST /api/orders`: rechazar accesorio si usuario no tiene chip activo
- [ ] UI en tienda: paso obligatorio de selección de chip antes de agregar accesorio al carrito
- [ ] UI en Admin: para accesorios, mostrar a qué chip/profile está vinculado
- [ ] En la ficha pública: si el perfil tiene accesorios personalizados, mostrar indicación

---

## 9. Limpieza necesaria en Admin

### A) Botones y módulos heredados del flujo viejo

**En `PedidosSection.tsx`:**
| Botón/Acción | Estado actual | Decisión |
|---|---|---|
| `Declinar Orden` (línea 1466) | Visible | ✅ Mantener (cancelar orden) |
| `Marcar como Enviado` (línea 1476) | Visible | ⚠️ Reemplazar por workflow automático |
| `Finalizar Pedido` (línea 1484) | Visible | ⚠️ Reemplazar por "Confirmar entrega" |
| `Eliminar Permanente` (línea 1457) | Visible (solo cancelados) | ✅ Mantener |
| `Limpiar Cancelados` (línea 1540) | Visible | ✅ Mantener |
| `handleStatusChange` PATCH (línea 233) | Usado para shipped/completed | ⚠️ Simplificar |
| Botones de fulfillment por item corporativo | Visible en detalle | ❌ ELIMINAR (mover a logística) |
| Asignación de chip a empleado en detalle de pedido | Visible | ❌ ELIMINAR (auto-asignación por activación) |
| Sección "corporate delivery tracking" (línea 1404, oculta con `{false && ...}`) | Oculta con comentario | ✅ Ya está correctamente oculta |
| Sección "corporate chip assignment" (línea 1244, oculta con `{false && ...}`) | Oculta con comentario | ✅ Ya está correctamente oculta |

### B) Pantallas que deben simplificarse

**En `PedidosSection.tsx`:**
- **Simplificar detalle de pedido corporativo:** Actualmente es muy complejo (1655 líneas). Debe separarse en componentes:
  - `CorporateOrderDetail.tsx` 
  - `OrderPaymentReview.tsx`
  - `OrderFulfillment.tsx`
  - `OrderDelivery.tsx`

**En InventorySection / CreateBatch:**
- Revisar si la creación de lotes debe ser solo operación de superadmin/imprenta, no de admin regular.

### C) Acciones manuales que ya no deben estar visibles

| Acción | Dónde está | Decisión |
|---|---|---|
| `Asignar chip manualmente` en detalle de orden | PedidosSection | ❌ ELIMINAR (auto-asignación) |
| `Marcar en fabricación` por item | PedidosSection | ❌ ELIMINAR (estado global de orden) |
| `Asignar chip principal` a empleado | PedidosSection | ❌ ELIMINAR (auto-asignación por activación) |
| Botón `Fabricación` por item corporativo | PedidosSection | ❌ ELIMINAR |
| Botón `Listo` por item corporativo | PedidosSection | ❌ ELIMINAR |
| Botón `Entregar` por item corporativo | PedidosSection | ❌ ELIMINAR |

### D) Módulos de Admin que deben permanecer

- ✅ Dashboard con estadísticas
- ✅ Gestión de usuarios
- ✅ Gestión de empresas (crear, editar, ver)
- ✅ Pedidos (listar, ver detalle, aprobar/rechazar pago)
- ✅ Inventario (ver chips, filtrar)
- ✅ Configuración del sistema
- ✅ Soporte: búsqueda por shortCode, email, teléfono

---

## 10. Cambios Prisma requeridos

### A) Migraciones necesarias (orden sugerido)

**Fase 1 — Perfil Médico v2 (model Profile):**
```prisma
cognitiveImpairment          Boolean  @default(false)
isVulnerable                 Boolean  @default(false)
wanderingRisk                Boolean  @default(false)
isMinor                      Boolean  @default(false)
isNonVerbal                  Boolean  @default(false)
communicationAssistance      String?  // tipo de asistencia (señas, pictogramas, etc.)
emergencyContactInstructions String?  // instrucciones específicas
showVulnerabilityStatusPublic    Boolean @default(false)
showCommunicationStatusPublic    Boolean @default(false)
```

**Fase 2 — WhatsApp (model ScanEvent):**
```prisma
// Ya existe geoLat, geoLng, address, notificationStatus
// Solo cambiar: notificationStatus default de "disabled" a "enabled"
```

**Fase 3 — Retail (model Order):**
```prisma
// Ya existe provider: "manual"
// Agregar provider "retail" como opción válida (sin migración, solo lógica)
```

**Fase 4 — Accesorios (model Product):**
```prisma
// Ya existe productType
// Agregar: isAccessory Boolean @default(false) para diferenciar más fácil
```

### B) Modelos que NO requieren cambios

- ✅ `Chip` — ya soporta todos los estados necesarios
- ✅ `OrderItem` — ya soporta `profileId` y `chipId`
- ✅ `ChipClaimToken` — ya soporta activación por código
- ✅ `Organization`, `OrganizationMember` — ya soportan flujo corporativo
- ✅ `CorporateOrderEmployeeItem` — ya soporta seguimiento
- ✅ `CorporateProductRequest` — ya implementado (Fase 2)
- ✅ `ScanEvent` — solo cambiar default de `notificationStatus`

---

## 11. Endpoints afectados

### A) Endpoints existentes que deben modificarse

| Endpoint | Cambio requerido |
|---|---|
| `GET /api/public/[shortCode]` | Devolver campos nuevos del perfil (vulnerabilidad, comunicación, etc.) |
| `POST /api/public/[shortCode]/scan` | Cambiar `notificationStatus` default a `"enabled"`, activar notificaciones |
| `PATCH /api/users/perfiles-medicos/[id]` | Aceptar campos nuevos del perfil médico v2 |
| `POST /api/users/perfiles-medicos` | Aceptar campos nuevos del perfil médico v2 |
| `POST /api/chips/activate` | Agregar verificación de chip no asignado previamente |
| `POST /api/orders` | Rechazar accesorio si no hay chip activo |
| `POST /api/admin/orders/[id]/approve` | Soporte para `provider: "retail"` sin package obligatorio |

### B) Nuevos endpoints requeridos

| Endpoint | Propósito |
|---|---|
| `POST /api/admin/retail/register` | Registrar venta retail, generar código de activación |
| `GET /api/public/[shortCode]/whatsapp-links` | Generar links de WhatsApp con ubicación + Google Maps |
| `POST /api/organizations/requests` | Empleado solicita producto a su empresa |
| `POST /api/admin/organizations/[id]/approve-request` | Admin aprueba solicitud de empleado |
| `GET /api/users/chips/active` | Listar chips activos del usuario (para selección de accesorio) |

---

## 12. Riesgos de privacidad

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Edad exacta visible para menores | ALTO | Reemplazar por "Menor de edad" cuando `isMinor=true` |
| Sexo visible sin control | MEDIO | Agregar toggle `showSexPublic` |
| Contactos visibles para cualquier escáner | ALTO | Mostrar contactos solo en vista paramédico |
| Foto de perfil sin control de privacidad | MEDIO | Agregar toggle `showPhotoPublic` |
| Campos condicionales (Alzheimer, vulnerabilidad) expuestos sin permiso | ALTO | Controlar con toggles de privacidad |
| Ubicación del scan visible en ficha pública | BAJO | No se muestra actualmente, pero verificar que no se agregue sin control |
| Código de activación visible en Admin | MEDIO | Solo admin/superadmin deben verlo |

---

## 13. Riesgos operativos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Admin asigna chip a orden equivocada | ALTO | Validación doble al seleccionar chip en picking |
| Código de activación expira antes de que cliente lo use | MEDIO | Extender expiración a 60+ días, notificar al cliente |
| Usuario activa chip corporativo sin ser empleado | ALTO | Validar `corporateStatus` antes de activar |
| Venta retail sin registro queda fuera del sistema | ALTO | Crear endpoint obligatorio para registrar ventas |
| Accesorio fabricado sin chip asignado | ALTO | Validar chip activo antes de permitir compra |
| Admin marca pedido como completado sin entregar chips | MEDIO | Requierir selección de chips antes de completar |
| Duplicaciôn de códigos de activación | BAJO | `activationCode` es `@unique` en Prisma |

---

## 14. Plan de implementación por fases

### Fase 1 — Foundation (semana 1-2)
**Perfil Médico v2 + migraciones Prisma**

- [ ] Agregar campos nuevos a modelo Profile `cognitiveImpairment`, `isVulnerable`, `wanderingRisk`, `isMinor`, `isNonVerbal`, `communicationAssistance`, `emergencyContactInstructions`, `showVulnerabilityStatusPublic`, `showCommunicationStatusPublic`
- [ ] Actualizar `MedicalProfileForm.tsx` con nuevos campos condicionales
- [ ] Actualizar endpoints de perfiles médicos para aceptar/escribir nuevos campos
- [ ] Agregar badges en ficha pública (vulnerable, menor, extravío, no verbal)
- [ ] Agregar sección "Retorno Seguro" en ficha pública

### Fase 2 — Emergency Comms (semana 2-3)
**WhatsApp + ubicación + notificaciones**

- [ ] Crear endpoint `GET /api/public/[shortCode]/whatsapp-links`
- [ ] Cambiar `notificationStatus` default a `"enabled"` en `ScanEvent`
- [ ] Generar mensaje WhatsApp con Google Maps + ficha pública
- [ ] Implementar fallback si no hay ubicación
- [ ] Activar notificaciones automáticas a contactos

### Fase 3 — Retail (semana 3-4)
**Venta física sin pedido online**

- [ ] Crear endpoint `POST /api/admin/retail/register`
- [ ] Crear UI en Admin > un botón "Venta en tienda"
- [ ] Implementar generación automática de código de activación
- [ ] Probar flujo completo: retail → activación → chip vinculado

### Fase 4 — Corporate v2 (semana 4-6)
**Simplificar Admin + potenciar empresa**

- [ ] Ocultar botones legacy de asignación manual en Admin
- [ ] Implementar auto-asignación de chips por activación de código
- [ ] Crear endpoints de solicitud de empleado
- [ ] Agregar UI de empresa (solicitar, ver estado, activar)
- [ ] Simplificar detalle de pedido corporativo (componentes separados)

### Fase 5 — Accesorios (semana 6-7)
**Validaciones + UI de selección de chip**

- [ ] Validar chip activo antes de permitir compra de accesorio
- [ ] UI obligatoria de selección de chip en checkout
- [ ] Mostrar vinculación chip-accesorio en ficha pública

### Fase 6 — Limpieza Admin (semana 7-8)
**Refactor + simplificación de UI**

- [ ] Refactorizar `PedidosSection.tsx` (separar en componentes)
- [ ] Remover botones legacy de fulfillment individual
- [ ] Simplificar flujo de aprobación de pedidos
- [ ] Pruebas de regresión en Admin

---

## 15. P0 / P1 / P2 / P3

### P0 — Crítico (bloqueante para operación)
- [ ] Perfil Médico v2: campos de vulnerabilidad y comunicación asistida
- [ ] WhatsApp con ubicación real (sin esto, el WhatsApp de emergencia no sirve)
- [ ] Badge "Persona vulnerable" y "Menor de edad" en ficha pública
- [ ] Sección "Retorno Seguro" en ficha pública

### P1 — Alta prioridad (mejora sustancial)
- [ ] Venta retail sin pedido online
- [ ] Auto-asignación de chips en flujo normal (Admin no asigna manualmente)
- [ ] Validación de chip activo para accesorios
- [ ] Toggles de privacidad para nuevos campos

### P2 — Media prioridad (mejora de UX)
- [ ] Simplificación de UI Admin (remover botones legacy)
- [ ] Componentización de PedidosSection
- [ ] UI de empresa para autogestión de miembros
- [ ] Generación de Google Maps link en WhatsApp

### P3 — Baja prioridad (backlog)
- [ ] Digital Pass (Apple/Google Wallet) ya existe como modelo pero no se usa
- [ ] Notificaciones push a contactos
- [ ] Historial de escaneos en dashboard del cliente
- [ ] Múltiples idiomas para ficha pública

---

## 16. Veredicto final

### Estado actual del sistema

| Aspecto | Calificación | Notas |
|---|---|---|
| Perfil Médico v1 | ✅ Funcional | Completo pero sin campos de vulnerabilidad |
| Ficha Pública | ✅ Funcional | Bonita y responsiva, le faltan badges y retorno seguro |
| WhatsApp | ❌ Roto | No incluye ubicación por async race condition |
| Venta Retail | ❌ No existe | No hay flujo para venta física |
| Pedidos + Activación | ✅ Funcional | Complejo pero funcional |
| Flujo Corporativo | ⚠️ Parcial | Sobran pasos manuales en Admin |
| Accesorios | ⚠️ Incompleto | Sin validación de chip activo |
| Admin UI | ⚠️ Legacy | Sobran botones de fulfillment manual |

### Recomendaciones clave

1. **P0 Urgente:** Arreglar WhatsApp con ubicación (mesaje actual no sirve sin ubicación)
2. **P0 Urgente:** Agregar "Persona vulnerable" al perfil médico (requisito legal/ético)
3. **P0 Urgente:** Badge "Menor de edad" en ficha pública (protección de menores)
4. **P1 Alta:** Venta retail (necesario para expansión comercial)
5. **P1 Alta:** Auto-asignación de chips (reduce error humano en Admin)
6. **P2 Medio:** Limpieza de Admin UI (mejora productividad del equipo)
7. **No implementar ahora:** Digital Pass, notificaciones push, multi-idioma

### Archivos que requieren cambios

| Archivo | Cambio | Prioridad |
|---|---|---|
| `prisma/schema.prisma` | Agregar 9 campos nuevos a Profile | P0 |
| `components/forms/MedicalProfileForm.tsx` | Agregar campos condicionales + toggles | P0 |
| `app/(public)/e/[shortCode]/page.tsx` | Badges + Retorno Seguro + WhatsApp fix | P0 |
| `app/api/public/[shortCode]/scan/route.ts` | Activar notificationStatus | P1 |
| `app/api/chips/activate/route.ts` | Verificar chip no asignado previamente | P1 |
| `app/(admin)/admin/_components/sections/PedidosSection.tsx` | Simplificar + remover legacy | P2 |
| `app/api/orders/route.ts` | Validar chip activo para accesorios | P1 |
| `app/api/admin/orders/[id]/approve/route.ts` | Soporte retail | P1 |
| `domains/orders/services/order-fulfillment.service.ts` | Minor: refactor constants | P2 |

---

*Documento generado el 6 de octubre 2026*
*NO implementar — solo auditoría y diseño funcional*
*Próximo paso: Revisar este documento con el equipo y priorizar Fase 1*

---
*Originalmente en: docs/audit/*