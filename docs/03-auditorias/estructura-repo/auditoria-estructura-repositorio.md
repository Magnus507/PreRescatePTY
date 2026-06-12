# Auditoría de estructura del repositorio

## Inventario por clasificación

### Código productivo (app/)
- `app/(app)/` - Rutas dashboard cliente (dashboard, chips, fichas, órdenes, empresas)
- `app/(admin)/` - Rutas admin console (usuarios, chips, órdenes, inventario)
- `app/(public)/` - Rutas públicas (landing, login, registro, emergencia QR)
- `app/api/**/route.ts` - 78 handlers HTTP

### Rutas Next.js
- App Router completo bajo `app/`
- Middleware en `middleware.ts`
- Config en `next.config.ts`

### Componentes UI
- `components/` - Reusable (forms, home, landing)
- `app/(admin)/admin/_components/` - Colocalizados admin

### Lógica de dominio
- `domains/accounts/` - Servicios de cuenta
- `domains/chips/` - Lógica chips (parcial)
- `domains/profiles/` - Lógica fichas médicas
- `domains/orders/` - Lógica órdenes
- `domains/shared/services/` - Servicios compartidos (pago, email, SMS)
- `domains/notifications/` - Notificaciones
- `domains/users/` - MFA y auth

### Servicios/helpers críticos
- `lib/auth.ts` - NextAuth config
- `lib/prisma.ts` - Prisma client singleton
- `lib/rbac.ts` - Roles y permisos
- `lib/encryption.ts` - Cifrado médico
- `lib/validations.ts` - Schemas Zod
- `lib/rateLimit.ts` - Rate limiting

### Modelos/base de datos
- `prisma/schema.prisma` (~749 líneas)

### Tests
- **No hay tests automatizados** (`.test.` o `.spec.` no encontrados)

### Scripts
- `scripts/` - Scripts varios (setup, seed, tools)
- Scripts temporales y db-inspect no trackeados

### Configuración obligatoria raíz
- `package.json` - Dependencias y scripts (Next 15.5.15, React 19, etc.)
- `next.config.ts` - Config Next + CSP + redirects
- `tsconfig.json` - Strict mode, baseUrl
- `tailwind.config.ts` - Theme y colors
- `components.json` - shadcn config
- `vercel.json` - Vercel config
- `.env.example` - Template de variables

### Documentación funcional
- `docs/architecture/` - Entrypoints técnicos
- `docs/analysis/` - Análisis previos
- `docs/official/` - Documentación oficial

### Auditorías
- `docs/audit/` - Auditorías completadas
- `docs/qa/` - QA incompleto
- Múltiples `.md` en raíz con auditorías

### Bitácoras/planes
- `features/` - Planes de features
- Múltiples archivos `.md` en raíz

### Recursos auxiliares
- `public/` - Imágenes, favicon
- `public/logo.jpeg` - Logo sin optimizar

### Temporal/legacy/dudoso
- Archivos `.DS_Store`
- Scripts temporales sin trackear
- Código en `components.json` apunta a `src/app/globals.css` pero real es `app/globals.css`

### No clasificado
- Carpetas admin con lógica colocalizada