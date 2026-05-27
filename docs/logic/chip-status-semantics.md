# Chip Status Semantics

Este documento define de forma explícita la diferencia entre `chip.status` y `chip.serviceStatus`.

## 1) `chip.status`

Estados válidos:

- `inventory`
- `sold`
- `activated`
- `suspended`
- `damaged`
- `lost`

Significado:

- **inventory**: chip físico disponible en inventario, sin activar.
- **sold**: chip vendido/asignado comercialmente, pero aún no activado por el usuario final.
- **activated**: chip activado y vinculado a usuario/perfil.
- **suspended**: chip suspendido operativamente.
- **damaged / lost**: estados administrativos por daño o pérdida.

---

## 2) `chip.serviceStatus`

Estados válidos:

- `active`
- `inactive`
- `expired`
- `suspended`

Significado:

- **active**: servicio vigente.
- **expired**: servicio vencido.
- **suspended**: servicio pausado/suspendido.
- **inactive**: servicio no activo.

---

## 3) Regla importante

Nunca usar `"active"` como `chip.status`.

Para un chip operativo estándar:

- `chip.status = "activated"`
- `chip.serviceStatus = "active"`

---

## 4) Endpoints/servicios que dependen de esta semántica

- `app/api/chips/activate/route.ts`
- `app/api/chips/dashboard/route.ts`
- `app/api/public/[shortCode]/route.ts`
- `app/api/public/[shortCode]/scan/route.ts`
- `domains/accounts/services/account-state.service.ts` (`AccountStateService`)
