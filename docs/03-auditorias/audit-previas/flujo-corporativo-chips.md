# Auditoría — Flujo Corporativo y Chips

**Fecha:** 2026-06-09  
**Objetivo:** Auditar el flujo completo corporativo: creación de empresa, chips, panel empresa, y proponer flujo correcto.  
**No se modificó código. No se hizo commit.**

---

## 1. Flujo real actual al crear empresa

### Endpoint: `POST /api/admin/organizations`

**Archivo:** `app/api/admin/organizations/route.ts` (223 líneas)

### Qué crea en BD (dentro de transacción de 30s)

| Paso | Tabla | Datos creados | Cantidad |
|------|-------|---------------|----------|
| 1 | `Account` | `accountType: "company"`, `packageId`, `maxChipsAllocated: maxChips`, `accountName: legalName` | 1 |
| 2 | `User` | Owner con `email`, `passwordHash`, `role: "owner"`, `accountId` | 1 |
| 3 | `Account.update` | Se actualiza `ownerUserId` | 1 |
| 4 | `Profile` | Blank: `firstName: displayName`, `bloodType: "Pendiente"` | 1 |
| 5 | `Organization` | `legalName`, `companyCode`, `contactEmail`, `accountId` | 1 |
| 6 | `Chip` | Chips con `status: "inventory"`, `accountId`, `productType: "sticker_nfc_qr"` | **N chips** |
| 7 | `ChipClaimToken` | Token de activación por chip (válido 1 año) | **N tokens** |

### ¿Cuántos chips crea y de dónde sale?

```
maxChips = Number(maxChips) || 30
```

El valor por defecto es **30 chips** (campo `maxChips` en el modal). El admin puede configurarlo.

**Origen del número:** El formulario `OrgCreateModal.tsx` línea 16: `maxChips: 30`. El label es "Cant. Máxima Empleados" pero el valor se usa como cantidad de chips a crear.

### Código de creación de chips (líneas 186-210)

```typescript
for (const codes of chipDataBatch) {
  const chip = await tx.chip.create({
    data: {
      serialPublic,
      shortCode,
      nfcUrl: `${SITE_URL}/e/${shortCode}?source=nfc`,
      qrUrl: `${SITE_URL}/e/${shortCode}`,
      batchId: batchId,
      productType: "sticker_nfc_qr",
      status: "inventory",
      accountId: account.id
    },
  });
  await tx.chipClaimToken.create({
    data: {
      chipId: chip.id,
      activationCode,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });
}
```

### Los chips se crean con

- `status: "inventory"` → disponibles para asignar
- `accountId` → pertenecen a la cuenta corporativa
- `productType: "sticker_nfc_qr"` (hardcodeado)

---

## 2. Chips creados automáticamente: origen y propósito

### ¿Por qué se crean chips automáticos?

Porque el diseño original era:
1. Admin crea empresa → se crean N chips automáticamente asociados a la cuenta
2. Admin asigna chips a empleados desde el detalle de la empresa
3. Empleado activa su chip

### ¿Sigue siendo necesario para algún flujo actual?

**Sí, para el flujo de asignación actual:**
- `POST /api/admin/organizations/[orgId]/assign-bulk` → asigna chips **ya existentes** de la cuenta corporativa
- `POST /api/admin/organizations/[orgId]/batch` → crea chips nuevos
- `OrgDetail.tsx` → muestra `currentChips / maxChips`

**Pero el flujo deseado es diferente.**

### ¿Qué esperan los endpoints existentes?

| Endpoint | Espera chips preexistentes? |
|----------|---------------------------|
| `assign-bulk` | Sí — transfiere chips desde la cuenta corporativa a users |
| `batch` | No — crea chips nuevos |
| `assign-chip` por shortcode | No — busca el chip en toda la DB |

---

## 3. Panel administrador de empresa (cliente)

### Archivo: `app/(app)/dashboard/empresas/page.tsx` (2629 líneas)

### Tabs disponibles

| Tab | Función |
|-----|---------|
| `solicitantes` | Personas registradas sin organización |
| `solicitudes` | Solicitudes de ingreso pendientes |
| `aprobados` | Miembros aprobados |
| `pagos_enviados` | Pagos enviados |
| `rechazados` | Solicitudes rechazadas |
| `pagados` | Pagos confirmados |
| `suspendidos` | Miembros suspendidos |
| `archivados` | Miembros archivados |

### Lo que puede hacer la empresa

| Acción | API | ¿Implementado? |
|--------|-----|----------------|
| Ver mi estado corporativo | `GET /api/organizations/my-status` | ✅ |
| Ver miembros del equipo | `GET /api/organizations/members` | ✅ |
| Aprobar/rechazar empleados | `PATCH /api/organizations/members/[id]/status` | ✅ |
| Solicitar productos corporativos | `POST /api/organizations/product-requests` | ✅ |
| Ver perfil público empresa | `GET /api/organizations/public-profile` | ✅ |
| Editar perfil público | `PUT /api/organizations/public-profile` | ✅ |
| Realizar pedidos corporativos | `POST /api/organizations/corporate-orders` | ✅ |
| Generar pedido desde requests | `POST /api/organizations/corporate-orders/from-requests` | ✅ |
| Gestionar colaboradores | `app/(app)/dashboard/colaboradores/page.tsx` | ✅ |

### Flujo de solicitud de productos

1. Empleado solicita producto → `POST /api/organizations/product-requests`
2. Queda con `status: "pending_company_approval"`
3. Empresa aprueba/rechaza
4. Si aprueba → genera orden corporativa → `POST /api/organizations/corporate-orders/from-requests`

### Flujo de pedidos corporativos

- `POST /api/organizations/corporate-orders` → crea `Order` con `orderType: "corporate_employee_purchase"`, `organizationId`, y `CorporateOrderEmployeeItem` por cada miembro/producto
- `POST /api/organizations/corporate-orders/from-requests` → convierte requests aprobados en orden

---

## 4. Solicitudes corporativas y pedidos corporativos

### ProductRequest (`CorporateProductRequest`)

| Campo | Valor |
|-------|-------|
| `status` | `"pending_company_approval"` (default) |
| `organizationId` | FK a Organization |
| `organizationMemberId` | FK a OrganizationMember |
| `requestedByUserId` | FK a User |
| `orderId` | String? (se asigna cuando se genera orden) |
| `companyReviewedAt` | DateTime? |
| `companyReviewedById` | String? |
| `rejectionReason` | String? |

### CorporateOrder (NO existe como modelo)

**No hay modelo `CorporateOrder` en Prisma.** 
El flujo usa:
- `Order` con `orderType: "corporate_employee_purchase"` y `organizationId`
- `CorporateOrderEmployeeItem` para items individuales por empleado

### CorporateOrderEmployeeItem

| Campo | Valor |
|-------|-------|
| `fulfillmentStatus` | `"pending_assignment"` (default) |
| `chipId` | String? (nullable — se asigna después) |
| `productId` | Producto solicitado |
| `quantity` | 1 |
| `unitPrice` | Precio unitario |

---

## 5. Modelo de datos real

```
User (owner) ──→ Account (company)
                  ├── packageId → Package
                  ├── maxChipsAllocated: Int
                  └── organizations: Organization[]
                            │
                     Organization
                      ├── accountId → Account
                      ├── companyCode
                      └── members: OrganizationMember[]
                                 │
                          OrganizationMember
                           ├── profileId → Profile
                           ├── corporateStatus: "pending_company_review"
                           └── employeeId, position, shift...
                                      │
                          CorporateProductRequest
                           ├── status: "pending_company_approval"
                           └── orderId → Order (cuando se genera)
                                               │
                                          Order
                                           ├── orderType: "corporate_employee_purchase"
                                           ├── organizationId
                                           └── corporateEmployeeItems[]
                                                         │
                                              CorporateOrderEmployeeItem
                                               ├── fulfillmentStatus: "pending_assignment"
                                               ├── chipId → Chip (nullable)
                                               └── productId → Product
```

---

## 6. Diferencia entre flujo actual y flujo deseado

### Flujo actual

```
Admin crea empresa → Crea Account + User + Profile + Organization + N chips + N tokens
                                                                  │
                              ┌─────────────────────────────────────┘
                              ▼
                  Chips en inventario de la cuenta
                              │
                    Admin asigna chips a empleados
                              │
                    Empleado activa chip
```

### Flujo deseado

```
Admin crea empresa → Crea Account + User + Profile + Organization (sin chips)
                              │
                    Empresa solicita productos/chips
                              │
                    Admin aprueba + pago
                              │
                    Admin asigna chips desde inventario global
                              │
                    Empleado activa chip
```

### Diferencias clave

| Aspecto | Actual | Deseado |
|---------|--------|---------|
| Chips al crear empresa | **Sí** — se crean N chips | **No** — no crear chips |
| Origen de chips | Creados en la cuenta corporativa | Desde inventario global |
| Capacidad vs chips | Se crean chips = maxChips | `maxChipsAllocated` como límite |
| Flujo de solicitud | Admin asigna directamente | Empresa solicita → Admin aprueba → Asigna |

---

## 7. Cambios mínimos recomendados

### Fase 1 (P0) — Quitar creación automática de chips

**Archivo:** `app/api/admin/organizations/route.ts`

- Eliminar líneas 119-129 (pre-generación de códigos)
- Eliminar líneas 186-210 (creación de chips y tokens en transacción)
- Mantener: Account, User, Profile, Organization
- Mantener `maxChipsAllocated` como **capacidad**

### Fase 2 (P1) — Ajustar UI

- `OrgCreateModal.tsx` — "Cant. Máxima Empleados" → "Capacidad Máxima de Chips"
- `OrgDetail.tsx` — mostrar chips asignados, no creados

### Fase 3 (P1) — Flujo de aprobación

- Admin revisa product requests en Admin > Pedidos
- Admin aprueba → genera orden corporativa
- Admin asigna chips desde inventario global

---

## 8. Riesgos de quitar chips automáticos

| Riesgo | Nivel | Mitigación |
|--------|-------|------------|
| Empresas existentes pierden chips no asignados | Medio | Solo afecta nuevas creaciones |
| `assign-bulk` sin chips en cuenta | Medio | Mover chips del inventario global primero |
| Admin no sabe cómo conseguir chips | Medio | Agregar botón "Asignar desde inventario global" |
| `batch` sigue siendo necesario | Bajo | Mantener para creación manual |
| `OrgDetail.tsx` muestra conteo incorrecto | Bajo | Refactorizar para mostrar asignados |

---

## 9. Plan de implementación por fases

### Fase 1: Detener creación automática

**Archivos:** `app/api/admin/organizations/route.ts`

1. Eliminar pre-generación de códigos
2. Eliminar loop de creación de chips
3. Mantener estructura Account + User + Profile + Organization

### Fase 2: Ajustar UI admin

**Archivos:**
- `OrgCreateModal.tsx` — cambiar labels
- `OrgDetail.tsx` — lógica de conteo

### Fase 3: Flujo de aprobación

**Endpoints existentes:**
- `POST /api/admin/organizations/[orgId]/product-requests/[id]/approve`
- `POST /api/organizations/product-requests`
- UI admin para revisar pendientes

### Fase 4: Notificaciones

- Empresa: cuando admin aprueba/rechaza
- Empleado: cuando chip está asignado

---

## 10. Veredicto

| Afirmación | Resultado |
|------------|-----------|
| ¿Se crean chips automáticamente? | **SÍ** — 30 por defecto |
| ¿Es necesario? | **Parcialmente** — solo para el flujo de asignación directa |
| ¿Existe `CorporateOrder`? | **NO** — se usa `Order` + `orderType` |
| ¿Panel empresa solicita productos? | **SÍ** — via `product-requests` |
| ¿Panel empresa aprueba empleados? | **SÍ** — via `members/[id]/status` |
| ¿Admin asigna desde inventario? | **SÍ** — via `assign-bulk` y `assign-chip` |
| ¿Flujo deseado es viable? | **SÍ** — con cambios mínimos |

### Conclusión

**Sí se puede quitar la creación automática de chips.** El flujo corporativo ya soporta solicitudes, aprobación, órdenes y asignación.

Solo falta:
1. Dejar de crear chips automáticamente (1 cambio en organizations/route.ts)
2. Ajustar UI para reflejar capacidad en lugar de chips pre-creados
3. Exponer solicitudes pendientes en el panel admin

**No se modificó código. No se hizo commit.**

---
*Originalmente en: docs/audit/*