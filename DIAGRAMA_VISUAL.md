# 📊 DIAGRAMA VISUAL: PreRescatePTY

## Flujo de Emergencia (El más importante)

```
┌─────────────────────────────────────────────────────────────────┐
│                    RESCATISTA ESCANEA CHIP                       │
│                    (QR code o NFC tap)                           │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ├─→ Navegador abre: https://prerescatepty.com/e/{shortCode}
                 │
                 ↓
         ┌───────────────────────────────────────┐
         │   POST /api/public/{shortCode}/scan   │ ← REGISTRA EVENTO
         │                                       │
         │ - Captura IP + geolocalización GPS   │
         │ - Crea ScanEvent en BD               │
         │ - Busca Profile + ProfileContacts    │
         └────────┬────────────────────────────┘
                  │
         ┌────────┴────────────────────────────────────────────┐
         │                                                     │
         ↓                                                     ↓
    GET /api/public/{shortCode}          NOTIFICA CONTACTOS (paralelo)
    (obtener perfil médico)              
         │                                        ├─→ Email
         │                                        ├─→ SMS
         ↓                                        └─→ WhatsApp ❌
    ┌─────────────────┐
    │ Frontend pregunta│
    │ "¿Eres médico?" │
    └────┬────────────┘
         │
    ┌────┴─────────────────────────────┐
    │                                   │
    ├─→ SÍ: Muestra perfil COMPLETO   ├─→ NO: Instrucciones
    │    (sangre, alergias, meds)      │    de primeros auxilios
    │    (contactos)                    │    + Botón 911
    │                                   │
    └─────────────────────────────────┘
```

---

## Arquitectura de Capas

```
┌──────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                        │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐           │
│  │   Landing  │  │  Dashboard │  │   Admin UI   │           │
│  │   (Public) │  │ (Protected)│  │ (Admin only) │           │
│  └────────────┘  └────────────┘  └──────────────┘           │
└─────────────┬──────────────────────────────────────┬─────────┘
              │                                      │
              │                                      │
┌─────────────▼──────────────────────────────────────▼─────────┐
│                       API LAYER (NextAuth)                    │
│                                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │   Auth   │ │  Users   │ │  Chips   │ │ Payments │        │
│  │  (Login) │ │ (Profile)│ │(Activate)│ │ (Stripe) │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ Contacts │ │   Admin  │ │  Cron    │ │  Public  │        │
│  │ (Alertas)│ │(Dashboard)│ │(Daily)   │ │(Emergency)        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
└──────────────┬───────────────────────────────────────────────┘
               │
               │ Prisma ORM
               │
┌──────────────▼──────────────────────────────────────────────┐
│              DOMAIN LAYER (Business Logic)                   │
│                                                              │
│  ┌────────────┐ ┌────────────┐ ┌──────────────┐            │
│  │  Accounts  │ │   Chips    │ │  Profiles    │            │
│  │  (State)   │ │  (Statuses)│ │ (Medical)    │            │
│  └────────────┘ └────────────┘ └──────────────┘            │
│                                                              │
│  ┌────────────┐ ┌────────────┐ ┌──────────────┐            │
│  │  Contacts  │ │ Notif      │ │Organizations│            │
│  │  (Alerts)  │ │ (Channels) │ │ (Enterprise) │            │
│  └────────────┘ └────────────┘ └──────────────┘            │
└──────────────┬──────────────────────────────────────────────┘
               │
               │
┌──────────────▼──────────────────────────────────────────────┐
│           INFRASTRUCTURE LAYER (Shared Services)             │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │  Email   │ │   SMS    │ │ WhatsApp │ │  Stripe  │      │
│  │ (Resend) │ │ (Twilio) │ │(Inactive)│ │(Payments)│      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Rate     │ │Encryption│ │ Geocoding│ │ Logging  │      │
│  │ Limiting │ │(AES-256) │ │ (OSM)    │ │(Sentry)  │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
└─────────────────────────────────────────────────────────────┘
              │
              │
┌─────────────▼─────────────────────────────────────────────┐
│          DATA LAYER (PostgreSQL Supabase)                  │
│                                                            │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐              │
│  │User │ │Chip │ │Acc. │ │Pkg. │ │Scan │              │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘              │
│                                                            │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐              │
│  │Prof │ │Cont │ │Org  │ │Notif│ │Order│              │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘              │
└────────────────────────────────────────────────────────┘
```

---

## Flujo de Registro → Activación

```
Step 1: REGISTRO
┌─────────────────────────────────────────┐
│  Usuario llena formulario /registro     │
│  email, password, phone, accountType    │
└────────┬────────────────────────────────┘
         │
         ↓
    POST /api/auth/register
    ├─ Valida email único + password min 8 chars
    ├─ Rate limit: 5/15min
    └─ Crea en transacción:
       ├─ Account { accountType, maxChipsAllocated: 0 }
       ├─ User { role: "owner" }
       └─ Profile { bloodType: "Pendiente" }

Step 2: COMPLETAR PERFIL MÉDICO
┌─────────────────────────────────────────┐
│  Usuario va a /dashboard/perfil         │
│  Ingresa firstName, lastName, bloodType │
└────────┬────────────────────────────────┘
         │
         ↓
    PUT /api/users/profile
    ├─ Valida: firstName.length > 1
    ├─ Valida: bloodType ≠ "Pendiente"
    └─ UPDATE Profile

Step 3: ACTIVAR CHIP
┌─────────────────────────────────────────┐
│  Usuario va a /activar                  │
│  Ingresa código: XXXX-XXXX-XXXX        │
└────────┬────────────────────────────────┘
         │
         ↓
    POST /api/chips/activate
    ├─ Valida código existe y no expirado
    ├─ Valida perfil completo ✓
    ├─ Valida cuenta no expirada ✓
    ├─ Valida no excede maxChipsAllocated
    │
    └─ Transacción:
       ├─ UPDATE Chip
       │  ├─ status: "activated"
       │  ├─ assignedProfileId: User.Profile.id
       │  ├─ serviceEndDate: NOW + 24 meses
       │  └─ activatedAt: NOW
       └─ UPDATE ChipClaimToken.usedAt = NOW

Step 4: DASHBOARD VERIFICA SETUP
┌─────────────────────────────────────────┐
│  Dashboard muestra checklist:           │
│  ✅ Perfil médico completado            │
│  ✅ Chip activado                       │
│  ⏳ Contactos de emergencia              │
└─────────────────────────────────────────┘
```

---

## AccountStateService: El Cerebro Central

```
              ┌────────────────────────┐
              │   getAccountState()    │
              │   (userId: string)     │
              └────────────┬───────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ↓                ↓                ↓
    Busca User    Busca Account    Busca Package
          │                │                │
          └────────────────┼────────────────┘
                           │
                    ┌──────▼──────┐
                    │  Calcula:   │
                    ├─────────────┤
                    │ Categoría   │ isPersonal, isFamily,
                    │ (Account    │ isCorporate
                    │  Type)      │
                    ├─────────────┤
                    │ Status      │ "active", "expired",
                    │ (Service)   │ "inactive"
                    ├─────────────┤
                    │ Permisos    │ canActivateMoreChips,
                    │ (Features)  │ canManageFamilyProfiles
                    ├─────────────┤
                    │ Estadísticas│ activeChipsCount,
                    │             │ familyProfilesCount
                    ├─────────────┤
                    │ Setup       │ hasCompletedProfile,
                    │ Checklist   │ hasEmergencyContact
                    └─────────────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ↓              ↓              ↓
        DASHBOARD      SIDEBAR       PERMISSIONS
      Muestra estado   Mostrar/ocultar APIs validan
      y estadísticas   secciones      canActivate
      
    Redis Cache: 5 minutos
    Key: accountstate:{userId}
```

---

## Matriz de Permisos Basada en Tipo de Cuenta

```
                 Personal  Family  Company  School
                 ────────  ──────  ───────  ──────
maxChips               1       3        20      50
maxProfiles            1       4        50     100
canManage
  FamilyProfiles       ❌      ✅       ❌      ❌
canAccess
  Organization         ❌      ❌       ✅      ✅
canBuyExtra
  Chips                ❌      ✅       ✅      ✅

Sidebar sections:
Personal:
  └─ Perfil Médico (mío)
  └─ Mis Chips
  └─ Contactos

Family:
  ├─ Perfil Médico (mío)
  ├─ Perfiles Médicos (familiares)  ← Nueva sección
  ├─ Mis Chips
  ├─ Contactos
  └─ Upgrade

Company:
  ├─ Perfil Médico (mío)
  ├─ Mi Empresa                     ← Nueva sección
  ├─ Personal (miembros)
  ├─ Mis Chips
  ├─ Contactos
  └─ Upgrade

School:
  ├─ Perfil Médico (mío)
  ├─ Mi Colegio                     ← Nueva sección
  ├─ Estudiantes/Staff
  ├─ Mis Chips
  ├─ Contactos
  └─ Upgrade
```

---

## Flujo de Estados del Chip

```
                    ┌──────────────────┐
                    │  INVENTORY       │  (Nuevo, sin vender)
                    └────────┬─────────┘
                             │
                    Vendido a usuario
                             │
                    ┌────────▼──────────┐
                    │  SOLD             │  (Vendido, no activado)
                    └────────┬──────────┘
                             │
                    Usuario activa con código
                             │
                    ┌────────▼──────────┐
                    │  ACTIVATED        │  (En uso, válido)
                    └────────┬──────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
    Manualmente            Automatic         Manual
    pausar                 (24 meses          retire
            │                │                │
    ┌───────▼──────┐ ┌───────▼──────┐ ┌─────▼───────┐
    │  SUSPENDED   │ │  EXPIRED     │ │  RETIRED    │
    │ (Pausado)    │ │ (Vencido)    │ │(Fin de vida)│
    └──────────────┘ └──────────────┘ └─────────────┘
            │                                    │
            └────────────┬───────────────────────┘
                         │
            Reemplazar por uno nuevo
                         │
                ┌────────▼──────────┐
                │  REPLACED         │
                │ (Reemplazado)     │
                └───────────────────┘
```

---

## Notificaciones: Flujo Multi-Canal

```
ScanEvent creado
└─ Obtiene ProfileContacts para este Profile
   │
   ├─ ¿notifyEmail = true?
   │  └─→ EmailService.send(contact.email, html)
   │      └─ Crea Notification { channel: "email", status: "pending" }
   │         └─ Resend API → SENT o FAILED
   │
   ├─ ¿notifySms = true?
   │  └─→ SmsService.send(contact.phone, text)
   │      └─ Crea Notification { channel: "sms", status: "pending" }
   │         └─ Twilio API → SENT o FAILED
   │
   └─ ¿notifyWhatsapp = true?
      └─→ ❌ FALTA IMPLEMENTAR
          (está en WhatsappService pero no se llama en scan/route.ts)

Reintentos automáticos (Cron job cada minuto):
SELECT Notification WHERE status = "pending" AND createdAt > 10 min
  ├─ Reintenta con exponential backoff
  └─ UPDATE status → "sent" o "failed"
```

---

## Endpoint Security Matrix

```
Endpoint                        Auth    Role Required  Rate Limit
─────────────────────────────────────────────────────────────────
POST /api/auth/register         ❌      —             5/15min
POST /api/auth/login            ❌      —             10/15min
GET  /api/public/{shortCode}    ❌      —             Unlimited
POST /api/public/{shortCode}/..  ❌      —             Unlimited ⚠️

PUT  /api/users/profile         ✅      owner         Unlimited
GET  /api/chips/dashboard       ✅      owner         Unlimited
POST /api/chips/activate        ✅      owner         Unlimited
GET  /api/account/state         ✅      owner         Unlimited

GET  /api/admin/packages        ✅      admin         Unlimited
GET  /api/admin/users           ✅      admin         Unlimited
POST /api/admin/chips           ✅      admin         Unlimited
DELETE /api/admin/admins        ✅      superadmin    Unlimited

GET  /api/cron/expire-chips     ⚠️      API Key       1/day
GET  /api/cron/notify           ⚠️      API Key       1/min
```

---

## Puntos Críticos de Falla

```
          🔴 CRÍTICO
             │
    ┌────────┼────────┐
    │        │        │
    ↓        ↓        ↓
 POST      GET      Webhook
 /api/     /api/    Stripe
 public/   public/
{code}/    {code}
 scan

 FALLA     FALLA    FALLA
 │         │        │
 └─────────┼────────┘
           │
      No se registra
      evento de scan
      │
      ├─→ No se buscan contactos
      ├─→ No se envían notificaciones
      └─→ Rescatista sin info médica


          🟠 ALTO
          
    Package.price
    en DB
         │
         ├─→ Page.tsx hardcoded $25  ← DESINCRONIZADO
         ├─→ Comprar.tsx hardcoded $25
         ├─→ Upgrade.tsx $45
         ├─→ plan-catalog.ts $19.99 ← DIFERENTE
         └─→ seed.ts $25

    Consecuencia:
    User ve "$25" en landing
    Pero DB tiene "$19.99"
    O Stripe recibe "$1" desde frontend


          🟡 MEDIO
          
    ChipClaimToken.expiresAt < NOW
         │
         └─→ Código expirado
             │
             └─→ ❌ NO SE PUEDE REGENERAR
                 │
                 └─→ Usuario stuck forever
                     (código es UNIQUE)
```

