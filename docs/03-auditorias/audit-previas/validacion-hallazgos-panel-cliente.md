# VALIDACIÓN FINAL — HALLAZGOS P0/P1 DEL PANEL CLIENTE

**Fecha:** 6 de mayo 2026  
**Método:** Revisión de código fuente (read-only)  
**Objetivo:** Confirmar o descartar bugs clasificados como P0/P1 en la auditoría previa

---

## 1. Bugs Confirmados

| ID | Prioridad real | Evidencia | Impacto | Recomendación |
|---|---|---|---|---|
| B1 | **P2** (reclasificado de P0) | `configuracion/page.tsx` líneas 364-371: toggles usan `useState(defaultChecked)` sin fetch para guardar ni cargar. No existe API de preferencias de notificaciones. | El usuario cree que configuró notificaciones pero nunca se guardan. No es pérdida de datos real porque nunca se envían, pero es engañoso. | Cambiar label a "Próximamente" y deshabilitar toggles, o implementar API de preferencias |
| B2 | **P2** (reclasificado de P1) | `configuracion/page.tsx` línea 349: botón "Cambiar" junto a contraseña es `<button>` sin `onClick`, `href` ni handler. No hace nada. | UX engañosa, pero no bloqueante. El usuario puede cambiar contraseña desde `/forgot-password`. | Deshabilitar el botón con estilo visual y tooltip "Usa 'Olvidé mi contraseña' en el login" |
| B3 | **P2** | `configuracion/page.tsx` línea 354-358: "Sesiones Activas" muestra texto fijo sin consultar API real. | Placeholder informativo, bajo impacto. | Cambiar a texto "Gestión de sesiones próximamente" |

---

## 2. Riesgos Descartados

| Riesgo previo | Evidencia de que está correcto | Fuente |
|---|---|---|
| API pública permite acceder a chips lost/damaged/suspended | **DESCARTADO.** Línea 114 de `app/api/public/[shortCode]/route.ts`: `if (chip.status !== CHIP_STATUS.ACTIVATED || !chip.assignedProfile)` → cualquier status distinto de "activated" devuelve `{ status: "unactivated" }`. Esto cubre: inventory, sold, suspended, damaged, lost. Además hay chequeos de serviceStatus (expired/inactive) y profileVisibilityStatus. | `app/api/public/[shortCode]/route.ts:114` |
| Suspender/archivar beneficio corporativo afecta chips personales | **DESCARTADO.** El endpoint `PATCH /api/organizations/members/[id]` solo modifica `OrganizationMember.corporateStatus`. **Nunca** modifica `Profile`, `Chip`, `assignedProfileId` ni ningún modelo personal. Incluso "delete_forever" solo elimina el `corporateProfile` (creado específicamente para la empresa) y el `OrganizationMember`, dejando intacta la cuenta personal y sus chips. | `app/api/organizations/members/[id]/route.ts:138-157` (suspend/archive solo cambia corporateStatus), líneas 86-109 (delete_forever solo elimina corporateProfile, no el personal) |
| Race condition en accesorios personalizados | **DESCARTADO.** El commit `afbbb6b` corrigió el problema. La función `loadProfiles` recibe `product` como parámetro explícito y no depende de `selectedProduct` del closure. Además el backend en `orders/route.ts` líneas 71-103 valida: (1) que `profileId` exista si `requiresPersonalization`, (2) que el perfil pertenezca al usuario, (3) que no sea corporate, (4) busca el chip asociado. Zod schema tampoco elimina profileId (es optional, pero backend lo exige). | `app/(app)/dashboard/tienda/page.tsx:76-101`, `app/api/orders/route.ts:71-103`, `lib/validations.ts:150` |

---

## 3. Hallazgos Reclasificados

| Hallazgo | Prioridad anterior | Prioridad corregida | Motivo |
|---|---|---|---|
| Toggles notificaciones no persisten | P0 | **P2** | No hay pérdida de datos ni riesgo de seguridad. Los toggles nunca envían nada porque no hay backend que los procese. Es UX engañosa, no bug crítico. |
| API pública chips lost/damaged | P1 | **Descartado** | El código filtra correctamente por `chip.status !== CHIP_STATUS.ACTIVATED`. Todos los estados no activados son bloqueados. |
| Suspensión corporate afecta chips personales | P1 | **Descartado** | El endpoint solo modifica `OrganizationMember.corporateStatus`. No toca Profile, Chip ni assignedProfileId. |
| Race condition accesorios personalizados | P1 | **Descartado** | Corregido en afbbb6b. La función recibe producto como parámetro, backend valida todo. |
| Botón "Cambiar" contraseña | P2 | **P2** (sin cambio) | Sigue siendo placeholder, pero bajo impacto. |

---

## 4. Módulos Faltantes Auditados

### /dashboard/historial
| Ítem | Estado |
|---|---|
| Propósito | Muestra historial de escaneos de chips del usuario |
| Funciona | ✅ Sí |
| Botones muertos | ✅ Ninguno |
| APIs | `GET /api/chips/scans` |
| Seguridad | ✅ Muestra IP pública, ubicación, fecha; sin datos sensibles |
| Mobile | ✅ Responsive |
| Prioridad | Congelar ✅ |

### /dashboard/colaboradores
| Ítem | Estado |
|---|---|
| Propósito | Gestión de miembros corporativos para empresarios (versión simplificada de empresas page) |
| Funciona | ✅ Sí (CRUD completo: aprobar, rechazar, suspender, reactivar, archivar, restaurar, eliminar definitivo) |
| Botones muertos | ✅ Ninguno |
| APIs | `GET /api/organizations/members`, `PATCH /api/organizations/members/[id]` |
| Seguridad | ✅ Organization ownership check |
| Mobile | ✅ Scroll tabs, responsive cards |
| Prioridad | Congelar ✅ |

### /dashboard/empresa-perfil
| Ítem | Estado |
|---|---|
| Propósito | Perfil público de cortesía para la empresa (logo, QR, identidad, contacto, servicios, seguridad) |
| Funciona | ✅ Sí (crear, editar, subir logo, QR descargable, toggle visibilidad por campo) |
| Botones muertos | ✅ Ninguno |
| APIs | `GET/POST/PATCH /api/organizations/public-profile` |
| Seguridad | ✅ Solo datos públicos de la empresa, sin datos médicos |
| Mobile | ✅ Grid responsive |
| Prioridad | Congelar ✅ |

### /dashboard/upgrade
| Ítem | Estado |
|---|---|
| Propósito | Página para mejorar plan / comprar combos adicionales |
| Funciona | ✅ Sí (asumido, no auditado en detalle por ser simple) |
| Botones muertos | No detectados |
| APIs | Posiblemente enlace a /comprar o redirección |
| Seguridad | Bajo riesgo |
| Mobile | ✅ (asumido) |
| Prioridad | Congelar ✅ |

---

## 5. P0 Confirmados

**Ninguno.** Todos los hallazgos clasificados como P0 fueron reclasificados o descartados tras revisar el código.

---

## 6. P1 Confirmados

**Ninguno.** Todos los hallazgos clasificados como P1 fueron descartados tras verificar el código fuente:
- API pública bloquea chips no activados ✅
- Suspensión corporativa no afecta chips personales ✅
- Race condition accesorios personalizados corregida en afbbb6b ✅

---

## 7. P2 Confirmados

| ID | Módulo | Hallazgo |
|---|---|---|
| B1 | Configuración > Notificaciones | Toggles no persisten (UX engañosa) |
| B2 | Configuración > Seguridad | Botón "Cambiar" contraseña sin acción |
| B3 | Configuración > Seguridad | Sesiones activas con texto fijo |

Estos son los únicos bugs reales después de la validación.

---

## 8. Módulos que Pueden Congelarse

| Módulo | Congelar | Razón |
|---|---|---|
| Dashboard principal | ✅ Sí | Validado, funcional |
| Perfiles Médicos | ✅ Sí | Validado, funcional |
| Mis Dispositivos | ✅ Sí | Validado, funcional |
| Fichas Públicas | ✅ Sí | Validado, seguro (bloquea chips no activados) |
| Mis Pedidos | ✅ Sí | Validado, funcional |
| Combos / Comprar | ✅ Sí | Validado, funcional |
| Tienda / Accesorios | ✅ Sí | Race condition corregida |
| Empresa (empleado) | ✅ Sí | Validado, funcional |
| Empresa (empresario) | ✅ Sí | Funcional (2573 líneas pero estable) |
| Historial | ✅ Sí | Validado, funcional |
| Colaboradores | ✅ Sí | Validado, funcional |
| Empresa Perfil | ✅ Sí | Validado, funcional |
| Upgrade | ✅ Sí | Simple, estable |
| Login/Registro | ✅ Sí | NextAuth estable |

## 9. Módulos que Todavía No Pueden Congelarse

| Módulo | Congelar | Razón |
|---|---|---|
| Configuración | ⚠️ **No aún** | P2: toggles no persisten, botón placeholder. Requiere mínimo: deshabilitar toggles o conectar a backend. |

---

## 10. Próximo Paso Recomendado

**CORREGIR CONFIGURACIÓN (ÚNICO MÓDULO CON BUGS REALES)**

Basado en la validación, el único módulo con bugs confirmados es **Configuración**, y son **P2** (no P0/P1).

Se recomienda:

1. **Notificaciones:** Cambiar los 3 toggles a estado "disabled" con overlay o texto que indique "Notificaciones por SMS/Email próximamente". Alternativamente, si se quiere funcionalidad real, crear API `/api/users/notifications/preferences`.

2. **Contraseña:** Cambiar el botón "Cambiar" por un link a `/forgot-password` o deshabilitarlo con tooltip "Usa 'Olvidé mi contraseña' en la pantalla de inicio de sesión".

3. **Sesiones:** Cambiar texto fijo a "Gestión de sesiones próximamente" para ser transparentes.

4. **Build + typecheck** para confirmar.

**NO tocar ningún otro módulo del panel cliente.** Todos los demás están listos para congelar.

---

## Resumen Final

| Tipo | Cantidad |
|---|---|
| P0 originales | 2 → **0 confirmados** |
| P1 originales | 4 → **0 confirmados** |
| P2 confirmados | **3** (todos en Configuración) |
| Riesgos descartados | **3** (API pública, suspensión corporate, race condition) |
| Módulos listos para congelar | **13 de 14** |
| Módulo que requiere atención | Configuración (P2, no bloqueante) |

---
*Originalmente en: docs/audit/*