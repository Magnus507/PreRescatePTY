# Chips / QR / NFC - PreRescatePTY

## Descripción funcional
Gestión de chips físicos: compra, activación, asignación a fichas médicas, estados, y escaneo de emergencia público.

## Rutas relacionadas
- `app/(app)/dashboard/chips/page.tsx` - Lista de chips
- `app/(public)/e/[shortCode]/page.tsx` - Perfil público QR
- `app/api/chips/activate/route.ts` - Activación
- `app/api/chips/scans/*` - Registro de escaneos

## Componentes relacionados
- Formularios de activación de chips
- UI de estado en dashboard

## APIs relacionadas
- `app/api/chips/activate/route.ts`
- `app/api/chips/assign/route.ts`
- `app/api/chips/[id]/route.ts`
- `app/api/public/[shortCode]/scan/route.ts`

## Servicios/helpers
- `domains/chips/services/*` - Lógica de chips
- `domains/chips/repositories/chip.repository.ts` (no usado actualmente)
- `lib/identifiers.ts` - Generación de shortCodes

## Modelos Prisma relacionados
- `Chip` - Dispositivo físico
- `ChipClaimToken` - Token de activación
- `ScanEvent` - Registro de escaneos
- `Profile` - Asignación de ficha

## Variables de entorno
- `NEXT_PUBLIC_SUPABASE_URL` - Para QR images

## Tests existentes
Ninguno.

## Tests faltantes recomendados
- Tests de activación de chips
- Tests de asignación ficha-chip
- Tests de scan público (rate limit, visibilidad)
- Tests de estados del chip (activo, inactivo, expirado)

## Riesgos detectados
- Lógica de chips en archivos muy grandes
- Estados como strings sin tipado fuerte
- Falta repo chip.repository.ts no usado pero existe

## Pendientes
- Migrar lógica a domain services probados
- Implementar enums para estados de chip
- Tests de flujo completo chip → ficha → scan