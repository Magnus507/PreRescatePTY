# ⚡ QUICK REFERENCE: PreRescatePTY

## 1️⃣ Command Cheat Sheet

```bash
# Setup
npm install
npx prisma migrate deploy
npx prisma db seed

# Development
npm run dev              # localhost:3000
npm run build           # Próducción
npm run lint            # ESLint check

# Database
npx prisma studio      # GUI de Prisma
npx prisma generate    # Regenerar client
npx prisma db push     # Sincronizar schema
```

---

## 2️⃣ Endpoints Rápidos

### 🔓 Public (sin auth)
```
GET  /api/public/{shortCode}           # Ver perfil médico
POST /api/public/{shortCode}/scan      # Registrar escaneo
GET  /api/public/packages              # Listar planes
```

### 🔐 Auth Required
```
POST /api/auth/register
POST /api/auth/[...nextauth]
POST /api/chips/activate               # ⭐ Activar chip
PUT  /api/users/profile                # ⭐ Completar perfil
GET  /api/account/state                # ⭐ Estado cuenta
POST /api/orders/manual                # Crear pedido manual
POST /api/orders/[id]/payment-proof    # Subir comprobante
```

### 👨‍💼 Admin Only
```
GET  /api/admin/packages
POST /api/admin/packages               # Crear plan
GET  /api/admin/users
POST /api/admin/chips                  # Crear chips batch
GET  /api/admin/stats
```

### ⏰ Cron (API Key)
```
GET  /api/cron/expire-chips            # Expira chips vencidos (diario)
GET  /api/cron/notify                  # Reintenta notificaciones (1min)
```

---

## 3️⃣ Modelos de Datos Clave

### Package (Plan - SSOT)
```sql
id, name(unique), maxChips, price, description, 
isActive, accountType, serviceDurationMonths(default:24)
```

### Account (Cuenta)
```sql
id, accountType(personal|family|company|school), 
packageId→Package, ownerUserId, maxChipsAllocated, status
```

### Chip (Dispositivo)
```sql
id, shortCode(unique), serialPublic, 
status(inventory|sold|activated|expired|suspended|retired), 
serviceEndDate, serviceStatus, ownerUserId, assignedProfileId
```

### Profile (Perfil médico)
```sql
id, firstName, lastName, bloodType, 
allergies, medications, chronicConditions, 
photoUrl, lastScanAt
```

### ScanEvent (Escaneo)
```sql
id, chipId, scannedAt, sourceType(qr|nfc), 
geoLat, geoLng, country, city, emergencyMode
```

---

## 4️⃣ Flujos Críticos (Step by Step)

### ✔️ REGISTRO
```
1. User POST /api/auth/register
   Input: { email, password, phone, accountType? }
2. Backend crea: Account + User + Profile
3. Account.maxChipsAllocated inicia en 0
4. User redirected a /login
```

### ✔️ COMPLETAR PERFIL
```
1. User PUT /api/users/profile
   Input: { firstName, lastName, bloodType, allergies?, ... }
2. Valida: firstName.length > 1, bloodType != "Pendiente"
3. Profile actualizado
4. AccountState.hasCompletedMedicalProfile = true
```

### ✔️ ACTIVAR CHIP
```
1. User POST /api/chips/activate
   Input: { activationCode: "XXXX-XXXX-XXXX" }
2. Busca ChipClaimToken (debe existir, no expirado, no usado)
3. Valida: perfil completo, cuenta no expirada
4. UPDATE Chip:
   - status: "activated"
   - serviceEndDate: NOW + 24 meses
   - assignedProfileId: User's Profile.id
5. UPDATE ChipClaimToken.usedAt = NOW
6. Account.maxChipsAllocated se auto-incrementa si necesita
```

### ✔️ EMERGENCIA (Escaneo)
```
1. Civil/Rescatista escanea QR/NFC
2. POST /api/public/{shortCode}/scan
   Captura: IP, geoLat, geoLng
3. Crea ScanEvent
4. Busca Profile → ProfileContacts
5. Para cada contacto:
   - Si notifyEmail: envía email (Resend)
   - Si notifySms: envía SMS (Twilio)
   - Si notifyWhatsapp: ❌ FALTA (bug)
6. Frontend:
   GET /api/public/{shortCode} → muestra perfil
   Pregunta "¿Eres médico?" → 2 opciones
```

### ✔️ COMPRA DE PLAN (manual)
```
1. User POST /api/orders/manual
   Input: { packageId, customerName, customerEmail, paymentMethod, ... }
2. Backend busca Package en BD (SSOT)
3. Crea Order manual con provider: "manual"
4. Retorna pedido con instrucciones de pago
5. User sube comprobante a /api/orders/[id]/payment-proof
6. Admin aprueba o rechaza
7. Reserva atómica y sync operacional se ejecutan al aprobar
```

---

## 5️⃣ Archivos "Hot Spots"

| Archivo | Líneas | Qué Hace | Problemas |
|---------|--------|----------|-----------|
| `lib/auth.ts` | 100+ | NextAuth config | Mfa logic OK |
| `lib/guards.ts` | 80+ | Auth guards | Funciona bien |
| `domains/accounts/services/account-state.service.ts` | 250+ | Calcula permisos + state | OK pero falta scansCount |
| `app/api/public/[shortCode]/scan/route.ts` | ~120 | Registra escaneo | ❌ Falta WhatsApp |
| `app/api/chips/activate/route.ts` | ~150 | Activa chip | ✅ OK |
| `app/api/orders/manual/route.ts` | ~100 | Crea pedido manual | ✅ OK (usa package real) |
| `app/api/orders/[id]/payment-proof/route.ts` | ~120 | Subida de comprobante | ✅ OK (manual) |
| `lib/notifications.ts` | 77 | Orquídea de alertas | ✅ OK pero falta WA en scan |
| `app/page.tsx` | 286+ | Landing | ❌ Planes hardcodeado líneas 12-18 |
| `app/(public)/comprar/page.tsx` | 110+ | Página de compra | ❌ Planes hardcodeado líneas 9-14 |
| `app/(app)/dashboard/upgrade/page.tsx` | 183+ | Upgrade | ❌ Planes DIFERENTES líneas 9-42 |
| `prisma/schema.prisma` | ~500 | BD schema | ✅ OK, pero falta seed populate |
| `prisma/seed.ts` | ? | Datos iniciales | ❌ accountType: 'usuario' es inválido |

---

## 6️⃣ Environment Variables (Requeridas)

```bash
# Database
DATABASE_URL="postgresql://user:password@supabase.com/db"
DIRECT_URL="postgresql://..."  # Para migrations

# NextAuth
NEXTAUTH_SECRET="tu-secreto-aleatorio-64-chars"
NEXTAUTH_URL="http://localhost:3000"

# Email
RESEND_API_KEY="re_xxxx"
RESEND_FROM_EMAIL="alertas@prerescatepty.com"

# SMS
TWILIO_ACCOUNT_SID="ACxxxx"
TWILIO_AUTH_TOKEN="xxxx"
TWILIO_PHONE_NUMBER="+15551234567"

# Cache
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="AxxBxx..."

# Encriptación
ENCRYPTION_KEY="32-char-hex-string"

# URLs
NEXT_PUBLIC_SITE_URL="https://prerescatepty.com"
NEXT_PUBLIC_APP_URL="https://app.prerescatepty.com"

# Monitoring
SENTRY_AUTH_TOKEN="sntrys_xxxx"

# Optional
RATE_LIMIT_BYPASS_TOKEN="admin-token"
```

---

## 7️⃣ Debugging Tips

### 🔍 Ver estado de cuenta
```bash
# En dashboard, console.log:
fetch('/api/account/state')
  .then(r => r.json())
  .then(d => console.table(d))
```

### 🔍 Verificar permisos
```javascript
const session = await getServerSession(authOptions);
const user = await prisma.user.findUnique({
  where: { id: session.user.id },
  include: { account: { include: { package: true } } }
});
console.log('User:', user);
```

### 🔍 Listar chips de usuario
```bash
SELECT chip.* FROM chip
WHERE "ownerUserId" = 'user-id-here'
ORDER BY "activatedAt" DESC;
```

### 🔍 Ver escaneos recientes
```bash
SELECT * FROM "ScanEvent"
WHERE "chipId" = 'chip-id'
ORDER BY "scannedAt" DESC
LIMIT 10;
```

### 🔍 Listar notificaciones pendientes
```bash
SELECT * FROM "Notification"
WHERE status = 'pending'
ORDER BY "createdAt" DESC;
```

---

## 8️⃣ Testing Checklist

### Pre-Deploy
- [ ] `npm run build` OK
- [ ] `npm run lint` OK
- [ ] DB migrations OK
- [ ] Env vars configurados
- [ ] NextAuth secret set

### Functional
- [ ] ✅ Registro → Create Account/User/Profile
- [ ] ✅ Perfil médico → Puede completar
- [ ] ✅ Activación → Chip se activa con código
- [ ] ✅ Escaneo → ScanEvent se crea, notificaciones se envían
- [ ] ✅ Estado → AccountState calcula correctamente
- [ ] ✅ Permisos → Sidebar muestra secciones correctas
- [ ] ✅ Pagos → flujo manual funciona

### Security
- [ ] ✅ Rate limiting activo (intenta 15 logins = bloqueado)
- [ ] ✅ Admin guard funciona (user normal no accede a /admin)
- [ ] ✅ Contraseñas hasheadas (bcrypt)
- [ ] ✅ JWT expira en 30 días
- [ ] ✅ CORS configurado

---

## 9️⃣ Known Bugs (Priority)

### 🔴 P0 (Bloquean)
- [ ] Planes hardcodeados en UI (no sincronizan con BD)
- [ ] Seed.ts: accountType 'usuario' es inválido
- [ ] Pedido manual no requiere pasarela externa
- [ ] WhatsApp no se envía en escaneos

### 🟠 P1 (Funcional)
- [ ] Checkout valida precio del frontend (no del server)
- [ ] scansCount siempre 0 en AccountState
- [ ] Plan duración: 12 meses en catalog, 24 en activate

### 🟡 P2 (UX)
- [ ] Dashboard muestra "Plan Personalizado" si no hay match
- [ ] Mensajes de error podrían ser más específicos

---

## 🔟 Rutas Importantes

```
Public Pages:
  /                    Landing
  /login               Iniciar sesión
  /registro            Crear cuenta
  /e/{shortCode}       ⭐ EMERGENCIA (sin auth)
  /activar             Activar chip
  /comprar             Planes
  /como-funciona       Info
  /contacto            Email support
  /faq                 Preguntas

Protected Pages:
  /dashboard           ⭐ Principal
  /dashboard/perfil    Mi perfil médico
  /dashboard/chips     Mis dispositivos
  /dashboard/familia   Perfiles familiares
  /dashboard/contactos Contactos emergencia
  /dashboard/historial Historial de escaneos
  /dashboard/upgrade   Cambiar plan

Admin Pages:
  /admin               ⭐ Dashboard admin
  /admin?tab=packages  Gestión de planes
  /admin?tab=users     Buscar usuarios
  /admin?tab=chips     Inventario de chips
  /admin?tab=stats     Estadísticas
```

---

## 🎯 Decision Tree: ¿Cuál endpoint debo usar?

```
¿Quiero obtener datos del usuario?
  ├─ Su perfil médico       → GET /api/users/profile
  ├─ Todos sus chips        → GET /api/chips/dashboard
  ├─ Contactos emergencia   → GET /api/contacts/dashboard
  ├─ Estado de cuenta       → GET /api/account/state
  └─ Historial de escaneos  → GET /api/chips/scans

¿Quiero modificar datos?
  ├─ Perfil médico          → PUT /api/users/profile
  ├─ Agregar contacto       → POST /api/contacts/dashboard
  ├─ Actualizar contacto    → PUT /api/contacts/dashboard/{id}
  └─ Activar chip           → POST /api/chips/activate

¿Quiero procesar pago?
  ├─ Crear pedido manual   → POST /api/orders/manual
  └─ Subir comprobante    → POST /api/orders/[id]/payment-proof

¿Soy admin?
  ├─ Ver usuarios          → GET /api/admin/users
  ├─ Ver planes            → GET /api/admin/packages
  ├─ Crear chips batch     → POST /api/admin/chips
  ├─ Ver estadísticas      → GET /api/admin/stats
  └─ Gestionar admins      → POST/DELETE /api/admin/admins

¿Es emergencia?
  └─ GET /api/public/{shortCode}           # Ver perfil
  └─ POST /api/public/{shortCode}/scan     # Registrar escaneo
```

---

## 📋 Validation Rules (Zod)

```javascript
// Email
email: z.string().email()

// Password
password: z.string().min(8, "Mínimo 8 caracteres")

// Blood Type
bloodType: z.enum([
  "Pendiente", "O+", "O-", "A+", "A-", 
  "B+", "B-", "AB+", "AB-"
])

// Account Type
accountType: z.enum(["personal", "family", "company", "school"])

// Activation Code
activationCode: z.string().regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/)

// Short Code
shortCode: z.string().length(8).regex(/^[A-Z0-9]+$/)
```

---

## 🚀 Deployment Checklist

```
Pre-Deploy:
  [ ] Leer INSTRUCTIONS.md completo
  [ ] Ejecutar npm run build
  [ ] Ejecutar npm run lint
  [ ] Backup de BD
  [ ] Verificar env vars en Vercel
  [ ] Probar staging environment

Post-Deploy:
  [ ] Verificar logs de Sentry (0 errors)
  [ ] Probar flujo de emergencia
  [ ] Probar activación de chip
  [ ] Verificar notificaciones se envían
  [ ] Probar pago manual
  [ ] Verificar admin panel funciona
  [ ] Monitorear performance
```

---

**Última actualización**: 21 de mayo de 2026  
**Versión**: 1.0  
**Estado**: VERIFICADO
