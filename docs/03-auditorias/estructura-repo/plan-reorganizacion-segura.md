# Plan de reorganización segura

## Estrategia
Reorganizar solo documentación, auditorías y recursos. No tocar código productivo ni rutas Next.js.

## Nivel A - Se puede hacer ya (riesgo bajo)

### Acciones inmediatas
- Mover todos los `.md` de raíz a `docs/03-auditorias/estrutura-repo/` o `docs/08-bitacoras/`
- Reunificar auditorías en `docs/03-auditorias/`
- Crear `docs/00-indice/README.md` maestro
- Organizar `docs/architecture/` y `docs/analysis/` bajo nueva estructura
- Eliminar duplicación entre `docs/audit/`, `docs/analysis/`, `docs/ops/`, `docs/operations/`

### Estructura target
```
docs/
  00-indice/README.md           <- Este índice
  01-arquitectura/
    estructura-actual.md        <- Este inventario
    estructura-propuesta.md     <- Arquitectura ideal
  02-mapa-funcional/           <- Mapas por dominio
  03-auditorias/
    estructura-repo/            <- Auditorías de repo
    seguridad/
    base-datos/
  04-operaciones/
  05-seguridad/
  06-producto/
  07-tests/
  08-bitacoras/
  09-recursos/
  10-pendientes/
```

## Nivel B - Requiere cuidado

### Pendiente para siguiente fase
- Reorganizar `components/` por dominio funcional
- Mover helpers de `lib/` a `domains/shared/lib/`
- Consolidar lógica admin bajo `domains/admin/`
- Unificar referencias a shadcn en `components.json`

## Nivel C - No tocar sin revisión

### Prohibido modificar
- `app/` completo (rutas Next.js)
- `middleware.ts`
- `prisma/schema.prisma`
- `.env`, `.env.local`
- `package.json`, `next.config.ts`, `tsconfig.json`
- Cualquier archivo usado por Vercel, Next.js, Prisma

## Cronograma sugerido
1. **Fase 1 (inmediata):** Índices y movimientos de documentos (Nivel A)
2. **Fase 2 (post-hardening):** Reorganización de componentes (Nivel B)
3. **Fase 3 (post-cobertura):** Arquitectura de dominio (Nivel C)

*Generado a partir de task t_c51d84c7*