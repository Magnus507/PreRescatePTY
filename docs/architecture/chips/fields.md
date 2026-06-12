# Chips — Catálogo de Campos y Estados

Este documento lista los campos principales del dominio chips y cómo deben entenderse.

Fuente principal actual:

- `prisma/schema.prisma` -> modelos `Chip`, `ChipClaimToken`, `ScanEvent`, `PointOfSale`.
- `domains/chips/chip-lifecycle.constants.ts` -> estados y grupos de estados.

Este catálogo es documentación. No es todavía fuente de verdad ejecutable.

---

## 1. Modelo `Chip`

### Identidad

| Campo | Tipo | Público | Uso | Notas |
|---|---:|---|---|---|
| `id` | `String` | no | ID interno | No exponer públicamente. |
| `chipUidInternal` | `String` | no | UID interno | Único, default `cuid()`. |
| `serialPublic` | `String` | parcial | Serial visible | Puede usarse en admin/cliente. |
| `shortCode` | `String` | sí | Código público QR/NFC | Llave de `/e/[shortCode]`. |
| `internalLabel` | `String?` | no | Etiqueta física/inventario | Ej: caja, lote, secuencia. |
| `batchId` | `String?` | no | Lote de creación | Agrupa chips creados juntos. |

### URLs y escaneo

| Campo | Tipo | Público | Uso | Notas |
|---|---:|---|---|---|
| `nfcUrl` | `String` | sí | URL grabada en NFC | Normalmente apunta a `/e/{shortCode}?source=nfc`. |
| `qrUrl` | `String` | sí | URL/endpoint para QR | Puede apuntar a `/api/public/qr?data=...`. |
| `lastScanAt` | `DateTime?` | interno/cliente | Último escaneo | Actualización operacional. |
| `lastScanLocation` | `String?` | interno/cliente | Última ubicación | Dato sensible. |

### Producto e inventario

| Campo | Tipo | Público | Uso | Notas |
|---|---:|---|---|---|
| `productType` | `String` | interno | Tipo de producto | Default `sticker_nfc_qr`. |
| `nicheType` | `String` | interno | Nicho/categoría | Default `motorcycle`. |
| `isPhysical` | `Boolean` | interno/admin | Físico vs digital | Requerido para consignación/retail físico. |
| `status` | `String` | parcial | Estado operativo | Ver sección de estados. |
| `pointOfSaleId` | `String?` | interno/admin | Punto de venta | Seteado cuando está consignado. |
| `consignedAt` | `DateTime?` | interno/admin | Fecha de consignación | Seteado en consignación. |

### Propiedad/asignación

| Campo | Tipo | Público | Uso | Notas |
|---|---:|---|---|---|
| `accountId` | `String?` | no | Cuenta dueña | Seteado al activar/asignar. |
| `ownerUserId` | `String?` | no | Usuario dueño | Seteado al activar. |
| `assignedProfileId` | `String?` | no | Ficha médica asignada | Conecta con `Profile`. |
| `transferLock` | `Boolean` | interno | Bloqueo transferencia | Evita transferencias si se usa. |

### Servicio

| Campo | Tipo | Público | Uso | Notas |
|---|---:|---|---|---|
| `activatedAt` | `DateTime?` | interno/cliente | Fecha activación | Seteado al activar. |
| `serviceStartDate` | `DateTime?` | interno/cliente | Inicio servicio | Seteado al activar. |
| `serviceEndDate` | `DateTime?` | interno/cliente | Fin servicio | Usado por cron de expiración. |
| `serviceStatus` | `String` | parcial | Estado del servicio | `active`, `inactive`, `expired`, `suspended`. |

### Auditoría temporal

| Campo | Tipo | Público | Uso |
|---|---:|---|---|
| `createdAt` | `DateTime` | no | Creación. |
| `updatedAt` | `DateTime` | no | Última actualización. |

### Relaciones

| Relación | Modelo | Uso |
|---|---|---|
| `owner` | `User` | Usuario dueño del chip. |
| `assignedProfile` | `Profile` | Ficha médica que se muestra en emergencia. |
| `account` | `Account` | Cuenta a la que pertenece. |
| `claimTokens` | `ChipClaimToken[]` | Códigos de activación. |
| `scanEvents` | `ScanEvent[]` | Historial de escaneos. |
| `notifications` | `Notification[]` | Notificaciones generadas por escaneos. |
| `corporateOrderItems` | `CorporateOrderEmployeeItem[]` | Flujo corporativo. |
| `orderItems` | `OrderItem[]` | Relación con pedidos. |
| `pointOfSale` | `PointOfSale` | Punto de venta si está consignado. |

---

## 2. Estados operativos `Chip.status`

Fuente:

- `domains/chips/chip-lifecycle.constants.ts`

| Estado | Significado | Activable | Consume cupo | Disponible inventario | Notas |
|---|---|---|---|---|---|
| `inventory` | En bodega/inventario | sí | no | sí | Estado inicial al crear lote. |
| `consigned` | En punto de venta externo | sí | no | no | Físico, asignado a `pointOfSaleId`. |
| `sold` | Vendido, pendiente de activación | sí | no | no | Suele tener token activo. |
| `activated` | Activado y asignado | no | sí | no | Público si ficha/servicio lo permiten. |
| `suspended` | Suspendido | no | sí | no | Puede reactivarse por ciertos flujos. |
| `damaged` | Dañado | no | no | no | Puede liberar cupo si venía activo. |
| `lost` | Perdido | no | no | no | Puede liberar cupo si venía activo. |

---

## 3. Estados de servicio `Chip.serviceStatus`

| Estado | Significado | Cómo ocurre | Notas |
|---|---|---|---|
| `active` | Servicio vigente | Activación | Default actual también es `active`. |
| `inactive` | Servicio inactivo | Admin/lifecycle | Puede usarse al dañar/perder. |
| `expired` | Servicio vencido | Cron | `app/api/cron/expire-chips/route.ts`. |
| `suspended` | Servicio suspendido | Admin/lifecycle | Diferente de `Chip.status = suspended`. |

Regla mental:

- `status` habla del chip como unidad.
- `serviceStatus` habla de vigencia del servicio.

---

## 4. Modelo `ChipClaimToken`

| Campo | Tipo | Público | Uso | Notas |
|---|---:|---|---|---|
| `id` | `String` | no | ID interno | No exponer. |
| `chipId` | `String` | no | Chip asociado | FK a `Chip`. |
| `activationCode` | `String` | sensible | Código de activación | Debe tratarse como secreto/claim code. |
| `orderId` | `String?` | interno | Pedido asociado | Si existe, activación puede completar orden. |
| `expiresAt` | `DateTime` | interno/cliente | Expiración | Rechaza activación vencida. |
| `usedAt` | `DateTime?` | interno | Uso | Si no es null, token ya fue usado. |
| `createdAt` | `DateTime` | interno | Creación | Auditoría. |

Estados derivados del token:

| Estado derivado | Condición |
|---|---|
| Disponible | `usedAt = null` y `expiresAt > now` |
| Usado | `usedAt != null` |
| Vencido | `expiresAt <= now` |
| Histórico | usado o vencido |

---

## 5. Modelo `ScanEvent`

| Campo | Tipo | Público | Uso | Notas |
|---|---:|---|---|---|
| `id` | `String` | no | ID interno | No exponer públicamente. |
| `chipId` | `String` | no | Chip escaneado | FK a `Chip`. |
| `profileId` | `String?` | no | Ficha relacionada | Puede ser null si no asignado. |
| `accountId` | `String?` | no | Cuenta relacionada | Para dashboard/analytics. |
| `scannedAt` | `DateTime` | cliente/admin | Fecha escaneo | Puede mostrarse al usuario. |
| `sourceType` | `String` | parcial | QR/NFC/etc. | Default `qr`. |
| `ipAddress` | `String?` | no | IP de quien escanea | Dato sensible. |
| `userAgent` | `String?` | no | Navegador/dispositivo | Dato técnico sensible. |
| `geoLat` | `Float?` | sensible | Latitud | Solo si usuario acepta ubicación. |
| `geoLng` | `Float?` | sensible | Longitud | Solo si usuario acepta ubicación. |
| `geoAccuracy` | `Float?` | sensible | Precisión | Complemento de ubicación. |
| `country` | `String?` | cliente/admin | País | Derivado. |
| `city` | `String?` | cliente/admin | Ciudad | Derivado. |
| `address` | `String?` | sensible | Dirección | Tratar con cuidado. |
| `emergencyMode` | `Boolean` | interno | Modo emergencia | Default true. |
| `notificationStatus` | `String` | cliente/admin | Estado notificación | Ej: pending/sent/failed. |
| `rawMetadataJson` | `String?` | no | Metadata cruda | Tratar como potencialmente sensible. |

---

## 6. Modelo `PointOfSale`

| Campo | Tipo | Público | Uso |
|---|---:|---|---|
| `id` | `String` | no | ID interno. |
| `name` | `String` | admin | Nombre del punto de venta. |
| `address` | `String?` | admin | Dirección. |
| `contactName` | `String?` | admin | Contacto. |
| `contactPhone` | `String?` | admin | Teléfono. |
| `isActive` | `Boolean` | admin | Si puede recibir consignación. |
| `createdAt` | `DateTime` | admin | Creación. |
| `updatedAt` | `DateTime` | admin | Última actualización. |

Relación:

- `PointOfSale.chips` lista chips consignados o relacionados.

---

## 7. Grupos de estados documentados

### Activables

| Estado | Por qué |
|---|---|
| `inventory` | Chip nuevo/en bodega con token válido. |
| `consigned` | Chip en punto de venta externo, aún activable. |
| `sold` | Chip vendido, pendiente de activación. |

### Usan capacidad del plan

| Estado | Por qué |
|---|---|
| `activated` | Protección activa. |
| `suspended` | Protección reservada/suspendida, todavía ocupa cupo. |

### No disponibles en inventario

| Estado | Motivo |
|---|---|
| `sold` | Ya vendido. |
| `consigned` | Está en punto externo. |
| `activated` | Ya usado. |
| `suspended` | Ya usado/reservado. |
| `damaged` | No usable. |
| `lost` | No localizable. |

---

## 8. Transiciones principales

| Desde | Hacia | Quién | Ruta | Condiciones principales |
|---|---|---|---|---|
| none | `inventory` | admin | `POST /api/admin/chips` | Crear lote. |
| `inventory` | `sold` | admin | `POST /api/admin/retail/sell` | Físico, sin owner/profile/token activo. |
| `inventory` | `consigned` | admin/superadmin | `POST /api/admin/points-of-sale/[id]/consign` | Físico, POS activo, sin owner/profile. |
| `consigned` | `inventory` | admin/superadmin | `POST /api/admin/points-of-sale/[id]/return` | Pertenece al POS, sin owner/profile. |
| `inventory` | `activated` | usuario | `POST /api/chips/activate` | Token válido, perfil completo. |
| `sold` | `activated` | usuario | `POST /api/chips/activate` | Token válido, perfil completo. |
| `consigned` | `activated` | usuario | `POST /api/chips/activate` | Token válido, perfil completo. |
| `activated` | `suspended` | usuario/admin | dashboard/admin | Acción permitida. |
| `suspended` | `activated` | usuario/admin | dashboard/admin | Acción permitida. |
| `activated` | `damaged` | admin | admin detail | Libera cupo/desasigna si aplica. |
| `activated` | `lost` | admin/POS | admin/POS | Libera cupo/desasigna si aplica. |
| `active` service | `expired` service | cron | `/api/cron/expire-chips` | `serviceEndDate < now`. |

---

## 9. Reglas de oro

1. `shortCode` es público, `activationCode` es sensible.
2. Un chip activado debe tener owner, cuenta y ficha asignada.
3. Un chip físico de inventario no debería tener owner ni ficha.
4. Un chip consignado debe tener `pointOfSaleId` y `consignedAt`.
5. Un chip consignado no debe contarse como inventario de bodega.
6. Un chip vendido normalmente debe tener token de activación.
7. Un token usado nunca debe reutilizarse.
8. La activación debe ser transaccional para evitar doble uso del token.
9. Los chips `activated` y `suspended` consumen cupo.
10. `damaged` y `lost` no deben mostrar ficha pública activa.
11. Los datos de escaneo son sensibles, sobre todo IP, user agent y ubicación.
12. `status` y `serviceStatus` no significan lo mismo; siempre revisar ambos.
