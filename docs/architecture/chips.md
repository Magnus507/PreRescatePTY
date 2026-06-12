# Arquitectura — Chips QR/NFC

Estado: documento de orden interno.
Fecha: 2026-06-10.
Propósito: explicar el dominio de chips de PreRescatePTY: inventario, activación, QR/NFC, asignación a ficha médica, escaneos, vencimiento, venta retail y consignación.

Este documento no cambia la lógica de la app. Es un mapa del dominio actual.

---

## 1. Definición del dominio

Un chip es el objeto físico o digital que conecta el mundo real con una ficha médica.

En PreRescatePTY, el chip puede representar:

- sticker NFC/QR
- tarjeta o accesorio físico
- identificador digital
- unidad en inventario
- unidad vendida
- unidad consignada en punto de venta
- unidad activada por un usuario
- unidad suspendida, dañada o perdida

La relación central es:

```txt
Chip.shortCode -> /e/[shortCode] -> ficha médica pública de emergencia
```

El chip no contiene por sí mismo toda la información médica. El chip apunta a una ficha mediante:

- `Chip.assignedProfileId -> Profile.id`

---

## 2. Archivos principales actuales

### Modelo/base de datos

- `prisma/schema.prisma`
  - `Chip`
  - `ChipClaimToken`
  - `ScanEvent`
  - `PointOfSale`
  - relaciones con `Profile`, `Account`, `User`, `OrderItem`, `CorporateOrderEmployeeItem`, `Notification`

### Constantes/lifecycle

- `domains/chips/chip-lifecycle.constants.ts`
  - Define estados principales del chip.
  - Define estados activables.
  - Define estados que consumen capacidad.
  - Define estados públicos activos.
  - Define estados no disponibles en inventario.

- `domains/chips/repositories/chip.repository.ts`
  - Repositorio básico de chips.
  - Busca por id/shortCode.
  - Desasigna chips de perfil.
  - Cuenta chips activos por cuenta.

### APIs cliente

- `app/api/chips/activate/route.ts`
  - Activa chip usando `ChipClaimToken.activationCode`.
  - Asigna a perfil médico personal/familiar o corporativo.
  - Marca token como usado.
  - Actualiza estado a `activated`.
  - Calcula fechas de servicio.

- `app/api/chips/dashboard/route.ts`
  - Lista chips personales del dashboard cliente.
  - Excluye chips corporativos.
  - Permite asignar/desasignar perfil.
  - Permite suspender/reactivar en ciertos casos.

- `app/api/chips/scans/route.ts`
  - Lista escaneos recientes de chips del usuario autenticado.

### APIs públicas

- `app/api/public/[shortCode]/route.ts`
  - Obtiene la ficha pública de emergencia asociada al chip.

- `app/api/public/[shortCode]/scan/route.ts`
  - Registra el evento de escaneo.

- `app/api/public/qr/route.ts`
  - Genera QR público para data/URL.

### APIs admin

- `app/api/admin/chips/route.ts`
  - Lista chips con filtros y vistas.
  - Crea lotes de chips.
  - Genera `shortCode`, `serialPublic`, `activationCode`, `nfcUrl`, `qrUrl`.

- `app/api/admin/chips/[chipId]/route.ts`
  - Detalle admin de chip.
  - Actualiza status/serviceStatus/accountId/isPhysical.
  - Permite eliminar chip con dependencias.
  - Notifica acceso administrativo si consulta datos sensibles.

- `app/api/admin/chips/available/route.ts`
  - Lista chips disponibles para asignación/venta.

- `app/api/admin/chips/inventory/route.ts`
  - Lista chips físicos en inventario.
  - Permite actualizar `internalLabel`.

- `app/api/admin/chips/[chipId]/assign-direct/route.ts`
  - Asignación directa admin.

- `app/api/admin/chips/[chipId]/reactivate/route.ts`
  - Reactivación admin.

- `app/api/admin/chips/[chipId]/rehabilitate/route.ts`
  - Rehabilitación admin.

### Puntos de venta / consignación

- `app/api/admin/points-of-sale/route.ts`
  - Gestión de puntos de venta.

- `app/api/admin/points-of-sale/[id]/consign/route.ts`
  - Consigna chips físicos `inventory` a un punto de venta.
  - Cambia estado a `consigned`.

- `app/api/admin/points-of-sale/[id]/return/route.ts`
  - Devuelve chips consignados al inventario.
  - Cambia estado a `inventory`.

- `app/api/admin/points-of-sale/[id]/mark-lost/route.ts`
  - Marca chips consignados como perdidos.

### Venta retail

- `app/api/admin/retail/sell/route.ts`
  - Vende chips físicos de inventario.
  - Cambia estado a `sold`.
  - Genera tokens de activación.

### Cron

- `app/api/cron/expire-chips/route.ts`
  - Marca chips vencidos como `serviceStatus = "expired"`.
  - Se ejecuta desde Vercel Cron.

---

## 3. Modelos Prisma involucrados

### `Chip`

Modelo central.

Campos de identidad:

- `id`
- `chipUidInternal`
- `serialPublic`
- `shortCode`
- `internalLabel`
- `batchId`

Campos de URL/escaneo:

- `nfcUrl`
- `qrUrl`
- `lastScanAt`
- `lastScanLocation`

Campos de producto/inventario:

- `productType`
- `nicheType`
- `isPhysical`
- `status`
- `pointOfSaleId`
- `consignedAt`

Campos de propiedad/asignación:

- `accountId`
- `ownerUserId`
- `assignedProfileId`
- `transferLock`

Campos de servicio:

- `activatedAt`
- `serviceStartDate`
- `serviceEndDate`
- `serviceStatus`

Relaciones:

- `owner -> User`
- `assignedProfile -> Profile`
- `account -> Account`
- `claimTokens -> ChipClaimToken[]`
- `scanEvents -> ScanEvent[]`
- `notifications -> Notification[]`
- `corporateOrderItems -> CorporateOrderEmployeeItem[]`
- `orderItems -> OrderItem[]`
- `pointOfSale -> PointOfSale`

### `ChipClaimToken`

Representa un código de activación de un chip.

Campos:

- `id`
- `chipId`
- `activationCode`
- `orderId`
- `expiresAt`
- `usedAt`
- `createdAt`

Reglas observadas:

- Un token usado tiene `usedAt`.
- Un token vencido tiene `expiresAt < now`.
- La activación consume el token con update atómico.
- Los tokens pueden venir de lote admin o venta retail.

### `ScanEvent`

Evento generado cuando alguien escanea un QR/NFC.

Campos:

- `chipId`
- `profileId`
- `accountId`
- `scannedAt`
- `sourceType`
- `ipAddress`
- `userAgent`
- `geoLat`
- `geoLng`
- `geoAccuracy`
- `country`
- `city`
- `address`
- `emergencyMode`
- `notificationStatus`
- `rawMetadataJson`

### `PointOfSale`

Punto de venta externo o físico.

Campos:

- `id`
- `name`
- `address`
- `contactName`
- `contactPhone`
- `isActive`
- `createdAt`
- `updatedAt`

Relación:

- `chips -> Chip[]`

---

## 4. Estados del chip

Archivo fuente:

- `domains/chips/chip-lifecycle.constants.ts`

Estados actuales:

```ts
inventory
consigned
sold
activated
suspended
damaged
lost
```

### `inventory`

Chip en bodega/inventario.

Uso:

- disponible para venta, asignación, consignación o creación de lote.
- debe tener `ownerUserId = null` y `assignedProfileId = null` para muchas operaciones.

### `consigned`

Chip físico enviado a un punto de venta externo, pero no vendido/activado.

Uso:

- tiene `pointOfSaleId`.
- tiene `consignedAt`.
- puede activarse desde punto de venta según `ACTIVATABLE_CHIP_STATUSES`.
- no debe aparecer como disponible en bodega.

### `sold`

Chip vendido pero aún no necesariamente activado.

Uso:

- puede tener token de activación.
- puede activarse por el usuario usando `activationCode`.

### `activated`

Chip activo y asignado.

Uso:

- debe tener `ownerUserId`, `accountId`, `assignedProfileId`.
- debe tener `activatedAt`, `serviceStartDate`, `serviceEndDate`.
- aparece públicamente si la ficha y servicio lo permiten.

### `suspended`

Chip suspendido.

Uso:

- cuenta como capacidad usada.
- puede ser reactivado en algunos flujos.

### `damaged`

Chip dañado.

Uso:

- no disponible para activación normal.
- si venía de activo, puede liberar cupo y desasignar ficha.

### `lost`

Chip perdido.

Uso:

- no disponible para activación normal.
- si venía de activo, puede liberar cupo y desasignar ficha.

---

## 5. Estados de servicio

Fuente:

- `CHIP_SERVICE_STATUS` en `domains/chips/chip-lifecycle.constants.ts`

Estados:

```ts
active
inactive
expired
suspended
```

### `active`

Servicio vigente.

### `inactive`

Servicio inactivo manualmente o por transición administrativa.

### `expired`

Servicio vencido por fecha.

Cron relacionado:

- `app/api/cron/expire-chips/route.ts`

Regla actual:

- marca como `expired` chips con:
  - `serviceStatus = "active"`
  - `serviceEndDate < now`
  - `status in ["activated", "suspended"]`

### `suspended`

Servicio suspendido.

---

## 6. Grupos de estados actuales

Fuente:

- `domains/chips/chip-lifecycle.constants.ts`

### Activables

```ts
inventory
consigned
sold
```

Un chip con esos estados puede activarse mediante código si las demás reglas pasan.

### Consumen capacidad

```ts
activated
suspended
```

Estos chips cuentan contra el límite del plan/cuenta.

### Públicamente activos

```ts
activated
```

Solo chips activados deben ser considerados activos públicamente.

### No disponibles en inventario

```ts
sold
consigned
activated
suspended
damaged
lost
```

---

## 7. Flujos principales

### 7.1 Creación de lote admin

Archivo:

- `app/api/admin/chips/route.ts`

Flujo:

1. Admin envía `count`, `batchId`, `productType`, `labelBase`, `labelStart`.
2. Sistema genera:
   - `shortCode`
   - `serialPublic`
   - `activationCode`
3. Crea `Chip` con:
   - `status = "inventory"`
   - `nfcUrl = SITE_URL/e/{shortCode}?source=nfc`
   - `qrUrl = /api/public/qr?data=...`
4. Crea `ChipClaimToken` con expiración de 1 año.

### 7.2 Activación por usuario

Archivo:

- `app/api/chips/activate/route.ts`

Flujo:

1. Usuario autenticado envía `activationCode` y opcionalmente `profileId`.
2. Se valida rate limit.
3. Se busca `ChipClaimToken`.
4. Se rechaza si:
   - token no existe
   - token ya fue usado
   - token expiró
   - chip no está en estado activable
   - cuenta vencida
   - perfil médico incompleto
   - límite de chips del plan excedido
5. En transacción:
   - consume token (`usedAt = now`)
   - determina perfil a asignar
   - maneja flujo normal o corporativo
   - actualiza chip a `activated`
   - setea owner/account/profile/fechas de servicio
   - completa orden si aplica
   - actualiza item corporativo si aplica
   - escribe audit log
6. Invalida cache de cuenta.

### 7.3 Activación normal

Usa una ficha personal/familiar del mismo `accountId`.

Reglas:

- Si se envía `profileId`, debe pertenecer a la cuenta.
- No se permite activar perfiles `corporate` desde el flujo normal.
- Si no se envía `profileId`, usa ficha propia del usuario.
- La ficha debe tener datos mínimos completos.

### 7.4 Activación corporativa

Detectada por `CorporateOrderEmployeeItem` asociado al chip.

Reglas:

- Debe existir `organizationMember`.
- `corporateStatus` debe ser `paid_active`.
- Debe existir `corporateProfileId`.
- El perfil debe tener `profileType = "corporate"`.
- El perfil corporativo debe pertenecer a la cuenta del usuario.
- La ficha corporativa debe estar completa.

### 7.5 Dashboard cliente

Archivo:

- `app/api/chips/dashboard/route.ts`

GET:

- lista chips de la cuenta.
- excluye chips corporativos.
- incluye cantidad de escaneos.
- incluye perfil asignado.
- incluye items de orden cuando existan.

PATCH:

- `assign`: asigna/desasigna ficha médica.
- `suspend`: cambia `activated` -> `suspended`.
- `reactivate`: cambia `suspended` o `inventory` -> `activated`.

### 7.6 Vista pública por escaneo

Archivos:

- `app/(public)/e/[shortCode]/page.tsx`
- `app/api/public/[shortCode]/route.ts`
- `app/api/public/[shortCode]/scan/route.ts`

Flujo:

1. QR/NFC abre `/e/{shortCode}`.
2. Frontend consulta `/api/public/{shortCode}`.
3. API busca chip por `shortCode`.
4. Valida estado y ficha asignada.
5. Devuelve ficha filtrada.
6. Se registra escaneo en `ScanEvent`.

### 7.7 Consignación a punto de venta

Archivo:

- `app/api/admin/points-of-sale/[id]/consign/route.ts`

Reglas:

- Solo `admin` o `superadmin`.
- PointOfSale debe existir y estar activo.
- Chips deben:
  - existir
  - estar `inventory`
  - ser físicos (`isPhysical = true`)
  - no tener owner
  - no tener ficha asignada
  - no estar ya en otro punto de venta
- Cambia:
  - `status = "consigned"`
  - `pointOfSaleId = id`
  - `consignedAt = now`

### 7.8 Retorno desde punto de venta

Archivo:

- `app/api/admin/points-of-sale/[id]/return/route.ts`

Reglas:

- Solo `admin` o `superadmin`.
- Chips deben estar `consigned`.
- Deben pertenecer a ese punto de venta.
- No deben tener owner ni ficha.
- Cambia:
  - `status = "inventory"`
  - `pointOfSaleId = null`
  - `consignedAt = null`

### 7.9 Venta retail

Archivo:

- `app/api/admin/retail/sell/route.ts`

Reglas observadas:

- Chip debe estar `inventory`.
- Debe ser físico.
- No debe tener owner.
- No debe tener ficha asignada.
- No debe tener token activo no usado.
- Cambia estado a `sold`.
- Genera `ChipClaimToken` por chip.

### 7.10 Vencimiento automático

Archivo:

- `app/api/cron/expire-chips/route.ts`

Reglas:

- Usa `CRON_SECRET`.
- Vercel Cron programado en `vercel.json`.
- Marca como expirados chips activos/suspendidos con fecha vencida.

---

## 8. Reglas de autorización actuales

### Cliente autenticado

Puede:

- activar chip con código
- ver sus chips personales
- ver escaneos de sus chips
- asignar/desasignar chip a ficha de su cuenta
- suspender/reactivar en dashboard según reglas

### Admin / superadmin / imprenta

Puede:

- ver chips admin
- ver detalle admin de chip
- crear lotes
- operar inventario según ruta

Nota:

- Algunas rutas usan `isAdmin()` con roles `admin`, `superadmin`, `imprenta`.
- Algunas rutas usan `requireRole(ORDER_ADMIN_ROLES)`.
- Consignación/retorno restringen a `admin` y `superadmin`.

---

## 9. Relación con fichas médicas

El chip se conecta a ficha médica por:

```txt
Chip.assignedProfileId -> Profile.id
```

Reglas clave:

- Un chip activado debe apuntar a una ficha médica completa.
- La vista pública no debería mostrar datos si el chip no está activado o no tiene ficha.
- Los chips corporativos deben usar `Profile.profileType = "corporate"` y flujo corporativo.
- Dashboard cliente excluye chips corporativos.

---

## 10. Relación con pedidos/pagos

Chips pueden aparecer en:

- `OrderItem`
- `CorporateOrderEmployeeItem`
- `ChipClaimToken.orderId`

Flujos:

- compra online crea orden/items/tokens según lógica de pedidos.
- venta retail crea orden y tokens.
- activación puede marcar orden como completada/pagada si el token tiene `orderId`.

---

## 11. Riesgos de confusión actuales

1. Hay dos dimensiones de estado:
   - `Chip.status`
   - `Chip.serviceStatus`

2. Un chip puede estar vendido pero no activado.

3. Un chip puede estar consignado y todavía ser activable.

4. Un chip activado puede tener servicio expirado.

5. Ficha corporativa y ficha familiar usan el mismo modelo `Profile`, pero flujos distintos.

6. Admin puede ver datos sensibles del chip/ficha; existe notificación de transparencia al usuario en detalle admin.

7. `ChipClaimToken` representa disponibilidad/activación, pero no es lo mismo que estado del chip.

---

## 12. Propuesta de organización futura

Crear estructura progresiva:

```txt
features/chips/
  README.md
  fields.md
  lifecycle.md
  activacion/
    README.md
  inventario/
    README.md
  escaneos/
    README.md
  consignacion/
    README.md
  retail/
    README.md
  admin/
    README.md
```

Regla recomendada:

- `app/` mantiene rutas Next.js.
- `features/chips/` documenta y concentra lenguaje de negocio.
- `domains/chips/` mantiene constantes y repositorios backend.
- La lógica de lifecycle debería centralizarse cada vez más en `domains/chips` o `features/chips/services`.

---

## 13. Candidatos de refactor futuro

### Alta prioridad de orden

- `app/api/chips/activate/route.ts`
  - Tiene mucha lógica de activación normal/corporativa.
  - Candidato a extraer servicios:
    - `validateActivationToken`
    - `resolveActivationProfile`
    - `activateChipTransaction`
    - `activateCorporateChip`

- `app/api/admin/chips/route.ts`
  - Mezcla listado/filtros/creación de lote.
  - Candidato a separar servicio de batch creation.

- `app/api/chips/dashboard/route.ts`
  - Mezcla lectura dashboard y acciones de assignment/status.
  - Candidato a separar comandos.

- `app/(admin)/admin/_components/sections/InventorySection.tsx`
  - Componente grande ligado a inventario/chips.
  - Candidato a `features/chips/inventario/components/`.

### Mantener por ahora

- `domains/chips/chip-lifecycle.constants.ts`
  - Ya es buen lugar para estados.

- `domains/chips/repositories/chip.repository.ts`
  - Puede crecer gradualmente.

---

## 14. Preguntas abiertas

1. ¿`consigned` debe ser activable siempre o solo después de venta POS?
   - Actualmente está en `ACTIVATABLE_CHIP_STATUSES`.

2. ¿`sold` siempre debe tener token activo?
   - Retail lo genera, pero conviene documentar invariantes.

3. ¿Qué diferencia exacta de negocio hay entre `status = suspended` y `serviceStatus = suspended`?

4. ¿`reactivate` desde dashboard debería permitir `inventory -> activated`?
   - Actualmente el dashboard lo contempla.

5. ¿Cuándo se debe liberar cupo del plan?
   - Actualmente `damaged/lost` desde activo libera en admin.

6. ¿Cuánto debe durar un token de activación?
   - Batch admin usa 1 año.

7. ¿Qué datos de escaneo se guardan y por cuánto tiempo?
   - Importante para privacidad.

---

## 15. Próximo paso recomendado

Crear `features/chips/lifecycle.md` con una matriz de transición:

| Desde | Hacia | Quién | Ruta | Condiciones |
|---|---|---|---|---|
| inventory | consigned | admin | `/api/admin/points-of-sale/[id]/consign` | físico, sin owner, sin profile |
| consigned | inventory | admin | `/api/admin/points-of-sale/[id]/return` | pertenece al POS, sin owner/profile |
| inventory | sold | admin retail | `/api/admin/retail/sell` | físico, sin owner/profile/token activo |
| sold | activated | user | `/api/chips/activate` | token válido, perfil completo |
| inventory | activated | user | `/api/chips/activate` | token válido, perfil completo |
| consigned | activated | user | `/api/chips/activate` | token válido, perfil completo |
| activated | suspended | user/admin | dashboard/admin | permitido por flujo |
| activated | damaged/lost | admin | admin detail/POS | libera cupo si aplica |

Esto ayudaría mucho a evitar confusión sobre estados.
