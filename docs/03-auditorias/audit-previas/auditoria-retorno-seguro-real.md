# Auditoría Técnica: Retorno Seguro Real con Ubicación Fija del Perfil

**Fecha:** 2026-06-10  
**Estado:** Propuesta (NO implementada)  
**Contexto:** Pre-Rescate Panamá - Ubicación fija vs. ubicación de escaneo

---

## 1. Problema Actual

### Situación Hoy
El botón "Asistencia Especial / Retorno Seguro" existe para ayudar a regresar a personas vulnerables (menores, Alzheimer, no verbal, desorientadas). Actualmente:

- ✅ Formulario guarda `safeReturnInstructions` (texto)
- ✅ Formulario guarda `address` y `city` (ubicación genérica)
- ✅ La ficha pública muestra instrucciones de retorno
- ❌ **Google Maps / Waze usan `scanLocation` (dónde se escaneó)**
- ❌ **No hay campos específicos para ubicación de retorno: lat/lng, contacto responsable, nombre del lugar**
- ❌ **Los links de mapas redirigen al lugar donde se escaneó, NO a dónde llevar a la persona**

### Impacto UX/Seguridad
```
Caso de uso: Niño se pierde en centro comercial. Rescatista escanea chip.
Hoy:
  → Ve instrucciones: "Casa de tía María en La Margarita"
  → Presiona Google Maps → ¡Va al centro comercial (donde escaneó)!
  → ❌ Incorrecto, contraproducente

Esperado:
  → Ve instrucciones: "Casa de tía María en La Margarita"
  → Ve dirección real: "Calle 123, La Margarita"
  → Presiona Google Maps → Va a Calle 123, La Margarita
  → ✅ Correcto
```

---

## 2. Auditoría de Arquitectura Actual

### 2.1 Prisma Schema (`prisma/schema.prisma`)

**Campos actuales en `model Profile`:**
```prisma
// Dirección genérica
address                 String?              @db.Text
city                    String?

// Retorno seguro
safeReturnInstructions  String?
showSafeReturnPublic    Boolean   @default(false)

// Ubicación de escaneo (en Chip, no en Profile)
lastScanLocation        String?  // En model Chip
```

**Lo que falta:**
- `safeReturnLocationName` - Nombre del lugar (ej: "Casa de tía María")
- `safeReturnAddress` - Dirección específica de retorno
- `safeReturnLat` - Latitud para mapas
- `safeReturnLng` - Longitud para mapas
- `safeReturnContactName` - Responsable del lugar (ej: "Tía María García")
- `safeReturnContactPhone` - Teléfono del responsable
- `showSafeReturnLocationPublic` - Control de visibilidad de la ubicación

### 2.1.1 Estado actual de implementación

Al momento del análisis:
- El `prisma/schema.prisma` ya contiene los campos propuestos para Retorno Seguro.
- `lib/validations.ts` aún no valida los nuevos campos.
- `domains/profiles/repositories/profile.repository.ts` aún no los encripta/desencripta.
- Las rutas de API `app/api/users/perfiles-medicos` aceptan solo los campos existentes.
- La UI de `MedicalProfileForm.tsx` no ofrece inputs específicos para ubicación segura.
- La vista pública usa `scanLocation` para mapas, no `safeReturnLat`/`safeReturnLng`.

### 2.2 Validaciones (`lib/validations.ts`)

**`profileUpdateSchema` incluye:**
```typescript
safeReturnInstructions: z.string().max(1000).optional().nullable(),
showSafeReturnPublic: z.boolean().optional(),
address: z.string().max(500).optional().nullable(),
city: z.string().max(100).optional().nullable(),
```

**Lo que falta:**
```typescript
safeReturnLocationName: z.string().max(150).optional().nullable(),
safeReturnAddress: z.string().max(500).optional().nullable(),
safeReturnLat: z.coerce.number().finite().min(-90).max(90).optional().nullable(),
safeReturnLng: z.coerce.number().finite().min(-180).max(180).optional().nullable(),
safeReturnContactName: z.string().max(120).optional().nullable(),
safeReturnContactPhone: z.string().max(30).optional().nullable(),
showSafeReturnLocationPublic: z.boolean().optional(),
```

### 2.3 ProfileRepository (`domains/profiles/repositories/profile.repository.ts`)

**Campos encriptados al guardar:**
```typescript
safeReturnInstructions: encrypt(data.safeReturnInstructions || ""),
```

**Lo que falta:**
```typescript
// Los campos de ubicación/contacto de retorno seguro deben encriptarse también
safeReturnLocationName: encrypt(data.safeReturnLocationName || ""),
safeReturnAddress: encrypt(data.safeReturnAddress || ""),
safeReturnContactName: encrypt(data.safeReturnContactName || ""),
safeReturnContactPhone: encrypt(data.safeReturnContactPhone || ""),
// Lat/lng NO se encriptan (son coordenadas públicas de mapas)
```

### 2.4 APIs REST

#### `POST /api/users/perfiles-medicos` (crear perfil)
**Actualmente:**
- Acepta `safeReturnInstructions`, `showSafeReturnPublic`
- Los guarda en BD y devuelve

**Falta:**
- Aceptar campos nuevos de ubicación/contacto
- Validarlos con schema actualizado

#### `PATCH /api/users/perfiles-medicos/[profileId]` (actualizar)
**Actualmente:**
- Permite actualizar `safeReturnInstructions`, `showSafeReturnPublic`

**Falta:**
- Permitir actualizar campos de ubicación/contacto
- Validar y encriptar

#### `GET /api/public/[shortCode]` (ficha pública)
**Actualmente:**
```typescript
safeReturn: profile.showSafeReturnPublic ? {
  instructions: decryptedSafeReturnInstructions || null,
} : null,
```

**Cambio propuesto:**
```typescript
safeReturn: profile.showSafeReturnPublic ? {
  instructions: decryptedSafeReturnInstructions || null,
  locationName: profile.showSafeReturnLocationPublic ? 
    (decryptedSafeReturnLocationName || null) : null,
  address: profile.showSafeReturnLocationPublic ? 
    (decryptedSafeReturnAddress || null) : null,
  lat: profile.showSafeReturnLocationPublic ? 
    profile.safeReturnLat : null,
  lng: profile.showSafeReturnLocationPublic ? 
    profile.safeReturnLng : null,
  contactName: profile.showSafeReturnLocationPublic ? 
    (decryptedSafeReturnContactName || null) : null,
  contactPhone: profile.showSafeReturnLocationPublic ? 
    (decryptedSafeReturnContactPhone || null) : null,
} : null,
```

### 2.5 Frontend - MedicalProfileForm

**Actualmente en renderSafeReturnFields():**
- Campo para `safeReturnInstructions` (textarea)
- Auto-activa `showSafeReturnPublic` al activar toggle

**Falta:**
- Campos para `safeReturnLocationName` (nombre del lugar)
- Campos para `safeReturnAddress` (dirección)
- Picker de ubicación o input de lat/lng
- Campo para `safeReturnContactName` (responsable)
- Campo para `safeReturnContactPhone` (teléfono)

### 2.6 Frontend - PublicSpecialAssistanceCard / Página Especial

**Actualmente:**
- Muestra `safeReturn.instructions`
- Muestra Google Maps / Waze basados en `scanLocation` (dónde se escaneó)

**Cambio propuesto:**
- Si `safeReturn.locationName` existe: mostrar nombre del lugar
- Si `safeReturn.address` existe: mostrar dirección escrita
- Si `safeReturn.lat` y `safeReturn.lng` existen:
  - Google Maps link → `https://maps.google.com/?q={lat},{lng}`
  - Waze link → `https://waze.com/ul?ll={lat},{lng}&navigate=yes`
- Si no hay lat/lng: mostrar solo dirección escrita + mensaje "Ubicación no configurada para mapas"
- Si `safeReturn.contactName` / `safeReturn.contactPhone`: mostrar responsable como contacto adicional

---

## 3. Propuesta de Implementación

### 3.1 Migración Prisma

**Nueva migración:**
```prisma
model Profile {
  // ... campos existentes ...
  
  // Retorno Seguro — ubicación fija y contacto responsable
  safeReturnLocationName  String?              // Ej: "Casa de tía María"
  safeReturnAddress       String?              @db.Text  // Ej: "Calle 123, Apto 4B"
  safeReturnLat           Float?               // -90 a 90
  safeReturnLng           Float?               // -180 a 180
  safeReturnContactName   String?              // Ej: "Tía María García"
  safeReturnContactPhone  String?              // Ej: "+507 6612-3456"
  showSafeReturnLocationPublic Boolean         @default(false)  // Controla visibilidad de ubicación
  
  // ... resto de campos ...
}
```

**Comando de migración:**
```bash
npx prisma migrate dev --name add_safe_return_location_fields
```

### 3.2 Esquema de Validación

**Actualizar `lib/validations.ts`:**

```typescript
export const profileUpdateSchema = z.object({
  // ... campos existentes ...
  
  // Retorno Seguro — campos nuevos
  safeReturnLocationName: z.string().max(150).optional().nullable(),
  safeReturnAddress: z.string().max(500).optional().nullable(),
  safeReturnLat: z.coerce.number()
    .finite()
    .min(-90, "Latitud debe estar entre -90 y 90")
    .max(90)
    .optional()
    .nullable(),
  safeReturnLng: z.coerce.number()
    .finite()
    .min(-180, "Longitud debe estar entre -180 y 180")
    .max(180)
    .optional()
    .nullable(),
  safeReturnContactName: z.string().max(120).optional().nullable(),
  safeReturnContactPhone: z.string().max(30).optional().nullable(),
  showSafeReturnLocationPublic: z.boolean().optional(),
});
```

### 3.3 ProfileRepository

**Actualizar métodos `create()` y `update()`:**

```typescript
// En create() — añadir encriptación:
safeReturnLocationName: encrypt(data.safeReturnLocationName || ""),
safeReturnAddress: encrypt(data.safeReturnAddress || ""),
// Lat/lng no se encriptan
safeReturnLat: data.safeReturnLat,
safeReturnLng: data.safeReturnLng,
safeReturnContactName: encrypt(data.safeReturnContactName || ""),
safeReturnContactPhone: encrypt(data.safeReturnContactPhone || ""),
showSafeReturnLocationPublic: data.showSafeReturnLocationPublic ?? false,

// En update() — mismo patrón
if (data.safeReturnLocationName !== undefined) 
  updateData.safeReturnLocationName = encrypt(data.safeReturnLocationName || "");
if (data.safeReturnAddress !== undefined) 
  updateData.safeReturnAddress = encrypt(data.safeReturnAddress || "");
if (data.safeReturnLat !== undefined) 
  updateData.safeReturnLat = data.safeReturnLat;
if (data.safeReturnLng !== undefined) 
  updateData.safeReturnLng = data.safeReturnLng;
if (data.safeReturnContactName !== undefined) 
  updateData.safeReturnContactName = encrypt(data.safeReturnContactName || "");
if (data.safeReturnContactPhone !== undefined) 
  updateData.safeReturnContactPhone = encrypt(data.safeReturnContactPhone || "");

// En decryptProfile() — añadir desencriptación:
safeReturnLocationName: decrypt(profile.safeReturnLocationName || ""),
safeReturnAddress: decrypt(profile.safeReturnAddress || ""),
safeReturnContactName: decrypt(profile.safeReturnContactName || ""),
safeReturnContactPhone: decrypt(profile.safeReturnContactPhone || ""),
```

### 3.4 APIs REST

#### Cambio en `GET /api/public/[shortCode]/route.ts`:

```typescript
// Desencriptar campos de retorno seguro
const decryptedSafeReturnLocationName = decrypt(profile.safeReturnLocationName || "");
const decryptedSafeReturnAddress = decrypt(profile.safeReturnAddress || "");
const decryptedSafeReturnContactName = decrypt(profile.safeReturnContactName || "");
const decryptedSafeReturnContactPhone = decrypt(profile.safeReturnContactPhone || "");

// En construcción de publicProfile:
safeReturn: profile.showSafeReturnPublic ? {
  instructions: decryptedSafeReturnInstructions || null,
  // Nuevos campos — solo si showSafeReturnLocationPublic es true
  ...(profile.showSafeReturnLocationPublic && {
    locationName: decryptedSafeReturnLocationName || null,
    address: decryptedSafeReturnAddress || null,
    lat: profile.safeReturnLat,
    lng: profile.safeReturnLng,
    contactName: decryptedSafeReturnContactName || null,
    contactPhone: decryptedSafeReturnContactPhone || null,
  }),
} : null,
```

#### No hay cambios en POST/PATCH — ya aceptan datos del body y los validan con schema.

### 3.5 Frontend - MedicalProfileForm

**Actualizar interfaz ProfileFormProps:**
```typescript
interface ProfileFormProps {
  form: {
    // ... campos existentes ...
    safeReturnLocationName?: string;
    safeReturnAddress?: string;
    safeReturnLat?: number | null;
    safeReturnLng?: number | null;
    safeReturnContactName?: string;
    safeReturnContactPhone?: string;
    showSafeReturnLocationPublic?: boolean;
  };
  onChange: (field: string, value: string | boolean | number | null) => void;
}
```

**Actualizar renderSafeReturnFields():**
```typescript
const renderSafeReturnFields = () => (
  <div className="space-y-3">
    <ToggleField 
      label="Retorno seguro" 
      checked={form.enableSafeReturn ?? false} 
      onChange={(v) => {
        update("enableSafeReturn", v);
        if (v) {
          update("showSafeReturnPublic", true);
          update("showSafeReturnLocationPublic", true);
        }
      }} 
    />

    {form.enableSafeReturn && (
      <div className="space-y-3">
        {/* Instrucciones */}
        <TextAreaField
          icon={<Footprints className="h-4 w-4" />}
          label="Instrucciones de retorno seguro"
          value={form.safeReturnInstructions || ""}
          onChange={(v: string) => update("safeReturnInstructions", v)}
          placeholder="Ej. Si está desorientado, llamar primero a tía María..."
          color="text-teal-600"
        />

        {/* Datos del lugar de retorno */}
        <div className="space-y-2 pt-4 border-t border-border">
          <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Ubicación de Retorno Seguro
          </label>
          
          <Field 
            label="Nombre del lugar" 
            value={form.safeReturnLocationName || ""} 
            onChange={(v: string) => update("safeReturnLocationName", v)} 
            placeholder="Ej: Casa de tía María" 
          />
          
          <Field 
            label="Dirección completa" 
            value={form.safeReturnAddress || ""} 
            onChange={(v: string) => update("safeReturnAddress", v)} 
            placeholder="Calle, número, apto, referencia" 
          />

          <div className="grid grid-cols-2 gap-3">
            <Field 
              label="Latitud (opcional)" 
              value={form.safeReturnLat?.toString() || ""} 
              onChange={(v: string) => update("safeReturnLat", v ? parseFloat(v) : null)} 
              placeholder="Ej: 8.9824" 
            />
            <Field 
              label="Longitud (opcional)" 
              value={form.safeReturnLng?.toString() || ""} 
              onChange={(v: string) => update("safeReturnLng", v ? parseFloat(v) : null)} 
              placeholder="Ej: -79.5199" 
            />
          </div>

          {/* Contacto responsable del lugar */}
          <div className="pt-3 border-t border-border">
            <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Responsable del lugar (opcional)
            </label>
            
            <Field 
              label="Nombre" 
              value={form.safeReturnContactName || ""} 
              onChange={(v: string) => update("safeReturnContactName", v)} 
              placeholder="Ej: Tía María García" 
            />
            
            <Field 
              label="Teléfono" 
              value={form.safeReturnContactPhone || ""} 
              onChange={(v: string) => update("safeReturnContactPhone", v)} 
              placeholder="Ej: +507 6612-3456" 
            />
          </div>
        </div>
      </div>
    )}
  </div>
);
```

### 3.6 Frontend - SafeReturnCard (vista especial)

**Cambiar componente en `app/(public)/e/[shortCode]/page.tsx`:**

```typescript
function SafeReturnCard({ safeReturn }: { safeReturn: EmergencyProfile["safeReturn"] }) {
  if (!safeReturn?.instructions) return null;

  const locationCoords = safeReturn.lat && safeReturn.lng 
    ? { lat: safeReturn.lat, lng: safeReturn.lng } 
    : null;
  const googleMapsUrl = locationCoords 
    ? `https://maps.google.com/?q=${locationCoords.lat},${locationCoords.lng}` 
    : null;
  const wazeUrl = locationCoords 
    ? `https://waze.com/ul?ll=${locationCoords.lat},${locationCoords.lng}&navigate=yes` 
    : null;

  return (
    <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-teal-200 shadow-xl shadow-teal-100/50 space-y-4">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 bg-teal-50 rounded-2xl flex items-center justify-center border border-teal-100">
          <Footprints className="h-7 w-7 text-teal-600" />
        </div>
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">
            Retorno Seguro
          </h2>
          <p className="text-xs text-teal-600 font-bold uppercase tracking-widest mt-1">
            Información de retorno seguro
          </p>
        </div>
      </div>

      {/* Instrucciones */}
      <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200">
        <p className="text-sm font-semibold text-teal-900 leading-relaxed whitespace-pre-wrap">
          {safeReturn.instructions}
        </p>
      </div>

      {/* Ubicación del lugar de retorno */}
      {(safeReturn.locationName || safeReturn.address) && (
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-2">
          <p className="text-xs font-black uppercase tracking-widest text-blue-700 mb-2">
            Lugar de Retorno Seguro
          </p>
          {safeReturn.locationName && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Nombre:</p>
              <p className="text-sm font-semibold text-slate-900">{safeReturn.locationName}</p>
            </div>
          )}
          {safeReturn.address && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Dirección:</p>
              <p className="text-sm font-semibold text-slate-900">{safeReturn.address}</p>
            </div>
          )}
        </div>
      )}

      {/* Enlaces a mapas (si hay coordenadas) */}
      {(googleMapsUrl || wazeUrl) && (
        <div className="grid sm:grid-cols-2 gap-3">
          {googleMapsUrl && (
            <a 
              href={googleMapsUrl} 
              target="_blank" 
              rel="noreferrer" 
              className="inline-flex items-center justify-center gap-2 px-4 py-3 uppercase text-sm font-black text-white bg-slate-900 rounded-2xl shadow-lg hover:bg-slate-800 transition-all"
            >
              📍 Google Maps
            </a>
          )}
          {wazeUrl && (
            <a 
              href={wazeUrl} 
              target="_blank" 
              rel="noreferrer" 
              className="inline-flex items-center justify-center gap-2 px-4 py-3 uppercase text-sm font-black text-white bg-[#2C2C2C] rounded-2xl shadow-lg hover:bg-[#111] transition-all"
            >
              🗺️ Waze
            </a>
          )}
        </div>
      )}

      {/* Mensaje si no hay coordenadas */}
      {!locationCoords && safeReturn.address && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-1">
            ⚠️ Ubicación sin coordenadas
          </p>
          <p className="text-xs text-amber-800">
            La dirección está registrada pero sin coordenadas de mapa. 
            Comparte la dirección manualmente.
          </p>
        </div>
      )}

      {/* Contacto responsable */}
      {safeReturn.contactName && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-700 mb-2">
            Responsable del Lugar
          </p>
          <p className="text-sm font-black uppercase tracking-tight text-emerald-900">
            {safeReturn.contactName}
          </p>
          {safeReturn.contactPhone && (
            <a 
              href={`tel:${safeReturn.contactPhone.replace(/[^\d+]/g, "")}`} 
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all"
            >
              📞 Llamar
            </a>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## 4. Reglas de Privacidad y Visibilidad

### Control de Visibilidad Pública

| Campo | Controla | Comportamiento |
|-------|----------|----------------|
| `showSafeReturnPublic` | Instrucciones | Si false → no mostrar nada de retorno seguro |
| `showSafeReturnLocationPublic` | Ubicación + contacto | Si false → no mostrar lugar, dirección, lat/lng, contacto responsable |

**Regla automática (en formulario):**
- Al activar `enableSafeReturn` → automáticamente activa `showSafeReturnPublic = true` y `showSafeReturnLocationPublic = true`
- Usuario puede deshabilitar individualmente en Privacidad si lo desea

### Encriptación

**Se encriptan (en BD):**
- `safeReturnInstructions`
- `safeReturnLocationName`
- `safeReturnAddress`
- `safeReturnContactName`
- `safeReturnContactPhone`

**NO se encriptan (públicos):**
- `safeReturnLat`
- `safeReturnLng`
- (Las coordenadas de mapas son públicas por definición)

### Corporativos

**Excluir de retorno seguro:**
- Corporativos (`profileType = "corporate"`) NO tienen opción de Retorno Seguro
- En API pública: si `profileType = "corporate"`, `safeReturn = null` siempre

---

## 5. Riesgos y Mitigaciones

### Riesgo 1: Privacidad de Ubicación
**Problema:** Guardar lat/lng de "lugar de retorno seguro" expone ubicación privada de familia.  
**Mitigación:**
- Usuario puede omitir lat/lng y solo guardar dirección escrita
- Controles de privacidad explícitos: `showSafeReturnLocationPublic`
- Documentar en UI que solo activar si es apropiado compartir

### Riesgo 2: Contacto Responsable
**Problema:** Guardar teléfono del responsable podría exponerlo a contactos indeseados.  
**Mitigación:**
- El campo es opcional
- Solo se muestra si `showSafeReturnLocationPublic = true`
- Validar que sea teléfono válido

### Riesgo 3: Coordenadas Inválidas
**Problema:** Usuario ingresa lat/lng incorrectas → mapas van a lugar equivocado.  
**Mitigación:**
- Validación en schema (lat: -90 a 90, lng: -180 a 180)
- Si falta una coordenada, no mostrar enlaces de mapas
- Mostrar advencia "Ubicación sin coordenadas configuradas"
- Considerar añadir picker de ubicación en UI (click en mapa)

### Riesgo 4: Datos Inconsistentes
**Problema:** `address` se usa genéricamente, ¿es dirección de retorno o de vivienda?  
**Mitigación:**
- Renombrar internamente: `safeReturnAddress` es específico
- `address` queda para datos administrativos generales
- Documentar claramente en formulario

---

## 6. Plan de Implementación por Commits

### Commit 1: Migración Prisma + ProfileRepository
**Cambios:**
- Crear migración Prisma con campos nuevos
- Actualizar `decryptProfile()` en ProfileRepository
- Actualizar `create()` y `update()` para manejar encriptación/desencriptación

**Validación:**
- `npm run typecheck` (no debe fallar)
- `npm run build` (compilar)
- Verificar BD: `npx prisma studio` y confirmar tablas

**Commit message:**
```
Add safe return location fields to profile schema

- Add safeReturnLocationName, safeReturnAddress, safeReturnLat, safeReturnLng
- Add safeReturnContactName, safeReturnContactPhone
- Add showSafeReturnLocationPublic toggle
- Update ProfileRepository encryption/decryption for new fields
- All address/contact fields encrypted, lat/lng unencrypted (public)
```

### Commit 2: Validación Zod
**Cambios:**
- Actualizar `profileUpdateSchema` en `lib/validations.ts`
- Añadir coerción de números para lat/lng
- Añadir validación de rangos

**Validación:**
- `npm run typecheck`

**Commit message:**
```
Add safe return location validation schema

- Add lat/lng number validation with range -90..90 and -180..180
- Add optional fields for location name, address, contact info
- Ensure showSafeReturnLocationPublic boolean
```

### Commit 3: APIs REST
**Cambios:**
- Actualizar `GET /api/public/[shortCode]/route.ts` para incluir nuevos campos en respuesta
- Desencriptar en endpoint público

**Validación:**
- `npm run typecheck`
- `npm run build`
- Hacer test con curl: `curl http://localhost:3000/api/public/[testCode]`

**Commit message:**
```
Expose safe return location in public API

- Decrypt and include safeReturnLocationName, safeReturnAddress, lat, lng
- Include safeReturnContactName, safeReturnContactPhone
- Only expose if showSafeReturnLocationPublic is true
- Lat/lng unencrypted, other fields decrypted before response
```

### Commit 4: MedicalProfileForm UI
**Cambios:**
- Actualizar interfaz `ProfileFormProps`
- Actualizar `renderSafeReturnFields()` con nuevos inputs
- Auto-activar `showSafeReturnLocationPublic` cuando se activa retorno seguro

**Validación:**
- `npm run typecheck`
- `npm run build`
- Verificar en navegador: crear perfil, activar retorno seguro, rellenar campos

**Commit message:**
```
Add safe return location form fields

- Add inputs for location name, address, lat/lng in MedicalProfileForm
- Add contact name/phone fields (optional)
- Auto-enable showSafeReturnLocationPublic when enableSafeReturn activated
- Maintain privacy toggle for manual override
```

### Commit 5: SafeReturnCard UI (vista especial)
**Cambios:**
- Reescribir `SafeReturnCard()` para mostrar ubicación real
- Cambiar Google/Waze para usar `safeReturn.lat/lng` (NO `scanLocation`)
- Mostrar contacto responsable si existe
- Mensaje "sin coordenadas" si no hay lat/lng

**Validación:**
- `npm run typecheck`
- `npm run build`
- Verificar en navegador: ver ficha especial con ubicación real de mapas

**Commit message:**
```
Update special assistance view to show real safe return location

- Change SafeReturnCard to use safeReturn.lat/lng instead of scanLocation
- Display location name, address, and responsible contact
- Show Google Maps/Waze links only if coordinates present
- Add warning if address present but no coordinates
```

### Commit 6: QA + Documentación
**Cambios:**
- Documentar en QUICK_REFERENCE.md o en docs/
- Actualizar README con notas sobre retorno seguro
- Crear ejemplos de uso

**Validación:**
- Revisar todas las vistas (grid/wizard, mobile/desktop)
- Testear creación y edición de perfiles con retorno seguro
- Verificar encriptación en BD

**Commit message:**
```
Document safe return location feature

- Add notes on usage, privacy, and best practices
- Document migration steps for deployment
- Include test cases for lat/lng validation
```

---

## 7. Checklist Pre-Implementación

- [ ] Revisar migración Prisma con DBA/lead
- [ ] Confirmar campos de lat/lng no causarán problemas de rendimiento
- [ ] Validar que encriptación funciona para strings, no numbers
- [ ] Preparar rollback plan si migración falla
- [ ] Briefing a UX sobre nuevos campos en formulario
- [ ] Revisar permisos de privacidad con Legal/Product
- [ ] Crear test cases para edge cases (coordenadas fuera de rango, etc.)
- [ ] Definir punto de geolocalización para picker (si se implementa)

---

## 8. Consideraciones Futuras

### 8.1 Picker de Ubicación
**Opción 1 (Hoy):** Usuario ingresa lat/lng manualmente
**Opción 2 (Futuro):** Click en mapa → selecciona coordenadas automáticamente

Necesitaría:
- Componente de mapa interactivo (Google Maps API o similar)
- Geocoding inverso para convertir coordenadas a dirección

### 8.2 Validación de Coordenadas
Considerar validar que lat/lng caen dentro de Panamá:
- Lat: ~7 a ~10
- Lng: ~-77 a ~-83

### 8.3 Multiguerrilla de Ubicaciones
Si un usuario quiere múltiples "lugares seguros" (tía, abuela, guardería):
- Necesitaría tabla separada `SafeReturnLocation[]` en vez de campos únicos
- Complejo para MVP

---

## 9. Estimación de Esfuerzo

| Tarea | Horas | Complejidad |
|-------|-------|-------------|
| Migración Prisma | 1 | Baja |
| ProfileRepository + validación | 2 | Media |
| APIs REST | 2 | Media |
| MedicalProfileForm | 3 | Media |
| SafeReturnCard + vista especial | 3 | Media |
| Testing QA | 4 | Media |
| Documentación | 1 | Baja |
| **Total** | **16** | **~2 días** |

---

## 10. Citas/Prompts para Commits

### Prompt para Commit 1 (Migración)
```
Crea la migración Prisma y actualiza ProfileRepository:

1. Nueva migración: add_safe_return_location_fields
2. Campos en Profile model:
   - safeReturnLocationName String?
   - safeReturnAddress String? @db.Text
   - safeReturnLat Float?
   - safeReturnLng Float?
   - safeReturnContactName String?
   - safeReturnContactPhone String?
   - showSafeReturnLocationPublic Boolean @default(false)

3. Actualiza ProfileRepository.decryptProfile():
   - Desencripta: safeReturnLocationName, safeReturnAddress, safeReturnContactName, safeReturnContactPhone
   - NO desencripta: safeReturnLat, safeReturnLng

4. Actualiza create() y update():
   - Encripta los 4 campos de texto
   - Guarda lat/lng sin encriptación

5. Valida: npm run typecheck && npm run build
```

### Prompt para Commit 3 (API Pública)
```
Actualiza GET /api/public/[shortCode]/route.ts:

1. Desencripta campos nuevos:
   - const decryptedSafeReturnLocationName = decrypt(profile.safeReturnLocationName || "");
   - const decryptedSafeReturnAddress = decrypt(profile.safeReturnAddress || "");
   - const decryptedSafeReturnContactName = decrypt(profile.safeReturnContactName || "");
   - const decryptedSafeReturnContactPhone = decrypt(profile.safeReturnContactPhone || "");

2. Actualiza construcción de safeReturn en publicProfile:
   - Solo incluir locationName, address, lat, lng si showSafeReturnLocationPublic=true
   - Siempre incluir instructions si showSafeReturnPublic=true

3. NO toques respuesta para corporativos (profileType="corporate")

4. Valida respuesta con curl
```

---

## 11. Referencias

- Current implementation: `commit 9259550` "Refine special assistance visibility logic"
- Safe Return Card: `app/(public)/e/[shortCode]/page.tsx` line ~130-270
- Profile Form: `components/forms/MedicalProfileForm.tsx` line ~258-280
- API Public: `app/api/public/[shortCode]/route.ts`

---

**Documento creado:** 2026-06-10  
**Estado:** Listo para revisión antes de implementación  
**Próximo paso:** Ejecutar Commit 1 (Migración Prisma)


---
*Originalmente en: docs/audit/*