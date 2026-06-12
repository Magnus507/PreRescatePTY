# 🛡️ PreRescatePTY: Admin Governance & System Cleanup Log

Este archivo registra las funcionalidades administrativas críticas y las limpiezas de UI realizadas para evitar regresiones de código.

## ✅ Funcionalidades Implementadas (Estado Actual)

### 1. Super Admin: Emergency Reset (Arreglo)
- **Backend**: Implementado en `/api/admin/users/[id]/actions/route.ts` (Caso `emergency-reset`).
  - Desvincula todos los chips (pasan a `inventory`).
  - Borra perfiles secundarios.
  - Limpia el perfil principal y contactos de emergencia.
  - Resetea capacidad a un número definido por el Admin.
  - **Invalidación de Cache**: Llama a `AccountStateService.invalidateCache(userId)` para actualización inmediata.
- **Frontend**: Botón Ámbar en `UserDetail.tsx` -> "Super Reset (Arreglo)".

### 2. Privacidad & Limpieza de Interfaz
- **Eliminación de Expediente Médico**: Se ha eliminado la sección "Expediente Médico Detallado" de la vista de administrador en `UserDetail.tsx`. Los administradores ya no ven alergias, sangre ni notas privadas.
- **Lógica de Inactividad**: Corregida en `AccountStateService.ts`. Una cuenta ya NO es "Inactiva" solo por tener 0 chips. Solo es inactiva si tiene **Capacidad Cero**. Esto evita el mensaje "Esperando Combo" después de un reset.

### 3. Sincronización de Datos
- **Cache Redis**: Todas las acciones administrativas (Plan, Reset, Chips) ahora disparan un `invalidateCache` para que el usuario vea los cambios sin refrescar manualmente.

- **Sincronización Multi-Pestaña**: Implementado listener de visisbilidad y enfoque (`visibilitychange`, `focus`) en `DashboardLayout` y `DashboardPage`. Los datos se re-sincronizan automáticamente al cambiar entre pestañas o volver a la aplicación, evitando conflictos de estado viejo.

## 🔍 Investigaciones en Curso
- Ninguna. Todos los puntos críticos de sincronización han sido atendidos.

---

## 🛑 Cambios Eliminados (NO REVERTIR)
- **NO** volver a poner el Expediente Médico en el Panel de Admin.
- **NO** basar la inactividad de la cuenta únicamente en el conteo de chips (usar capacidad).

---

## 🛠️ Archivos Protegidos (Core Admin)
- `src/app/(admin)/admin/_components/details/UserDetail.tsx` (UI Admin)
- `src/app/api/admin/users/[id]/actions/route.ts` (Acciones Admin)
- `src/domains/accounts/services/account-state.service.ts` (Lógica de Estado)
