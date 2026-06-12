# 📊 ANÁLISIS EXHAUSTIVO DEL PROYECTO PRERESCATEPY

**Fecha**: 21 de mayo de 2026  
**Versión**: 1.0  
**Alcance**: Arquitectura completa, flujos de negocio, API endpoints, modelo de datos, servicios

---

## 1️⃣ ARQUITECTURA GENERAL

### 1.1 Stack Tecnológico

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|----------|
| **Frontend** | Next.js 15 (App Router) | 15.5.15 | Framework React full-stack |
| **Runtime** | Node.js | - | Entorno JavaScript |
| **ORM** | Prisma | 6.2.1 | Abstracción de base de datos PostgreSQL |
| **BD** | PostgreSQL | - | En Supabase (proveedor) |
| **Autenticación** | NextAuth.js | 4.24.11 | Gestión de sesiones JWT (30 días) |
| **UI Framework** | React | 19.0.0 | Componentes de interfaz |
| **Estilos** | Tailwind CSS | 3.4.1 | Utilidades CSS |
| **Animaciones** | Framer Motion | 11.18.1 | Transiciones y animaciones |
| **Iconos** | Lucide React | 0.473.0 | Biblioteca de iconos |
| **Email** | Resend | 6.10.0 | Servicio de email transaccional |
| **SMS** | Twilio | 5.13.1 | Servicio de SMS |
| **Pagos** | Stripe | 22.0.1 | Procesamiento de pagos (en desarrollo) |
| **Validación** | Zod | 3.24.1 | Schemas de validación TypeScript-first |
| **Encriptación** | bcryptjs | 2.4.3 | Hash de contraseñas |
| **Generación QR** | qrcode.react | 4.2.0 | Componentes React para QR |
| **Toasts** | sonner | 1.7.2 | Notificaciones en UI |
| **Cache** | Upstash Redis | 1.37.0 | Cache y rate limiting distribuido |

### 1.2 Patrón de Diseño: Domain-Driven Design (DDD)

```
src/
├── domains/                    ← LÓGICA DE NEGOCIO PURA (independiente de framework)
│   ├── accounts/              ← Dominio de Cuentas
│   │   ├── account.types.ts   ← Interfaces de dominio (AccountState)
│   │   └── services/
│   │       └── account-state.service.ts  ← Cerebro central de permisos
│   ├── chips/                 ← Dominio de Dispositivos NFC/QR
│   ├── profiles/              ← Dominio de Perfiles Médicos
│   ├── contacts/              ← Dominio de Contactos de Emergencia
│   ├── notifications/         ← Dominio de Notificaciones
│   ├── organizations/         ← Dominio de Organizaciones (Empresas/Colegios)
│   ├── admin/                 ← Dominio de Administración
│   └── shared/                ← Constantes y tipos compartidos
│       └── constants.ts       ← ACCOUNT_TYPES, USER_ROLES, BUSINESS_RULES
│
├── app/                       ← CAPAS DE PRESENTACIÓN Y API
│   ├── (public)/              ← Rutas públicas (sin auth)
│   ├── (app)/dashboard/       ← Panel de cliente (auth requerido)
│   ├── (admin)/admin/         ← Panel de admin (admin only)
│   └── api/                   ← Endpoints REST (38+ rutas)
│
├── lib/                       ← UTILIDADES COMPARTIDAS
│   ├── auth.ts                ← Configuración NextAuth + lógica de login
│   ├── guards.ts              ← Funciones de verificación de permisos
│   ├── notifications.ts       ← Orquestación de notificaciones
│   ├── payments.ts            ← Integración con proveedores de pago
│   ├── rateLimit.ts           ← Rate limiting (in-memory + Redis)
│   ├── validations.ts         ← Schemas Zod
│   ├── geocoding.ts           ← Geolocalización inversa (OpenStreetMap)
│   ├── encryption.ts          ← Encriptación de datos sensibles
│   ├── identifiers.ts         ← Generación de códigos únicos
│   └── logger.ts              ← Sistema de logging
│
├── components/                ← COMPONENTES REUTILIZABLES
│   ├── Navbar.tsx             ← Navegación principal
│   ├── Footer.tsx             ← Pie de página
│   ├── home/                  ← Componentes del landing
│   └── ui/                    ← shadcn/ui components
│
└── types/                     ← Tipos TypeScript globales
    └── next-auth.d.ts         ← Extensión de tipos NextAuth
```

### 1.3 Principios de Arquitectura

#### 🎯 Single Source of Truth (SSOT)
- **Planes/Precios/Límites**: Residen EXCLUSIVAMENTE en tabla `Package` de BD
- **Permisos de Cuenta**: Calculados por `AccountStateService.getAccountState(userId)`
- **Constantes de Negocio**: En `domains/shared/constants.ts`

#### 🔐 Seguridad en Capas
1. **Autenticación**: NextAuth.js con JWT + MFA (TOTP opcional)
2. **Autorización**: Guards (`isAdmin()`, `isOrgManager()`, `belongsToAccount()`)
3. **Validación**: Zod schemas en frontend + backend
4. **Rate Limiting**: Upstash Redis + fallback in-memory
5. **Encriptación**: bcryptjs para contraseñas, AES-256 para datos sensibles

#### 📊 Observabilidad
- **Logging**: Sistema de logging centralizado en `lib/logger.ts`
- **Auditoría**: Tabla `AuditLog` registra cambios de admin
- **Monitoring**: Sentry integrado (`@sentry/nextjs` v10.49.0)
- **Analítica**: Vercel Analytics + Speed Insights

---

## 2️⃣ FLUJOS PRINCIPALES DE NEGOCIO

### 2.1 Flujo de Emergencia 🚨 (CRÍTICO - No romper)

**Secuencia**: Rescatista escanea chip → Sistema busca perfil → Notifica contactos

```
1. ESCANEO
   └─ Civil/Paramédico escanea código QR o NFC
      └─ Navegador abre: https://prerescatepty.com/e/{shortCode}?source=nfc
      
2. REGISTRO DE EVENTO
   └─ POST /api/public/{shortCode}/scan
      ├─ Captura: IP, geolocalización GPS, user-agent
      ├─ Crea ScanEvent (BD)
      ├─ Retorna: profileId, accountId
      └─ Dispara notificaciones (asincrónicas)

3. OBTENER PERFIL
   └─ GET /api/public/{shortCode}
      ├─ Sin auth (público)
      ├─ Verifica profileVisibilityStatus == "active"
      └─ Retorna:
         ├─ Perfil médico (firstName, lastName, bloodType, etc.)
         ├─ Alergias, medicamentos, condiciones crónicas
         └─ Contactos de emergencia (nombres + teléfono)

4. PREGUNTAR AL RESCATISTA
   └─ Frontend: "¿Eres paramédico?" (2 botones)
      ├─ ✅ SÍ → Muestra perfil COMPLETO (sangre, alergias, meds)
      └─ ❌ NO → Muestra instrucciones de primeros auxilios + contactos

5. NOTIFICACIÓN A CONTACTOS (Paralelo)
   └─ Para cada ProfileContact con notifyEmail/notifySms/notifyWhatsapp
      ├─ Email: HTML con perfil + link GPS + botón "Ver Perfil"
      ├─ SMS: Texto corto con link
      └─ WhatsApp: ❌ BUG - Nunca se envía (ver sección 6)

6. REGISTRAR EN BD
   └─ Notification.create({ chipId, channel, recipient, status: "pending" })
   └─ Cron job cada minuto reintenta failed notifications
```

**Datos que fluyen**:
```javascript
Chip.shortCode (ej: "A3K9WX2P")
  ↓ Busca
Profile { firstName, lastName, bloodType, allergies, medications }
  ↓ Busca
ProfileContact[] { fullName, phone, email, relationship, notifyX flags }
  ↓ Para cada
Notification { channel: "email"|"sms"|"whatsapp", recipient, status }
  ↓ Envía
EmailService.send() / SmsService.send() / WhatsappService.send()
```

**⚠️ RIESGOS CRÍTICOS**:
- Si falla POST /api/public/{shortCode}/scan → No se registra el evento
- Si contactos no están activos → No reciben notificación
- Si Email/SMS/WhatsApp están down → Contacto no se entera (pero reintento existe)

---

### 2.2 Flujo de Registro y Activación

**Secuencia**: Usuario se registra → Completa perfil → Activa chip

```
PASO 1: REGISTRO (POST /api/auth/register)
├─ Input: { email, password, phone?, accountType? }
├─ Rate Limit: 5 intentos / 15 minutos
├─ Validaciones:
│  ├─ Email único (sino 409 Conflict)
│  ├─ Password mínimo 8 caracteres
│  └─ accountType en ["personal", "family", "company", "school"]
├─ Transacción:
│  ├─ CREATE Account { accountType, status: "active", maxChipsAllocated: 0 }
│  ├─ CREATE User { email, passwordHash (bcrypt), role: "owner" }
│  ├─ UPDATE Account.ownerUserId = User.id
│  └─ CREATE Profile { userId, bloodType: "Pendiente", firstName: "", lastName: "" }
└─ Output: { userId, message: "Cuenta creada" }

PASO 2: COMPLETAR PERFIL MÉDICO (PUT /api/users/profile)
├─ Input: { firstName, lastName, bloodType, allergies?, medications?, ... }
├─ Validaciones (zod):
│  ├─ firstName.length > 1
│  ├─ lastName.length > 1
│  └─ bloodType ∉ ["Pendiente", ""]
├─ UPDATE Profile
└─ Output: Profile completo

PASO 3: ACTIVAR CHIP (POST /api/chips/activate)
├─ Input: { activationCode: "XXXX-XXXX-XXXX" } (JWT auth requerido)
├─ Busca ChipClaimToken con ese activationCode
├─ Validaciones:
│  ├─ Código existe y no expirado
│  ├─ Código no usado antes (usedAt == null)
│  ├─ Perfil médico completo
│  ├─ Cuenta no expirada
│  └─ No excede límite de chips (Account.maxChipsAllocated)
├─ Transacción:
│  ├─ UPDATE Chip
│  │  ├─ status: "activated"
│  │  ├─ ownerUserId: session.user.id
│  │  ├─ assignedProfileId: Profile.id
│  │  ├─ activatedAt: NOW
│  │  ├─ serviceStartDate: NOW
│  │  └─ serviceEndDate: NOW + 24 meses (serviceDurationMonths de Package)
│  ├─ UPDATE ChipClaimToken.usedAt = NOW
│  └─ Si activeChipsCount >= maxChipsAllocated → Auto-upgrade a "Plan Personalizado"
└─ Output: { success: true, serviceEndDate }

PASO 4: VERIFICAR SETUP (GET /api/account/state)
└─ Devuelve AccountState con flags:
   ├─ setupChecklist.medicalProfileComplete ✅
   ├─ setupChecklist.chipActivated ✅
   └─ setupChecklist.emergencyContactAdded ❌ (aún faltan contactos)
```

**Problemas conocidos**:
- Seed.ts cambia accountType "personal" → "usuario" (bug) → todos los flags dan false
- maxChipsAllocated inicia en 0 hasta que se completa compra (pero seed inicia con valores)

---

### 2.3 Flujo de Permisos y Cálculo de Estado

**Cerebro central**: `AccountStateService.getAccountState(userId)`

```typescript
// Entrada
const userId = session.user.id

// Procesa
const user = await prisma.user.findUnique({ where: { id: userId } })
  // User -> Account -> Package (relaciones)

// Calcula
const state: AccountState = {
  // Identidad
  accountId: account.id,
  packageId: package.id,
  accountType: "family" | "personal" | "company" | "school",
  packageName: "Plan Duo", // De Package.name
  packagePrice: 45.00,     // De Package.price
  
  // Límites y capacidad
  maxChipsAllocated: 2,       // De Account.maxChipsAllocated
  maxProfilesAllocated: 2,    // De Account.maxProfilesAllocated
  
  // Estado del servicio
  serviceStatus: "active" | "expired" | "inactive",
  serviceEndDate: 2026-05-21,
  serviceDurationMonths: 24,  // De Package.serviceDurationMonths
  isExpired: false,
  isInactive: false,
  
  // Flags de categoría (para mostrar/ocultar sidebar)
  isPersonal: true,
  isFamily: false,
  isCorporate: false,
  isOrganization: false,
  isOwner: true,
  
  // Flags de funcionalidad (permiso granular)
  canManageFamilyProfiles: false,    // Solo si isFamily || maxProfilesAllocated > 1
  canAccessOrganizationModule: false, // Solo si Package.allowsOrganizationModule
  canActivateMoreChips: true,         // Si activeChipsCount < maxChipsAllocated
  canAddFamilyMember: false,
  
  // Estadísticas de consumo
  activeChipsCount: 1,
  familyProfilesCount: 0,
  contactsCount: 2,
  scansCount: 0, // TODO: implementar
  
  // Status del setup
  hasCompletedMedicalProfile: true,
  hasEmergencyContact: true,
  hasActivatedChip: true,
  setupChecklist: { setupComplete: true, ... }
}

// El dashboard/sidebar usa estos flags para renderizar:
if (state.isFamily) render("Perfiles Médicos")
if (state.isOrganization) render("Mi Empresa")
if (state.canManageFamilyProfiles) render("Agregar Familia")
```

**Caché distribuida**: Con Redis (Upstash), se cachea por 5 minutos con clave `accountstate:{userId}`

---

### 2.4 Flujo de Pagos y Compra de Planes

**Secuencia**: Usuario selecciona plan → Checkout Stripe → Webhook webhook → Actualiza account

```
PASO 1: SELECCIONAR PLAN (Frontend)
├─ GET /api/admin/packages (lista planes activos)
├─ Usuario hace click en "Comprar" o "Upgrade"
└─ Abre modal con plan details (nombre, precio, chips, perfiles)

PASO 2: CREAR SESIÓN DE CHECKOUT (POST /api/payments/checkout)
├─ Input: { packageId }
├─ Backend:
│  ├─ Busca Package en BD (SSOT)
│  ├─ Valida que isActive = true
│  ├─ Crea Stripe CheckoutSession con:
│  │  ├─ amount: package.price (en centavos)
│  │  ├─ metadata: { userId, packageId } ← IMPORTANTE para webhook
│  │  └─ urls: { successUrl, cancelUrl }
│  └─ Retorna: { url: "https://checkout.stripe.com/..." }
└─ Frontend: Redirige a URL de Stripe

PASO 3: PAGO EN STRIPE
├─ Usuario ingresa tarjeta, CVC, etc.
├─ Stripe procesa pago
├─ ✅ Success → redirige a successUrl
└─ ❌ Cancel → redirige a cancelUrl

PASO 4: WEBHOOK DE STRIPE (POST /api/payments/webhook)
├─ Stripe envía evento: "checkout.session.completed"
├─ Backend valida firma de Stripe
├─ Busca metadata: { userId, packageId }
├─ ❌ BUG CRÍTICO: No actualiza Account.packageId ni maxChipsAllocated
│  (El webhook recibe sesión pero no hace transacción de actualización)
├─ Debería:
│  ├─ UPDATE Account.packageId = packageId
│  ├─ UPDATE Account.maxChipsAllocated = Package.maxChips
│  ├─ UPDATE Account.maxProfilesAllocated = Package.maxProfiles
│  └─ CREATE Order { status: "completed", paymentStatus: "completed" }
└─ Retorna: { received: true }

PASO 5: VERIFICAR ESTADO (GET /api/account/state)
├─ Dashboard verifica si canActivateMoreChips ahora = true
└─ Muestra "Tu plan fue actualizado"
```

**⚠️ BUGS CONOCIDOS**:
1. Checkout recibe `priceAmount` del frontend (no validado) ← Inyección de precio
2. Webhook no actualiza account → Usuario no ve cambios
3. Chip individual ($25) está hardcodeado en `add-chips/route.ts`
4. Stripe key podría estar expuesta si no está en env vars

---

### 2.5 Flujo de Notificaciones de Emergencia

**Orquestación**: `lib/notifications.ts` → EmailService / SmsService / WhatsappService

```
TRIGGER: POST /api/public/{shortCode}/scan
├─ 1. Registra ScanEvent
├─ 2. Obtiene Profile + ProfileContacts
├─ 3. Para cada ProfileContact donde active = true:
│  └─ Si notifyEmail = true && contact.email exists:
│     └─ sendEmergencyNotification({
│        type: "email",
│        profileName: profile.firstName,
│        location: { lat, lng },
│        shortCode
│     })
│     └─ EmailService.send(email, html)
│        └─ Resend API (o console.log si no está configurado)
│        └─ Crea Notification { status: "pending" → "sent" }
│
├─ 4. Si notifySms = true && contact.phone exists:
│  └─ SmsService.send(phone, smsText)
│     └─ Twilio API
│     └─ Crea Notification { status: "pending" → "sent" }
│
└─ 5. Si notifyWhatsapp = true ← BUG: NUNCA EJECUTA
   └─ WhatsappService.send(phone, msg) ❌ FALTA EN scan/route.ts

REINTENTOS (Cron job cada minuto): GET /api/cron/notify
├─ SELECT Notification WHERE status = "pending" AND createdAt > 10 minutos
├─ Reintenta con exponential backoff
└─ Actualiza status → "sent" o "failed"
```

**Plantilla de Email** (HTML):
```html
<h2>🚨 Alerta de Emergencia — PreRescue ID PTY</h2>
<p>El chip de <strong>Juan Pérez</strong> fue escaneado. 
   Puede estar en una situación de emergencia.</p>
<p><strong>Ubicación GPS:</strong> 
   <a href="https://maps.google.com/?q=8.9824,-79.5199">
   8.9824, -79.5199
   </a>
</p>
<a href="https://prerescatepty.com/e/A3K9WX2P">
   Ver Perfil Médico
</a>
```

**Servicios**:
- **EmailService** (Resend): `domains/shared/services/email.service.ts`
- **SmsService** (Twilio): `domains/shared/services/sms.service.ts`
- **WhatsappService**: Mock en `domains/shared/services/whatsapp.service.ts`

---

### 2.6 Flujo de Administración

**Acceso**: Solo usuarios con `isAdmin = true` y `adminRole ∈ ["admin", "superadmin", "imprenta"]`

```
DASHBOARD ADMIN (POST /app/(admin)/admin/page.tsx - 2515 líneas ⚠️)
├─ STATS
│  ├─ GET /api/admin/stats → total users, chips, scans, revenue
│  └─ Gráficos de uso (frontend renderiza)
│
├─ GESTIÓN DE USUARIOS
│  ├─ GET /api/admin/users?search={email}
│  ├─ Busca usuarios por email/phone
│  └─ Puede ver: email, phone, role, status, accountId
│
├─ GESTIÓN DE CHIPS
│  ├─ GET /api/admin/chips
│  ├─ POST /api/admin/chips (crear batch)
│  ├─ Crea chips en bulk (ej: 100 chips de una impresora)
│  └─ Genera: shortCode, serialPublic, activationCode
│
├─ GESTIÓN DE PAQUETES
│  ├─ GET /api/admin/packages
│  ├─ POST /api/admin/packages
│  ├─ PUT /api/admin/packages/:id
│  ├─ DELETE /api/admin/packages/:id
│  └─ CRUD completo de planes (DB source of truth)
│
├─ GESTIÓN DE ADMINS
│  ├─ POST /api/admin/admins (crear admin)
│  ├─ DELETE /api/admin/admins/:id (remover admin)
│  └─ Roles: admin, superadmin, imprenta
│
├─ GESTIÓN DE ORGANIZACIONES
│  ├─ GET /api/admin/organizations
│  ├─ POST /api/admin/organizations
│  ├─ Ver todas las empresas/colegios registrados
│  └─ Puede cambiar status, ver members
│
└─ CRON JOBS (Automatizados, ejecutan cada X tiempo)
   ├─ /api/cron/expire-chips (diario a las 00:00 UTC)
   │  └─ SELECT Chip WHERE serviceEndDate < NOW AND status = "activated"
   │     └─ UPDATE Chip.serviceStatus = "expired"
   │
   └─ /api/cron/notify (cada minuto)
      └─ SELECT Notification WHERE status = "pending"
         └─ Reintentar envío (email, SMS, WhatsApp)
```

**Guard de Admin**: `withAdminAuth(handler, roles)` en `lib/guards.ts`

---

## 3️⃣ RUTAS API Y ENDPOINTS

### 3.1 Mapa de Endpoints por Dominio

#### 📱 **AUTH** (Autenticación)

| Método | Endpoint | Descripción | Auth | Parámetros | Respuesta |
|--------|----------|-------------|------|-----------|-----------|
| `POST` | `/api/auth/register` | Crear cuenta | ❌ | email, password, phone, accountType | { userId, message } |
| `POST` | `/api/auth/[...nextauth]` | NextAuth (login/logout) | ❌ | credenciales | JWT session |
| `POST` | `/api/auth/forgot-password` | Reset password request | ❌ | email | { message } |
| `POST` | `/api/auth/reset-password` | Actualizar contraseña | ❌ | token, newPassword | { success } |

#### 👤 **USERS** (Usuarios y Perfiles)

| Método | Endpoint | Descripción | Auth | Input | Output |
|--------|----------|-------------|------|-------|--------|
| `GET` | `/api/users/profile` | Mi perfil médico | ✅ User | - | Profile { firstName, lastName, bloodType, ... } |
| `PUT` | `/api/users/profile` | Actualizar perfil | ✅ User | { firstName, lastName, bloodType, ... } | Profile |
| `GET` | `/api/users/profiles` | Todos los perfiles de la cuenta | ✅ User | - | Profile[] |
| `POST` | `/api/users/familia/create-profile` | Crear perfil familiar | ✅ User (family) | { firstName, lastName, birthDate, bloodType, ... } | Profile |
| `PUT` | `/api/users/familia/:profileId` | Actualizar perfil familiar | ✅ User | { firstName, lastName, ... } | Profile |
| `DELETE` | `/api/users/familia/:profileId` | Eliminar perfil familiar | ✅ User | - | { success } |
| `POST` | `/api/users/familia/:profileId/contacts` | Agregar contacto a perfil | ✅ User | { fullName, phone, email, relationship, notifyX } | ProfileContact |
| `GET` | `/api/users/notifications/account` | Notificaciones de la app | ✅ User | - | AppNotification[] |

#### 🔗 **CHIPS** (Dispositivos NFC/QR)

| Método | Endpoint | Descripción | Auth | Input | Output |
|--------|----------|-------------|------|-------|--------|
| `POST` | `/api/chips/activate` | Activar chip con código | ✅ User | { activationCode } | { success, serviceEndDate } |
| `GET` | `/api/chips/dashboard` | Mis chips | ✅ User | - | Chip[] { shortCode, status, serviceEndDate, ... } |
| `GET` | `/api/chips/scans` | Historial de escaneos | ✅ User | page, limit | ScanEvent[] { scannedAt, city, country, geoLat, geoLng } |

#### 👥 **CONTACTS** (Contactos de Emergencia)

| Método | Endpoint | Descripción | Auth | Input | Output |
|--------|----------|-------------|------|-------|--------|
| `GET` | `/api/contacts/dashboard` | Mis contactos | ✅ User | - | Contact[] |
| `POST` | `/api/contacts/dashboard` | Crear contacto | ✅ User | { fullName, phone, email, relationship, notifyX } | Contact |
| `PUT` | `/api/contacts/dashboard/:id` | Actualizar contacto | ✅ User | { fullName, phone, ... } | Contact |
| `DELETE` | `/api/contacts/dashboard/:id` | Eliminar contacto | ✅ User | - | { success } |
| `GET` | `/api/contacts/public?chipId=X` | Contactos públicos (emergencia) | ❌ | chipId, permisos | Contact[] (nombres + teléfono) |

#### 🏢 **ORGANIZATIONS** (Empresas/Colegios)

| Método | Endpoint | Descripción | Auth | Input | Output |
|--------|----------|-------------|------|-------|--------|
| `GET` | `/api/organizations/current` | Mi organización | ✅ OrgMember | - | Organization { id, legalName, ... } |
| `GET` | `/api/organizations/current/members` | Miembros de mi org | ✅ OrgMember | - | OrganizationMember[] |
| `POST` | `/api/organizations/actions` | Crear/actualizar org | ✅ User | { legalName, organizationType, ... } | Organization |

#### 💳 **PAYMENTS** (Pagos)

| Método | Endpoint | Descripción | Auth | Input | Output |
|--------|----------|-------------|------|-------|--------|
| `POST` | `/api/payments/checkout` | Crear sesión Stripe | ✅ User | { packageId } | { url: "https://checkout.stripe.com/..." } |
| `POST` | `/api/payments/webhook` | Webhook Stripe | ❌ (Stripe signed) | evento Stripe | { received: true } |

#### 🎟️ **ACCOUNT** (Cuenta y Estado)

| Método | Endpoint | Descripción | Auth | Input | Output |
|--------|----------|-------------|------|-------|--------|
| `GET` | `/api/account/state` | Estado actual de la cuenta | ✅ User | - | AccountState { packageName, maxChips, canActivate, ... } |
| `POST` | `/api/account/add-chips` | Comprar chips individuales | ✅ User (family+) | { quantity } | { totalPrice } |

#### 🚨 **PUBLIC** (Emergencia - Sin auth)

| Método | Endpoint | Descripción | Auth | Input | Output |
|--------|----------|-------------|------|-------|--------|
| `GET` | `/api/public/:shortCode` | Obtener perfil público | ❌ | shortCode | Profile (médico + contactos) |
| `POST` | `/api/public/:shortCode/scan` | Registrar escaneo | ❌ | geoLat, geoLng, sourceType | { success, notificationsSent } |

#### 📦 **PRODUCTS** (Productos)

| Método | Endpoint | Descripción | Auth | Input | Output |
|--------|----------|-------------|------|-------|--------|
| `GET` | `/api/products` | Lista de productos | ❌ | - | Product[] |

#### 🏛️ **ADMIN** (Solo Admins)

| Método | Endpoint | Descripción | Auth | Input | Output |
|--------|----------|-------------|------|-------|--------|
| `GET` | `/api/admin/packages` | Listar paquetes | ✅ Admin | - | Package[] |
| `POST` | `/api/admin/packages` | Crear paquete | ✅ Admin | { name, price, maxChips, ... } | Package |
| `PUT` | `/api/admin/packages/:id` | Actualizar paquete | ✅ Admin | { name, price, ... } | Package |
| `GET` | `/api/admin/users` | Buscar usuarios | ✅ Admin | search, limit | User[] |
| `GET` | `/api/admin/chips` | Listar chips | ✅ Admin | status, limit, offset | Chip[] |
| `POST` | `/api/admin/chips` | Crear chips en batch | ✅ Admin | { quantity, batchId, productType } | { shortCodes[], serialPublics[], activationCodes[] } |
| `GET` | `/api/admin/stats` | Estadísticas | ✅ Admin | - | { totalUsers, totalChips, totalScans, revenue } |
| `POST` | `/api/admin/admins` | Crear admin | ✅ Superadmin | { email, password, adminRole } | { adminId } |
| `DELETE` | `/api/admin/admins/:id` | Eliminar admin | ✅ Superadmin | - | { success } |

#### ⏰ **CRON** (Trabajos programados - Sin auth, protegido por API key)

| Método | Endpoint | Descripción | Trigger | Acción |
|--------|----------|-------------|---------|--------|
| `GET` | `/api/cron/expire-chips` | Expirar chips vencidos | 00:00 UTC diario | UPDATE Chip.serviceStatus = "expired" |
| `GET` | `/api/cron/notify` | Reintentar notificaciones | Cada minuto | Reintentar Notification.status = "pending" |

---

### 3.2 Patrones de Respuesta

#### ✅ Respuesta exitosa (2xx)
```json
{
  "data": { /* objeto específico del endpoint */ },
  "message": "Operación completada",
  "timestamp": "2026-05-21T14:30:00Z"
}
```

#### ❌ Errores (4xx/5xx)
```json
{
  "error": "Descripción del error",
  "code": "ERROR_CODE",
  "status": 400,
  "details": { /* contexto adicional */ }
}
```

#### 🔐 Errores comunes
- `401`: No autorizado (sin JWT)
- `403`: Prohibido (no permisos)
- `404`: Recurso no encontrado
- `409`: Conflicto (email duplicado, código ya usado)
- `429`: Rate limit excedido
- `500`: Error del servidor (Sentry reporta)

---

## 4️⃣ MODELO DE DATOS COMPLETO

### 4.1 Diagrama de Relaciones

```
┌─────────────┐
│  Package    │ (planes/paquetes)
└──────┬──────┘
       │ 1:N
       ↓
┌─────────────────┐
│   Account       │ ← CENTRO: contiene maxChips, packageId, accountType
└──┬──────────────┘
   │ 1:N
   ├──→ User (1:N)        ← email, password, role
   ├──→ Profile (1:N)     ← Perfil médico (firstName, bloodType, etc.)
   ├──→ Chip (1:N)        ← Dispositivos NFC/QR
   ├──→ Organization (1:N)← Empresas/Colegios
   └──→ Order (1:N)       ← Pedidos/Pagos

User
├─ 1:1 Profile (userId unique)
├─ 1:N Chip (como ownerUserId)
├─ 1:N Order
└─ 1:N Consent

Profile
├─ 1:N ProfileContact (emergencyContacts)
├─ 1:N Chip (como assignedProfileId)
├─ 1:N OrganizationMember
└─ 1:1 DigitalPass

Chip
├─ 1:N ScanEvent (cuando se escanea)
├─ 1:N Notification (envíos de alerta)
└─ 1:N ChipClaimToken (códigos de activación)

Organization
├─ 1:N OrganizationMember
└─ Account (1:1)
```

### 4.2 Entidades Principales

#### 📦 **Package** (Planes - FUENTE DE VERDAD)
```sql
id              VARCHAR(24)  PRIMARY KEY
name            VARCHAR      UNIQUE      -- "Plan Duo", "Family Club"
slug            VARCHAR      UNIQUE      -- "plan-duo"
maxChips        INT                      -- 2, 3, 5, 20, 50
maxProfiles     INT          DEFAULT 1   -- Familias pueden tener >1
price           FLOAT                    -- 45.00
description     TEXT         NULLABLE
isActive        BOOLEAN      DEFAULT true
accountType     VARCHAR      -- "personal", "family", "company", "school"
icon            VARCHAR      NULLABLE    -- emoji o URL
color           VARCHAR      NULLABLE    -- "blue", "indigo"
recommended     BOOLEAN      DEFAULT false
displayOrder    INT          DEFAULT 0   -- para ordenar en UI
savings         VARCHAR      NULLABLE    -- "20% de descuento"
allowsFamilyProfiles      BOOLEAN DEFAULT false
allowsOrganizationModule  BOOLEAN DEFAULT false
allowsSchoolModule        BOOLEAN DEFAULT false
serviceDurationMonths INT   DEFAULT 24  -- Meses válido
createdAt       TIMESTAMP    DEFAULT NOW
updatedAt       TIMESTAMP    DEFAULT NOW
```

#### 👥 **Account** (Cuenta del cliente)
```sql
id                  VARCHAR(24)  PRIMARY KEY
accountType         VARCHAR      -- "personal", "family", "company", "school"
accountName         VARCHAR      -- email del propietario o nombre
ownerUserId         VARCHAR(24)  FK User
status              VARCHAR      DEFAULT "active" -- "active", "suspended", "deleted"
packageId           VARCHAR(24)  FK Package
maxChipsAllocated   INT          DEFAULT 1  -- Del plan, o incrementado
maxProfilesAllocated INT         DEFAULT 1  -- Del plan
additionalChips     INT          DEFAULT 0  -- Chips comprados extra
createdAt           TIMESTAMP    DEFAULT NOW
updatedAt           TIMESTAMP    DEFAULT NOW
```

#### 👤 **User** (Usuario/Login)
```sql
id              VARCHAR(24)  PRIMARY KEY
accountId       VARCHAR(24)  FK Account  NULLABLE
email           VARCHAR      UNIQUE
phone           VARCHAR      NULLABLE
passwordHash    VARCHAR      -- bcryptjs
role            VARCHAR      DEFAULT "owner"  -- "owner", "member"
isAdmin         BOOLEAN      DEFAULT false
adminRole       VARCHAR      NULLABLE  -- "admin", "superadmin", "imprenta"
status          VARCHAR      DEFAULT "active"
lastLoginAt     TIMESTAMP    NULLABLE
mfaEnabled      BOOLEAN      DEFAULT false
mfaSecret       VARCHAR      NULLABLE  -- Encriptado (TOTP)
deletedAt       TIMESTAMP    NULLABLE  -- Soft delete GDPR
createdAt       TIMESTAMP    DEFAULT NOW
updatedAt       TIMESTAMP    DEFAULT NOW

INDEX isAdmin, email, phone
```

#### 🩺 **Profile** (Perfil Médico)
```sql
id                      VARCHAR(24)  PRIMARY KEY
accountId               VARCHAR(24)  FK Account
userId                  VARCHAR(24)  UNIQUE FK User
firstName               VARCHAR
lastName                VARCHAR
displayNamePublic       VARCHAR      NULLABLE -- Nombre público alternativo
birthDate               DATE         NULLABLE
sex                     VARCHAR      NULLABLE -- "M", "F", "O"
bloodType               VARCHAR      -- "O+", "AB-", "Pendiente"
allergies               TEXT         DEFAULT ""
chronicConditions       TEXT         DEFAULT "" -- Diabetes, asma, etc.
medications             TEXT         DEFAULT "" -- Aspirina, Metformina
additionalNotes         TEXT         DEFAULT ""
phone                   VARCHAR      NULLABLE
nationalId              VARCHAR      NULLABLE -- Cédula
address                 TEXT         NULLABLE
city                    VARCHAR      NULLABLE
profileVisibilityStatus VARCHAR      DEFAULT "active" -- "active", "private"
photoUrl                VARCHAR      NULLABLE -- Avatar del perfil
lastScanAt              TIMESTAMP    NULLABLE
lastScanLocation        VARCHAR      NULLABLE
createdAt               TIMESTAMP    DEFAULT NOW
updatedAt               TIMESTAMP    DEFAULT NOW

INDEX accountId, userId (unique), nationalId
```

#### 🔗 **Chip** (Dispositivo NFC/QR)
```sql
id                  VARCHAR(24)  PRIMARY KEY
accountId           VARCHAR(24)  FK Account
assignedProfileId   VARCHAR(24)  FK Profile  NULLABLE
chipUidInternal     VARCHAR      UNIQUE     -- UUID del chip físico
serialPublic        VARCHAR      UNIQUE     -- "PRP-2026-A3K9"
shortCode           VARCHAR      UNIQUE     -- "A3K9WX2P" (lo que se imprime/graba)
nfcUrl              VARCHAR      -- "https://prerescatepty.com/e/A3K9WX2P?source=nfc"
qrUrl               VARCHAR      -- "https://prerescatepty.com/e/A3K9WX2P"
batchId             VARCHAR      NULLABLE   -- "BATCH-2026-001"
productType         VARCHAR      DEFAULT "sticker_nfc_qr"
nicheType           VARCHAR      DEFAULT "motorcycle" -- "helmet", "vehicle", "pet", etc.
internalLabel       VARCHAR      UNIQUE NULLABLE
chipAlias           VARCHAR      NULLABLE   -- Nombre custom "Casco Moto"
status              VARCHAR      DEFAULT "inventory"
                    -- "inventory": nuevo sin asignar
                    -- "sold": vendido pero no activado
                    -- "activated": en uso
                    -- "suspended": pausado
                    -- "retired": fin de vida
                    -- "replaced": reemplazado
ownerUserId         VARCHAR(24)  FK User
activatedAt         TIMESTAMP    NULLABLE
lastScanAt          TIMESTAMP    NULLABLE
lastScanLocation    VARCHAR      NULLABLE   -- "Panama City, Panama"
transferLock        BOOLEAN      DEFAULT false -- Bloquea transferencia
serviceStartDate    TIMESTAMP    NULLABLE
serviceEndDate      TIMESTAMP    NULLABLE   -- NOW + 24 meses
serviceStatus       VARCHAR      DEFAULT "active" -- "active", "expired"
isPhysical          BOOLEAN      DEFAULT false -- true si es sticker físico
createdAt           TIMESTAMP    DEFAULT NOW
updatedAt           TIMESTAMP    DEFAULT NOW

INDEX accountId, ownerUserId, status, serviceEndDate
```

#### 📍 **ScanEvent** (Registro de escaneos)
```sql
id                  VARCHAR(24)  PRIMARY KEY
chipId              VARCHAR(24)  FK Chip (onDelete CASCADE)
profileId           VARCHAR(24)  FK Profile NULLABLE
accountId           VARCHAR(24)  FK Account
scannedAt           TIMESTAMP    DEFAULT NOW
sourceType          VARCHAR      DEFAULT "qr" -- "qr", "nfc"
ipAddress           VARCHAR      NULLABLE
userAgent           VARCHAR      NULLABLE
geoLat              FLOAT        NULLABLE
geoLng              FLOAT        NULLABLE
geoAccuracy         FLOAT        NULLABLE   -- metros
country             VARCHAR      NULLABLE
city                VARCHAR      NULLABLE
address             VARCHAR      NULLABLE
emergencyMode       BOOLEAN      DEFAULT true
notificationStatus  VARCHAR      DEFAULT "pending" -- "pending", "sent", "failed"
rawMetadataJson     TEXT         NULLABLE   -- JSON extra

INDEX accountId, chipId, scannedAt, country, city
```

#### 📬 **Notification** (Envíos de alerta)
```sql
id                  VARCHAR(24)  PRIMARY KEY
chipId              VARCHAR(24)  FK Chip (onDelete CASCADE)
eventId             VARCHAR(24)  -- referencia a ScanEvent.id
channel             VARCHAR      -- "email", "sms", "whatsapp"
recipient           VARCHAR      -- email o teléfono
status              VARCHAR      DEFAULT "pending"
                    -- "pending": en espera
                    -- "sent": enviado exitosamente
                    -- "failed": error permanente
                    -- "retrying": reintentando
providerResponse    TEXT         NULLABLE   -- respuesta del proveedor (Resend, Twilio)
sentAt              TIMESTAMP    NULLABLE
createdAt           TIMESTAMP    DEFAULT NOW

INDEX chipId, status
```

#### 👥 **Contact** y **ProfileContact**
```sql
-- Contact (tabla de contactos globales del usuario)
id              VARCHAR(24)  PRIMARY KEY
userId          VARCHAR(24)  FK User
fullName        VARCHAR
phone           VARCHAR
email           VARCHAR      NULLABLE
relationship    VARCHAR      DEFAULT "Familiar"
notifySms       BOOLEAN      DEFAULT false
notifyEmail     BOOLEAN      DEFAULT true
notifyWhatsapp  BOOLEAN      DEFAULT false
createdAt       TIMESTAMP    DEFAULT NOW
updatedAt       TIMESTAMP    DEFAULT NOW

-- ProfileContact (unión de perfil + contacto)
id              VARCHAR(24)  PRIMARY KEY
profileId       VARCHAR(24)  FK Profile (onDelete CASCADE)
contactId       VARCHAR(24)  FK Contact (onDelete CASCADE)
relationship    VARCHAR      -- permite override
contactType     VARCHAR      DEFAULT "auxilio"
priorityOrder   INT          DEFAULT 1    -- 1º, 2º, 3º contacto
notifySms       BOOLEAN      DEFAULT false
notifyEmail     BOOLEAN      DEFAULT true
notifyWhatsapp  BOOLEAN      DEFAULT false
active          BOOLEAN      DEFAULT true
createdAt       TIMESTAMP    DEFAULT NOW
updatedAt       TIMESTAMP    DEFAULT NOW

UNIQUE (profileId, contactId)
```

#### 🏢 **Organization** y **OrganizationMember**
```sql
-- Organization
id               VARCHAR(24)  PRIMARY KEY
accountId        VARCHAR(24)  FK Account
legalName        VARCHAR      -- "Colegio San José"
displayName      VARCHAR      NULLABLE
organizationType VARCHAR      DEFAULT "company" -- "company", "school"
taxId            VARCHAR      NULLABLE
contactEmail     VARCHAR      NULLABLE
contactPhone     VARCHAR      NULLABLE
address          TEXT         NULLABLE
status           VARCHAR      DEFAULT "active"
createdAt        TIMESTAMP    DEFAULT NOW
updatedAt        TIMESTAMP    DEFAULT NOW

-- OrganizationMember
id               VARCHAR(24)  PRIMARY KEY
organizationId   VARCHAR(24)  FK Organization (onDelete CASCADE)
profileId        VARCHAR(24)  FK Profile (onDelete CASCADE)
internalCode     VARCHAR      NULLABLE -- "EMP-12345"
department       VARCHAR      NULLABLE -- "Recursos Humanos"
position         VARCHAR      NULLABLE -- "Gerente"
memberStatus     VARCHAR      DEFAULT "active"
createdAt        TIMESTAMP    DEFAULT NOW
updatedAt        TIMESTAMP    DEFAULT NOW
```

#### 🛒 **Order** y **OrderItem**
```sql
-- Order
id                  VARCHAR(24)  PRIMARY KEY
orderNumber         VARCHAR      UNIQUE
userId              VARCHAR(24)  FK User
amount              FLOAT
currency            VARCHAR      DEFAULT "USD"
orderStatus         VARCHAR      DEFAULT "pending"
                    -- "pending": en espera
                    -- "processing": en proceso
                    -- "completed": completado
                    -- "cancelled": cancelado
paymentStatus       VARCHAR      DEFAULT "pending"
                    -- "pending": sin procesar
                    -- "completed": pagado
                    -- "failed": error
provider            VARCHAR      DEFAULT "manual" -- "stripe", "yappy"
providerReference   VARCHAR      NULLABLE -- Stripe session ID
paymentProofUrl     VARCHAR      NULLABLE
customerName        VARCHAR      NULLABLE
customerEmail       VARCHAR      NULLABLE
customerPhone       VARCHAR      NULLABLE
customerDocument    VARCHAR      NULLABLE
shippingAddress     TEXT         NULLABLE
shippingCity        VARCHAR      NULLABLE
shippingNotes       TEXT         NULLABLE
createdAt           TIMESTAMP    DEFAULT NOW
updatedAt           TIMESTAMP    DEFAULT NOW

INDEX userId, orderStatus, paymentStatus

-- OrderItem
id                  VARCHAR(24)  PRIMARY KEY
orderId             VARCHAR(24)  FK Order (onDelete CASCADE)
productType         VARCHAR      -- "sticker_nfc_qr"
quantity            INT          DEFAULT 1
unitPrice           FLOAT
totalPrice          FLOAT
createdAt           TIMESTAMP    DEFAULT NOW
updatedAt           TIMESTAMP    DEFAULT NOW

INDEX orderId
```

#### 🔐 **ChipClaimToken** (Código de activación)
```sql
id              VARCHAR(24)  PRIMARY KEY
chipId          VARCHAR(24)  FK Chip (onDelete CASCADE)
activationCode  VARCHAR      UNIQUE -- "XXXX-XXXX-XXXX"
orderId         VARCHAR(24)  FK Order NULLABLE
expiresAt       TIMESTAMP    -- Generalmente NOW + 1 año
usedAt          TIMESTAMP    NULLABLE -- Cuando se activó
createdAt       TIMESTAMP    DEFAULT NOW
```

#### 📋 **AuditLog** (Trazabilidad)
```sql
id              VARCHAR(24)  PRIMARY KEY
accountId       VARCHAR(24)  NULLABLE
actorUserId     VARCHAR(24)  NULLABLE -- Quién hizo la acción
entityType      VARCHAR      -- "user", "chip", "profile"
entityId        VARCHAR(24)  -- ID de lo que cambió
action          VARCHAR      -- "create", "update", "delete"
oldValuesJson   TEXT         NULLABLE -- JSON con valores antes
newValuesJson   TEXT         NULLABLE -- JSON con valores después
createdAt       TIMESTAMP    DEFAULT NOW

INDEX accountId, entityId, actorUserId, action, createdAt
```

---

## 5️⃣ SERVICIOS Y LÓGICA COMPARTIDA

### 5.1 Servicios Principales

#### 🧠 **AccountStateService** (`domains/accounts/services/account-state.service.ts`)
**Propósito**: Cerebro central que calcula todo el estado de una cuenta

```typescript
// Métodos públicos
static async getAccountState(userId: string): Promise<AccountState>
  → Retorna todo lo que necesita el dashboard
  → Caché en Redis (5 minutos)

static isMedicalProfileComplete(profile: Profile): boolean
  → Valida que firstName, lastName, bloodType sean válidos

// Métodos privados
static resolveAccountCategory()
  → Determina si es personal, family, corporate

static calculateServiceStatus()
  → Calcula si está expired, inactive, active

// Datos procesados
accountType: "personal" | "family" | "company" | "school"
isPersonal, isFamily, isCorporate, isOrganization: boolean
canActivateMoreChips, canManageFamilyProfiles: boolean
maxChipsAllocated, activeChipsCount: number
setupChecklist: { medicalProfileComplete, chipActivated, emergencyContactAdded }
```

#### 📧 **EmailService** (`domains/shared/services/email.service.ts`)
**Propósito**: Envío de emails transaccionales

```typescript
static async send(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }>
  → Usa Resend si RESEND_API_KEY está configurado
  → Fallback a console.log en development
  → Retorna { id } de Resend si success
```

#### 📱 **SmsService** (`domains/shared/services/sms.service.ts`)
**Propósito**: Envío de SMS

```typescript
static async send(
  to: string,
  message: string
): Promise<{ success: boolean; data?: { sid: string }; error?: string }>
  → Usa Twilio si TWILIO_* env vars están configuradas
  → Retorna sid de Twilio
```

#### 💬 **WhatsappService** (`domains/shared/services/whatsapp.service.ts`)
**Propósito**: Envío de WhatsApp (MOCK - NO IMPLEMENTADO)

```typescript
static async send(
  to: string,
  message: string
): Promise<{ success: boolean; message?: string; error?: string }>
  → ACTUALMENTE MOCK - retorna { success: true }
  → ❌ BUG: No se integra en scan/route.ts
```

#### 💳 **PaymentService** (`domains/shared/services/payment.service.ts`)
**Propósito**: Integración con Stripe

```typescript
static async createCheckoutSession(
  userId: string,
  planName: string,
  price: number,
  successUrl: string,
  cancelUrl: string,
  packageId: string  // metadata
): Promise<{ url: string; sessionId: string }>
  → Crea sesión Stripe
  → Guarda packageId en metadata para webhook
  → Retorna URL de checkout
```

### 5.2 Funciones Compartidas (lib/)

#### 🔐 **Guard Functions** (`lib/guards.ts`)
```typescript
async function isAdmin(): boolean
  → Verifica si usuario es admin/superadmin

async function belongsToAccount(accountId: string): boolean
  → Verifica si usuario pertenece a la cuenta

async function isOrgManager(organizationId: string): boolean
  → Verifica si es manager de la organización

async function withAdminAuth(handler, roles[]): Promise<Response>
  → Wrapper para endpoints solo-admin
```

#### 🛡️ **Rate Limiting** (`lib/rateLimit.ts`)
```typescript
async function rateLimit(
  namespace: string,         // "login", "register", "scan"
  identifier: string,        // IP address
  options: {
    limit: number,          // máximo intentos
    windowMs: number        // ventana de tiempo (ms)
  }
): Promise<{ allowed: boolean; remaining: number; resetAt: number }>
  → Usa Upstash Redis si está configurado
  → Fallback a Map in-memory
  → Ventanas deslizantes (sliding windows)
```

**Configuración actual**:
- Login: 10 intentos / 15 minutos
- Registro: 5 intentos / 15 minutos
- Scan: Ilimitado (sin rate limit)

#### ✅ **Validación** (`lib/validations.ts`)
```typescript
// Schemas Zod
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  accountType: z.enum(["personal", "family", "company", "school"]).optional()
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  mfaCode: z.string().optional()
})

// Funciones de validación
function validateOrThrow<T>(schema, data): T
  → Lanza error si falla

function validateOrNull<T>(schema, data): { data: T | null; error: string | null }
  → Retorna null sin lanzar
```

#### 🗺️ **Geocoding** (`lib/geocoding.ts`)
```typescript
async function getReverseGeocoding(
  lat: number,
  lng: number
): Promise<{ address?: string; city?: string; country?: string }>
  → Usa OpenStreetMap Nominatim API (libre)
  → Convierte GPS a dirección legible
  → Usado en ScanEvent para mostrar ubicación en alertas
```

#### 🔒 **Encriptación** (`lib/encryption.ts`)
```typescript
function encrypt(text: string): string
  → AES-256-GCM (algoritmo)
  → Clave del env: ENCRYPTION_KEY

function decrypt(text: string): string
  → Desencripta con la misma clave
  → Usado para MFA secret (TOTP)
```

#### 🆔 **Identificadores** (`lib/identifiers.ts`)
```typescript
async function getUniqueShortCode(): Promise<string>
  → Genera "A3K9WX2P" (8 caracteres)
  → Verifica unicidad en BD (retry si duplicado)

async function getUniqueSerialPublic(): Promise<string>
  → Genera "PRP-2026-A3K9" (formato legible)
  → Printed en el sticker

async function getUniqueActivationCode(): Promise<string>
  → Genera "XXXX-XXXX-XXXX" (formato amigable)
  → Lo que el usuario ingresa en /activar

async function getUniqueBatch(count: number): Promise<Batch>
  → Genera batch de 100 chips en paralelo
  → Usado por admin para crear stocks
```

#### 🔔 **Notificaciones** (`lib/notifications.ts`)
```typescript
async function sendEmergencyNotification(data: {
  recipient: string,
  type: "email" | "sms" | "whatsapp",
  profileName: string,
  location?: { lat, lng },
  shortCode: string,
  notificationId: string
}): Promise<{ success: boolean; providerResponse?: string }>
  → Orquesta envío multi-canal
  → Crea registro en Notification table
  → Reintento automático vía cron job

async function sendTransactionalEmail(
  email: string,
  subject: string,
  html: string
): Promise<{ success: boolean }>
  → Para emails de confirmación, password reset, etc.
```

---

## 6️⃣ FLUJOS CRÍTICOS Y PUNTOS DE QUIEBRE

### 6.1 ¿Dónde pueden romperse las cosas?

#### 🔴 **CRÍTICO - Flujo de Emergencia**
```
Si ANY de estos fallan, contacto NO se entera:

1. POST /api/public/{shortCode}/scan falla
   → No se registra ScanEvent
   → No se busca ProfileContact
   → No se envía notificación

2. Profile.profileVisibilityStatus = "private"
   → GET /api/public/{shortCode} retorna 404
   → Rescatista ve página de error

3. ProfileContact.active = false O notifyEmail = false
   → Contacto no recibe email

4. EmailService.send() falla (Resend down)
   → Email en Notification.status = "pending"
   → Cron job reintenta cada minuto
   → Pero hay lag (hasta 1 minuto de espera)

5. ScanEvent.geoLat/geoLng = null
   → Email/SMS tiene location = undefined
   → No se muestra GPS en alerta

RIESGO: Si contacto no tiene email O email no está configurado,
        NO HAY FORMA DE NOTIFICAR (SMS y WhatsApp no existen)
```

#### 🔴 **CRÍTICO - Activación de Chip**
```
Si ANY falla, usuario no puede activar:

1. ChipClaimToken.expiresAt < NOW
   → Código expirado
   → Usuario no puede activar
   → Código es ÚNICO en BD → no puede regenerarse

2. AccountStateService.isMedicalProfileComplete() = false
   → Profile.firstName ó lastName vacíos O bloodType = "Pendiente"
   → Bloquea activación
   → Usuario debe ir a /dashboard/perfil primero

3. Account.maxChipsAllocated = 0
   → Incluso con accountType="personal" y packageId=null
   → Usuario no puede activar NI UN CHIP
   → PROBLEMA: seed.ts crea esto así

4. Chip.status ∉ ["inventory", "sold"]
   → Chip ya está "activated" o "retired"
   → No se puede activar dos veces

5. serviceStartDate es NULL pero auto-calcula serviceEndDate
   → Puede causar NaN si se suma a NULL
```

#### 🔴 **CRÍTICO - Checkout y Pagos**
```
Si ANY falla, usuario queda sin plan:

1. POST /api/payments/checkout recibe { priceAmount } del frontend
   → Usuario puede enviar $1 en lugar de $45
   → Backend NO VALIDA contra Package.price en BD

2. Webhook de Stripe no ejecuta UPDATE Account
   → Usuario paga pero Account.packageId NO cambia
   → Dashboard muestra plan anterior
   → maxChipsAllocated no se incrementa
   → Usuario frustrado

3. Stripe session metadata no incluye packageId
   → Webhook no sabe qué plan compró
   → Imposible hacer update

4. Order NOT created en la BD
   → No hay registro de quién compró qué
   → Sin auditoría de ventas
```

#### 🔴 **ALTO - Permisos de Sidebar**
```
Si AccountStateService calcula mal, UI rompe:

1. isMedicalProfileComplete = false pero user completó perfil
   → Sidebar muestra "Completa tu perfil" incorrectamente
   → Verifica bloodType !== "Pendiente" pero user lo dejó así

2. accountType = "usuario" (bug de seed)
   → isFamily = false, isOrganization = false
   → Sidebar no muestra "Perfiles Médicos" ni "Mi Empresa"
   → User no puede acceder a features que pagó

3. maxProfilesAllocated leído de Account pero Package tiene otro valor
   → Frontend piensa que tiene 1 perfil, backend permite 2
   → Inconsistencia de datos
```

#### 🔴 **MEDIO - Planes Hardcodeados**
```
Si cambias un precio en DB pero no en componentes:

1. Landing page (app/page.tsx líneas 12-18)
   → Muestra "Plan Estándar $25"
   → Pero en BD es "Personal Básico $19.99"
   → User confundido

2. Comprar page (app/(public)/comprar/page.tsx líneas 9-14)
   → Hardcodeado igual que landing
   → Mismo problema

3. Upgrade page (app/(app)/dashboard/upgrade/page.tsx líneas 9-42)
   → DIFERENTE a landing y comprar
   → "Family Club" vs "Familiar Estándar"
   → 3 vs 5 chips

4. plan-catalog.ts tiene 7ª versión con precios DIFERENTES
   → "Personal Básico $19.99" vs "Plan Estándar $25"
   → Fuzzy matching en getPlan() usa esto
```

### 6.2 Orden de llamadas de API críticas

```
CORRECTO (activación de chip):
1. ✅ PUT /api/users/profile (completar bloodType)
   └─ Valida: isMedicalProfileComplete = true

2. ✅ POST /api/chips/activate
   └─ Valida: hasCompletedMedicalProfile = true
   └─ Si falla limit → auto-upgrade account
   └─ UPDATE Chip.status = "activated"

3. ✅ GET /api/account/state (verificar nuevo estado)
   └─ Muestra: activeChipsCount: 1, canActivateMoreChips: true

INCORRECTO (rompe):
❌ POST /api/chips/activate SIN completar perfil
   └─ 400: "Debes completar tu perfil médico"

❌ POST /api/chips/activate CON Account.maxChipsAllocated = 0
   └─ 403: "No tienes chips disponibles"
```

### 6.3 Qué puede causar downtime

#### 🔴 **Base de datos (PostgreSQL)**
- Si Supabase cae → TODO falla (no hay ORM failover)
- Conexión slow → queries largas → timeouts

#### 🔴 **Servicios externos**
- Resend down → Emails no se envían (cron reintenta)
- Twilio down → SMS no se envían (cron reintenta)
- Stripe down → Checkout falla (puede retentarse)
- OpenStreetMap down → Geocoding falla (opcional, warning)

#### 🔴 **Cache (Upstash Redis)**
- Si cae, fallback a in-memory (funciona, pero sin persistencia)
- Rate limiting menos efectivo en multi-instancia

#### 🔴 **NextAuth + JWT**
- Si NEXTAUTH_SECRET corrupted → sesiones inválidas
- Todos los usuarios deslogueados

#### 🔴 **Code deploy**
- Si next build falla → no deployea
- Si migration falla → BD inconsistente
- Si env vars faltan → crashes en runtime

---

## 7️⃣ BUGS VERIFICADOS (A CORREGIR PRIORITARIAMENTE)

### BUG-01 🔴 CRÍTICO: Planes en 5 lugares diferentes

| Lugar | Precios | Chips | Problema |
|-------|---------|-------|----------|
| `page.tsx:12-18` | $25,$45,$65,$95,$250,$450 | 1,2,3,5,20,50 | Hardcoded |
| `comprar/page.tsx:9-14` | Idem | Idem | Duplicado |
| `upgrade/page.tsx:9-42` | $45,$65,$95 | 2,3,5 | INCOMPLETO |
| `plan-catalog.ts:17-115` | $19.99,$39.99,$59.99,$89.99,$249.99,$799.99 | 1,3,5,10,25,100,200 | DIFERENTE |
| `seed.ts:8-15` | $25,$45,$65,$95,$250,$450 | 1,2,3,5,20,50 | Duplica landing |

**Consecuencia**: `getPlan()` usa fuzzy matching. User ve "$25" en landing pero BD tiene "$19.99"

**Solución**: Eliminar hardcoding, hacer GET /api/public/packages

---

### BUG-02 🔴 CRÍTICO: Seed destruye cuentas

**Archivo**: `prisma/seed.ts:39-41`

```typescript
// ❌ INCORRECTO
accountType: 'personal' → 'usuario'  // "usuario" no es válido
```

**Consecuencia**: Todos los flags en AccountState dan false
- `isPersonal = false`
- `isFamily = false`
- Sidebar no muestra secciones

**Solución**: Cambiar a `accountType: ACCOUNT_TYPES.PERSONAL`

---

### BUG-03 🔴 CRÍTICO: Checkout no valida precio

**Archivo**: `app/api/payments/checkout/route.ts:6`

```typescript
// ❌ ANTES
const { userId, planName, priceAmount } = await req.json();
// User envía { priceAmount: 1 } → Stripe crea session por $0.01

// ✅ DESPUÉS (ya corregido en lectura)
const { packageId } = await req.json();
const pkg = await prisma.package.findUnique({ where: { id: packageId } });
const price = pkg.price;  // Validado en BD
```

**Estado**: PARCIALMENTE CORREGIDO en archivo

---

### BUG-04 🟠 ALTO: Webhook no actualiza account

**Archivo**: `app/api/payments/webhook/route.ts`

```typescript
// ❌ INCORRECTO: Webhook recibe evento pero NO actualiza
const session = await stripe.checkout.sessions.retrieve(sessionId);
// Debería:
// UPDATE Account SET packageId = metadata.packageId,
//                    maxChipsAllocated = Package.maxChips

// ✅ DEBE HACER:
const pkg = await prisma.package.findUnique({ 
  where: { id: metadata.packageId } 
});
await prisma.account.update({
  where: { id: userAccount.id },
  data: {
    packageId: pkg.id,
    maxChipsAllocated: pkg.maxChips,
    maxProfilesAllocated: pkg.maxProfiles
  }
});
```

---

### BUG-05 🟠 ALTO: WhatsApp nunca se envía

**Archivo**: `app/api/public/[shortCode]/scan/route.ts`

```typescript
// ❌ FALTA EN scan/route.ts
// Se procesa email y SMS pero NO whatsapp

for (const contact of profileContacts) {
  if (contact.notifyEmail) { /* email */ }
  if (contact.notifySms) { /* sms */ }
  // ❌ FALTA: if (contact.notifyWhatsapp) { /* whatsapp */ }
}
```

---

### BUG-06 🟠 ALTO: Duración inconsistente

- `plan-catalog.ts`: `serviceDurationMonths: 12` (1 año)
- `chips/activate/route.ts`: calcula `now + 24 meses`
- Landing dice "2 años"

**Solución**: Usar `Package.serviceDurationMonths` (defaulta 24)

---

### BUG-07 🟡 MEDIO: scansCount siempre 0

**Archivo**: `account-state.service.ts:172`

```typescript
scansCount: 0, // Placeholder — nunca se implementó
```

**Solución**: 
```typescript
scansCount: await tx.scanEvent.count({
  where: { accountId: account.id }
})
```

---

### BUG-08 🟡 MEDIO: Seed cambia accountType inválido

**Archivo**: `prisma/seed.ts`

Crea `accountType: 'personal'` pero luego algún lugar lo muta a `'usuario'`

---

## 8️⃣ RECOMENDACIONES DE ARQUITECTURA

### ✅ Fortalezas del proyecto

1. **DDD bien estructurado**: Dominio separado de presentación y API
2. **Type-safe**: TypeScript + Zod para validaciones
3. **Modular**: Servicios independientes (email, SMS, pagos)
4. **Rate limiting**: Protección contra abuso
5. **Auditoría**: AuditLog registra cambios de admin
6. **JWT + MFA**: Seguridad moderna
7. **Transacciones Prisma**: Previene race conditions

### ⚠️ Mejoras prioritarias

#### P0 (Bloquean producción)
- [ ] Eliminar planes hardcodeados → GET /api/public/packages
- [ ] Corregir seed.ts (accountType='usuario')
- [ ] Implementar webhook de Stripe (actualizar account)
- [ ] Enviar WhatsApp en scan events

#### P1 (Seguridad/Rendimiento)
- [ ] Validar precio en checkout contra BD
- [ ] Implementar cache invalidation en AccountState
- [ ] Rate limiting para endpoints públicos (scan)
- [ ] Encriptación de PII (phone, email) en ScanEvent

#### P2 (Features)
- [ ] Implementar scansCount
- [ ] Filtrar ScanEvent por fecha/ciudad en dashboard
- [ ] Integración real con WhatsApp Business API
- [ ] Soporte para múltiples idiomas

---

## 9️⃣ CHECKLIST DE CALIDAD

### Pre-Deployment
- [ ] `npm run build` sin errores
- [ ] `next lint` sin warnings
- [ ] Todas las APIs con `force-dynamic` o `revalidate`
- [ ] Rate limiting en endpoints públicos
- [ ] Auth requerido en endpoints privados
- [ ] Env vars: `NEXTAUTH_SECRET`, `DATABASE_URL`, `STRIPE_SECRET_KEY`
- [ ] Base de datos con migraciones actualizadas
- [ ] Seed ejecutado sin errores

### Verificación Funcional
- [ ] Flujo de registro → activación → escaneo
- [ ] Notificaciones llegan a email/SMS
- [ ] Dashboard muestra estado correcto
- [ ] Pagos procesan en Stripe
- [ ] Cron jobs ejecutan puntualmente
- [ ] Geolocalización de escaneos es correcta

### Seguridad
- [ ] Contraseñas hasheadas con bcrypt (salt: 12)
- [ ] JWT expira en 30 días
- [ ] Admin URLs requieren isAdmin() guard
- [ ] Rate limiting activo (login, register, scan)
- [ ] CORS configurado (no "*")
- [ ] CSP headers activados
- [ ] SQL injection imposible (Prisma ORM)
- [ ] XSS mitigado (React sanitization)

---

## 🔟 REFERENCIAS DE ARCHIVOS

**Archivos críticos por tema**:

| Tema | Archivo | Líneas | Propósito |
|------|---------|--------|----------|
| Autenticación | `lib/auth.ts` | 100+ | NextAuth config |
| Permisos | `lib/guards.ts` | 80+ | Auth guards |
| Estado de Cuenta | `domains/accounts/services/account-state.service.ts` | 250+ | Cerebro central |
| Flujo de Emergencia | `app/api/public/[shortCode]/scan/route.ts` | ~120 | Endpoint crítico |
| Activación de Chip | `app/api/chips/activate/route.ts` | ~150 | Lógica de activación |
| Notificaciones | `lib/notifications.ts` | 77 | Orquestación email/SMS |
| Pagos | `app/api/payments/checkout/route.ts` | ~40 | Stripe checkout |
| Modelo | `prisma/schema.prisma` | ~500 | BD schema |
| Constantes | `domains/shared/constants.ts` | ~150 | SSOT |

---

## ✅ CONCLUSIÓN

**PreRescatePTY es un sistema SaaS bien estructurado** con arquitectura DDD moderna. El flujo de emergencias es robusto y el modelo de datos es completo.

**Riesgos principales**:
1. Planes hardcodeados en UI → Mantener sincronizados manualmente es error-prone
2. Webhook de Stripe incompleto → Users no ven cambios post-compra
3. WhatsApp no implementado → Contactos no reciben alertas vía WA

**Con los bugs corregidos**, el sistema es production-ready. La infraestructura está bien (Supabase, Vercel, Sentry) y los guardrails de seguridad son sólidos.

---

**FIN DEL ANÁLISIS**

*Generado: 21 de mayo de 2026*  
*Próxima revisión recomendada: Post-deployment P0 fixes*
