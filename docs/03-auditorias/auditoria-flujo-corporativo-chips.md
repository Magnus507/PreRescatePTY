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
  // Pre-generados arriba: shortCode, serialPublic, activationCode
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
  // Crear activation token
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
- `productType: "sticker_nfc_qr"` (hardcodeado, no viene del formulario)

---

## 2. Chips creados automáticamente: origen y propósito

### ¿Por qué se crean chips automáticos?

Porque originalmente el diseño era:
1. Admin crea empresa → se crean N chips automáticamente asociados a la cuenta
2. Admin asigna chips a empleados desde el detalle de la empresa
3. Empleado activa su chip

### ¿Sigue siendo necesario para algún flujo actual?

**Sí, para el flujo de asignación actual:**
- `POST /api/admin/organizations/[orgId]/assign-bulk` → asigna chips **ya existentes** de la cuenta corporativa
- `POST /api/admin/organizations/[orgId]/batch` → crea chips nuevos en la cuenta corporativa
- `OrgDetail.tsx` → muestra `currentChips / maxChips` (chips existentes / capacidad)

**Pero el flujo deseado es diferente.**

### ¿Qué esperan los endpoints existentes?

| Endpoint | Espera chips preexistentes? |
|----------|---------------------------|
| `assign-bulk` | Sí — transfiere chips desde la cuenta corporativa a users |
| `batch` | No — crea chips nuevos |
| `assign-chip` por shortcode | No — busca el chip en toda la DB y lo asigna |

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
| Aprobar/rechazar empleados | `PATCH /api/organizations/members/[id]/status` | ✅ (desde panel) |
| Solicitar productos corporativos | `POST /api/organizations/product-requests` | ✅ |
| Ver perfil público empresa | `GET /api/organizations/public-profile` | ✅ |
| Editar perfil público | `PUT /api/organizations/public-profile` | ✅ |
| Realizar pedidos corporativos | `POST /api/organizations/corporate-orders` | ✅ |
| Generar pedido desde requests | `POST /api/organizations/corporate-orders/from-requests` | ✅ |
| Gestionar colaboradores | `app/(app)/dashboard/colaboradores/page.tsx` | ✅ |

### Flujo de solicitud de productos

1. Empleado solicita producto → `POST /api/organizations/product-requests`
2. Queda con `status: "pending_company_approval"`
3. Empresa (admin corporativo) aprueba/rechaza
4. Si se aprueba, se puede generar orden corporativa → `POST /api/organizations/corporate-orders/from-requests`

### Flujo de pedidos corporativos

- `POST /api/organizations/corporate-orders` → crea `Order` con `orderType: "corporate_employee_purchase"`, `organizationId`, y `CorporateOrderEmployeeItem` por cada miembro/producto
- `POST /api/organizations/corporate-orders/from-requests` → convierte product requests aprobados en una orden

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

**Estados posibles:**
- `pending_company_approval` → espera aprobación
- Otros estados: NO ENCONTRADOS EN SCHEMA (solo el default)

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

**Estados de fulfillment:**
- `pending_assignment` → espera asignación de chip
- `activatedAt` → DateTime? (se llena cuando se activa)

---

## 5. Modelo de datos real

```
User (owner) ──┐
               ▼
         Account (company)
          ├── packageId → Package
          ├── maxChipsAllocated: Int
          └── organizations: Organization[]
                    │
                    ▼
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
                     ├── organizationId → Organization
                     └── orderId → Order (cuando se genera)
                                         │
                                    Order
                                     ├── orderType: "corporate_employee_purchase"
                                     ├── organizationId
                                     └── corporateEmployeeItems: CorporateOrderEmployeeItem[]
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
Admin crea empresa ──→ Crea Account + User + Profile + Organization + N chips + N tokens
                                                                        │
                              ┌────────────────────────────────────────┘
                              ▼
                  Chips quedan en inventario de la cuenta
                              │
                    Admin asigna chips a empleados
                              │
                    Empleado activa chip
```

### Flujo deseado

```
Admin crea empresa ──→ Crea Account + User + Profile + Organization (sin chips)
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
| Origen de chips | Creados en la cuenta corporativa | Desde inventario global existente |
| Capacidad vs chips | Se crean chips = maxChips | `maxChipsAllocated` como límite, sin chips físicos |
| Flujo de solicitud | Admin asigna directamente | Empresa solicita → Admin aprueba → Asigna |

---

## 7. Cambios mínimos recomendados

### Fase 1 (P0) — Quitar creación automática de chips

**Archivo:** `app/api/admin/organizations/route.ts`

**Cambio:**
- Eliminar líneas 119-129 (generación de códigos de chips)
- Eliminar líneas 186-210 (creación de chips y tokens en transacción)
- Mantener todo lo demás: Account, User, Profile, Organization
- Mantener `maxChipsAllocated` como **capacidad** (no chips físicos)

**Riesgo de quitar chips automáticos:**
- Bajo si el admin puede asignar chips desde inventario global después
- Medio si hay datos existentes que dependen de chips por cuenta
- **Mitigación:** Los chips existentes seguirán funcionando. Solo los nuevos no se crearán automáticamente.

### Fase 2 (P1) — Ajustar UI para reflejar capacidad

**Archivo:** `OrgCreateModal.tsx`

- Renombrar label "Cant. Máxima Empleados" → "Capacidad Máxima de Chips"
- Cambiar descripción: "Límite de chips que la empresa podrá solicitar"

**Archivo:** `OrgDetail.tsx`

- Cambiar "Chips Asignados" → mostrar chips realmente asignados (no creados automáticamente)
- La barra de progreso muestra `currentChips / maxChips` donde `currentChips` son chips **asignados**, no creados

### Fase 3 (P1) — Flujo de solicitud → aprobación → asignación

- Admin revisa product requests en Admin > Pedidos o nueva sección
- Admin aprueba → se genera orden corporativa
- Admin asigna chips desde inventario global a los items de la orden
- Notificar a empleados que pueden activar

---

## 8. Riesgos de quitar chips automáticos

| Riesgo | Nivel | Mitigación |
|--------|-------|------------|
| Empresas existentes pierden chips no asignados | Medio | Solo afecta nuevas creaciones. Chips existentes se mantienen. |
| Flujo `assign-bulk` sin chips en cuenta corporativa | Medio | `assign-bulk` asigna chips de la cuenta corporativa. Si no hay chips, hay que mover chips del inventario global a la cuenta primero. |
| `OrgDetail.tsx` muestra `currentChips` basado en chips existentes, no asignados | Bajo | Refactorizar para mostrar solo chips asignados a miembros, no creados. |
| Admin no sabe cómo conseguir chips para asignar | Medio | Agregar botón "Asignar desde inventario global" (mueve chips en vez de crearlos). |
| Endpoint `batch` sigue siendo necesario | Bajo | Mantener `POST /api/admin/organizations/[orgId]/batch` para crear chips manualmente. |

---

## 9. Plan de implementación por fases

### Fase 1: Detener creación automática de chips

**Archivos:** `app/api/admin/organizations/route.ts`

1. Eliminar pre-generación de códigos (chipDataBatch, líneas 119-129)
2. Eliminar loop de creación de chips y tokens (líneas 186-210)
3. Mantener estructura de Account, User, Profile, Organization

### Fase 2: Ajustar UI admin

**Archivos:**
- `OrgCreateModal.tsx` — cambiar labels
- `OrgDetail.tsx` — cambiar lógica de conteo de chips

### Fase 3: Flujo de aprobación

**Archivos nuevos/endpoints existentes:**
- `POST /api/admin/organizations/[orgId]/product-requests/[id]/approve` (aprobación)
- `POST /api/admin/organizations/[orgId]/assign-from-inventory` (asignación desde inventario global)
- UI admin para revisar product requests pendientes

### Fase 4: Notificaciones

- Notificar a empresa cuando admin aprueba/rechaza
- Notificar a empleado cuando chip está asignado y listo para activar

---

## 10. Veredicto

| Afirmación | Resultado |
|------------|-----------|
| ¿Se crean chips automáticamente al crear empresa? | **SÍ** — 30 chips por defecto (o el valor de `maxChips`) |
| ¿Es necesario para el flujo actual? | **Parcialmente** — el flujo de asignación directa lo necesita, pero el flujo deseado no |
| ¿Existe `CorporateOrder` como modelo? | **NO** — se usa `Order` con `orderType: "corporate_employee_purchase"` |
| ¿El panel empresa puede solicitar productos? | **SÍ** — via `POST /api/organizations/product-requests` |
| ¿El panel empresa puede aprobar empleados? | **SÍ** — via `PATCH /api/organizations/members/[id]/status` |
| ¿El admin puede asignar chips desde inventario? | **SÍ** — via `assign-bulk` y `assign-chip` |
| ¿El flujo deseado es viable? | **SÍ** — con cambios mínimos en backend y UI |

### Conclusión

**Sí se puede quitar la creación automática de chips.** El flujo corporativo ya soporta:
- Solicitudes de productos por parte de empleados
- Aprobación por la empresa
- Creación de órdenes corporativas
- Asignación de chips desde inventario

Solo falta:
1. Dejar de crear chips automáticamente (1 cambio en organizations/route.ts)
2. Ajustar UI para reflejar capacidad en lugar de chips pre-creados
3. Exponer las solicitudes pendientes en el panel admin para aprobación

**No se modificó código. No se hizo commit.**