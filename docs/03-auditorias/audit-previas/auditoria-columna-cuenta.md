# Auditoría Columna "Cuenta" de UsersSection

**Fecha:** 2026-06-09  
**Objetivo:** Identificar el origen exacto del valor "Combo Dúo" en la columna Cuenta.  
**No se modificó código. No se hizo commit.**

---

## 1. Cadena completa de relaciones Prisma

```
User.accountId ──┐
                 ▼
          Account (model)
          ├── id: String
          ├── packageId: String?       ← FK a Package
          ├── accountType: String      ← "personal" | "company"
          ├── maxChipsAllocated: Int   ← default 1
          └── maxProfilesAllocated: Int ← default 1
                 │
                 ▼
          Package (model)
          ├── id: String
          ├── name: String             ← "Combo Dúo", "Combo Estándar", etc.
          ├── slug: String?
          ├── maxChips: Int
          ├── maxProfiles: Int
          ├── price: Float
          └── serviceDurationMonths: Int
```

### Relaciones en Prisma

```prisma
// Account → Package
model Account {
  packageId  String?
  package    Package?  @relation(fields: [packageId], references: [id])
}

// User → Account
model User {
  accountId String?
  account   Account?  @relation(fields: [accountId], references: [id])
}
```

---

## 2. Consulta exacta usada por UsersSection

En `domains/users/repositories/user.repository.ts` (líneas 57-64):

```typescript
account: {
  select: {
    id: true,
    packageId: true,
    maxChipsAllocated: true,
    accountType: true,
    package: { select: { name: true } },   // ← Aquí se obtiene "Combo Dúo"
  }
}
```

### Relación directa

| Query | Resultado |
|-------|-----------|
| `User.accountId` | `clx...abc` (cuid) |
| `Account.packageId` | `clx...xyz` (cuid) |
| `Package.name` | **"Combo Dúo"** |

No hay mappers, helpers ni transforms entre Prisma y el render. Es una relación directa: `User → Account → Package.name`.

---

## 3. Render exacto en UsersSection.tsx

En `app/(admin)/admin/_components/sections/UsersSection.tsx` (líneas 166-172):

```tsx
<td className="px-6 py-5">
  <div className="flex flex-col gap-0.5">
    <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">
      {u.account?.package?.name || "Sin paquete"}   {/* ← "Combo Dúo" */}
    </span>
    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
      {u.account?.accountType || "individual"}        {/* ← "personal" */}
    </span>
  </div>
</td>
```

### Lo que ve el admin

```
Combo Dúo        ← Package.name
personal         ← Account.accountType
```

---

## 4. Por qué aparece "Combo Dúo"

El usuario **geanky00@hotmail.com** tiene una cuenta con:

| Campo | Valor |
|-------|-------|
| `Account.packageId` | apunta al registro de Package con slug `combo-duo` |
| `Package.name` | **"Combo Dúo"** |
| `Package.maxChips` | 2 |
| `Package.price` | $45.00 |
| `Account.maxChipsAllocated` | depende del seed/orden — si no se asignó explícitamente, es **2** (default del Package) |
| `Account.accountType` | `"personal"` |

**"Combo Dúo"** es un **plan pago** (`price: 45.00`) que incluye **2 chips NFC + 2 perfiles médicos** por 24 meses.

---

## 5. Propuesta UX para mejor comprensión

### Problema actual

El admin ve:
```
Combo Dúo
personal
```

Esto no le dice cuántos chips tiene realmente el usuario ni cuál es su capacidad.

### Propuesta

Mostrar información más útil para un administrador:

```tsx
<td className="px-6 py-5">
  <div className="flex flex-col gap-0.5">
    <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">
      {u.account?.package?.name || "Sin paquete"}
      <span className="text-slate-400 font-medium ml-1">
        ({u.account?.maxChipsAllocated ?? "?"} chips)
      </span>
    </span>
    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
      {tipoCuenta(u.account?.accountType || "personal")}
    </span>
  </div>
</td>
```

Donde `tipoCuenta` muestra:

| accountType | Label |
|-------------|-------|
| `"personal"` | Personal |
| `"company"` | Empresarial |
| `"organization"` | Organización |
| `"school"` | Escolar |

### Resultado visual propuesto

```
Combo Dúo (2 chips)
Personal
```

Esto le dice al admin de un vistazo:
1. **Qué plan tiene** ("Combo Dúo")
2. **Cuántos chips incluye** ("2 chips")
3. **Tipo de cuenta** ("Personal")

### Datos necesarios

Ya están disponibles en `u.account`:
- `u.account.maxChipsAllocated` → viene en el select (línea 61 del repository)
- `u.account.package?.name` → ya se usa
- `u.account.accountType` → ya se usa

**No requiere cambios en backend ni en types. Solo UI.**

---

## 6. Resumen ejecutivo

| Concepto | Valor |
|----------|-------|
| **Valor mostrado** | "Combo Dúo" |
| **Campo Prisma** | `Package.name` |
| **Relación** | `User → Account.packageId → Package.id` |
| **Tipo de dato** | Nombre del plan/paquete comprado |
| **¿Útil para admin?** | Sí, pero sería mejor con capacidad de chips |
| **Datos adicionales disponibles** | `maxChipsAllocated` (2), `accountType` (personal) |
| **Cambio recomendado** | Agregar "(2 chips)" al lado del nombre y "Personal" como tipo de cuenta |
| **Riesgo** | Mínimo — solo UI, datos ya existen en la query |

---
*Originalmente en: docs/audit/*