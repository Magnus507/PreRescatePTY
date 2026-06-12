# Auditoría Visual UsersSection

**Fecha:** 2026-06-09  
**Alcance:** Columna "Perfil Médico" y tabla completa de Usuarios & Perfiles  
**No se modificó código. No se hizo commit.**

---

## Campo rojo identificado

| Propiedad | Valor |
|-----------|-------|
| **Valor observado** | `34d6dc0ca07b5ecff5c7f9b9b0806213:cd2e9a20720fd4a68cc08d4d145ee948` |
| **Campo** | `Profile.bloodType` |
| **Tabla Prisma** | `Profile.bloodType` → `String` |
| **¿Cifrado?** | **SÍ** — cifrado con AES-256-CBC en `profile.repository.ts` línea 109: `encrypt(data.bloodType)` |
| **¿Descifrado en admin?** | **NO** — `user.repository.ts` hace `select: { bloodType: true }` sin descifrar |
| **Dato real** | Tipo de sangre (ej: "A+", "O-", "AB+", etc.) |
| **¿Dato médico?** | **SÍ** — es un dato sensible de salud |
| **Línea exacta de render** | `UsersSection.tsx` línea 139: `{u.profile.bloodType}` |
| **Estilo** | Badge rojo (`bg-red-50 text-red-600`) |

---

## Origen real

La cadena completa:

1. **Usuario guarda perfil** → `profile.repository.ts` → `bloodType: encrypt(data.bloodType || "Pendiente")` → guarda en DB como `34d6dc0ca07b5ecff5c7f9b9b0806213:cd2e9a20720fd4a68cc08d4d145ee948`

2. **Admin consulta usuarios** → `user.repository.ts` → `select: { bloodType: true }` → Prisma devuelve el valor cifrado tal cual está en DB

3. **Tabla admin** → `UsersSection.tsx` línea 139 → `{u.profile.bloodType}` → renderiza el valor cifrado crudo

4. **El mismo problema existe en `UserDetail.tsx`** — no renderiza bloodType directamente pero podría si se agrega.

---

## Riesgo

| Tipo | Riesgo | Impacto |
|------|--------|---------|
| **Privacidad** | Bajo — el valor cifrado no es legible | Pero es un dato médico (tipo de sangre) que viaja cifrado por HTTP |
| **UX** | **ALTO** — el admin ve basura técnica | `34d6dc0ca07b5ecff5c7f9b9b0806213:cd2e9a20720fd4a68cc08d4d145ee948` no tiene sentido |
| **Seguridad** | Medio — dato cifrado viaja al frontend | Un atacante con la ENCRYPTION_KEY podría descifrarlo |

---

## Debe ocultarse o no

**El badge rojo debe eliminarse de la tabla** a menos que se descifre correctamente.

Opciones:

| Opción | Riesgo | Esfuerzo |
|--------|--------|----------|
| **A. Quitar bloodType del select** (como se hizo con nationalId) | Bajo | 1 línea |
| **B. Descifrar bloodType en el backend** | Bajo | Agregar decrypt() en user.repository.ts |
| **C. Mantener badge mostrando texto descifrado** | Bajo | Opción B + UI |
| **D. Mostrar badge solo si el valor es un bloodType válido (A+, O-, etc)** | Bajo | Validación en UI |

**Recomendación:** Opción B + C. El tipo de sangre es información útil para el admin (identificación rápida). Descifrarlo en el backend y mostrarlo como badge legible.

---

## Propuesta de reemplazo

**Actual:**
```
Badge rojo → 34d6dc0ca07b5ecff5c7f9b9b0806213:cd2e9a20720fd4a68cc08d4d145ee948
```

**Propuesto:**
```
Badge rojo → A+  (descifrado)
```

Para datos médicos se puede usar el mismo estilo visual actual (bg-red-50, text-red-600).

---

## Rediseño recomendado de columnas

### Columnas actuales (5)

| Columna | Contenido actual | Problema |
|---------|------------------|----------|
| **Usuario** | Avatar + email + fecha unión | ✅ Bien |
| **Perfil Médico** | Nombre + teléfono (mascarado) + bloodType (cifrado 🔴) | 🔴 bloodType cifrado |
| **Activaciones** | Número de chips | ✅ Bien |
| **Estado** | `user.status` (active/blocked/pending) | ✅ Bien (recién arreglado) |
| **Acciones** | Ver + Eliminar | ✅ Bien (siempre visible) |

### Columnas propuestas (6)

| Columna | Contenido propuesto | Notas |
|---------|---------------------|-------|
| **Usuario** | Avatar + email + fecha unión | Sin cambios |
| **Perfil Médico** | Nombre + bloodType (descifrado, badge rojo) | Teléfono eliminado de la tabla (sensible), bloodType descifrado |
| **Cuenta** | Paquete + tipo de cuenta | Nueva columna, útil para admin |
| **Hardware** | Chips vinculados (conteo + badge) | Renombrado de "Activaciones" |
| **Estado** | active / blocked / pending | Sin cambios |
| **Acciones** | Ver + Eliminar | Sin cambios |

### Ancho actual

La tabla tiene `min-w-[900px]` pero se ve comprimida porque:

1. **`overflow-hidden` fue quitado** del contenedor padre ✅
2. **El padding sigue siendo `px-6`** que es bastante (12px por lado = 24px + contenido)
3. **La columna "Perfil Médico"** tiene 3 líneas de contenido que se aprietan
4. **La columna "Usuario"** tiene avatar + email + fecha que necesita espacio
5. **El badge de bloodType** (cuando se descifre) será corto (ej: "A+") y ocupará menos espacio

**Solución:** `min-w-[900px]` es adecuado. El problema real es que el badge cifrado ocupa ~80 caracteres de ancho. Al descifrarlo (ej: "A+"), la tabla se verá más despejada.

---

## Cambios exactos recomendados

### 1. Descifrar `bloodType` en `user.repository.ts`

```typescript
import { decrypt } from "@/lib/encryption";

// Después del findMany:
users.forEach(u => {
  if (u.profile?.bloodType) {
    u.profile.bloodType = decrypt(u.profile.bloodType);
  }
});
```

### 2. Eliminar teléfono de la tabla (ya está mascarado, pero mejor quitarlo)

```tsx
// En UsersSection.tsx, línea 136:
// <span className="text-[10px] font-bold text-slate-400">{maskPhone(u.phone)}</span>
// → Eliminar esta línea. El teléfono queda visible solo en el detalle.
```

### 3. Agregar columna "Cuenta" (opcional)

```tsx
// Nueva columna entre "Perfil Médico" y "Hardware"
<th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Cuenta</th>
// Celda:
<td className="px-6 py-5">
  <div className="flex flex-col gap-1">
    <span className="text-[10px] font-black text-slate-700">
      {u.account?.package?.name || "—"}
    </span>
    <span className="text-[9px] font-bold text-slate-400 uppercase">
      {u.account?.accountType || "individual"}
    </span>
  </div>
</td>
```

### 4. Renombrar columna "Activaciones" → "Hardware"

Solo cambio de texto en el `<th>`.

---

## Resumen ejecutivo

El badge rojo con el valor `34d6dc0ca07b5ecff5c7f9b9b0806213:cd2e9a20720fd4a68cc08d4d145ee948` es el **`Profile.bloodType` cifrado**. El mismo problema que `nationalId`: se guarda cifrado en DB y se envía sin descifrar al admin.

**Diferencia:** A diferencia de `nationalId`, el tipo de sangre es información útil para el admin. **En lugar de ocultarlo, conviene descifrarlo.**

**Solución:** Agregar `decrypt()` en `user.repository.ts` para `bloodType` (3 líneas de código). Luego el badge rojo mostrará "A+", "O-", etc.

---
*Originalmente en: docs/audit/*