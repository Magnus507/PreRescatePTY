# W6.05G-F — Corregir Clasificación Personal/Empresa en Tienda

## 1. Problema detectado

En la auditoría W6.05G-E se detectó que **Sticker PreRescatePTY Empresarial** aparecía dentro de la sección "Combos personales" en `/dashboard/tienda`.

### Causa raíz

La función `isBusinessProduct()` en `page.tsx` usaba **solo el nombre del producto** para detectar si era empresarial:

```typescript
const BUSINESS_NAMES = ["Combo Empresa", "Corporativo"];
function isBusinessProduct(name: string): boolean {
  return BUSINESS_NAMES.some((b) => name.toLowerCase().includes(b.toLowerCase()));
}
```

"Sticker PreRescatePTY Empresarial" **NO contiene** "Combo Empresa" ni "Corporativo" → `isBusinessProduct()` retornaba `false` → el producto caía en `personalProducts` → se renderizaba dentro de "Combos personales".

## 2. Campos usados para clasificar

La data correcta ya existía en `ProductOperationalMapping` y era devuelta por `GET /api/products` dentro de `product.operationalMapping`:

| Campo | Valor para Sticker Empresarial |
|---|---|
| `storeSection` | `business_devices` |
| `deviceType` | `business` |
| `purchaseFlow` | `company_request` |
| `requiresCompanyContext` | `true` |

## 3. Cambio realizado

### Archivo modificado

- `app/(app)/dashboard/tienda/page.tsx`

### `isBusinessProduct()` — nueva lógica

```typescript
function isBusinessProduct(product: Product): boolean {
  const mapping = product.operationalMapping;
  return (
    mapping?.storeSection === "business_devices" ||
    mapping?.deviceType === "business" ||
    mapping?.purchaseFlow === "company_request" ||
    mapping?.requiresCompanyContext === true
  );
}
```

### `getBusinessLabel()` — nueva lógica

```typescript
function getBusinessLabel(product: Product): string {
  const mapping = product.operationalMapping;
  if (mapping?.deviceType === "business") return "Empresarial";
  if (mapping?.purchaseFlow === "company_request") return "Solicitud empresarial";
  return "Producto empresarial";
}
```

### Llamadas actualizadas

- `products.filter((p) => !isBusinessProduct(p))` — pasa el objeto `Product`, no `p.name`
- `products.filter((p) => isBusinessProduct(p))` — igual
- `getBusinessLabel(p)` — pasa el objeto `Product`, no `p.name`

### Código eliminado

- Constante `BUSINESS_NAMES` (ya no se usa)
- Función `isBusinessProduct(name: string)` (reemplazada)
- Función `getBusinessLabel(name: string)` (reemplazada)

## 4. Resultado esperado en tienda

| Sección | Producto |
|---|---|
| **Combos personales** | Sticker PreRescatePTY |
| **Para empresas** (acordeón) | Sticker PreRescatePTY Empresarial |

Sticker PreRescatePTY Empresarial **ya no aparece** en "Combos personales".

## 5. Stock 0 — pendiente operativo

Ambos productos siguen apareciendo **"Agotado temporalmente"** porque no existen unidades en `OperationFinishedGoodUnit`. Esto es correcto y no se corrige en esta fase. Es un pendiente operativo para producción de unidades.

## 6. Qué NO se tocó

- `schema.prisma`: no se modificó.
- Migraciones: no se crearon.
- Base de datos: no se tocó.
- Backend: no se modificó ningún endpoint.
- Payloads: no se cambiaron.
- Lógica de pedidos: no se modificó.
- Lógica de pagos: no se modificó.
- `ProductOperationalMapping`: no se tocó a nivel DB.
- W6.03: no se rompió.
- W6.04: no se tocó.
- W6.05F: no se tocó.
- W6.10: no se tocó.
- Empresarial funcionalmente: no se tocó (solo clasificación visual).
- Mascotas: no se tocó.
- KLFUFPK8: no se tocó.
- `/dashboard/compras`: no se modificó.
- Navegación: no se cambió.
- Dependencias: no se agregaron.

## 7. Skills usadas

- `prerescate-rules`: reglas del proyecto.
- `verification-loop`: verificación sistemática.
- `frontend-patterns`: patrones frontend.
- `dashboard-builder`: estructura de dashboard.
- `frontend-a11y`: accesibilidad.
- `design-system`: sistema de diseño.

## 8. Validaciones ejecutadas

- `git status --short`: solo archivos tocados.
- `git diff`: cambios solo en tienda page y nuevo doc.
- `git diff --check`: sin whitespace errors.
- `npx prisma validate`: schema válido ✅
- `npm run typecheck`: typecheck pasa ✅
- `npm run build`: build exitoso ✅

## 9. Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `app/(app)/dashboard/tienda/page.tsx` | Clasificación personal/empresa por mapping, no por nombre |
| `docs/w605g-f-store-business-classification-fix.md` | Documentación del cambio |

## 10. Estado Git

- HEAD = `0bc5cf4` (origin/master)
- Workspace limpio salvo `tmp/`
- Archivos staged: `app/(app)/dashboard/tienda/page.tsx`, `docs/w605g-f-store-business-classification-fix.md`

## 11. Commit

```
W6.05G-F fix store business product classification
```

## 12. Push

Push normal a origin/master después de validaciones.

## 13. Reporte final

| Aspecto | Resultado |
|---------|-----------|
| Backend tocado | No |
| Frontend tocado | Sí — solo `app/(app)/dashboard/tienda/page.tsx` |
| Prisma modificado | No |
| Migraciones | No |
| Endpoints modificados/creados | No |
| Qué se corrigió | Clasificación personal/empresa usando `operationalMapping` en lugar de nombre |
| Resultado esperado | Sticker Empresarial en sección "Para empresas", no en "Combos personales" |
| Stock 0 | Documentado como pendiente operativo — no se corrige |