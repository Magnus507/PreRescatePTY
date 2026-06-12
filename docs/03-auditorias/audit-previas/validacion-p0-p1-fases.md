# Validación P0/P1 — Separación por fases de implementación

> **Documento:** Validación de hallazgos de la auditoría maestra
> **Fecha:** 6 de octubre 2026
> **Propósito:** Separar qué se puede implementar sin migración Prisma y qué requiere migración, para entregar un plan de implementación por fases accionable
> **Regla:** NO modificar código, NO hacer commit

---

## 1. WhatsApp con ubicación

### Archivo exacto donde se arma el link

**`app/(public)/e/[shortCode]/page.tsx` — líneas 505-513**

```typescript
// Línea 507: sanitiza el teléfono
const contactPhone = sanitizeTelPhone(contact.phone);
const whatsappPhone = normalizeWhatsAppPhone(contact.phone);
const personName = `${profile.firstName} ${profile.lastName}`.trim() || profile.displayName;
// Línea 509: usa scanLocation (ESTADO LOCAL)
const locInfo = formatEmergencyLocation(scanLocation);
// Líneas 510-512: construye el mensaje
const whatsappMessage = locInfo.text
  ? `Hola ${contact.fullName}, ${personName} podría necesitar ayuda. Su ficha PreRescue ID fue escaneada recientemente.\n\n${locInfo.text}\n\nPor favor intenta contactarle o verifica si necesita asistencia.`
  : `Hola ${contact.fullName}, ${personName} podría necesitar ayuda. Su ficha PreRescue ID fue escaneada recientemente. Por favor intenta contactarle o verifica si necesita asistencia.`;
// Línea 513: genera URL de WhatsApp
const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(whatsappMessage)}`;
```

### Función auxiliar `formatEmergencyLocation`

**`domains/shared/services/emergency-location.ts`**

```typescript
export function formatEmergencyLocation(scanLocation: string): {
  text: string;
  mapsUrl: string | null;
} {
  if (!scanLocation?.trim()) {
    return { text: "", mapsUrl: null }; // ← SIEMPRE retorna vacío cuando scanLocation = ""
  }
  // ... resto del código
}
```

### Causa raíz confirmada

En `app/(public)/e/[shortCode]/page.tsx`:

1. **Línea 209:** `const [scanLocation, setScanLocation] = useState("");` — inicia VACÍO
2. **Líneas 223-247:** `navigator.geolocation.getCurrentPosition()` se ejecuta ASYNC. El callback setea `setScanLocation(locationLabel)` PERO NADIE ESPERA.
3. **Línea 256:** `const res = await fetch(\`/api/public/${shortCode}?t=${Date.now()}\`);` — se ejecuta INMEDIATAMENTE, sin esperar el callback de GPS.
4. **Línea 264:** `setProfile(data.profile)` — el perfil se renderiza CON ESCANEO SIN TERMINAR.
5. **Línea 509:** `formatEmergencyLocation(scanLocation)` recibe `""` porque el callback de GPS corre en paralelo y no ha terminado.

### ¿Se puede arreglar sin nuevo endpoint?

**SÍ, sin migración, sin nuevo endpoint.** Hay 3 opciones:

#### Opción A (recomendada — useEffect watcher)

Mantener el flujo paralelo actual pero regenerar los URLs de WhatsApp cuando `scanLocation` se actualice.

**Cambios en `app/(public)/e/[shortCode]/page.tsx`:**

1. Convertir `whatsappUrl` de variable de render a `useState`:
   ```typescript
   const [whatsappUrls, setWhatsappUrls] = useState<Record<number, string>>({});
   ```

2. Agregar `useEffect` que escuche cambios en `scanLocation` y `profile`:
   ```typescript
   useEffect(() => {
     if (!profile || !scanLocation) return;
     const newUrls: Record<number, string> = {};
     profile.emergencyContacts.forEach((contact, idx) => {
       const locInfo = formatEmergencyLocation(scanLocation);
       const message = buildWhatsAppMessage(contact, profile, locInfo);
       newUrls[idx] = `https://wa.me/${normalizeWhatsAppPhone(contact.phone)}?text=${encodeURIComponent(message)}`;
     });
     setWhatsappUrls(newUrls);
   }, [scanLocation, profile]);
   ```

3. En el render, usar `whatsappUrls[idx]` en lugar de `whatsappUrl`.

**Ventaja:** Sin race condition. Cuando el GPS llegue (incluso 3s después), los URLs se regeneran automáticamente.

#### Opción B (servidor — más precisa pero requiere endpoint)

Crear `GET /api/public/[shortCode]/whatsapp-links` que:
1. Toma `shortCode` y el `scanId` (que se devuelve del scan POST)
2. Usa la ubicación guardada en el `ScanEvent` (con reverse geocoding ya hecho en `after()`)
3. Genera links con Google Maps + dirección

#### Opción C (reestructurar useEffect)

Mover el fetch del perfil DENTRO del callback de geolocalización exitoso:
```typescript
navigator.geolocation.getCurrentPosition(
  async (pos) => {
    // 1. Setear ubicación
    setScanLocation(`${pos.coords.latitude},${pos.coords.longitude}`);
    // 2. Hacer scan
    await fetch(`/api/public/${shortCode}/scan`, { ... });
    // 3. Ahora sí, cargar perfil (scanLocation ya está seteado)
    const res = await fetch(`/api/public/${shortCode}?...`);
    ...
  },
  // Fallback: cargar perfil sin ubicación
  () => { loadProfileWithoutLocation(); },
  { timeout: 3000 }
);
```

**Desventaja:** Si GPS falla (timeout 3s), la carga del perfil se retrasa 3s.

### Veredicto WhatsApp

| Aspecto | Decisión |
|---------|----------|
| ¿Requiere migración? | ❌ NO |
| ¿Requiere nuevo endpoint? | ❌ NO (Opción A o C) |
| ¿Requiere cambios en ScanEvent? | ❌ NO (ya guarda ubicación) |
| Fix mínimo | Opción A (useEffect watcher) — solo frontend |
| Archivos afectados | Solo `app/(public)/e/[shortCode]/page.tsx` |
| Tiempo estimado | ~30 min |

---

## 2. Accesorios con chip activo

### Confirmación: ¿Actualmente se permite comprar accesorio sin chip?

**SÍ.** En `app/api/orders/route.ts`, líneas 82-118:

```typescript
if (storeProduct.requiresPersonalization) {
  const profileId = itemAny.profileId as string | undefined;
  if (!profileId) {
    throw new Error(`El producto "${storeProduct.name}" requiere seleccionar un perfil médico.`);
  }

  const profile = await tx.profile.findFirst({
    where: { id: profileId, accountId: user.accountId || undefined },
    include: {
      assignedChips: {
        where: { status: { in: ["activated", "sold", "assigned_reserved"] } },
        take: 1,
        select: { id: true, shortCode: true },
      },
    },
  });

  if (!profile) {
    throw new Error(`El perfil seleccionado no es válido o es corporativo.`);
  }

  const chip = profile.assignedChips[0] || null; // ← PERMITE null
  return {
    ...item,
    profileId,
    chipId: chip?.id || null, // ← chipId puede ser null
    ...
  };
}
```

La línea 110: `const chip = profile.assignedChips[0] || null;` — si no hay chips asignados al perfil, `chip = null` y `chipId = null`. La orden se crea igual.

### ¿Dónde validar mejor?

**Ambos lados:**

#### Backend (obligatorio — seguridad)

En `app/api/orders/route.ts`, después de la línea 107 (`if (!profile)`), agregar:

```typescript
if (!profile.assignedChips[0]) {
  throw new Error(
    `El perfil "${profile.firstName} ${profile.lastName}" no tiene un chip activo. ` +
    `Debes tener al menos un chip activo o vinculado para personalizar accesorios.`
  );
}
```

#### Frontend (UX — opcional pero recomendado)

En el formulario de compra de accesorios (componente de tienda), antes de permitir agregar al carrito:
1. Listar chips activos del usuario
2. Forzar selección de un chip
3. Si no hay chips activos, deshabilitar compra de accesorios con mensaje claro

### Fix mínimo sin migración

| Aspecto | Decisión |
|---------|----------|
| ¿Requiere migración? | ❌ NO |
| ¿Requiere nuevo endpoint? | ❌ NO |
| Backend | Agregar 3 líneas en `app/api/orders/route.ts` (validación `if (!profile.assignedChips[0]) throw`) |
| Frontend | Mejorar componente de tienda (opcional P2) |
| Archivos afectados | `app/api/orders/route.ts` (backend) + componente de tienda (frontend) |
| Tiempo estimado | ~15 min backend, ~1h frontend |

### Verificación adicional

Cuando se aprueba una orden de accesorio en `app/api/admin/orders/[id]/approve/route.ts`, ya existe lógica que detecta accesorios:

```typescript
const isPersonalizedAccessoryOrder =
  !order.packageId &&
  order.items.length > 0 &&
  order.items.every((item) => item.profileId || item.chipId);
```

Pero si `chipId` es `null` (porque no se validó), `isPersonalizedAccessoryOrder = false` (porque `item.chipId` es falsy), y el sistema intenta procesarlo como orden normal, lo que causaría error porque no tiene `packageId`.

**Esto confirma que la validación debe estar en backend, antes de que la orden se cree.**

---

## 3. Perfil Médico v2

### Campos que requieren migración Prisma

**Modelo: `Profile` en `prisma/schema.prisma`**

Total: **9 campos nuevos** requeridos:

| # | Campo | Tipo | Default | Notas |
|---|-------|------|---------|-------|
| 1 | `cognitiveImpairment` | `Boolean` | `false` | Deterioro cognitivo / Alzheimer |
| 2 | `isVulnerable` | `Boolean` | `false` | Persona vulnerable general |
| 3 | `wanderingRisk` | `Boolean` | `false` | Riesgo de desorientación o extravío |
| 4 | `isMinor` | `Boolean` | `false` | Menor de edad explícito |
| 5 | `isNonVerbal` | `Boolean` | `false` | Persona no verbal |
| 6 | `communicationAssistance` | `String?` | `null` | Tipo de asistencia (señas, pictogramas, etc.) |
| 7 | `emergencyContactInstructions` | `String?` | `null` | Instrucciones específicas para contacto |
| 8 | `showVulnerabilityStatusPublic` | `Boolean` | `false` | Toggle de privacidad |
| 9 | `showCommunicationStatusPublic` | `Boolean` | `false` | Toggle de privacidad |

### Endpoints afectados

| Endpoint | Cambio | ¿Puede sin migración? |
|----------|--------|-----------------------|
| `POST /api/users/perfiles-medicos` | Aceptar campos nuevos en validación + escritura | ❌ No, hasta que existan en schema |
| `PATCH /api/users/perfiles-medicos/[id]` | Aceptar campos nuevos | ❌ No, hasta que existan en schema |
| `GET /api/users/perfiles-medicos` | Devolver campos nuevos | ❌ No, hasta que existan en schema |
| `GET /api/public/[shortCode]` | Devolver campos nuevos (según toggles) | ❌ No, hasta que existan en schema |
| `GET /api/users/perfiles-medicos/[id]/contacts` | Sin cambios | ✅ No afectado |

### Componentes UI afectados

| Componente | Cambio | ¿Requiere migración? |
|------------|--------|----------------------|
| `components/forms/MedicalProfileForm.tsx` | Agregar campos condicionales + toggles | Sí (los campos deben existir en schema) |
| `app/(public)/e/[shortCode]/page.tsx` | Badges + Retorno Seguro | Sí (los datos deben venir del servidor) |
| `app/(app)/dashboard/perfiles-medicos/page.tsx` | Mostrar nuevos campos | Sí |

### Veredicto Perfil Médico v2

| Aspecto | Decisión |
|---------|----------|
| ¿Requiere migración? | **SÍ** — 9 campos nuevos en modelo Profile |
| ¿Se puede dividir? | Sí: primero migración+backend+lógica, luego UI |
| Dependencias | `prisma migrate dev` → endpoints → formulario → ficha pública |
| Tiempo estimado | ~2-3 días (migración + backend + formulario + ficha) |
| **Debe ser fase separada** | **SÍ** — no mezclar con cambios sin migración |

---

## 4. Retail (Venta física)

### ¿Requiere nuevos endpoints/modelos o solo lógica?

| Componente | ¿Nuevo? | Explicación |
|------------|---------|-------------|
| Modelo Prisma | ❌ NO | `Order` ya tiene `provider: "manual"`, se puede usar `provider: "retail"` sin migración |
| Endpoint | ✅ SÍ | `POST /api/admin/retail/register` — nuevo endpoint |
| UI en Admin | ✅ SÍ | Botón + formulario "Venta en tienda" |

### Lógica propuesta (sin migración)

El modelo `Order` ya soporta:
- `provider: string @default("manual")` — se puede setear como `"retail"`
- `orderType: string @default("manual")` — se puede setear como `"retail"`
- `paymentStatus` — se puede setear como `"paid"` directamente
- `ChipClaimToken` — ya existe para generar códigos de activación
- `OrderItem` — ya existe para registrar productos vendidos

**No se requiere migración porque no se agregan campos nuevos, solo se usan valores existentes de otra manera.**

### Lo que NO requiere migración

| Afirmación | ¿Verdadero? | Detalle |
|------------|-------------|---------|
| ¿Requiere nuevo campo en Order? | ❌ Falso | `provider`, `orderType`, `paymentStatus` ya existen |
| ¿Requiere nuevo modelo? | ❌ Falso | `Order`, `OrderItem`, `Chip`, `ChipClaimToken` ya existen |
| ¿Requiere nueva validación? | ⚠️ Sí, lógica | El approve endpoint actualmente espera `provider: "manual"` y requiere `packageId` — hay que saltar esas validaciones para retail |

### Veredicto Retail

| Aspecto | Decisión |
|---------|----------|
| ¿Requiere migración? | ❌ **NO** |
| ¿Requiere nuevo endpoint? | ✅ SÍ — `POST /api/admin/retail/register` |
| ¿Requiere nueva UI? | ✅ SÍ — Botón en Admin > Pedidos |
| Archivos afectados | Nuevo endpoint + `PedidosSection.tsx` (o componente separado) |
| Tiempo estimado | ~1 día |
| **¿Fase separada?** | Sí, pero puede ir en paralelo con WhatsApp/Accesorios |

---

## 5. Fase Inmediata (sin migración)

### Lo que se puede implementar AHORA sin migración

| # | Tarea | Archivos afectados | Tiempo |
|---|-------|-------------------|--------|
| 1 | **WhatsApp con ubicación** — Agregar useEffect watcher para regenerar URLs cuando llegue scanLocation | `app/(public)/e/[shortCode]/page.tsx` | ~30 min |
| 2 | **Accesorios con chip activo** — Validar chip existente en backend antes de crear orden | `app/api/orders/route.ts` | ~15 min |
| 3 | **Retail endpoint** — Crear `POST /api/admin/retail/register` | Nuevo archivo + `PedidosSection.tsx` | ~1 día |
| 4 | **Admin UI: ocultar botones legacy** — Ocultar fulfillment individual, asignación manual, etc. | `PedidosSection.tsx` | ~2h |

### Lo que requiere migración (fase separada)

| # | Tarea | Dependencia |
|---|-------|-------------|
| 5 | **Perfil Médico v2** — Migración Prisma + endpoints + formulario + badges | `prisma migrate dev` |
| 6 | **Retorno Seguro** en ficha pública | Depende de campos de perfil (wanderingRisk, cognitiveImpairment) |
| 7 | **Nuevos toggles de privacidad** | Depende de campos nuevos |

### Lo que queda como backlog (P3)

| # | Tarea | Razón |
|---|-------|-------|
| 8 | Digital Pass (Apple/Google Wallet) | Modelo existe, sin uso |
| 9 | Notificaciones push a contactos | Requiere infraestructura de notificaciones |
| 10 | Multi-idioma | No crítico |

---

## 6. Resumen de fases

### Fase A — Inmediata (sin migración, ~2 días)

| Prioridad | Tarea | Dependencias |
|-----------|-------|--------------|
| P0 | WhatsApp con ubicación (useEffect watcher) | Ninguna |
| P0 | Accesorios: validar chip activo en backend | Ninguna |
| P1 | Retail: endpoint + UI básica | Ninguna |
| P2 | Admin: ocultar botones legacy | Ninguna |

### Fase B — Con migración (~1 semana)

| Prioridad | Tarea | Dependencias |
|-----------|-------|--------------|
| P0 | Migración Prisma (9 campos en Profile) | Ninguna |
| P0 | Endpoints perfiles médicos v2 | Migración Prisma |
| P0 | Badges en ficha pública (vulnerable, menor, extravío, no verbal) | Endpoints v2 |
| P0 | Sección "Retorno Seguro" en ficha pública | Endpoints v2 |
| P1 | Formulario MedicalProfileForm v2 | Migración Prisma |
| P1 | Toggles de privacidad nuevos | Migración Prisma |

### Fase C — Corporate v2 (~1 semana)

| Prioridad | Tarea | Dependencias |
|-----------|-------|--------------|
| P1 | Endpoints de solicitud de empleado | Ninguna |
| P1 | UI de empresa (autogestión) | Endpoints |
| P2 | Simplificar detalle de pedido corporativo en Admin | Ninguna |
| P2 | Remover asignación manual de chips en Admin | Ninguna |

### Fase D — Backlog

| Prioridad | Tarea | 
|-----------|-------|
| P3 | Digital Pass |
| P3 | Notificaciones push |
| P3 | Multi-idioma |
| P3 | Historial de escaneos en dashboard |

---

## 7. Prompt recomendado para implementar la Fase A

> **Instrucciones para implementar la Fase Inmediata (sin migración):**
>
> 1. **WhatsApp con ubicación:** En `app/(public)/e/[shortCode]/page.tsx`, convertir los URLs de WhatsApp de variables de render a estado React. Agregar un `useEffect` que dependa de `scanLocation` para regenerar los URLs cuando llegue la ubicación GPS. Mantener el flujo actual pero regenerar los links automáticamente.
>
> 2. **Accesorios con chip activo:** En `app/api/orders/route.ts`, en el bloque donde se procesan `requiresPersonalization`, después de validar que el perfil existe, agregar validación de que `profile.assignedChips[0]` exista. Si no, lanzar error: "El perfil no tiene un chip activo. Debes tener al menos un chip activo para personalizar accesorios."
>
> 3. **Ocultar botones legacy en Admin:** En `app/(admin)/admin/_components/sections/PedidosSection.tsx`, reemplazar los botones de fulfillment individual por item corporativo con mensajes de "auto-gestionado". Ocultar los selectores de asignación de chip manual. Simplificar la barra de acciones.
>
> No crear migraciones. No tocar archivos no listados.

---

*Documento generado el 6 de octubre 2026*
*Basado en la auditoría: `docs/audit/auditoria-redisenio-flujos-pre-rescue.md`*
*Próximo paso: Implementar Fase A (inmediata, sin migración)*

---
*Originalmente en: docs/audit/*