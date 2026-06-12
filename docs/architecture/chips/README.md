# Feature — Chips QR/NFC

Esta carpeta es el punto de entrada lógico para entender y, en el futuro, ordenar todo lo relacionado con chips, QR, NFC, activaciones, inventario, escaneos y puntos de venta.

Actualmente este directorio empieza como documentación de dominio. No reemplaza todavía los archivos existentes en `app/`, `domains/` o `lib/`.

Mapa completo actual:

- `docs/architecture/chips.md`

Catálogo de campos:

- `features/chips/fields.md`

---

## Qué significa “chip” en este proyecto

Un chip es la unidad que conecta una persona/ficha médica con un QR/NFC físico o digital.

La lógica principal es:

```txt
Chip.shortCode -> /e/[shortCode] -> vista pública de emergencia
```

Un chip puede estar en inventario, vendido, consignado, activado, suspendido, dañado o perdido.

---

## Relación con fichas médicas

El chip apunta a una ficha médica mediante:

```txt
Chip.assignedProfileId -> Profile.id
```

Sin ficha asignada, el QR/NFC no debe mostrar datos médicos personales.

La documentación de fichas médicas está en:

- `features/fichas-medicas/README.md`
- `features/fichas-medicas/fields.md`
- `docs/architecture/fichas-medicas.md`

---

## Subdominios recomendados

La estructura futura recomendada es:

```txt
features/chips/
  README.md
  fields.md
  lifecycle.md
  activacion/
  inventario/
  escaneos/
  consignacion/
  retail/
  admin/
```

Por ahora solo existe documentación para iniciar el orden sin mover código.

---

## Ubicación actual del código relacionado

### Constantes y repositorio

- `domains/chips/chip-lifecycle.constants.ts`
- `domains/chips/repositories/chip.repository.ts`

### APIs cliente

- `app/api/chips/activate/route.ts`
- `app/api/chips/dashboard/route.ts`
- `app/api/chips/scans/route.ts`

### APIs públicas

- `app/api/public/[shortCode]/route.ts`
- `app/api/public/[shortCode]/scan/route.ts`
- `app/api/public/qr/route.ts`

### APIs admin

- `app/api/admin/chips/route.ts`
- `app/api/admin/chips/[chipId]/route.ts`
- `app/api/admin/chips/available/route.ts`
- `app/api/admin/chips/inventory/route.ts`
- `app/api/admin/chips/[chipId]/assign-direct/route.ts`
- `app/api/admin/chips/[chipId]/reactivate/route.ts`
- `app/api/admin/chips/[chipId]/rehabilitate/route.ts`

### Puntos de venta

- `app/api/admin/points-of-sale/route.ts`
- `app/api/admin/points-of-sale/[id]/consign/route.ts`
- `app/api/admin/points-of-sale/[id]/return/route.ts`
- `app/api/admin/points-of-sale/[id]/mark-lost/route.ts`

### Retail

- `app/api/admin/retail/sell/route.ts`

### Cron

- `app/api/cron/expire-chips/route.ts`

### UI relacionada

- `app/(app)/dashboard/chips/page.tsx`
- `app/(admin)/admin/_components/sections/InventorySection.tsx`
- `app/(admin)/admin/inventario/lotes/page.tsx`

---

## Estados principales

### Estado operativo: `Chip.status`

- `inventory`
- `consigned`
- `sold`
- `activated`
- `suspended`
- `damaged`
- `lost`

### Estado de servicio: `Chip.serviceStatus`

- `active`
- `inactive`
- `expired`
- `suspended`

Regla mental:

`status` responde: “¿dónde está el chip y en qué condición operativa está?”

`serviceStatus` responde: “¿el servicio asociado al chip está vigente?”

---

## Flujos principales

1. Crear lote admin
   - Crea chips en `inventory`.
   - Genera serial, shortCode, QR/NFC y token.

2. Vender retail
   - Cambia `inventory -> sold`.
   - Genera token de activación.

3. Consignar a punto de venta
   - Cambia `inventory -> consigned`.
   - Asocia `pointOfSaleId`.

4. Devolver desde punto de venta
   - Cambia `consigned -> inventory`.
   - Limpia `pointOfSaleId`.

5. Activar
   - Cambia `inventory/sold/consigned -> activated`.
   - Consume token.
   - Asigna owner, cuenta, ficha y fechas de servicio.

6. Suspender/reactivar
   - Cambia entre `activated` y `suspended` según flujo.

7. Marcar dañado/perdido
   - Cambia a `damaged` o `lost`.
   - Puede liberar cupo si venía de activo.

8. Expirar servicio
   - Cambia `serviceStatus -> expired` por cron.

9. Escanear
   - Usa `shortCode`.
   - Muestra vista pública segura.
   - Registra `ScanEvent`.

---

## Regla mental para trabajar este dominio

Si un cambio afecta QR/NFC, inventario, activationCode, shortCode, asignación a ficha, escaneos, serviceEndDate, puntos de venta o venta retail, debe revisarse desde este dominio.

Antes de cambiar código, revisar:

1. ¿Afecta `Chip.status`?
2. ¿Afecta `Chip.serviceStatus`?
3. ¿Afecta capacidad del plan?
4. ¿Afecta tokens de activación?
5. ¿Afecta vista pública de emergencia?
6. ¿Afecta fichas médicas?
7. ¿Afecta punto de venta/consignación?
8. ¿Afecta pedidos/pagos?
9. ¿Afecta privacidad de escaneos?

---

## Próximos archivos recomendados

1. `features/chips/lifecycle.md`
   - Matriz oficial de transiciones de estado.

2. `features/chips/activacion/README.md`
   - Explica activación normal y corporativa.

3. `features/chips/inventario/README.md`
   - Explica bodega, lotes, etiquetas internas y chips físicos.

4. `features/chips/consignacion/README.md`
   - Explica puntos de venta, consignar, devolver y marcar perdido.

5. `features/chips/escaneos/README.md`
   - Explica `ScanEvent`, ubicación, notificaciones y privacidad.

6. `features/chips/retail/README.md`
   - Explica venta física retail y generación de activation codes.

---

## Regla de migración futura

No mover código de golpe.

Orden recomendado:

1. Documentar.
2. Crear matriz de lifecycle.
3. Extraer servicios puros desde rutas grandes.
4. Mantener `app/api` como capa HTTP.
5. Mover lógica repetida a `domains/chips`.
6. Validar typecheck/lint.
7. Repetir por flujo.

La carpeta `app/` debe seguir siendo la capa de rutas de Next.js.
La carpeta `features/` debe convertirse gradualmente en la capa de negocio/producto.
La carpeta `domains/chips/` debe concentrar reglas de lifecycle y repositorios backend.
