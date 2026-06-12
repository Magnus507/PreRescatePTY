# Archivos raíz que deberían moverse

| Archivo | Tipo | Ubicación actual | Ubicación recomendada | Riesgo | Acción |
|---------|------|------------------|---------------------|--------|--------|
| README.md | Template | raíz | docs/01-arquitectura/README.md | Bajo | Mover - es plantilla create-next-app |
| ANALISIS_PROYECTO.md | Auditoría | raíz | docs/03-auditorias/estructura-repo/ANALISIS_PROYECTO.md | Bajo | Mover - auditoría previa |
| PLAN_DE_ACCION.md | Plan | raíz | docs/08-bitacoras/PLAN_DE_ACCION.md | Bajo | Mover - planificación |
| ARCHITECTURE_NOTES.md | Arquitectura | raíz | docs/01-arquitectura/ARCHITECTURE_NOTES.md | Bajo | Mover - notas técnicas |
| SETUP_GUIDE.md | Operación | raíz | docs/04-operaciones/SETUP_GUIDE.md | Bajo | Mover - guía setup |
| SECURITY_AUDIT.md | Seguridad | raíz | docs/05-seguridad/SECURITY_AUDIT.md | Bajo | Mover - auditoría seguridad |

## Notas
- Todos estos archivos son documentos informativos sin código
- No aparecen referenciados en `package.json` scripts
- No afectan builds ni despliegues
- Se pueden mover sin bloquear el proyecto

## Acciones inmediatas
```bash
mkdir -p docs/03-auditorias/estructura-repo
mkdir -p docs/08-bitacoras
# Mover archivos (sin git add para no interferir con otros cambios)
git mv README.md docs/01-arquitectura/README.md 2>/dev/null || true
```

*Generado a partir de task t_c51d84c7*