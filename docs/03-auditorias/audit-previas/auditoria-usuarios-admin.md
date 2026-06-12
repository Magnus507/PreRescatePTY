# Auditoría Usuarios Admin

**Fecha:** 2026-06-09  
**Alcance:** Sección "Usuarios & Perfiles" del Panel Admin  
**No se modificó código. No se hizo commit.**

---

## 1. Archivos revisados

| Archivo | Líneas | Función |
|---------|--------|---------|
| `app/(admin)/admin/_components/sections/UsersSection.tsx` | 181 | Tabla de usuarios con filtros y búsqueda |
| `app/(admin)/admin/_components/details/UserDetail.tsx` | 264 | Detalle de usuario con acciones |
| `app/(admin)/admin/_hooks/useAdminUsers.ts` | 191 | Hook de estado y acciones de usuarios |
| `app/(admin)/admin/_services/domains/users.service.ts` | 48 | Servicio HTTP para endpoints de usuarios |
| `app/api/admin/users/route.ts` | 67 | API GET (listar) y PATCH (status) |
| `app/api/admin/users/[id]/profiles/route.ts` | — | API de perfiles por usuario |
| `app/api/admin/users/[id]/actions/route.ts` | — | API de acciones (reset, delete, convert) |
| `app/(admin)/admin/_types/admin.ts` | 204 | Tipos TypeScript (UserAdmin, Profile, etc) |
| `prisma/schema.prisma` | — | Modelos User, Profile, Chip |
| `domains/users/repositories/user.repository.ts` | 107 | Repository con query Prisma |
| `lib/encryption.ts` | — | AES-256-CBC encrypt/decrypt |
| `domains/profiles/repositories/profile.repository.ts` | — | Donde se cifra/descifra nationalId |

---

## 2. Datos que muestra la tabla actual

### Columnas visibles (5)

| # | Columna | Contenido | Fuente |
|---|---------|-----------|--------|
| 1 | **Usuario** | Avatar (primera letra), email, fecha de unión | `u.email`, `u.createdAt` |
| 2 | **Perfil Médico** | Nombre completo (firstName + lastName), teléfono, tipo de sangre | `u.profile?.firstName`, `u.profile?.lastName`, `u.phone`, `u.profile?.bloodType` |
| 3 | **Activaciones** | Número de chips vinculados | `u._count.chips` |
| 4 | **Estado** | "Activa" o "Inactiva" (basado en chips > 0) | `u._count.chips > 0` |
| 5 | **Acciones** | Ver detalle (Search icon), Eliminar (Trash icon) — solo visibles al hover | `setSelectedUser(u)`, `handleDeleteUser(u.id, u.email)` |

### Filtros

| Filtro | Tipo | Valores |
|--------|------|---------|
| **Tabs** | Botones toggle | "Todos", "Activos" (chips > 0), "Sin Chip" (chips === 0) |
| **Búsqueda** | Input text | Busca por email, nombre o teléfono (Enter para buscar) |
| **Contador** | Badge | "Total: X usuarios" |

### Datos que NO se muestran en la tabla

- `nationalId` (cifrado) — **NO se muestra en la tabla** (solo se muestra en el detalle)
- `phone` del User — **SÍ se muestra** en la columna "Perfil Médico" como `u.phone`
- `bloodType` — Sí se muestra como badge
- `accountType` — No se muestra
- `lastLoginAt` — No se muestra
- `role` — No se muestra
- `chips` (lista) — No se muestra, solo el conteo

---

## 3. Datos que recibe del backend

### Endpoint: `GET /api/admin/users`

**Query params:** `page`, `limit`, `search`

**Select del UserRepository (líneas 48-89):**

```typescript
select: {
  id: true,
  email: true,
  phone: true,          // ← User.phone (texto plano)
  role: true,
  status: true,
  createdAt: true,
  lastLoginAt: true,
  accountId: true,
  account: {
    select: {
      id: true,
      packageId: true,
      maxChipsAllocated: true,
      accountType: true,
      package: { select: { name: true } },
    }
  },
  _count: { select: { chips: true } },
  chips: {
    take: 5,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      shortCode: true,
      status: true,
      activatedAt: true,
    }
  },
  profile: {
    select: {
      firstName: true,
      lastName: true,
      bloodType: true,
      nationalId: true,   // ← Profile.nationalId (CIFRADO en DB)
    }
  },
  consent: {
    select: { revokedAt: true }
  }
}
```

**Filtros del repository:**
- Excluye admins (`isAdmin: false`)
- Excluye cuentas de tipo company/organization/school
- Excluye usuarios con organizaciones
- Búsqueda por email (insensitive) o phone

---

## 4. Qué es el valor largo cifrado

### El valor observado
```
39ac67b4b8d10a991463e8cdc8e2f20b:27e805fef14551af204248beac453055
```

### Identificación

| Propiedad | Valor |
|-----------|-------|
| **Campo** | `Profile.nationalId` |
| **Formato** | `iv:ciphertext` (32 hex chars : 32 hex chars) |
| **Algoritmo** | AES-256-CBC |
| **IV length** | 16 bytes = 32 hex chars |
| **Ciphertext** | 32 hex chars (16 bytes) |
| **¿Es cifrado?** | **SÍ** — cifrado en `domains/profiles/repositories/profile.repository.ts` |
| **¿Dónde se descifra?** | En `profile.repository.ts` línea 18: `decrypt(profile.nationalId)` |
| **¿Se descifra en el admin?** | **NO** — el admin endpoint no descifra este campo |

### Cadena de datos

1. **Usuario guarda** → `profile.repository.ts` → `encrypt(data.nationalId)` → se guarda cifrado en DB
2. **Admin consulta** → `user.repository.ts` → `select: { nationalId: true }` → **devuelve cifrado**
3. **Tabla admin** → `u.profile?.nationalId` → **muestra el valor cifrado crudo**

### ¿Debería mostrarse al admin?

**NO.** El valor cifrado no tiene sentido para el admin. Debería:
- Descifrarse antes de mostrar (si el admin tiene permiso)
- O no enviarse desde el backend (ocultar en el select)
- O truncarse/mostrarse como "••••••••" (dato sensible)

### ¿Qué es el dato real?

Es la **cédula / ID / DNI** del usuario (número de identificación personal). Es un dato sensible bajo la Ley 81 de Protección de Datos Personales de Panamá.

---

## 5. Acciones disponibles

### En la tabla (UsersSection)

| Acción | Icono | Comportamiento |
|--------|-------|----------------|
| Ver detalle | Search | Abre `UserDetail` con `setSelectedUser(u)` |
| Eliminar | Trash2 | Llama `handleDeleteUser(u.id, u.email)` — confirmación |

### En el detalle (UserDetail)

| Acción | Botón | Endpoint | Descripción |
|--------|-------|----------|-------------|
| Resetear Password | RotateCcw | `POST /api/admin/users/[id]/actions` | `action: "reset-password"` |
| Convertir a Empresa | Building2 | `POST /api/admin/users/[id]/actions` | `action: "convert-to-org"` (solo si no es company) |
| Ajuste de Cuenta (Fix) | RotateCcw | `POST /api/admin/users/[id]/actions` | `action: "emergency-reset"` — resetea chips a inventario |
| Borrar Cuenta | ShieldOff | `POST /api/admin/users/[id]/actions` | `action: "delete-user"` — eliminación permanente |
| Sincronizar Datos | RefreshCw | — | Recarga datos del usuario |
| Ver Inventario | — | — | Navega a inventario del usuario |
| Añadir Combos/Chips | ChevronRight | — | Abre selector de combos |

### Datos del detalle

| Sección | Campos |
|---------|--------|
| **Datos personales** | Nombre completo, email, teléfono, cédula/ID/DNI, fecha de unión, tipo de cuenta |
| **Capacidad de cuenta** | Estado (Activa/Inactiva), capacidad total (maxChips), chips vinculados, chips libres |
| **Uso de hardware** | Chips vinculados, chips libres, botón "Ver Inventario" |
| **Governance Console** | Reset password, convertir a empresa, ajuste de cuenta, borrar cuenta |
| **Estado de autenticación** | Status (active/blocked) |
| **Consentimiento legal** | Alerta si consentimiento revocado (Ley 81/ANTAI) |

---

## 6. Problemas encontrados

### P0 — Crítico

| # | Problema | Impacto |
|---|----------|---------|
| 1 | **`nationalId` cifrado se muestra crudo en el detalle** | El admin ve `39ac67b4b8d10a991463e8cdc8e2f20b:27e805fef14551af204248beac453055` en lugar de la cédula real. No es útil. |
| 2 | **`nationalId` se envía cifrado desde el backend** | El `user.repository.ts` hace `select: { nationalId: true }` sin descifrar. El admin recibe el payload cifrado. |

### P1 — UX

| # | Problema | Impacto |
|---|----------|---------|
| 3 | **Tabla estrecha** | El contenedor tiene `overflow-x-auto` pero el padre tiene `overflow-hidden`. Las columnas usan `px-8` (padding excesivo). |
| 4 | **Columna "Perfil Médico" sobrecargada** | Muestra nombre + teléfono + blood type en una celda. Puede verse truncado. |
| 5 | **`u.phone` se muestra en la tabla** | El teléfono del User se muestra sin descifrar (aunque no está cifrado en el modelo User). |
| 6 | **Estado basado solo en chips** | "Activa" = tiene chips, "Inactiva" = no tiene chips. No refleja el status real del usuario (active/blocked). |
| 7 | **Acciones solo visibles al hover** | Los botones de acción aparecen con `opacity-0 group-hover:opacity-100`. En móvil no hay hover. |
| 8 | **No hay paginación visible** | El backend soporta paginación pero la UI no muestra controles de página. |
| 9 | **No hay estado vacío para "Sin resultados"** | Solo muestra "No se encontraron usuarios" cuando `users.length === 0`, no cuando la búsqueda no tiene resultados. |

### P2 — Seguridad

| # | Problema | Impacto |
|---|----------|---------|
| 10 | **`nationalId` se envía al frontend** | Aunque cifrado, el payload viaja por HTTP. Un atacante podría intentar descifrarlo. |
| 11 | **`phone` del User se muestra sin mascarar** | El teléfono es dato personal. Debería mostrarse parcialmente (ej: `6***-1234`). |

---

## 7. Propuesta de mejora UI

### 7.1 Ampliar contenedor

```tsx
// Actual: overflow-hidden en el padre
<div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-border overflow-hidden shadow-xl">

// Propuesta: quitar overflow-hidden, usar overflow-x-auto solo en la tabla
<div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-border shadow-xl">
  <div className="overflow-x-auto">
    <table className="w-full text-sm min-w-[800px]">
```

### 7.2 Ocultar dato cifrado

**Opción A (recomendada):** No enviar `nationalId` desde el backend

```typescript
// user.repository.ts — quitar nationalId del select
profile: {
  select: {
    firstName: true,
    lastName: true,
    bloodType: true,
    // nationalId: true,  ← ELIMINAR
  }
}
```

**Opción B:** Descifrar en el backend antes de enviar

```typescript
// user.repository.ts — descifrar nationalId
profile: {
  select: {
    firstName: true,
    lastName: true,
    bloodType: true,
    nationalId: true,
  }
}
// Después del query, descifrar:
users.forEach(u => {
  if (u.profile?.nationalId) {
    u.profile.nationalId = decrypt(u.profile.nationalId);
  }
});
```

**Opción C:** Mostrar solo en el detalle, no en la tabla

### 7.3 Mostrar alias/nombre legible

En la tabla, mostrar:
- **Nombre:** `firstName + lastName` (ya se hace)
- **Email:** `u.email` (ya se hace)
- **Teléfono:** `u.phone` (ya se hace, pero debería mascarar)
- **Blood type:** badge (ya se hace)

### 7.4 Mover datos sensibles al detalle

- `nationalId` → solo en el detalle, descifrado
- `phone` → mascarar en la tabla, completo en el detalle
- `accountType` → mostrar en el detalle

### 7.5 Mejorar columnas visibles

| Columna actual | Propuesta |
|----------------|-----------|
| Usuario (email + fecha) | Usuario (email + fecha + status badge) |
| Perfil Médico (nombre + teléfono + blood) | Nombre + Blood type (teléfono oculto) |
| Activaciones (conteo) | Chips (conteo + status) |
| Estado (Activa/Inactiva) | Estado (active/blocked/suspended) |
| Acciones (hover) | Acciones (siempre visibles, compactas) |

### 7.6 Mejorar botones

- Hacer acciones siempre visibles (no solo al hover)
- Agregar botón "Ver detalle" explícito
- Agregar botón "Bloquear/Activar" (toggle status)

### 7.7 Estado vacío

- Mostrar "No se encontraron usuarios" cuando la búsqueda no tiene resultados
- Mostrar "No hay usuarios registrados" cuando la lista está vacía

---

## 8. Cambios mínimos recomendados

| Prioridad | Cambio | Archivo | Riesgo |
|-----------|--------|---------|--------|
| **P0** | No enviar `nationalId` desde el backend | `user.repository.ts` | Bajo — solo quitar un campo del select |
| **P0** | Descifrar `nationalId` en el backend si se necesita | `user.repository.ts` | Bajo — agregar decrypt() |
| **P1** | Quitar `overflow-hidden` del contenedor de la tabla | `UsersSection.tsx` | Bajo — solo CSS |
| **P1** | Agregar `min-w-[800px]` a la tabla | `UsersSection.tsx` | Bajo — solo CSS |
| **P1** | Mascarar teléfono en la tabla | `UsersSection.tsx` | Bajo — solo UI |
| **P1** | Mostrar status real (active/blocked) en la tabla | `UsersSection.tsx` | Bajo — solo UI |
| **P1** | Hacer acciones siempre visibles | `UsersSection.tsx` | Bajo — solo CSS |
| **P2** | Agregar paginación visible | `UsersSection.tsx` | Medio — requiere lógica |
| **P2** | Agregar estado vacío para búsqueda | `UsersSection.tsx` | Bajo — solo UI |

---

## 9. Riesgo de cada cambio

| Cambio | Riesgo | Mitigación |
|--------|--------|------------|
| Quitar `nationalId` del select | **Bajo** — El admin no necesita ver la cédula en la tabla | Verificar que el detalle no dependa de este campo |
| Descifrar `nationalId` | **Bajo** — Solo se descifra en el backend | No enviar el valor cifrado al frontend |
| Quitar `overflow-hidden` | **Bajo** — Solo afecta el contenedor de la tabla | Verificar que no rompa el layout |
| Mascarar teléfono | **Bajo** — Solo UI | Verificar que el detalle muestre el teléfono completo |
| Mostrar status real | **Bajo** — Solo UI | Verificar que el status se mapea correctamente |
| Hacer acciones visibles | **Bajo** — Solo CSS | Verificar que no rompa el layout en móvil |
| Agregar paginación | **Medio** — Requiere lógica de estado | Implementar con los mismos parámetros del backend |
| Agregar estado vacío | **Bajo** — Solo UI | Verificar que se muestra correctamente |

---

## Resumen ejecutivo

El problema principal es que **`nationalId` se envía cifrado desde el backend y se muestra crudo en el detalle del usuario**. El valor `39ac67b4b8d10a991463e8cdc8e2f20b:27e805fef14551af204248beac453055` es la cédula del usuario cifrada con AES-256-CBC. El admin no puede leerla.

**Solución mínima:** Quitar `nationalId` del select en `user.repository.ts` (1 línea). Si el admin necesita ver la cédula, descifrarla en el backend antes de enviarla.

**Problema de UX:** La tabla es estrecha, las acciones solo se ven al hover, y el estado no refleja el status real del usuario. Estos son problemas de CSS y lógica de UI que se pueden resolver con cambios mínimos.

---
*Originalmente en: docs/audit/*