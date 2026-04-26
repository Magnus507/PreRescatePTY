# PRE-RESCATE-PTY.md — Antigravity: Prompt Definitivo de Interconexión Total
# Generado: 2026-04-10 | Auditoría: 163 archivos, 38 rutas API, 22 páginas, 10 servicios

@AGENTS.md

---

## IDENTIDAD DEL PROYECTO

PreRescatePTY es un sistema SaaS panameño de identificación médica de emergencia. Un sticker NFC/QR se adhiere al casco, vehículo o identificación del usuario. Cuando alguien lo escanea (paramédico, civil, bombero), ve el perfil médico completo y se notifica automáticamente a los contactos de emergencia con geolocalización GPS.

**Misión**: Cada segundo cuenta en una emergencia. Un error en este código puede costar una vida.

---

## REGLA SUPREMA: SINGLE SOURCE OF TRUTH (SSOT) — CONSOLIDADO

> **Los datos de planes, precios, límites, nombres e íconos viven EXCLUSIVAMENTE en la tabla `Package` de la base de datos. TODO componente consume esos datos vía API o constantes de dominio en `src/domains/shared/constants.ts`.**

### Arquitectura Unificada:
- **Planes/Precios**: Vía `/api/public/packages`.
- **Chips Extra**: `BUSINESS_RULES.EXTRA_CHIP_PRICE` ($25.00).
- **Tipos de Cuenta**: `ACCOUNT_TYPES` (personal, family, corporate).

---

## STACK TECNOLÓGICO

| Capa | Tecnología | Notas |
|------|-----------|-------|
| Frontend | Next.js 15 (App Router) | Tailwind CSS, Lucide icons, sonner (toasts) |
| Auth | NextAuth.js (JWT, 30 días) | Credentials provider, admins + users |
| ORM | Prisma | PostgreSQL en Supabase |
| Pagos | Stripe (parcial) | Yappy/PagueloFacil en lib/payments.ts (mock) |
| Email | Resend (EmailService) | Template HTML inline |
| SMS | Twilio (SmsService) | Solo si TWILIO_* env vars |
| WhatsApp | WhatsappService | 9 líneas, todo mock |
| Validación | Zod | src/lib/validate.ts |
| Rate Limit | In-memory Map | src/lib/rateLimit.ts |

---

## ARQUITECTURA DE ARCHIVOS

```
src/
├── domains/                          ← LÓGICA DE NEGOCIO (servicios puros)
│   ├── accounts/
│   │   ├── plan-catalog.ts           ← ⚠️ CONFLICTO: catálogo estático, debe eliminarse
│   │   ├── account.types.ts          ← Interface AccountState (35+ campos)
│   │   └── services/
│   │       └── account-state.service.ts ← ⭐ CEREBRO: calcula todo el estado de cuenta
│   ├── chips/services/chip.service.ts
│   ├── profiles/services/profile.service.ts
│   ├── contacts/services/contact.service.ts
│   ├── organizations/services/org.service.ts
│   └── admin/services/admin.service.ts
│
├── services/                         ← SERVICIOS EXTERNOS
│   ├── email.service.ts (31 líneas)
│   ├── sms.service.ts (33 líneas)
│   ├── whatsapp.service.ts (9 líneas — mock)
│   └── payment.service.ts (65 líneas — Stripe)
│
├── lib/                              ← UTILIDADES COMPARTIDAS
│   ├── auth.ts (100 líneas)          ← NextAuth config, login admin+user
│   ├── prisma.ts (9 líneas)
│   ├── constants.ts (50 líneas)      ← BLOOD_TYPES, RELATIONSHIPS, generateShortCode
│   ├── guards.ts (60 líneas)         ← isAdmin, isOrgManager, belongsToAccount
│   ├── notifications.ts (77 líneas)  ← sendEmergencyNotification (email+sms)
│   ├── payments.ts (49 líneas)       ← Yappy/PagueloFacil mock
│   ├── rateLimit.ts (74 líneas)
│   ├── validate.ts (56 líneas)       ← Zod schemas
│   └── utils.ts (6 líneas)
│
├── components/
│   ├── Navbar.tsx                    ← Nav global, detecta admin vs user
│   ├── Footer.tsx                    ← Footer con disclaimer legal
│   ├── home/StickerDesign.tsx        ← Componente visual del sticker 3D
│   └── ui/button.tsx                 ← shadcn/ui button
│
├── app/
│   ├── page.tsx (286 líneas)         ← ⚠️ Landing: planes HARDCODEADOS líneas 12-18
│   ├── layout.tsx                    ← Root layout con providers
│   ├── providers.tsx                 ← SessionProvider + Toaster
│   ├── globals.css                   ← Tailwind + custom CSS vars
│   │
│   ├── (public)/                     ← PÁGINAS PÚBLICAS (sin auth)
│   │   ├── comprar/page.tsx (110 l)  ← ⚠️ Planes HARDCODEADOS líneas 9-14
│   │   ├── e/[shortCode]/page.tsx    ← ⭐ VISTA DE EMERGENCIA (346 líneas)
│   │   ├── activar/page.tsx          ← Formulario de activación de chip
│   │   ├── como-funciona/page.tsx
│   │   ├── contacto/page.tsx
│   │   ├── faq/page.tsx
│   │   ├── login/page.tsx
│   │   ├── registro/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   └── legal/{terminos,privacidad}/page.tsx
│   │
│   ├── (app)/dashboard/             ← PANEL DE CLIENTE (requiere auth)
│   │   ├── layout.tsx (180+ líneas) ← Sidebar con lógica de permisos por accountType
│   │   ├── page.tsx (488 líneas)    ← Dashboard principal
│   │   ├── perfil/page.tsx          ← Ficha médica del usuario
│   │   ├── chips/page.tsx           ← Mis dispositivos NFC
│   │   ├── familia/page.tsx (659 l) ← Perfiles familiares + contactos
│   │   ├── contactos/page.tsx       ← Contactos de emergencia
│   │   ├── historial/page.tsx       ← Historial de escaneos
│   │   ├── empresas/page.tsx (536 l)← Módulo de empresa/organización
│   │   ├── colegios/page.tsx (571 l)← Módulo de colegio
│   │   └── upgrade/page.tsx (183 l) ← ⚠️ Planes HARDCODEADOS líneas 9-42
│   │
│   ├── (admin)/admin/               ← PANEL DE ADMINISTRACIÓN
│   │   ├── layout.tsx               ← Layout admin
│   │   ├── page.tsx (2515 líneas)   ← MEGA componente admin completo
│   │   └── _components/admin-ui.tsx ← Componentes reutilizables admin
│   │
│   └── api/                         ← 38 ENDPOINTS
│       ├── account/
│       │   ├── state/route.ts       ← GET: AccountStateService.getAccountState()
│       │   └── add-chips/route.ts   ← POST: comprar chips individuales ($25 c/u)
│       ├── auth/
│       │   ├── [...nextauth]/route.ts
│       │   ├── register/route.ts    ← Crea Account+User+Profile
│       │   ├── forgot-password/route.ts
│       │   └── reset-password/route.ts
│       ├── chips/
│       │   ├── activate/route.ts    ← ⭐ Activa chip con código, asigna 2 años
│       │   ├── dashboard/route.ts   ← Lista chips del usuario
│       │   └── scans/route.ts       ← Historial de escaneos
│       ├── contacts/
│       │   ├── dashboard/route.ts   ← CRUD contactos del usuario
│       │   └── public/route.ts      ← Contactos públicos para emergencia
│       ├── users/
│       │   ├── profile/route.ts     ← GET/PUT perfil médico propio
│       │   ├── profiles/route.ts    ← Lista perfiles de la cuenta
│       │   └── familia/             ← CRUD perfiles familiares + contactos
│       ├── organizations/
│       │   ├── current/route.ts     ← Org del usuario actual
│       │   └── actions/route.ts     ← Acciones sobre la organización
│       ├── public/[shortCode]/
│       │   ├── route.ts             ← GET perfil público (lo que ve el rescatista)
│       │   └── scan/route.ts        ← ⭐ POST registra escaneo + dispara notificaciones
│       ├── payments/
│       │   ├── checkout/route.ts    ← ⚠️ Recibe precio del frontend SIN validar
│       │   └── webhook/route.ts     ← ⚠️ Stripe webhook sin fulfillment
│       ├── cron/
│       │   ├── expire-chips/route.ts ← Marca chips expirados (diario)
│       │   └── notify/route.ts      ← Reintenta notificaciones pendientes (cada minuto)
│       └── admin/                   ← Solo para rol admin/superadmin
│           ├── packages/route.ts    ← GET: lista packages activos
│           ├── stats/route.ts       ← Dashboard stats
│           ├── chips/route.ts       ← CRUD chips + inventario
│           ├── users/route.ts       ← Lista/busca usuarios
│           ├── organizations/route.ts ← CRUD organizaciones
│           ├── admins/route.ts      ← CRUD administradores
│           └── inventory/route.ts   ← Inventario de chips

prisma/
├── schema.prisma                    ← ⭐ FUENTE DE VERDAD del modelo de datos
├── seed.ts                          ← ⚠️ BUG: cambia accountType "personal"→"usuario"
└── migrations/

ops/                                 ← ZONA DE OPERACIONES (no afecta runtime)
├── knowledge/obsidian-vault/        ← Base de conocimiento persistente (Jarvis Core)
└── utilidades/                      ← Scripts de mantenimiento

---

## MODELO DE DATOS COMPLETO (Prisma)

### Relaciones entre entidades
```
Package ──1:N──→ Account
Account ──1:N──→ User
Account ──1:N──→ Profile
Account ──1:N──→ Chip
Account ──1:N──→ Organization

User ──1:1──→ Profile (userId unique)
User ──1:N──→ Chip (como owner)
User ──1:N──→ Order
User ──1:N──→ Consent

Profile ──1:N──→ EmergencyContact
Profile ──1:N──→ Chip (como assignedProfile)
Profile ──1:N──→ OrganizationMember

Chip ──1:N──→ ScanEvent
Chip ──1:N──→ Notification
Chip ──1:N──→ ChipClaimToken

Organization ──1:N──→ OrganizationMember
```

### Campos clave de cada modelo

**Package** (plan/paquete — fuente de verdad):
`id, name(unique), maxChips, price, description, isActive, createdAt, updatedAt`
⚠️ FALTAN: `slug, maxProfiles, accountType, icon, color, recommended, displayOrder, savings, allowsFamilyProfiles, allowsOrganizationModule, allowsSchoolModule, serviceDurationMonths`

**Account** (cuenta del cliente):
`id, accountType("personal"|"family"|"company"|"school"), accountName, ownerUserId, status, packageId→Package, maxChipsAllocated, additionalChips`

**User**: `id, accountId→Account, email(unique), phone, passwordHash, role("owner"|"manager"|"admin"|"superadmin"), status, lastLoginAt`

**Profile**: `id, accountId→Account, userId(unique)→User, firstName, lastName, displayNamePublic, birthDate, sex, bloodType, allergies, chronicConditions, medications, additionalNotes, profileVisibilityStatus, photoUrl`

**EmergencyContact**: `id, userId, profileId→Profile, fullName, relationship, phone, email, priorityOrder, notifySms, notifyEmail, notifyWhatsapp, active`

**Chip**: `id, accountId→Account, assignedProfileId→Profile, chipUidInternal(unique), serialPublic(unique), shortCode(unique), nfcUrl, qrUrl, batchId, productType, nicheType, chipAlias, status("inventory"|"sold"|"activated"|"suspended"|"retired"|"replaced"), ownerUserId→User, activatedAt, lastScanAt, transferLock, serviceStartDate, serviceEndDate, serviceStatus("active"|"expired"), isPhysical`

**ScanEvent**: `id, chipId→Chip, profileId, accountId, scannedAt, sourceType("qr"|"nfc"), ipAddress, userAgent, geoLat, geoLng, geoAccuracy, country, city, emergencyMode, notificationStatus, rawMetadataJson`

**Organization**: `id, accountId→Account, legalName, displayName, organizationType("company"), taxId, contactEmail, contactPhone, address, status`

**OrganizationMember**: `id, organizationId→Organization, profileId→Profile, internalCode, department, position, memberStatus`

**Notification**: `id, chipId→Chip, eventId, channel("email"|"sms"|"whatsapp"), recipient, status("pending"|"sent"|"failed"), providerResponse, sentAt`

**Order**: `id, userId→User, amount, currency("USD"), paymentStatus("pending"|"completed"|"failed"), provider("manual"|"stripe"|"yappy"), providerReference`

**AdminUser**: `id, email(unique), passwordHash, role("admin"|"superadmin"), status`

---

## FLUJOS CRÍTICOS

### 1. FLUJO DE EMERGENCIA (el más importante — no romper NUNCA)
```
Civil/Paramédico escanea NFC o QR
  → Navegador abre /e/{shortCode}?source=nfc (o sin ?source para QR)
  → Frontend: src/app/(public)/e/[shortCode]/page.tsx
    1. POST /api/public/{shortCode}/scan (registra evento + geolocalización)
    2. GET /api/public/{shortCode} (obtiene perfil público)
    3. Pregunta "¿Eres paramédico?" (dos botones)
       → Civil: instrucciones de primeros auxilios + contactos + botón 911
       → Paramédico: perfil médico completo (sangre, alergias, medicamentos, etc.)
    4. En paralelo: scan dispara notificaciones a contactos de emergencia
       → Email (si contact.notifyEmail && contact.email)
       → SMS (si contact.notifySms && contact.phone)
       → ⚠️ WhatsApp NUNCA se envía (bug: falta en scan/route.ts)
    5. Notificación incluye: nombre del paciente + link al perfil + GPS
```

### 2. FLUJO DE REGISTRO → ACTIVACIÓN
```
1. Usuario se registra en /registro
   → POST /api/auth/register
   → Crea: Account(accountType:"personal") + User(role:"owner") + Profile(bloodType:"Pendiente")
2. Completa perfil médico en /dashboard/perfil
   → PUT /api/users/profile (firstName, lastName, bloodType mínimo)
3. Activa chip en /activar
   → POST /api/chips/activate con activationCode
   → Valida: perfil completo, cuenta no expirada, límite no alcanzado
   → Chip pasa a status:"activated", serviceEndDate = now + 2 años
4. Dashboard muestra checklist: ✅ Perfil ✅ Chip ✅ Contacto
```

### 3. FLUJO DE PERMISOS (AccountState como centro)
```
AccountStateService.getAccountState(userId) devuelve:
  → accountType, packageName, maxChipsAllocated, maxProfilesAllocated
  → isPersonal, isFamily, isOrganization, isSchool
  → canManageFamilyProfiles, canAccessOrganizationModule, canAccessSchoolModule
  → canActivateMoreChips, canAddFamilyMember
  → setupChecklist: { medicalProfileComplete, chipActivated, emergencyContactAdded }

El sidebar del dashboard (layout.tsx) usa estos flags para mostrar/ocultar:
  → isSchool → "Mi Colegio" + "Estudiantes/Staff"
  → isOrganization → "Mi Empresa" + "Personal/Staff"
  → canManageFamilyProfiles → "Perfiles Médicos" (familia)
```

### 4. FLUJO DE URLs NFC/QR
```
Admin crea chip → genera shortCode (ej: "A3K9WX2P")
  → nfcUrl = "https://prerescatepty.com/e/A3K9WX2P?source=nfc" (grabado en chip NFC)
  → qrUrl  = "https://prerescatepty.com/e/A3K9WX2P" (impreso como QR)
  → Ambos resuelven al MISMO perfil vía shortCode
  → serialPublic = "PRP-XXXX-YYYY" (para identificación visual del chip)
  → activationCode = "XXXX-XXXX-XXXX" (lo que el usuario ingresa para activar)
```

---

## BUGS CRÍTICOS VERIFICADOS (corregir ANTES de features nuevos)

### BUG-01: CRÍTICO — Planes en 5 lugares con datos DIFERENTES

| Ubicación | Nombres | Precios | Chips |
|---|---|---|---|
| `page.tsx:12-18` | Plan Estándar, Plan Dúo, Family Club, Hogar Full, Empresa, Corporativo | $25,$45,$65,$95,$250,$450 | 1,2,3,5,20,50 |
| `comprar/page.tsx:9-14` | (idéntico a landing) | (idéntico) | (idéntico) |
| `upgrade/page.tsx:9-42` | Plan Dúo, Family Club, Hogar (**sin "Full"**, solo 3 planes) | $45,$65,$95 | 2,3,5 |
| `plan-catalog.ts:17-115` | Personal Básico, Personal Pro, Familiar Estándar, Familiar Premium, Empresa Pyme, Corporativo Plus, Colegio Protegido | $19.99,$39.99,$59.99,$89.99,$249.99,$799.99 | 1,3,5,10,25,100,200 |
| `seed.ts:8-15` | Plan Estándar, Plan Dúo, Family Club, Hogar, Empresa, Corporativo | $25,$45,$65,$95,$250,$450 | 1,2,3,5,20,50 |

**Consecuencia**: `getPlan()` usa fuzzy matching. "Plan Estándar" → "Personal Básico". Dashboard muestra "Plan Personalizado" cuando no hay match (account-state.service.ts:65).

### BUG-02: CRÍTICO — Seed destruye cuentas personales
`prisma/seed.ts:39-41`: `accountType: 'personal' → 'usuario'`
"usuario" no existe en ningún enum. Todos los flags (isPersonal, isFamily, etc.) dan false.

### BUG-03: CRÍTICO — Checkout acepta precio del frontend sin validar
`api/payments/checkout/route.ts:6`: `const { userId, planName, priceAmount } = await req.json();`
Un usuario puede enviar $1. Además, el webhook no actualiza packageId ni accountType.

### BUG-04: ALTO — Chips/perfiles no coinciden entre upgrade y catálogo
upgrade: Family Club = 3 chips/4 perfiles. catalog: family-standard = 5 chips/5 perfiles. seed: 3 chips.

### BUG-05: ALTO — WhatsApp nunca se envía en escaneos
`scan/route.ts:~80`: solo procesa "email" y "sms", falta "whatsapp".

### BUG-06: MEDIO — Duración 12 meses en catálogo, 2 años en activación
`plan-catalog.ts`: `serviceDurationMonths: 12`. `chips/activate/route.ts:~85`: `setFullYear(+2)`. Landing dice "2 años".

### BUG-07: BAJO — scansCount siempre 0
`account-state.service.ts:172`: `scansCount: 0, // Placeholder`

---

## MAPA DE PROPAGACIÓN — QUÉ AFECTA QUÉ

Cuando cambias un dato en Package (BD), estos son TODOS los lugares que deben reflejar el cambio:

### Nombre del plan (Package.name)
| Lugar | Archivo | ¿Se actualiza? |
|---|---|---|
| Dashboard hero "TU PLAN ACTUAL" | dashboard/page.tsx:84 | ✅ vía state.packageName |
| Sidebar nombre | dashboard/layout.tsx:144 | ✅ vía state.packageName |
| Badge tipo cuenta | dashboard/page.tsx:65 | ✅ vía state.accountType |
| Upgrade "Tu plan actual es X" | upgrade/page.tsx:73 | ✅ vía state.packageName |
| Cards de upgrade | upgrade/page.tsx:9-42 | ❌ HARDCODEADO |
| Landing cards pricing | page.tsx:12-18 | ❌ HARDCODEADO |
| Comprar cards pricing | comprar/page.tsx:9-14 | ❌ HARDCODEADO |
| Email de emergencia | notifications.ts | ✅ usa profileName no planName |

### Precio (Package.price)
| Lugar | ¿Se actualiza? |
|---|---|
| Landing/Comprar | ❌ HARDCODEADO |
| Upgrade page | ❌ HARDCODEADO |
| Stripe checkout | ❌ Recibe del frontend |
| Chip individual ($25) | ❌ HARDCODEADO en add-chips/route.ts:6 |

### Límite de chips (Package.maxChips → Account.maxChipsAllocated)
| Lugar | ¿Se actualiza? |
|---|---|
| Dashboard contador | ✅ vía state.maxChipsAllocated |
| Activación de chip | ✅ vía state.canActivateMoreChips |
| Landing feature list | ❌ HARDCODEADO |
| plan-catalog.ts | ❌ VALORES DIFERENTES |

### Tipo de cuenta (Package → Account.accountType)
| Efecto | Componente |
|---|---|
| Sidebar muestra "Mi Empresa" | dashboard/layout.tsx (isOrganization) |
| Sidebar muestra "Mi Colegio" | dashboard/layout.tsx (isSchool) |
| Sidebar muestra "Perfiles Médicos" | dashboard/layout.tsx (canManageFamilyProfiles) |
| Permisos de features | AccountStateService |

---

---

## GOBERNANZA JARVIS CUSATTI (MEMORIA Y QA)

A partir de 2026-04-12, se activa el núcleo de memoria para evitar olvidos y asegurar la calidad:

1. **Protocolo de Consultas**: Antes de cada tarea, el agente DEBE leer `ops/knowledge/obsidian-vault/00_JARVIS_HEARTBEAT.md` y `01-Project-Overview/ACTIVE_MANIFEST.md`.
2. **Prohibición de "Falsos Terminados"**: Ninguna tarea se reporta como terminada sin evidencia en `ops/knowledge/obsidian-vault/08-Runbooks/Evidences/`.
3. **Registro de Eliminaciones**: Si se elimina una línea de código lógica o funcional, DEBE registrarse en `06-Decisions/GRAVEYARD.md`.
4. **Validación Técnica**: Compilación (`npm run build`) o Linting (`next lint`) obligatorio antes del handover.

---

## REGLAS OBLIGATORIAS PARA CUALQUIER CAMBIO

### SIEMPRE:
1. Leer datos de planes desde `Package` (BD) vía API, nunca desde arrays estáticos
2. Usar `AccountStateService.getAccountState()` como fuente central de permisos
3. Validar precios en el backend contra la BD
4. Usar `accountType` válidos: `"personal"`, `"family"`, `"company"`, `"school"`
5. Mantener la cadena de emergencia intacta: Chip→Profile→Contacts→Notifications
6. Respetar la zona de operaciones: runtime en `src/`, ops en `ops/`
7. Registrar cambios en AuditLog para operaciones de admin
8. Usar rate limiting en endpoints públicos
9. Loguear sesiones de trabajo en `ops/knowledge/obsidian-vault/11-Daily/`

### NUNCA:
1. Hardcodear arrays de planes en componentes de UI
2. Aceptar precios del frontend en checkout
3. Cambiar accountType a valores inventados ("usuario", "member", "employee")
4. Duplicar lógica de permisos fuera de AccountStateService
5. Omitir la validación de memoria en Obsidian
6. Hacer cambios de schema sin validación técnica previa
7. Finalizar sin pruebas de QA documentadas en Obsidian
8. Poner API keys o PII en el vault de Obsidian

### CHECKLIST PRE-PR:
- [ ] ¿Algún componente tiene array de planes hardcodeado?
- [ ] ¿Los precios en UI coinciden con la tabla Package en BD?
- [ ] ¿Los nombres de planes son consistentes en TODOS los archivos?
- [ ] ¿Los límites (chips, perfiles) coinciden con Package.maxChips?
- [ ] ¿El sidebar muestra secciones correctas para cada accountType?
- [ ] ¿El flujo de emergencia (scan→profile→notificaciones) funciona?
- [ ] ¿El checkout valida precio contra BD?
- [ ] ¿Se actualizó el vault de Obsidian si hubo decisión arquitectónica?

---

## SOLUCIÓN ARQUITECTÓNICA: MIGRACIÓN A SSOT

### Paso 1: Enriquecer tabla Package
Agregar a `prisma/schema.prisma` los campos faltantes:
`slug, maxProfiles, accountType, icon, color, recommended, displayOrder, savings, allowsFamilyProfiles, allowsOrganizationModule, allowsSchoolModule, serviceDurationMonths(default:24)`

### Paso 2: Crear GET /api/public/packages
Endpoint público (sin auth) que devuelve planes con `isActive:true` ordenados por `displayOrder`.

### Paso 3: Crear CRUD admin para packages
`GET/POST/PUT/DELETE /api/admin/packages/:id` con validaciones de negocio.

### Paso 4: Refactorizar componentes
Reemplazar arrays hardcodeados en `page.tsx`, `comprar/page.tsx`, `upgrade/page.tsx` por `fetch('/api/public/packages')`.

### Paso 5: Eliminar plan-catalog.ts
Una vez que Package tenga todos los campos, el catálogo estático sobra. AccountStateService lee todo de la BD.

### Paso 6: Corregir seed.ts
Eliminar la línea que cambia `"personal"→"usuario"`. Agregar los campos nuevos al upsert.

### Paso 7: Corregir checkout
Recibir solo `packageId`, buscar precio real en BD, enviarlo a Stripe.
