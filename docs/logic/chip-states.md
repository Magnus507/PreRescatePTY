# Lógica Central de Estados de Chips

Este documento define la "Verdad Única" para el manejo de estados de chips NFC/QR en PreRescatePTY. Cualquier cambio en la lógica de negocio debe basarse en estas definiciones.

## 1. Definición de Estados (`ChipStatus`)

| Estado | Significado | Considerado "Activo" |
| :--- | :--- | :--- |
| `inventory` | Chip en stock, sin dueño asignado. | No |
| `sold` | Chip vendido pero no activado por el usuario. | Sí (Ocupa espacio en cuenta) |
| `activated` | Chip activo y vinculado a un perfil médico. | Sí |
| `suspended` | Chip pausado por el usuario o administrador. | Sí (Ocupa espacio en cuenta) |
| `retired` | Chip devuelto o dado de baja permanentemente. | No |

## 2. Reglas de Cálculo

### A. Conteo de Capacidad (`activeChipsCount`)
Un chip consume un "slot" de la capacidad de la cuenta (`maxChipsAllocated`) si su estado es:
- `activated`
- `suspended`
- `sold`

**Razón:** Evitar que un usuario compre 10 chips (`sold`) pero solo pague un plan de 1 (`maxChips`).

### B. Fecha de Expiración del Servicio (`serviceEndDate`)
Para determinar cuándo vence el servicio de la cuenta, se busca el chip más reciente que esté:
- `activated`
- `suspended`

**Razón:** Un chip `sold` aún no ha empezado su periodo de vigencia (el reloj empieza al activar).

### C. Estado del Servicio (`serviceStatus`)
- **`active`**: Existe al menos un chip `activated` y la fecha de expiración es futura.
- **`expired`**: La fecha de expiración del chip más reciente ha pasado.
- **`inactive`**: No hay ningún chip vinculado en estado operativo (`activated`/`suspended`).

## 3. Implementación Centralizada

La implementación de estas reglas vive en:
1. `src/domains/accounts/services/account-state.service.ts` (Mediante la constante `CHIP_ACTIVE_STATUSES`).
2. `src/domains/chips/repositories/chip.repository.ts` (Filtrado de base de datos).

---
*Última actualización: 12 Abril, 2026*
