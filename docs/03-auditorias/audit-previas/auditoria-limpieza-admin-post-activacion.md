# Auditoría — Limpieza Admin Post-Activación Automática

**Fecha:** 2026-10-06
**Objetivo:** Identificar funcionalidades obsoletas tras el cambio a activación automática por el usuario final.
**Regla:** NO modificar código. Solo auditar.

---

## Resumen Ejecutivo

El sistema migró exitosamente de un modelo donde **Admin asignaba manualmente chips a pedidos** a un modelo donde el **usuario activa su chip y el sistema vincula automáticamente**. Sin embargo, el panel Admin conserva múltiples componentes heredados de la arquitectura anterior que ya no tienen sentido operativo o representan riesgos de seguridad.

**Hallazgos clave:**
- **6 botones/funcionalidades P0** (pueden eliminarse con seguridad)
- **4 botones/funcionalidades P1** (deben ocultarse de la UI)
- **3 áreas P2** (requieren refactor)
- **Código legacy detectado** en PedidosSection, OrgDetail, hooks

---

## SECCIÓN 1: Empresas (Organizaciones)

### Archivos auditados:
- `app/(admin)/admin/_components/details/OrgDetail.tsx`
- `app/(admin)/admin/_hooks/useAdminOrgs.ts`
- `app/(admin)/admin/_components/modals/BatchCreateModal.tsx`
- `app/api/admin/organizations/route.ts`
- `app/(admin)/admin/_services/domains/orgs.service.ts`

### Botón 1: Vinculación por Código (ShortCode)
- **Ubicación:** OrgDetail.tsx línea 135–144
- **Endpoint:** `assignChipByShortCode(orgId, shortCode)` → `POST /api/admin/organizations/{id}/assign-chip`
- **¿Sigue siendo necesario?** NO
- **¿Por qué?** En el nuevo paradigma, los chips corporativos se asignan mediante CorporateOrderEmployeeItem + activación del empleado. No hay razón para que un Admin pueda vincular un chip a una organización manualmente.
- **Clasificación:** P0 — ELIMINAR
- **Riesgo:** Ninguno. La activación automática y el flujo corporativo (CorporateOrderEmployeeItem) ya cubren este caso.

### Botón 2: Asignación Masiva (Lote)
- **Ubicación:** OrgDetail.tsx línea 147–159
- **Endpoint:** `assignBulkChips(orgId, count)` → `POST /api/admin/organizations/{id}/assign-bulk`
- **¿Sigue siendo necesario?** NO
- **¿Por qué?** Los chips ya no se "transfieren" en lote. El flujo corporativo asigna chips individuales por empleado a través de CorporateOrderEmployeeItem.
- **Clasificación:** P0 — ELIMINAR
- **Riesgo:** Bajo. Pero verificar que no haya dependencias downstream en domains/chips.

### Botón 3: Crear Lote
- **Ubicación:** OrgDetail.tsx línea 173–175 + BatchCreateModal
- **Endpoint:** Modal → llama a `POST /api/admin/chips/batch-create`
- **¿Sigue siendo necesario?** PARCIALMENTE
- **¿Por qué?** Crear lotes de chips en inventario sigue siendo necesario para fabricación, pero NO debería hacerse desde el detalle de una organización. Eso es una acción de SuperAdmin desde InventorySection.
- **Clasificación:** P1 — OCULTAR UI desde OrgDetail. Mantener solo en InventorySection.
- **Riesgo:** Bajo. Solo mover lógica de UI.

### Botón 4: Invitar Miembro
- **Ubicación:** OrgDetail.tsx línea 176–179
- **Endpoint:** El prop `onAddUser` está vacío (`() => {}`) en admin/page.tsx línea 226
- **¿Sigue siendo necesario?** SÍ, pero está INCOMPLETO
- **¿Por qué?** Las organizaciones necesitan invitar miembros para asignar beneficios corporativos. Pero actualmente es un placeholder sin funcionalidad real.
- **Clasificación:** P2 — REQUIERE REFACTOR
- **Riesgo:** Ninguno (no hace nada).

### Botón 5: Dar de Baja Entidad
- **Ubicación:** OrgDetail.tsx línea 97–100
- **Endpoint:** `deleteOrg(id, name)`
- **¿Sigue siendo necesario?** SÍ
- **¿Por qué?** Administración básica de entidades.
- **Clasificación:** OK — Mantener

### Conclusión Empresas:
| Funcionalidad | Clasificación | Acción |
|---|---|---|
| Vinculación por Código | P0 | Eliminar |
| Asignación Masiva | P0 | Eliminar |
| Crear Lote (desde Org) | P1 | Ocultar de OrgDetail |
| Invitar Miembro | P2 | Refactor (está vacío) |
| Dar de Baja | OK | Mantener |
| Editar Info | OK | Mantener |

---

## SECCIÓN 2: Pedidos

### Archivos auditados:
- `app/(admin)/admin/_components/sections/PedidosSection.tsx` (1655 líneas)
- `app/api/admin/orders/[id]/approve/route.ts`
- `app/api/admin/orders/route.ts`
- `domains/orders/services/order-fulfillment.service.ts`

### Funcionalidad 1: Picking Físico Manual
- **Ubicación:** PedidosSection.tsx líneas 899–971 (sección "Picking Físico" con search + chip selection)
- **Endpoint:** PATCH `/api/admin/orders` enviando `assignedChipIds`
- **¿Sigue siendo necesario?** NO
- **¿Por qué?** En el nuevo paradigma, el Admin ya no asigna chips manualmente. La activación por parte del usuario asigna el chip automáticamente. El picking físico solo aplica para control de inventario interno (imprenta), pero NO debe estar en Pedidos.
- **Clasificación:** P0 — ELIMINAR de PedidosSection (mover lógica de conteo a InventorySection si es necesario)
- **Riesgo:** Medio. Verificar que `handleStatusChange` y `handleReviewAction` no dependan de `assignedChipIds`.

### Funcionalidad 2: Estados de Fabricación / Listo / Entregado
- **Ubicación:** PedidosSection.tsx líneas 725–764 (botones "Marcar listo", "Marcar entregado")
- **Endpoint:** PATCH `/api/admin/orders/{id}/corporate-items/{itemId}/fulfillment`
- **¿Sigue siendo necesario?** PARCIALMENTE — Solo para pedidos corporativos con productos físicos. Pero para chips individuales estos estados no aplican.
- **Clasificación:** P1 — OCULTAR para productos tipo chip. Mantener para accesorios físicos (llaveros, stickers, etc.)
- **Riesgo:** Bajo.

### Funcionalidad 3: Asignación de Chip Principal (Corporate)
- **Ubicación:** PedidosSection.tsx líneas 772–797
- **Endpoint:** `POST /api/admin/orders/{id}/corporate-assign`
- **¿Sigue siendo necesario?** NO
- **¿Por qué?** El empleado activa su chip y el sistema asigna automáticamente. CorporateOrderEmployeeItem ya vincula chipId en la activación (ver activate/route.ts línea 301–305).
- **Clasificación:** P0 — ELIMINAR
- **Riesgo:** Bajo. La activación automática ya cubre este caso.

### Funcionalidad 4: Tracking Corporativo con QR
- **Ubicación:** PedidosSection.tsx líneas 799–835
- **Endpoint:** No tiene endpoint (solo UI)
- **¿Sigue siendo necesario?** SÍ — Pero debe generarse automáticamente al activar el chip.
- **Clasificación:** OK — Mantener, pero validar que el QR se genera post-activación.

### Conclusión Pedidos:
| Funcionalidad | Clasificación | Acción |
|---|---|---|
| Picking Físico Manual | P0 | Eliminar de PedidosSection |
| Estados Fab/Listo/Entregado | P1 | Ocultar para chips |
| Asignación Chip Principal Corp | P0 | Eliminar |
| QR/Link Tracking | OK | Mantener |
| Aprobación Pago Manual | OK | Mantener |
| Revisión Pago Corporate | OK | Mantener |
| Eliminar Órdenes Canceladas | OK | Mantener |

---

## SECCIÓN 3: Inventario

### Archivos auditados:
- `app/(admin)/admin/_components/sections/InventorySection.tsx`
- `app/(admin)/admin/_components/sections/CreateBatchSection.tsx`
- `app/api/admin/chips/`
- `domains/chips/`

### Funcionalidad 1: Crear Lote
- **¿Sigue siendo necesario?** SÍ — Para fabricación y entrada de stock.
- **¿Quién debería usarlo?** Solo SuperAdmin / rol "imprenta".
- **Clasificación:** OK — Mantener en InventorySection, remover de OrgDetail.

### Funcionalidad 2: Visualización de Stock
- **¿Sigue siendo necesario?** SÍ — Para control de inventario.
- **Clasificación:** OK — Mantener.

### Conclusión Inventario:
| Funcionalidad | Clasificación | Acción |
|---|---|---|
| Crear Lote | OK | Mantener (solo SuperAdmin/imprenta) |
| Ver Stock | OK | Mantener |

---

## SECCIÓN 4: Activación

### Archivos auditados:
- `app/api/chips/activate/route.ts` (352 líneas)
- `app/(app)/dashboard/pedidos/page.tsx` (vista de activación del cliente)
- `domains/chips/chip-lifecycle.constants.ts`

### Preguntas:

**1. ¿La activación asigna automáticamente usuario?**
SÍ. Línea 275: `ownerUserId: userId`

**2. ¿La activación asigna automáticamente perfil?**
SÍ. Línea 277: `assignedProfileId` — asigna perfil normal o corporativo según el caso.

**3. ¿Todavía existe alguna dependencia de asignación manual?**
SÍ — En PedidosSection persiste `assignedChipIds` y `handleStatusChange` que envía chips asignados manualmente. Esto es código legacy que debe eliminarse.

**4. ¿Existen rutas legacy?**
SÍ — `app/(app)/dashboard/activar/page.tsx` debe revisarse para ver si usa el flujo antiguo.

**5. ¿Existe código muerto?**
En PedidosSection:
- `loadInventory()` (línea 142) — Carga chips para picking manual → Legacy
- `assignedChipIds` state (línea 118) — Legacy
- `handleStatusChange` con `generateTokens` (línea 253) — Este es correcto

**6. ¿Existen endpoints ya innecesarios?**
- `PATCH /api/admin/orders` con `assignedChipIds` — Legacy
- `POST /api/admin/orders/{id}/corporate-assign` — Legacy (cubierto por activate)

### Conclusión Activación:
| Funcionalidad | Clasificación | Acción |
|---|---|---|
| Activate route | OK | Funciona correctamente |
| assignedChipIds en Pedidos | P0 | Eliminar código muerto |
| corporate-assign endpoint | P0 | Eliminar endpoint |
| dashboard/activar | P0 | Revisar + limpiar |

---

## SECCIÓN 5: Accesorios

### Archivos auditados:
- `app/(app)/dashboard/tienda/page.tsx`
- `app/api/orders/route.ts`
- `app/api/admin/orders/[id]/approve/route.ts`

### Validaciones:

**1. ¿Todos los accesorios exigen chip activo?**
SÍ. Tienda línea 131–137: verifica `profile.assignedChips?.[0]` y muestra error si no hay chip activo.

**2. ¿No existe bypass?**
NO. La validación es del lado del cliente (React) + la API de órdenes también valida el chip activo en `POST /api/orders`.

**3. ¿No existen flujos antiguos?**
NO. El flujo de accesorios está actualizado.

**4. ¿El Admin ve correctamente la relación accesorio → chip?**
Parcialmente. En PedidosSection se ven los items con `chip` y `profile`. Los chips vinculados a accesorios se muestran correctamente.

### Conclusión Accesorios:
| Validación | Estado |
|---|---|
| Exige chip activo | ✅ Correcto |
| Sin bypass | ✅ Correcto |
| Sin flujos antiguos | ✅ Correcto |
| Admin ve relación | ✅ Correcto |

---

## SECCIÓN 6: Código Legacy — Hallazgos Adicionales

### Código comentado:
- No se detectaron bloques grandes de código comentado.

### Secciones ocultas con `false &&`:
- No se detectaron.

### Endpoints sin uso aparente:
| Endpoint | Razón |
|---|---|
| `POST /api/admin/organizations/{id}/assign-chip` | Ya no se asigna manualmente |
| `POST /api/admin/organizations/{id}/assign-bulk` | Ya no se asigna en lote |
| `POST /api/admin/orders/{id}/corporate-assign` | Ya no se asigna chip a empleado manualmente |

### Hooks sin uso completo:
- `assignChipByShortCode` en `useAdminOrgs.ts` — Solo usado en OrgDetail (que debe eliminarse)
- `assignBulkChips` en `useAdminOrgs.ts` — Solo usado en OrgDetail (que debe eliminarse)

### Servicios sin uso:
- Revisar `domains/orders/services/order-fulfillment.service.ts` — Podría contener lógica de fulfillment manual legacy.

---

## Clasificación Completa

### P0 — Eliminar seguro
1. **Vinculación por Código** en OrgDetail (Botón + endpoint)
2. **Asignación Masiva** en OrgDetail (Botón + endpoint)
3. **Picking Físico Manual** en PedidosSection (search + assignedChipIds + selección)
4. **Asignación Chip Principal Corporativo** en PedidosSection (select + endpoint corporate-assign)
5. **assignedChipIds state** en PedidosSection (código muerto)
6. **Endpoint corporate-assign** (`POST /api/admin/orders/{id}/corporate-assign`)

### P1 — Ocultar UI
1. **Crear Lote** desde OrgDetail (mover solo a InventorySection)
2. **Estados Fab/Listo/Entregado** para productos tipo chip en PedidosSection corporativo
3. **Botón "Invitar Miembro"** está vacío (ocultar hasta implementar)
4. **loadInventory()** en PedidosSection (solo para picking legacy)

### P2 — Requiere refactor
1. **Invitar Miembro** en OrgDetail (placeholder vacío)
2. **Estados de fulfillment** en CorporateEmployeeItem (simplificar para nuevo paradigma)
3. **order-fulfillment.service.ts** (revisar si contiene lógica legacy)

### P3 — Backlog
1. **Exportar CSV** desde admin (funciona pero podría unificarse)
2. **Dashboard stats** (verificar que métricas reflejen nuevo paradigma)
3. **Documentación de activation flow** para nuevo onboarding

---

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Eliminar assignedChipIds rompe handleStatusChange | Media | Alto | Verificar que handleStatusChange tenga fallback |
| Eliminar corporate-assign rompe CorporateOrderEmployeeItem | Baja | Alto | CorporateOrderEmployeeItem se vincula en activate/route.ts |
| Ocultar picking rompe flujo de imprenta | Media | Medio | Imprenta usa InventorySection, no PedidosSection |
| Eliminar assign-bulk afecta migración de datos | Baja | Medio | Solo afecta datos históricos |

---

## Próximo Commit Recomendado

```
git add docs/audit/auditoria-limpieza-admin-post-activacion.md
git commit -m "Add post-activation admin cleanup audit"
```

**Acciones prioritarias post-auditoría:**
1. Sprint de limpieza P0 (estimación: 2–3 días)
2. Sprint de ocultación P1 (estimación: 1 día)
3. Refactor P2 (estimación: 2 días)
4. Backlog P3 (estimación: 1 día)

**Total estimado:** 6–7 días de desarrollo para limpiar completamente el panel Admin.

---
*Originalmente en: docs/audit/*