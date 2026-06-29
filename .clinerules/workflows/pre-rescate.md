# PreRescatePTY Development Rules

Arquitectura

- Nunca modificar Prisma sin autorización explícita.
- Nunca crear migraciones automáticamente.
- Nunca cambiar flujos de chips normales cuando el trabajo sea empresarial.
- Mantener separados los módulos Empresa y Particular.

Workflow obligatorio

Siempre trabajar en este orden:

1. Auditoría
2. Implementación
3. Verificación
4. Commit
5. Push

Nunca saltar pasos.

Git

- Nunca ejecutar git add .
- Agregar únicamente archivos modificados.
- Nunca hacer push sin autorización explícita.
- Nunca usar force push.
- Nunca hacer rebase ni squash salvo que se solicite.

Verificación obligatoria

Antes de cualquier commit ejecutar:

git diff --check
npm run typecheck
npm run build

Si alguno falla, corregir antes de continuar.

Código

Aplicar:

- KISS
- DRY
- YAGNI

Reutilizar componentes existentes antes de crear nuevos.

Responder siempre con:

- Qué archivos cambió.
- Qué no cambió.
- Qué validaciones ejecutó.
