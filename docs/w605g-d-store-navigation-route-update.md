# W6.05G-D — Apuntar Navegación Tienda a /dashboard/tienda

## 1. Problema detectado

W6.05G-C implementó correctamente la nueva experiencia híbrida de tienda en:
- `app/(app)/dashboard/tienda/page.tsx`

Sin embargo, al hacer clic en "Tienda" desde el sidebar, el usuario seguía viendo la tienda vieja (formulario legacy) porque la navegación del layout apuntaba a:
- `/dashboard/compras`

## 2. Causa

En `app/(app)/dashboard/layout.tsx`, el href `/dashboard/compras` aparecía en 4 lugares de navegación, y ninguno apuntaba a `/dashboard/tienda`:

| Lugar | Línea | href anterior |
|-------|-------|---------------|
| `consumerNavItems` (sidebar desktop) | 24 | `/dashboard/compras` |
| `mobileLinks` (bottom nav mobile) | 150 | `/dashboard/compras` |
| Botón rápido "Tienda" en sidebar | 238 | `/dashboard/compras` |
| Menú "Más" mobile | 327 | `/dashboard/compras` |

## 3. Cambios realizados

Se modificaron las 4 referencias de `/dashboard/compras` a `/dashboard/tienda` en `app/(app)/dashboard/layout.tsx`:

1. **Línea 24** — `consumerNavItems`: `"/dashboard/compras"` → `"/dashboard/tienda"`
2. **Línea 150** — `mobileLinks`: `"/dashboard/compras"` → `"/dashboard/tienda"`
3. **Línea 238** — Botón rápido sidebar: `href="/dashboard/compras"` → `href="/dashboard/tienda"`
4. **Línea 327** — Menú "Más" mobile: `"/dashboard/compras"` → `"/dashboard/tienda"`

El label "Tienda" se mantiene sin cambios en todos los casos.

## 4. Compatibilidad legacy

- `/dashboard/compras` sigue existiendo sin modificaciones.
- No se agregó redirección desde `/dashboard/compras`.
- El flujo legacy de paquetes/combos manuales sigue disponible en `/dashboard/compras`.
- No se rompe ningún enlace interno existente.

## 5. Qué NO se tocó

- `schema.prisma`: no se modificó.
- Migraciones: no se crearon.
- Base de datos: no se tocó.
- Backend: no se modificó ningún endpoint.
- Payloads: no se cambiaron.
- Lógica de tienda: no se cambió.
- Lógica de pedidos: no se modificó.
- Lógica de pagos: no se modificó.
- `ProductOperationalMapping`: no se tocó.
- W6.03: no se rompió.
- W6.04: no se tocó.
- W6.05F: no se tocó.
- W6.10: no se tocó.
- Empresarial funcionalmente: no se tocó.
- Mascotas: no se tocó.
- KLFUFPK8: no se tocó.
- `app/(app)/dashboard/compras/page.tsx`: no se modificó.
- `app/(app)/dashboard/tienda/page.tsx`: no se modificó.
- Dependencias: no se agregaron.

## 6. Skills usadas

- `prerescate-rules`: reglas del proyecto.
- `verification-loop`: verificación sistemática.
- `frontend-patterns`: patrones frontend.
- `dashboard-builder`: estructura de dashboard.

## 7. Validaciones ejecutadas

- `git status --short`: solo archivos tocados.
- `git diff`: cambios solo en layout y nuevo doc.
- `git diff --check`: sin whitespace errors.
- `npx prisma validate`: schema válido ✅
- `npm run typecheck`: typecheck pasa ✅
- `npm run build`: build exitoso ✅

## 8. Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `app/(app)/dashboard/layout.tsx` | 4 referencias de navegación actualizadas |
| `docs/w605g-d-store-navigation-route-update.md` | Documentación del cambio |

## 9. Estado Git

- HEAD = `8fb4c95` (origin/master)
- Workspace limpio salvo `tmp/`
- Archivos staged: `app/(app)/dashboard/layout.tsx`, `docs/w605g-d-store-navigation-route-update.md`

## 10. Commit

```
W6.05G-D point store navigation to new route
```

## 11. Push

Push normal a origin/master después de validaciones.