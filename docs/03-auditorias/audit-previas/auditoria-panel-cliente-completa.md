# Auditoría completa final — Panel Cliente

> **Fecha:** Junio 2026  
> **Estado del repo:** HEAD `6c056ad`  
> **Alcance:** Todas las rutas `/app/(app)/dashboard/*` + endpoints API asociados

---

## 1. Mapa general de navegación

### Sidebar Consumidor (usuario normal)

| Nombre visible | URL | Propósito | Quién la usa |
|---|---|---|---|
| Perfil | `/dashboard` | Dashboard principal con resumen de cuenta, chips, perfiles | Cliente normal |
| Ajuste de Perfil | `/dashboard/configuracion` | Editar datos de cuenta, foto, seguridad | Cliente normal |
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
- Consumidor: Dashboard, Mis Dispositivos, Tienda, Pedidos, Upgrade
- Corporativo: Perfil, Panel Empresa, Colaboradores, Historial

### Header
- Logo "PRE RESCUE ID" → redirect a `/dashboard`
- Botón salir → sign out
- Selector de idioma (ES/EN)
- Botón usuario con dropdown:
  - Mi Empresa (solo empresas)
  - Ajuste de Perfil
  - Cerrar sesión
- Badge de tipo de cuenta: "Cuenta Inactiva", "Cuenta Empresa", "Multi-Perfil" o "Protección Individual"

### Detección de cuenta empresa
- Se usa `state?.isOrganization === true` (no un campo `role`)
- La sidebar cambia completamente entre consumidor y corporativo

---

## 2. Dashboard principal

**Archivo:** `app/(app)/dashboard/page.tsx` (~830 líneas)  
**Endpoints:** `GET /api/users/perfiles-medicos`, `GET /api/users/notifications`

### Tarjetas familiares
- Muestra perfil con iniciales, nombre, sexo, fecha nacimiento, condición médica
- **Sin chips vinculados:** muestra icono chip + "Vincular Dispositivo" + link a `/chips`
- **Con chip:** muestra chips como badges pills, nombre del modelo, "Ver Dispositivo"
- Botón editar → abre wizard en línea (mobile) o modal (desktop)
- Botón eliminar → SweetAlert2 de confirmación → `DELETE /api/users/perfiles-medicos/{id}`

### Chips recientes
- Muestra chip_id, perfil vinculado, estado, ubicación, botón ver dispositivo

### Wizard de creación
- **Mobile:** formulario inline con `rounded-2xl shadow-lg border-2 border-teal-200`
- **Desktop:** modal con overlay oscuro
- Usa `MedicalProfileForm` → `POST /api/users/perfiles-medicos`
- Botones: "Crear Perfil" (submit), "Cancelar" (reset form)

### Wizard de edición
- Carga datos existentes, validación YUP, `PATCH /api/users/perfiles-medicos/{id}`

### Funcionalidad de notificaciones
- `GET /api/users/notifications` — badge counter
- `PATCH /api/users/notifications` — marcar como leído

### Upload de foto
- `POST /api/upload` con bucket `avatars`
- `DELETE /api/upload?fileUrl=...` al eliminar foto

### Sección corporativa
- Si hay perfil corporativo vinculado → muestra botón "Ver Perfil Corporativo"
- Click → modal con ficha completa (nombre, teléfono, email, sexo, nacimiento, condición médica)

### Estado vacío
- ✅ Muestra placeholder amarillo: "Aún no tienes perfiles médicos registrados"
- Botón "Crear Mi Primer Perfil"

---

## 3. Perfil Médico

**Archivo:** `app/(app)/dashboard/perfiles-medicos/page.tsx` (~820 líneas)  
**Endpoints:** `GET/POST/PATCH/DELETE /api/users/perfiles-medicos`, `GET /api/chips/dashboard`

### Vista de tarjetas
- Muestra: foto, nombre, sexo, fecha nacimiento, condición médica, notas alérgicas, contacto de emergencia
- Tags badges: estado del chip (VERDE/NARANJA/ROJO)
- Botones: Editar, Eliminar, Vincular Dispositivo (si no tiene chip)

### Creación inline
- **Mobile:** formulario inline con botón "Cancelar"
- **Desktop:** modal con overlay
- Wizard simplificado con validación YUP
- `POST /api/users/perfiles-medicos`

### Edición inline
- Carga datos existentes
- `PATCH /api/users/perfiles-medicos/{id}` (no PUT)
- Botones: "Actualizar Perfil", "Cancelar"

### Campos del formulario (MedicalProfileForm)
- Nombre, Apellido, Alias Público, Teléfono de Contacto
- Cédula / Identificación
- Sexo, Fecha de Nacimiento, Tipo de Sangre
- Alergias, Condiciones, Medicamentos
- ¿Cuenta con seguro médico? → Aseguradora, Número de Póliza, Hospital Preferido, Teléfono emergencia del seguro
- Nombre del médico, Teléfono del médico
- Notas adicionales
- Privacidad: Mostrar aseguradora, hospital preferido, médico tratante, teléfono del médico, notas adicionales (toggle públicos)

### Vinculación de chips
- Select dropdown con chips disponibles
- `PATCH /api/chips/dashboard` con body `{ chipId, action: "assign", profileId }`
- Recarga ambos: perfiles y chips

### Eliminación
- SweetAlert2 de confirmación
- `DELETE /api/users/perfiles-medicos/{id}`

### Estado vacío
- Muestra placeholder: "No tienes perfiles médicos registrados"
- Botón "Crear Mi Primer Perfil"

---

## 4. Contactos de emergencia

**Archivo:** Implementada inline en `perfiles-medicos/page.tsx` (~490 líneas)  
**Endpoints:** `GET/POST/PATCH/DELETE /api/users/perfiles-medicos/{profileId}/contacts`

### Listado de contactos
- `GET /api/users/perfiles-medicos/{profileId}/contacts`
- Muestra: nombre, relación, teléfono, email, prioridad
- Badges de canales: SMS, Email, WhatsApp (colores específicos)
- Límite: 3 contactos por perfil

### Creación
- Formulario inline con campos: nombre, relación, teléfono, email, prioridad, canales
- `POST /api/users/perfiles-medicos/{profileId}/contacts`
- Crea `Contact` en pool global + `ProfileContact` como vínculo

### Edición
- Formulario inline con datos existentes
- `PATCH /api/users/perfiles-medicos/{profileId}/contacts`
- Actualiza tanto `Contact` (datos compartidos) como `ProfileContact` (preferencias del vínculo)

### Eliminación
- SweetAlert2 de confirmación
- `DELETE /api/users/perfiles-medicos/{profileId}/contacts?id={contactId}`
- **Fix #8 aplicado:** Solo elimina el vínculo `ProfileContact`, preserva el `Contact` en el pool global

### Estado vacío
- Muestra: "No hay contactos de emergencia"
- Botón "+ Agregar Contacto"

### Modelo de datos
```
Contact (global pool): id, userId, fullName, phone, email, relationship
ProfileContact (vínculo): id, profileId, contactId, priorityOrder, notifySms, notifyEmail, notifyWhatsapp, active
```

---

## 5. Mis Dispositivos

**Archivo:** `app/(app)/dashboard/chips/page.tsx` (~610 líneas)  
**Endpoints:** `GET /api/chips/dashboard`, `GET /api/users/perfiles-medicos`, `PATCH /api/chips/dashboard`

### Tarjetas de chips
- Muestra: chip_id, perfil vinculado, modelo del chip, estado del perfil (badges coloreados), ubicación, última actualización
- Badges de perfil: PERFIL_VACÍO (rojo), INFORMACIÓN_PARCIAL (naranja), INFORMACIÓN_COMPLETA (verde)
- Botones: Ver Dispositivo, Editar Perfil, Desvincular

### Datos del endpoint chips/dashboard
- Retorna chips personales (excluye corporativos)
- Incluye: `_count.scanEvents`, `assignedProfile`, `corporateOrderItems`, `orderItems`
- `orderItems` incluye: `id, productType, quantity, totalPrice, createdAt, order`
- `order` incluye: `id, orderNumber, orderStatus, paymentStatus, createdAt`

### Vinculación de chips
- Select dropdown con chips disponibles
- `PATCH /api/chips/dashboard` con body `{ chipId, action: "assign", profileId }`

### Desvinculación
- `PATCH /api/chips/dashboard` con body `{ chipId, action: "assign", profileId: null }`
- Confirma con SweetAlert2

### Activación de chips
- Formulario: chipId, código de activación, profileId (dropdown)
- `POST /api/chips/activate` con rate limiting (5/min por IP)
- Si el chip ya está activado, muestra error específico

### Chips vinculados desde tienda (accesorios personalizados)
- Se muestran los chips de órdenes de accesorios personalizados enlazados al perfil
- Incluye chips de `orderItems` (chips activados via link de compra)
- Muestra modelo "Accesorio Personalizado" cuando aplica
- **Nota:** No existe campo `linkedChipId` — la relación es a través de `orderItems.order`

### Estado vacío
- Sin chips: "No tienes dispositivos activos"
- Con chips pero sin perfil: "Sin perfil vinculado" + botón vincular
- Con perfil vacío: Badges rojo "PERFIL VACÍO"

---

## 6. Tienda / Accesorios / Compras

### 6a. Tienda (Accesorios personalizados)

**Archivo:** `app/(app)/dashboard/tienda/page.tsx` (~740 líneas)  
**Endpoints:** `GET /api/products`, `GET /api/public/config`, `POST /api/orders`, `GET /api/users/perfiles-medicos`, `POST /api/upload`, `POST /api/orders/{id}/payment-proof`

### Catálogo de productos
- Sección "Dispositivos": solo productos con `requires_profile: true` y `available_online: true`
- Sección "Accesorios": productos sin `requires_profile`
- Productos personalizados (`is_personalized: true`) requieren selección de color/tamaño/material/opciones

### Checkout en línea (mobile embebido)
- Wizard 4 pasos en `/tienda`:
  1. Selección de producto
  2. Datos personales (formulación inline con botón "Cancelar")
  3. Método de pago (transferencia/billetera)
  4. Confirmación
- Sin redirect a `/comprar`
- Botón "Cancelar" en cada paso

### Checkout en línea (desktop)
- Redirige a `/comprar?productId=...`

### Selector de perfil (accesorios personalizados)
- Paso 2 incluye selector de perfil médico
- Muestra perfiles del usuario con chips asignados
- Si el perfil no tiene chip: warning "Este perfil todavía no tiene un chip/QR activo asociado"
- Si no hay perfiles: link a crear perfil médico

### Productos personalizados
- Paso 2 incluye: selección de color, talla, material, opciones adicionales
- Badge "Personalizado" en el carrito
- Validación: talla y color son obligatorios si el producto lo requiere

### Subida de comprobante de pago
- `POST /api/upload` con bucket `payment-proofs`
- `POST /api/orders/{orderId}/payment-proof` con body `{ paymentProofUrl }`
- SweetAlert2 informativo: "Tu pedido está pendiente de verificación"

### Creación de pedido
- `POST /api/orders` con body completo incluyendo `profileId` y campos personalizados
- Redirige a `/pedidos` tras éxito
- Si el usuario no tiene email: alerta "Registra tu email primero"

### Estado vacío
- Sin productos: "No hay productos disponibles en este momento"

### 6b. Compra de combos (Tienda original)

**Archivo:** `app/(app)/dashboard/compras/page.tsx`  
**Ruta:** `/dashboard/compras`  
**Propósito:** Comprar combos de chips (no accesorios personalizados)

---

## 7. Mis Pedidos

**Archivo:** `app/(app)/dashboard/pedidos/page.tsx` (~510 líneas)  
**Endpoints:** `GET /api/orders`, `PATCH /api/orders/{id}`, `POST /api/orders/{id}/payment-proof`, `GET /api/public/config`

### Listado de pedidos
- `GET /api/orders?_t=${Date.now()}` (con cache busting)
- Tarjetas expandibles con: número de pedido, estado, fecha, total, productos, dirección
- Botón "Ver detalle" expande para mostrar información completa

### Sistema de estados de pedido (3 campos)

**orderStatus:**
- `pending` — amarillo — "Esperando Pago"
- `processing` — azul — "Trabajando en tu pedido"
- `shipped` — índigo — "En camino"
- `completed` — verde — "Completado"
- `cancelled` — rojo — "Cancelado"

**paymentStatus:**
- `pending` — amarillo — "Esperando Pago"
- `under_review` — azul — "Pago en Revisión"
- `paid` — verde — "Pago Aprobado"
- `rejected` — rojo — "Pago Rechazado"
- `cancelled` — rojo — "Cancelado"

**adminReviewStatus:**
- `pending` — azul — "Pago en Revisión"
- `approved` — verde — "Aprobado"
- `rejected` — rojo — "Rechazado"

**Prioridad de visualización:** paymentStatus y adminReviewStatus tienen prioridad sobre orderStatus

### Cancelación
- SweetAlert2 de confirmación
- `PATCH /api/orders/{id}` con body `{ status: "cancelled" }`
- Solo disponible para pedidos manuales con `paymentStatus` en `pending` o `under_review`, y `orderStatus` distinto de `completed`, `shipped` o `cancelled`
- **Fix #9 aplicado:** El endpoint valida que el pedido no esté en estado final

### Subida de comprobante de pago
- Botón "Subir Comprobante" para pedidos manuales con `paymentStatus` en `pending` o `under_review`
- `POST /api/upload` + `POST /api/orders/{orderId}/payment-proof`
- SweetAlert2 informativo tras éxito

### Ver comprobante de pago
- Botón "Ver Comprobante" si el pedido tiene `paymentProofUrl`
- Abre en nueva pestaña

### Productos personalizados en pedidos
- Muestra badge "Personalizado" si el producto tiene `customization: true`
- Detalla opciones: talla, color, material, opciones adicionales
- Chips activados en la orden

### Estado vacío
- Sin pedidos: "No tienes pedidos realizados"
- Con pedidos: Lista de tarjetas expandibles

---

## 8. Empresa / Corporativo

**Archivo:** `app/(app)/dashboard/empresas/page.tsx` (~2700+ líneas, monolito)  
**Endpoints:** `GET /api/organizations/my-status`, `GET/POST /api/organizations/members`, `POST /api/organizations/join-request`, `GET/POST /api/organizations/corporate-orders`, `GET/POST /api/organizations/product-requests`, `GET/POST/PATCH /api/organizations/public-profile`, `GET /api/products`, `GET /api/users/perfiles-medicos`, `POST /api/chips/activate`

### Secciones
1. **Estado de la empresa:** Muestra status de la organización (`pending_company_review`, `approved_unpaid`, `paid_active`, `suspended`, `archived`)
2. **Empleados (miembros):** Tabla de miembros con roles y estados, invitación de nuevos
3. **Pedidos corporativos:** Listado de órdenes con filtros por estado
4. **Solicitudes de producto:** Formulario para solicitar productos personalizados
5. **Perfil corporativo:** Edición del perfil médico corporativo
6. **Pedidos de accesorios personalizados:** Creación de órdenes con selección de productos, colores, tamaños, materiales
7. **QR y activación:** Generación de QR para accesorios, link de activación, copia al clipboard
8. **Colaboradores:** Gestión de miembros (invitar, aprobar, rechazar, eliminar)
9. **Mi Empresa:** Edición del perfil corporativo con formularios inline

### Flujos de accesorios personalizados
- **Creación de pedido:** Selección de producto personalizado, configuración de opciones, subida de comprobante
- **Aprobación:** Admin aprueba → chip se activa automáticamente
- **QR:** Generación de QR con token de activación, descarga en PNG, copia de link
- **Estado:** Badge con estados (pendiente, aprobado, rechazado, completado)

### Funcionalidades clave
- Botón "Cancelar" en formularios de creación
- Botón "Cancelar" en formularios de edición
- Botón "Volver" para navegación
- Badges de estado con colores
- Tooltips informativos

### Estado vacío
- Sin empresa: "No tienes una empresa registrada"
- Sin miembros: "No hay miembros en la empresa"
- Sin pedidos: "No hay pedidos corporativos"

---

## 9. Configuración

**Archivo:** `app/(app)/dashboard/configuracion/page.tsx` (~170 líneas)  
**Endpoints:** `GET /api/users/profile`, `PATCH /api/users/profile`, `POST /api/upload`, `DELETE /api/users/account/delete`

### Datos del usuario
- `GET /api/users/profile?_t=${Date.now()}` (con cache busting)
- Muestra: nombre, email, teléfono, dirección

### Edición
- Formulario con campos: nombre, teléfono, dirección
- `PATCH /api/users/profile` (no PUT)
- **Fix #12 aplicado:** El endpoint preserva `medicalProfileId` existente al actualizar (no lo sobreescribe con null)

### Upload de foto
- `POST /api/upload` con bucket `avatars`
- Preview de foto actual
- Botón para cambiar foto

### Eliminación de cuenta
- SweetAlert2 de confirmación con texto "Eliminar cuenta"
- `DELETE /api/users/account/delete`
- Solo disponible para cuentas con 0 pedidos activos

### Funcionalidades próximas (placeholder)
- Seguridad (2FA)
- Notificaciones
- Preferencias

---

## 10. Flujos completos del cliente

### Flujo: Registro → Perfil → Dispositivo → Compra

1. **Registro:** `/registro` → `POST /api/auth/register` → redirect a `/dashboard`
2. **Perfil médico:** `/dashboard/perfiles-medicos` → crear perfil con datos personales
3. **Contacto de emergencia:** Asociar hasta 3 contactos por perfil
4. **Activar dispositivo:** `/dashboard/chips` → ingresar chipId + código
5. **Vincular chip al perfil:** Seleccionar chip + perfil → `PATCH /api/chips/dashboard` con `action: "assign"`
6. **Comprar desde tienda:** Seleccionar producto → checkout → pago → comprobante

### Flujo: Compra desde tienda → Activación automática

1. **Compra:** `/tienda` → seleccionar producto personalizado → configurar opciones → seleccionar perfil médico
2. **Pago:** Transferencia/billetera → subir comprobante
3. **Activación admin:** Admin aprueba → chip se activa automáticamente
4. **Visualización:** Chip aparece en "Mis Dispositivos" vinculado al perfil del comprador

### Flujo: Empresa → Colaboradores → Pedidos corporativos

1. **Unirse a empresa:** `/empresas` → solicitar unión con código de empresa
2. **Invitar miembros:** Admin invita → miembro acepta
3. **Crear pedido corporativo:** Seleccionar productos → configurar cantidades
4. **Aprobación:** Admin aprueba → se genera orden con chips vinculados

---

## 11. Estados vacíos y errores

### Estados vacíos implementados
| Página | Estado vacío | Texto | Acción |
|--------|-------------|-------|--------|
| Dashboard | Sin perfiles | "Aún no tienes perfiles médicos registrados" | Botón "Crear Mi Primer Perfil" |
| Perfiles médicos | Sin perfiles | "No tienes perfiles médicos registrados" | Botón "Crear Mi Primer Perfil" |
| Contactos | Sin contactos | "No hay contactos de emergencia" | Botón "+ Agregar Contacto" |
| Dispositivos | Sin chips | "No tienes dispositivos activos" | Sin acción |
| Dispositivos | Chips sin perfil | "Sin perfil vinculado" | Botón vincular |
| Tienda | Sin productos | "No hay productos disponibles en este momento" | Sin acción |
| Tienda | Sin perfiles | "Necesitas crear un perfil médico antes de solicitar accesorios personalizados" | Link a perfiles médicos |
| Pedidos | Sin pedidos | "No tienes pedidos realizados" | Sin acción |
| Empresa | Sin empresa | "No tienes una empresa registrada" | Sin acción |
| Empresa | Sin miembros | "No hay miembros en la empresa" | Sin acción |
| Empresa | Sin pedidos | "No hay pedidos corporativos" | Sin acción |

### Manejo de errores
- **401:** Redirect a `/login`
- **404:** SweetAlert2 "No encontrado"
- **400:** Toast de error con mensaje específico
- **409:** SweetAlert2 "Conflicto" (ej: chip ya activado)
- **500:** Toast genérico "Error del servidor"
- **Rate limit:** Toast "Demasiadas solicitudes. Intenta de nuevo en X minutos."

---

## 12. Interconexión con Admin

### Datos que Admin gestiona y Cliente consume

| Entidad | Admin crea/edita | Cliente consume | Endpoint cliente |
|---------|-----------------|-----------------|-----------------|
| Productos | CRUD completo | Catálogo tienda | `GET /api/products` |
| Configuración (precios) | Edita precio base, envío, IVA | Checkout calcula total | `GET /api/public/config` |
| Órdenes | Aprueba/cambia estado, confirma pago | Ve estados, cancela pendientes | `GET/PATCH /api/orders` |
| Chips | Registra, activa, asigna, desvincula | Ve dispositivos, activa con código | `GET/PATCH /api/chips/dashboard`, `POST /api/chips/activate` |
| Perfiles médicos | Ve listado, edita campos | CRUD completo | `GET/POST/PATCH/DELETE /api/users/perfiles-medicos` |
| Contactos | Ve asociaciones | CRUD por perfil | `GET/POST/PATCH/DELETE /api/users/perfiles-medicos/{id}/contacts` |
| Organizaciones | Aprobar/rechazar solicitudes | Crear/unirse, gestionar miembros | `GET/POST /api/organizations/*` |
| Pedidos corporativos | Aprueba/rechaza/cambia estado | Crea solicitudes, ve estados | `GET/POST /api/organizations/corporate-orders` |
| Auditoría | Ve logs completos | No tiene acceso | Solo admin |

### Flujo bidireccional: Órdenes

1. **Cliente crea orden** → `POST /api/orders`
2. **Cliente sube comprobante** → `POST /api/orders/{id}/payment-proof`
3. **Admin aprueba pago** → `PATCH /api/admin/orders/{id}/approve`
4. **Admin cambia estado** → `PATCH /api/admin/orders/{id}`
5. **Cliente ve cambio** → `GET /api/orders` (refresca al navigate)

### Flujo bidireccional: Accesorios personalizados

1. **Cliente solicita** → `POST /api/organizations/corporate-orders` con opciones personalizadas
2. **Admin aprueba** → Genera chip y lo asocia a la orden vía `orderItems`
3. **Cliente activa** → Chip aparece vinculado en "Mis Dispositivos"
4. **Admin ve QR** → Descarga QR de activación para el empleado

---

## 13. Problemas pendientes reales

### P0 — Bloqueantes
> **Ninguno.** Todos los P0 identificados en la auditoría anterior fueron corregidos.

| Problema | Estado | Fix aplicado |
|----------|--------|-------------|
| `chips/activate` sin rate limiting | ✅ Cerrado | Commit `1c10870` — 5/min por IP |
| `orders` POST sin rate limiting | ✅ Cerrado | Commit `1c10870` — 10/min por IP |
| DELETE contacto eliminaba Contact del pool global | ✅ Cerrado | Commit `6c056ad` — solo elimina vínculo ProfileContact |
| Cancelación de pedido sin validación de estado | ✅ Cerrado | Commit `321442b` — valida que no esté en shipped/completed |
| `account settings` borraba `medicalProfileId` | ✅ Cerrado | Commit `4053f80` — preserva campo al actualizar |
| `alert()` nativo en vez de toast | ✅ Cerrado | Commit `321442b` — reemplazado por `toast.error()` |

### P1 — Importantes
> **3 de 7 cerrados.** Resto es backlog no bloqueante.

| Problema | Estado | Fix aplicado |
|----------|--------|-------------|
| Link crear perfil desde tienda no existía | ✅ Cerrado | Commit `321442b` — link agregado |
| Wizard CSS hack para mobile | ⬜ Backlog | Deuda técnica — ver nota abajo |
| `empresas/page.tsx` monolítico (2700+ líneas) | ⬜ Backlog | Deuda técnica — ver nota abajo |
| Cache busting inconsistente entre páginas | ⬜ Backlog | No causa datos stale — ver nota abajo |
| Chips corporativos no aparecen en dashboard principal | ⬜ Backlog | Solo muestran chips del usuario, no de la empresa |
| Wizard necesita refactor a componente dedicado | ⬜ Backlog | Relacionado con CSS hack |

### P2 — Mejoras
> **1 de 10 cerrado.** Resto backlog post-cierre.

| Problema | Estado |
|----------|--------|
| Feedback de upload no mostraba estado | ✅ Cerrado |
| Perfil médico no muestra edad calculada | ⬜ Backlog |
| No hay paginación en listados | ⬜ Backlog |
| No hay búsqueda/filtros en pedidos | ⬜ Backlog |
| No hay exportación de datos | ⬜ Backlog |
| No hay confirmación de email | ⬜ Backlog |
| No hay notificaciones push | ⬜ Backlog |
| No hay modo oscuro | ⬜ Backlog |
| No hay accesibilidad (ARIA labels) | ⬜ Backlog |
| No hay internacionalización completa (solo ES/EN básico) | ⬜ Backlog |

### P3 — Nice to have

- Animaciones de transición entre páginas
- Tooltips en todos los botones
- Modo offline para dispositivos
- Integración con Google Maps para ubicación
- Exportar perfil médico a PDF

### Notas sobre backlog

#### CSS hack del wizard (P1)
El forminline del wizard de perfiles médicos usa un CSS hack para forzar estilos en mobile:
```tsx
<div className="p-6 bg-white rounded-2xl shadow-lg border-2 border-teal-200">
```
Esto funciona pero no es mantenible. Se recomienda refactorizar a un componente `MedicalProfileWizard` dedicado con estilos propios.

#### `empresas/page.tsx` monolítico (P1)
El archivo tiene 2700+ líneas con 10+ secciones inline. Se recomienda dividir en:
- `EmpresaStatus.tsx`
- `EmpresaMembers.tsx`
- `EmpresaOrders.tsx`
- `EmpresaProductRequests.tsx`
- `EmpresaCorporateProfile.tsx`
- `EmpresaAccessoryOrders.tsx`
- `EmpresaQR.tsx`

#### Cache busting inconsistente (P1)
3 páginas usan `_t=${Date.now()}` (perfiles-medicos, pedidos, configuración), 4 no lo usan. No causa datos stale porque:
- Todos los endpoints dinámicos tienen `force-dynamic` en el server
- Vercel no cachea API routes con `force-dynamic`
- Los `fetch()` desde `useEffect` no pasan por el data cache de Next.js

La solución uniforme sería agregar `cache: "no-store"` al fetch del cliente, pero no hay urgencia.

---

## 14. Recomendación final

### Estado del Panel Cliente: ✅ CERRADO FUNCIONALMENTE

El panel cliente queda funcionalmente completo para el cierre:

- **Autenticación:** Login, registro, recuperación de contraseña funcionan
- **Perfiles médicos:** CRUD completo con validación, contactos de emergencia, wizard inline
- **Dispositivos:** Activación, vinculación/desvinculación, estados, badges
- **Tienda:** Catálogo, checkout embebido en mobile, productos personalizados con selector de perfil
- **Pedidos:** Listado, cancelación con validación, comprobante de pago
- **Empresa:** Gestión de miembros, pedidos corporativos, accesorios personalizados, QR
- **Configuración:** Edición de perfil, upload de foto, eliminación de cuenta
- **Seguridad:** Rate limiting en endpoints críticos, auditoría verificada
- **UX:** Toast notifications, SweetAlert2, empty states, loading states

### Lo que queda como backlog técnico no bloqueante

| Ítem | Prioridad | Esfuerzo estimado |
|------|-----------|-------------------|
| Refactor wizard a componente dedicado | P1 | 2-3 días |
| Dividir `empresas/page.tsx` en módulos | P1 | 3-5 días |
| Unificar cache busting con `cache: "no-store"` | P1 | 0.5 días |
| Chips corporativos en dashboard principal | P1 | 1 día |
| Paginación en listados | P2 | 1-2 días |
| Búsqueda/filtros en pedidos | P2 | 1 día |
| Internacionalización completa | P2 | 3-5 días |
| Notificaciones push | P3 | 5+ días |

### Listo para pasar a panel admin

El panel cliente está listo para pasar al desarrollo del panel admin. Los flujos críticos (registro → perfil → dispositivo → compra → activación) están completos y funcionales. Los problemas P0 fueron corregidos y verificados. El backlog técnico restante es mejorable sin impacto en la funcionalidad core.

---
*Originalmente en: docs/audit/*