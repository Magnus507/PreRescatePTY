# Ficha Médica - PreRescatePTY

## Descripción funcional
Creación, edición, validación y gestión de fichas médicas con cifrado de datos sensibles. Funcionalidad core para emergencias.

## Rutas relacionadas
- `app/(app)/dashboard/perfiles-medicos/page.tsx` - Lista de fichas
- `app/(app)/dashboard/perfiles-medicos/[id]/page.tsx` - Edición
- `app/api/users/perfiles-medicos/*` - APIs CRUD

## Componentes relacionados
- `components/forms/MedicalProfileForm.tsx` - Formulario principal
- `components/home/MedicalSection.tsx` - Preview en landing

## APIs relacionadas
- `app/api/users/perfiles-medicos/create/route.ts`
- `app/api/users/perfiles-medicos/[id]/route.ts`
- `app/api/users/perfiles-medicos/list/route.ts`

## Servicios/helpers
- `domains/profiles/repositories/profile.repository.ts` - Repo con cifrado
- `lib/validations.ts` - Schemas Zod para fichas
- `lib/encryption.ts` - Encriptado de campos médicos

## Modelos Prisma relacionados
- `Profile` - Ficha médica
- `ProfileContact` - Contactos asociados
- `ProfileAllergy`, `ProfileCondition`, etc. - Entidades médicas

## Variables de entorno
- `ENCRYPTION_KEY` - Clave de cifrado médico

## Tests existentes
Ninguno.

## Tests faltantes recomendados
- Tests de validación de fichas médicas
- Tests de cifrado/desencriptado
- Tests de visibilidad pública/privada
- Tests de límites de cuenta (número de fichas)

## Riesgos detectados
- Campos médicos sensibles cifrados pero sin tests
- Validaciones complejas sin cobertura
- Permisos de visibilidad hardcodeados

## Pendientes
- Tests de cifrado end-to-end
- Documentar reglas de visibilidad pública