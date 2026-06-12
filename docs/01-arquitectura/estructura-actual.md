# Estructura actual del repositorio (junio 2025)

## Directorio raíz
```
app/              # Next.js App Router (~231 archivos .ts/.tsx)
components/       # UI reusable (~50 componentes)
domains/          # Business logic (accounts, chips, profiles, orders, shared)
features/         # Plans/roadmaps por feature
lib/              # Cross-cutting (auth, prisma, rbac, encryption)
docs/             # Múltiples subcarpetas dispersas
prisma/           # Schema, migrations, seed
public/           # Assets estáticos
scripts/          # Herramientas varias
types/            # Tipos TypeScript
```

## Carpetas docs existentes (problemático)
- `docs/architecture/` - Entrypoints técnicos
- `docs/analysis/` - Análisis previos  
- `docs/audit/` - Auditorías completadas
- `docs/qa/` - QA parcial
- `docs/cleanup/` - Tareas de limpieza
- `docs/logic/` - Documentación de lógica
- `docs/obsidian/` - Notas Obsidian
- `docs/ops/` - Operaciones
- `docs/operations/` - Operaciones (duplicado)
- `docs/official/` - Docs oficiales
- `docs/production/` - Docs producción

## Archivos raíz (.md)
~15 archivos `.md` con auditorías, planes, notas, sin organización clara.

## Duplicaciones detectadas
- `docs/ops/` y `docs/operations/` - Mismo propósito
- `docs/audit/` con múltiples versiones del mismo análisis
- Scripts en raíz y `scripts/` con propósitos similares

## Estado actual
- 78 handlers API bajo `app/api/**/route.ts`
- 231 archivos .ts/.tsx aproximadamente
- 0 tests automatizados
- Documentación dispersa sin índice maestro

*Generado a partir de task t_c51d84c7*