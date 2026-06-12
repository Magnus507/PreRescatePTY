# Auditoría — Venta Retail Física

> **Objetivo**: Diseñar el flujo para vender paquetes físicos en tienda sin pedido online.
> **Estado**: Solo análisis — No implementar, no hacer commit.

---

## 1. Estado actual

Hoy el sistema solo soporta venta online:
1. Usuario crea orden via `POST /api/orders` → `provider: "manual"`, `orderStatus: "pending"`, `paymentStatus: "pending"`
2. Admin revisa la orden en Admin UI → `POST /api/admin/orders/{id}/approve`
3. Approve crea `ChipClaimToken` con `activationCode`, vincula a la orden, marca chips como `sold`
4. Cliente recibe código, lo ingresa en Dashboard → `POST /api/chips/activate`
5. Activation consume token, marca chip como `activated`, vincula a usuario/perfil/cuenta

**No existe** un flujo para venta en tienda física donde:
- No hay pedido online
- No hay comprobante de pago
- No hay espera de revisión admin
- El producto se entrega físicamente en el mostrador

---

## 2. Inventario y chips

### Modelo Chip

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `status` | `string` | `inventory`, `sold`, `activated`, `suspended`, `damaged`, `lost` |
| `isPhysical` | `boolean` | Indica si el chip es físico (sticker/tag físico) vs digital |
| `serialPublic` | `string` (unique) | Serial visible para el usuario |
| `shortCode` | `string` (unique) | Código corto público (ej: "ABC12") |
| `activationCode` | `string` | **No existe en Chip** — está en ChipClaimToken |
| `ownerUserId` | `string?` | Usuario propietario (se setea en activación) |
| `assignedProfileId` | `string?` | Perfil asignado (se setea en activación) |

### Estados del chip

```
inventory ──► sold ──► activated
                 │          │
                 │    suspended
                 │          │
                 │    (reactivate → activated)
                 │
           damaged / lost
```

**Constantes relevantes** (`chip-lifecycle.constants.ts`):
```typescript
ACTIVATABLE_CHIP_STATUSES = ["inventory", "sold"]       // ← sold es activable
USED_CAPACITY_CHIP_STATUSES = ["activated", "suspended"]  // ← sold NO consume cupo
```

### Creación de chips

Actualmente hay dos formas:
1. **Admin PATCH /api/admin/orders**: Si `generateTokens=true` y no hay chips asignados, crea chips nuevos con `status: "inventory"` y genera `ChipClaimToken`
2. **Admin Approve**: Usa `OrderFulfillmentService.reserveAssignedChipsForOrder` para tomar chips del inventario y marcarlos como `sold`

### Inventario disponible

`GET /api/admin/chips/inventory` devuelve chips con:
```sql
status = "inventory"
AND ownerUserId IS NULL
AND isPhysical = true
AND claimTokens NO TIENEN tokens activos (no expirados, no usados)
```

---

## 3. Activación por código

### Endpoint: `POST /api/chips/activate`

Recibe:
```json
{
  "activationCode": "ACT-XXXXXX",
  "profileId": "opcional"
}
```

**Validaciones**:
1. Sesión válida (usuario autenticado)
2. Rate limit: 5 intentos/minuto
3. `activationCode` existe en `ChipClaimToken`
4. Token no usado (`usedAt === null`)
5. Token no expirado (`expiresAt > now`)
6. Chip status está en `ACTIVATABLE_CHIP_STATUSES` = `["inventory", "sold"]`
7. Usuario tiene perfil médico completo (nombre, apellido, tipo de sangre)
8. Cuenta no expirada
9. Límite de chips del plan no excedido (`activated + suspended < maxChipsAllocated`)

**Acciones en transacción**:
1. Marca `ChipClaimToken.usedAt = now`
2. Verifica límite de chips (cuenta activated + suspended en la cuenta)
3. Detecta si es chip corporativo (via `CorporateOrderEmployeeItem`)
4. Asigna `ownerUserId`, `accountId`, `assignedProfileId`
5. Marca chip: `status = "activated"`, `activatedAt = now`, `serviceStartDate/EndDate`, `serviceStatus = "active"`
6. Si el token tiene `orderId`, auto-completa la orden (`orderStatus = "completed"`, `paymentStatus = "paid"`)
7. Si es corporativo, marca `fulfillmentStatus = "activated"`
8. Audit log

**Confirmación clave**: ✅ Un chip en estado `sold` **SÍ puede activarse** (está en `ACTIVATABLE_CHIP_STATUSES`).
✅ Se vincula automáticamente al usuario autenticado.
✅ Se vincula automáticamente al perfil (propio o seleccionado).

### Interfaz de activación

No existe una página `/dashboard/activar` independiente. La activación está integrada en:
- **`app/(app)/dashboard/chips/page.tsx`**: Tiene un tab "Activar" con formulario de código y selector de perfil
- **`app/(app)/dashboard/empresas/page.tsx`**: Para chips corporativos, tiene un flujo de activación inline

---

## 4. Pedido retail

### Modelo Order

| Campo | Valor actual | ¿Soporta retail? |
|-------|-------------|------------------|
| `provider` | `"manual"`, `"stripe"`, `"admin"` | ❌ No existe `"retail"` |
| `orderType` | `"manual"`, `"corporate_employee_purchase"` | ❌ No existe `"retail"` |
| `orderStatus` | `"pending"`, `"completed"`, `"cancelled"`, etc. | Parcial |
| `paymentStatus` | `"pending"`, `"paid"`, `"rejected"` | Parcial |
| `paymentProofUrl` | `string?` | ❌ No aplica para retail |
| `adminReviewStatus` | `"pending"`, `"approved"`, `"rejected"` | ❌ No aplica |

### Modelo OrderItem

| Campo | Descripción |
|-------|-------------|
| `productType` | `"CHIP_EXTRA"`, nombre de producto, etc. |
| `quantity` | Int |
| `unitPrice` | Float |
| `totalPrice` | Float |
| `profileId` | String? (para personalizados) |
| `chipId` | String? (para accesorios vinculados) |

### Modelo ChipClaimToken

| Campo | Descripción |
|-------|-------------|
| `chipId` | Chip vinculado |
| `activationCode` | Código único de activación (ej: "ACT-XXXXXX") |
| `orderId` | String? (orden asociada, nullable) |
| `expiresAt` | Fecha de expiración |
| `usedAt` | DateTime? (null si no usado) |

### Restricciones actuales

1. **POST /api/orders** requiere sesión de usuario → no sirve para venta admin-solo
2. **PATCH /api/admin/orders** rechaza órdenes con `provider: "manual"` (línea 152-160)
3. **POST /api/admin/orders/{id}/approve** requiere `packageId` para flujo normal, lo cual no aplica para venta retail simple
4. **DELETE /api/admin/orders** rechaza eliminar órdenes manuales por trazabilidad

### ¿Se puede crear orden retail?

| Requisito | ¿Posible? |
|-----------|-----------|
| Crear orden sin usuario existente | ❌ El Order model requiere `userId` (no es nullable en Prisma) |
| Crear orden con `provider = "retail"` | ❌ No existe en validaciones, pero Prisma aceptaría cualquier string |
| Requiere comprobante | ❌ No necesario para retail |
| Payment automático `paid` | ✅ Se puede setear directamente |
| Sin revisión admin | ⚠️ El approve flow espera `adminReviewStatus: "pending"` |

---

## 5. UI Admin propuesta

### ¿Dónde agregarlo?

La opción más natural es en la sección de **Inventario** del Admin UI. Actualmente existe:
- `app/(admin)/admin/_components/sections/InventorySection.tsx` (o similar)
- `app/api/admin/chips/inventory/route.ts` (GET)

También podría ser una página separada: `/admin/tienda/venta-rapida`

### Componentes necesarios

1. **Selector de chip**: Tabla/listado de chips `status: "inventory"` con checkbox
2. **Selector de producto**: Lista de precios (sticker, tag, combo, etc.)
3. **Datos del cliente**: Nombre, email, teléfono (opcional para el token)
4. **Botón "Vender en tienda"**: Acción principal
5. **Modal de confirmación**: Muestra código de activación generado
6. **Opción de imprimir**: Ticket con código QR + activationCode

### Flujo UI

1. Admin abre `/admin/venta-retail`
2. Ve chips disponibles (inventory, isPhysical, sin token)
3. Selecciona chip(es) de la lista
4. Selecciona producto/paquete y precio
5. Opcional: ingresa datos del cliente (nombre, email)
6. Presiona "Vender en tienda"
7. Sistema:
   - Crea Order con `provider: "retail"`, `orderStatus: "completed"`, `paymentStatus: "paid"`, `adminReviewStatus: "approved"`
   - Marca chip(es) como `sold`
   - Genera ChipClaimToken con `activationCode`
8. Admin recibe código(s) de activación
9. Entrega código impreso al cliente
10. Cliente activa después desde Dashboard

---

## 6. Endpoints requeridos

### Nuevo endpoint: `POST /api/admin/retail/sell`

```typescript
// Request
{
  chipIds: string[],           // Chips a vender
  productType: string,         // "sticker_nfc_qr" | "tag" | etc.
  unitPrice: number,           // Precio de venta
  customerName?: string,       // Opcional
  customerEmail?: string,      // Opcional
  customerPhone?: string,       // Opcional
  quantity?: number             // Default 1
}

// Response
{
  orderId: string,
  activationCodes: [           // Un código por chip
    { chipId: string, activationCode: string, shortCode: string }
  ]
}
```

**Lógica**:
1. Validar admin autenticado
2. Validar chips existen, `status: "inventory"`, `isPhysical: true`, sin tokens activos
3. Validar no duplicados
4. En transacción:
   - Crear Order con:
     - `provider: "retail"`
     - `orderType: "retail"`
     - `orderStatus: "completed"`
     - `paymentStatus: "paid"`
     - `adminReviewStatus: "approved"`
     - `amount`: suma de precios
   - Crear OrderItem por chip
   - Marcar cada chip: `status: "sold"`
   - Generar ChipClaimToken por chip:
     - `activationCode: "ACT-" + random(8).toUpperCase()`
     - `expiresAt: now + 60 días`
     - `orderId: order.id`
5. Devolver códigos de activación

### Modificación menor: GET /api/admin/chips/inventory

No requiere cambios — ya filtra chips disponibles.

### Sin cambios en:

- `POST /api/chips/activate` → ya soporta chips `sold` ✅
- `POST /api/orders` → no aplica para retail
- `POST /api/admin/orders/{id}/approve` → no aplica para retail
- `PATCH /api/admin/orders` → no aplica para retail

---

## 7. Cambios Prisma necesarios o no

| Cambio | ¿Necesario? | Razón |
|--------|-------------|-------|
| `provider: "retail"` | ❌ No | Prisma acepta cualquier string en `provider` |
| `orderType: "retail"` | ❌ No | Prisma acepta cualquier string en `orderType` |
| Nuevo modelo RetailSale | ❌ No | Se reutiliza Order + OrderItem + ChipClaimToken |
| `Chip.activationCode` directo | ❌ No | Ya existe ChipClaimToken.activationCode |
| `Chip.isSoldAt` timestamp | ⚠️ Opcional | Para trazabilidad de venta retail |
| `Chip.soldPrice` | ⚠️ Opcional | Para reportes sin JOIN a Order |
| Índice en `Order.provider` | ⚠️ Opcional | Para filtrar órdenes retail rápidamente |

**Veredicto**: 🟢 **No requiere migración de esquema**. El modelo actual soporta el flujo sin cambios. Solo se usan valores nuevos en campos existentes (`provider: "retail"`, `orderType: "retail"`).

---

## 8. Riesgos

| # | Riesgo | Mitigación |
|---|--------|------------|
| 1 | **Código robado** — Admin imprime código y alguien más lo usa antes que el cliente | Usar `orderId` opcional en activación para validar que el token no tiene orden vinculada retail. O marcar token como `retail: true` y en activación pedir email de comprobación |
| 2 | **Chip vendido no activado** — Cliente compra pero nunca activa | El chip queda `sold` permanentemente. Podría agregarse reporte de chips `sold > 30 días sin activar` |
| 3 | **Duplicidad de tokens** — Dos ventas sobre el mismo chip | Validación en endpoint: el chip no debe tener `ChipClaimToken` activo (no usado, no expirado). El inventory GET ya excluye chips con tokens activos |
| 4 | **Venta sin registro** — Admin vende sin usar el sistema | No mitigable técnicamente. Depende de política/proceso. El sistema debería ser tan rápido que sea más fácil usarlo que evitarlo |
| 5 | **Stock físico vs stock digital** — Se vende un chip que no existe físicamente | El filtro `isPhysical: true` en inventory GET es la salvaguarda. Los chips digitales (creados automáticamente en órdenes online) tienen `isPhysical: false` |
| 6 | **Precio incorrecto** — Admin vende a precio manual | El endpoint debe recibir `unitPrice` desde el UI, pero podría validarse contra un precio mínimo por tipo de producto |
| 7 | **Token expirado antes de activar** — Cliente espera demasiado | `expiresAt` a 60 días es razonable. El activation code debería ser permanente para chips físicos (el chip no expira). Considerar `expiresAt: null` para chips retail |
| 8 | **Activación sin cuenta** — Cliente no tiene cuenta en la plataforma | La activación requiere sesión. El flujo natural: cliente compra → se registra en casa → activa. Si no tiene cuenta, debe crear una primero |

---

## 9. Plan por commits

### Commit 1: Nuevo endpoint retail sell
- `app/api/admin/retail/sell/route.ts` — POST handler
- Validaciones: admin auth, chips disponibles, sin tokens
- Transacción: crear Order retail → marcar chips sold → generar tokens
- Response con códigos de activación

### Commit 2: UI Admin — Venta Rápida
- `app/(admin)/admin/_components/modals/RetailSellModal.tsx`
  - Selector de chips disponibles (desde inventory GET)
  - Selector de producto/tipo
  - Campo de precio (o precargado según producto)
  - Campos opcionales de cliente
  - Botón "Vender en tienda"
- Integrar en página de inventario o nueva página `/admin/venta-retail`

### Commit 3: Ticket / comprobante
- Modal de resultado con códigos de activación
- Botón "Imprimir ticket" con formato simple
- QR Code del activationCode (para que el cliente escanee y active)

### Commit 4: Reportes (opcional, post-MVP)
- Reporte de ventas retail
- Chips vendidos no activados
- Totales por día/semana/mes

---

## 10. Veredicto

### 🟢 Factibilidad: ALTA

El sistema actual ya tiene **todo lo necesario** para soportar venta retail física:

| Componente | Estado | Uso en retail |
|------------|--------|---------------|
| Chip.status = "inventory" → "sold" | ✅ Existente | Se mantiene igual |
| Chip.sold como activable | ✅ `ACTIVATABLE_CHIP_STATUSES` incluye `sold` | El cliente activa normal |
| ChipClaimToken | ✅ Existente | Se genera al vender |
| Activation code | ✅ Existente | Se entrega impreso al cliente |
| Activación POST /api/chips/activate | ✅ Existente | Sin cambios |
| Order como registro contable | ✅ Existente | Se crea con provider="retail" |
| Perfil médico obligatorio | ✅ En activación | El cliente lo completa al activar |

### Lo que NO cambia
- Prisma schema: 🟢 Sin migraciones
- Activación: 🟢 Sin cambios
- Perfil médico: 🟢 Sin cambios
- Plan/límites: 🟢 Sin cambios (sold no consume cupo)
- Autenticación: 🟢 Sin cambios

### Lo que se agrega
- 1 endpoint nuevo: `POST /api/admin/retail/sell`
- 1 componente UI: `RetailSellModal`
- 1 página opcional: `/admin/venta-retail`

### Esfuerzo estimado
- Backend: ~2-3 horas (endpoint + validaciones + tests)
- Frontend: ~3-4 horas (modal + integración + ticket)
- **Total: ~5-7 horas para MVP funcional**

---
*Originalmente en: docs/audit/*