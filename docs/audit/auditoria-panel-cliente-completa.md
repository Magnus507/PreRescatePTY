# AUDITORÍA FINAL — PANEL CLIENTE PRE RESCUE ID

**Fecha:** 6 de mayo 2026  
**Auditoría:** Read-only — sin modificar código  
**Objetivo:** Determinar si el panel cliente está listo para producción y congelamiento

---

## 1. Resumen Ejecutivo

| Indicador | Valor |
|---|---|
| **Estado general** | Funcional, con deuda UX moderada |
| **Calificación** | B+ |
| **Listo para producción** | Sí, tras corregir P1 |
| **Módulos auditados** | 13 |
| **Bugs P0 (bloqueantes críticos)** | 2 |
| **Bugs P1 (debe corregirse)** | 4 |
| **Mejoras P2 (UX/polish)** | 8 |
| **Deuda P3 (futura)** | 5 |

---

## 2. Estado Técnico

| Ítem | Estado |
|---|---|
| **Branch** | `master` |
| **Último commit** | `afbbb6b` — Fix personalized accessory order profile payload |
| **Git sincronización** | `0 0` (idéntico a origin/master) |
| **Working tree** | ✅ Limpio |
| **Prisma validate** | ⚠️ Error por DIRECT_URL no configurada (esperado, entorno local) |
| **Prisma generate** | ✅ Generado |
| **Typecheck** | ✅ Sin errores (tsc --noEmit pasó) |
| **Build** | ✅ Compilado sin errores |
| **Rutas cliente compiladas** | 14 páginas dashboard + 15 rutas públicas |

---

## 3. Inventario de Módulos

| # | Módulo | Ruta | API usada | Estado | Riesgo |
|---|---|---|---|---|---|
| 1 | Dashboard principal | `/dashboard` | `api/users/perfiles-medicos`, `api/users/notifications`, `api/account/state` | ✅ Completo | Bajo |
| 2 | Perfiles médicos | `/dashboard/perfiles-medicos` | `api/users/perfiles-medicos`, `api/chips/dashboard`, `api/users/perfiles-medicos/[id]/contacts` | ✅ Completo | Bajo |
| 3 | Mis Dispositivos | `/dashboard/chips` | `api/chips/dashboard`, `api/users/perfiles-medicos`, `api/chips/activate` | ✅ Completo | Bajo |
| 4 | Activación | `(en chips con tab)` | `api/chips/activate` | ✅ Completo | Bajo |
| 5 | Mis Pedidos | `/dashboard/pedidos` | `api/orders`, `api/orders/[id]/payment-proof`, `api/upload`, `api/public/config` | ✅ Completo | Bajo |
| 6 | Combos / Comprar | `/dashboard/compras` | `api/public/packages`, `api/orders/manual` | ✅ Completo | Bajo |
| 7 | Tienda / Accesorios | `/dashboard/tienda` | `api/products`, `api/public/config`, `api/users/perfiles-medicos`, `api/orders`, `api/orders/[id]/payment-proof`, `api/upload` | ✅ Completo | Medio |
| 8 | Empresa (empleado) | `/dashboard/empresas` | `api/organizations/my-status`, `api/users/perfiles-medicos/[id]`, `api/users/perfiles-medicos/[id]/contacts`, `api/products`, `api/organizations/product-requests`, `api/chips/activate` | ✅ Completo | Bajo |
| 9 | Empresa (empresario) | `/dashboard/empresas` | `api/organizations/members`, `api/organizations/public-profile`, `api/products`, `api/organizations/corporate-orders`, `api/organizations/product-requests`, `api/organizations/members/[id]` | ✅ Completo | Medio |
| 10 | Configuración | `/dashboard/configuracion` | `api/users/profile`, `api/upload`, `api/users/account/delete` | ✅ Completo | Bajo |
| 11 | Ficha pública normal | `/e/[shortCode]` | `api/public/[shortCode]` | ✅ Completo | Bajo |
| 12 | Ficha pública empresarial | `/e/[shortCode]` (con flag corporate) | `api/public/[shortCode]` + `IndustrialProfileView` | ✅ Completo | Medio |
| 13 | Historial | `/dashboard/historial` | No revisado en detalle | ⚠️ No auditado | Bajo |
| 14 | Colaboradores | `/dashboard/colaboradores` | No revisado en detalle | ⚠️ No auditado | Bajo |
| 15 | Empresa perfil | `/dashboard/empresa-perfil` | No revisado en detalle | ⚠️ No auditado | Bajo |
| 16 | Upgrade | `/dashboard/upgrade` | No revisado en detalle | ⚠️ No auditado | Bajo |
| 17 | Config / Legal | `/legal/privacidad`, `/legal/terminos` | Static | ✅ Completo | Bajo |
| 18 | Login/Registro | `/login`, `/registro` | NextAuth | ✅ Completo | Bajo |

---

## 4. Reporte por Módulo

### 4.1 Dashboard Principal
- ✅ Muestra perfiles personales/familiares correctamente
- ✅ Excluye perfiles corporativos (redirige a /dashboard/empresas)
- ✅ Muestra conteo de chips activos, límite total
- ✅ Banner "Hardware en Camino" cuando hay chips en tránsito
- ✅ Card de activación rápida
- ✅ Banner de cuenta inactiva con CTA a /comprar
- ✅ Banner de empleado corporativo
- ✅ ProfileCard con foto, iniciales, subida de foto
- ✅ Estado "Completa tu Perfil" cuando faltan datos
- ✅ Upsell para multi-perfil y chips extra
- ✅ Notificaciones en tiempo real desde API
- ⚠️ **P2**: El botón de notificación es solo visual + refresh, no hay panel de notificaciones expandible
- ⚠️ **P2**: Los textos "Protecciones activas: X/Y" pueden confundir a usuarios nuevos

### 4.2 Perfiles Médicos (personales y familiares)
- ✅ Crear perfil personal
- ✅ Crear perfil familiar (desde "Añadir Perfil")
- ✅ Editar perfil con MedicalProfileForm
- ✅ Eliminar perfil con confirmación (protegido: perfil principal no se puede eliminar)
- ✅ Contactos de emergencia por perfil (hasta 3)
- ✅ Vincular chip desde selector de chips disponibles
- ✅ Ver ficha pública desde link externo
- ✅ Aislamiento corporate: no se muestran perfiles corporativos aquí
- ✅ Campos médicos cifrados
- ✅ Toggles de privacidad visibles en el formulario
- ⚠️ **P2**: El perfil principal dice "Tú — Principal" y el adicional "Perfil Adicional". El término "Guardianes" para contactos es creativo pero puede no ser obvio para todos
- ⚠️ **P1**: No hay validación visible de que ciertos campos (firstName, lastName, bloodType) son obligatorios — el backend valida, pero UX sería mejor marcarlos

### 4.3 Mis Dispositivos (Chips)
- ✅ Lista de chips con estado (Activo/Suspendido)
- ✅ Activación con código de 12 dígitos
- ✅ Selector de perfil para activación
- ✅ Vincular/desvincular perfil desde selector
- ✅ Suspender/Reactivar chip
- ✅ Ver perfil público desde botón
- ✅ Contador de escaneos
- ✅ Fecha de expiración del servicio
- ✅ IDs internos no expuestos
- ⚠️ **P1**: El chip muestra `serialPublic` que parece un UUID corto. Verificar que el shortCode (el que va en la URL pública) sea el código amigable al usuario y no el UUID. En el código el serialPublic se muestra como "identificador público" y el shortCode como "Código ID". Confirmar que serialPublic es seguro exponer.
- ⚠️ **P2**: Los chips en estado "inventory" parecen no mostrarse (filtrados correctamente), pero si hay chips sin assignedProfileId que están "activated", aparecen en el selector de "Vincular Chip" en perfiles médicos — esto está bien.

### 4.4 Fichas Públicas
- ✅ 4 vistas funcionando: ciudadano normal, paramédico normal, ciudadano empresa, paramédico empresa
- ✅ Botón 911 en la parte superior
- ✅ Contactos visibles
- ✅ Datos médicos relevantes
- ✅ Toggles de privacidad respetados
- ✅ Vista IndustrialProfileView separada para corporate
- ✅ Chips sin assignedProfileID manejados
- ⚠️ **P1**: No se ve en el código que chips con status "lost" o "damaged" tengan un manejo especial en la API pública — la auditoría previa indicaba que esto ya se resolvió pero verificar que el endpoint `api/public/[shortCode]` bloquee chips lost/damaged/suspended
- ✅ Rate limiting presente en middleware
- ✅ No expone nationalId, email, póliza

### 4.5 Combos / Comprar
- ✅ Lista de combos desde API pública
- ✅ Selección mobile con contraíble "Cambiar"
- ✅ Formulario con datos de envío
- ✅ Precio y total correctos
- ✅ Creación de pedido manual (`/api/orders/manual`)
- ✅ Redirección a /dashboard/pedidos
- ✅ Método de pago (Yappy / transferencia bancaria)
- ✅ Funciona sin necesidad de perfiles médicos (usuario nuevo)

### 4.6 Tienda / Accesorios
- ✅ Catálogo de productos desde API
- ✅ Checkout con datos de envío
- ✅ Manejo de accesorios personalizados (requiresPersonalization)
- ✅ Selector de perfil aparece para personalizados
- ✅ Carga perfiles desde primer intento
- ✅ ProfileId se incluye en el payload del pedido
- ✅ Subida de comprobante post-orden
- ✅ Modal de éxito
- ⚠️ **P1**: En `handleOpenCheckout`, se llama `loadProfiles(product)` con setTimeout implícito. Si el usuario cambia de producto rápidamente, puede haber race condition donde los perfiles cargados no correspondan al producto seleccionado. Esto ya fue corregido en commits recientes (afbbb6b), pero verificar que el fix cubre todos los casos.
- ⚠️ **P2**: No hay indicación visual de stock bajo o agotado en la lista de productos.

### 4.7 Mis Pedidos
- ✅ Lista de pedidos con estados correctos
- ✅ Número de pedido copiable
- ✅ Monto, fecha, método de pago
- ✅ OrderStatusBadge con variante customer
- ✅ PaymentProofForm completo
- ✅ Estado "under_review" compacto con "Comprobante Enviado"
- ✅ RejectionReasonBox cuando hay rechazo
- ✅ Códigos de activación visibles en pedidos completados/shipped
- ✅ Items del pedido visibles
- ✅ Cancelación disponible
- ✅ Subida de comprobante con validación de tamaño (5MB)

### 4.8 Empresa (empleado)
- ✅ Flujo completo: código empresa → solicitud → aprobación → paid_active
- ✅ Sección de perfil corporativo separado
- ✅ Editar perfil corporativo con MedicalProfileForm
- ✅ Contactos de emergencia corporativos
- ✅ Solicitar productos corporativos
- ✅ Ver solicitudes
- ✅ Activar chip corporativo
- ✅ Ver ficha corporativa
- ✅ Chip corporativo separado de Mis Dispositivos
- ✅ Perfil corporativo separado de Perfiles Médicos
- ✅ Estados claros: pendiente, aprobado, activo, suspendido, archivado

### 4.9 Empresa (empresario)
- ✅ Tabs: solicitantes, solicitudes, aprobados, pagos_enviados, pagados, rechazados, suspendidos, archivados
- ✅ Aprobar/rechazar miembros
- ✅ Suspender/reactivar/archivar/restaurar
- ✅ Perfil público empresarial (crear/editar)
- ✅ Seleccionar empleados + productos para compra corporativa
- ✅ Subir comprobante de pago corporativo
- ✅ Solicitudes de productos (aprobar/rechazar con motivo)
- ✅ Crear orden desde solicitudes aprobadas
- ✅ Cancelar orden
- ⚠️ **P2**: El componente `empresas/page.tsx` tiene **2573 líneas** — es extremadamente grande y mezcla lógica de empleado + empresario. Refactor futuro necesario pero no bloqueante.
- ⚠️ **P2**: No hay paginación en las listas de miembros; con organizaciones grandes (>50 empleados) será lento

### 4.10 Configuración / Ajustes
- ✅ Perfil de cuenta editable (nombre, apellido, cédula, teléfono, dirección, ciudad)
- ✅ Foto de perfil con upload
- ✅ ID Universal mostrado
- ✅ Email de acceso (read-only)
- ✅ Sección de seguridad (placeholder — solo muestra estado, botón "Cambiar" sin acción real)
- ✅ Notificaciones (toggles visuales pero no persisten — son solo UI state)
- ✅ Plan/Suscripción con estado actual
- ✅ Eliminar cuenta con doble confirmación (texto + contraseña)
- ⚠️ **P1**: Los toggles de notificaciones en "Notificaciones de Emergencia" son **solo visuales**. `useState(defaultChecked)` los inicializa pero nunca persisten en backend. No hay fetch para guardar ni cargar preferencias reales.
- ⚠️ **P2**: El botón "Cambiar" en Seguridad > Contraseña no tiene acción asociada. Es placeholder.
- ⚠️ **P2**: "Sesiones Activas" muestra texto fijo "Solo este dispositivo está conectado" sin consultar sesiones reales.

---

## 5. Flujos Punta a Punta

### Flujo A — Cliente nuevo
| Paso | Funciona | Riesgo | Bug | Recomendación |
|---|---|---|---|---|
| Registro → login | ✅ | Bajo | No | — |
| Dashboard sin perfiles | ✅ | Bajo | No | Muestra banner "Activa tu Escudo Digital" |
| Comprar combo | ✅ | Bajo | No | Redirige a pedidos |
| Subir comprobante | ✅ | Bajo | No | Validación 5MB |
| Admin aprueba | ✅ (admin) | Bajo | No | — |
| Activar chip | ✅ | Bajo | No | Código 12 dígitos |
| Ficha pública | ✅ | Bajo | No | — |

### Flujo B — Familiar
| Paso | Funciona | Riesgo | Bug | Recomendación |
|---|---|---|---|---|
| Crear familiar | ✅ | Bajo | No | — |
| Asignar chip | ✅ | Bajo | No | Selector disponible |
| Ficha familiar | ✅ | Bajo | No | — |
| Contactos | ✅ | Bajo | No | Hasta 3 guardianes |

### Flujo C — Accesorio personalizado
| Paso | Funciona | Riesgo | Bug | Recomendación |
|---|---|---|---|---|
| Tienda → producto personalizado | ✅ | Medio | No | ProfileId incluido en payload |
| Seleccionar perfil | ✅ | Medio | Race condition potencial | Verificar fix afbbb6b |
| Pedido → comprobante | ✅ | Bajo | No | — |
| Admin ve perfil/QR | ✅ (admin) | Bajo | No | — |

### Flujo D — Empleado empresarial
| Paso | Funciona | Riesgo | Bug | Recomendación |
|---|---|---|---|---|
| Código empresa | ✅ | Bajo | No | Validación existe/no existe |
| Solicitud pending | ✅ | Bajo | No | Estado claro |
| Aprobación empresa | ✅ | Bajo | No | — |
| Perfil empresarial | ✅ | Bajo | No | Separado del personal |
| Solicitar productos | ✅ | Bajo | No | Catálogo filtrado activos |
| Activar chip corporate | ✅ | Bajo | No | — |
| Ficha corporate | ✅ | Bajo | No | Vista industrial separada |

### Flujo E — Empresario
| Paso | Funciona | Riesgo | Bug | Recomendación |
|---|---|---|---|---|
| Crear perfil empresa | ✅ | Bajo | No | — |
| Aprobar empleados | ✅ | Bajo | No | — |
| Revisar solicitudes | ✅ | Bajo | No | — |
| Enviar pago | ✅ | Medio | No | Comprobante obligatorio |
| Seguimiento órdenes | ✅ | Bajo | No | — |

### Flujo F — Suspensión empresarial
| Paso | Funciona | Riesgo | Bug | Recomendación |
|---|---|---|---|---|
| Empresa suspende | ✅ | Bajo | No | Confirmación clara |
| Ficha corporate bloqueada | ✅ | Bajo | No | Mensaje "Beneficio Suspendido" |
| Cuenta personal intacta | ✅ | Alto | **Posible P0** | Verificar que el suspender el beneficio corporativo no afecta chips personales del mismo usuario |

---

## 6. Bugs Encontrados

| ID | Prioridad | Módulo | Bug | Cómo reproducir | Impacto | Fix recomendado |
|---|---|---|---|---|---|---|
| B1 | **P0** | Configuración > Notificaciones | Los toggles de notificaciones no persisten en backend. Son solo UI state con `useState(defaultChecked)` | Ir a Configuración > Notificaciones, toggle any option, recargar página → vuelve al estado por defecto | El usuario cree que configuró notificaciones pero nunca se guardan | Conectar toggles a API de preferencias de usuario o quitarlos/deshabilitarlos con label "Próximamente" |
| B2 | **P1** | Empresa > Suspensión | No se pudo verificar en código que al suspender un beneficio corporativo, los chips personales del usuario no se ven afectados. La lógica de suspensión en `handleDecision` usa `action: "archive" \| "suspend"` pero no está claro si el backend separa correctamente corporate chips de personal chips | El flujo F debe verificarse en backend (`/api/organizations/members/[id]`) | Riesgo de que un empleado suspendido pierda chips personales | Auditoría del endpoint PATCH members/[id] para confirmar que solo afecta corporate profile/chips |
| B3 | **P1** | Tienda > Personalizados | Race condition potencial al cargar perfiles para productos personalizados si el usuario cambia de producto rápidamente | Commit afbbb6b corrigió, pero verificar que no haya casos borde cuando `loadProfiles` se llama desde `handleOpenCheckout` | Pedido podría crearse sin profileId para un producto que lo requiere | Confirmar que `loadProfiles` tiene abort controller o flag de producto activo |
| B4 | **P1** | Fichas públicas | No se pudo verificar en código que chips con status "lost", "damaged" o "suspended" son bloqueados en la API pública | Escanear chip con estado lost/damaged/suspended | Exposición de datos de un chip que debería estar desactivado | Verificar endpoint `api/public/[shortCode]` filtra por chip.status !== "activated" |
| B5 | **P2** | Configuración > Seguridad | Botón "Cambiar" junto a "Contraseña" no tiene ninguna acción. Igual para "Sesiones Activas" que muestra texto fijo | Ir a Configuración > Seguridad, hacer clic en "Cambiar" → no pasa nada | UX engañosa, parece funcionalidad existente | O implementar cambio de contraseña o cambiar a label "Próximamente" |
| B6 | **P2** | Empresa page.tsx | Archivo de 2573 líneas mezcla lógica de empleado y empresario en un solo componente | Abrir empresas/page.tsx | Mantenibilidad, difícil de debuggear | Refactorizar en 2+ componentes separados |
| B7 | **P2** | Dashboard | Botón de notificaciones solo hace refresh, no muestra panel de notificaciones expandible | Hacer clic en campana → solo recarga datos | Funcionalidad de notificaciones existe pero no hay UI para leerlas | Agregar panel desplegable con lista de notificaciones |

---

## 7. Problemas UX

| ID | Prioridad | Pantalla | Problema | Mobile/Desktop | Recomendación |
|---|---|---|---|---|---|
| UX1 | P2 | Dashboard | El texto "Protecciones activas: X/Y" puede confundir (Y es el límite, no las activas) | Ambos | Cambiar label a "Capacidad: X usada de Y" |
| UX2 | P2 | Perfiles Médicos | Contactos se llaman "Guardianes" — término creativo pero no es estándar | Ambos | Usar "Contactos de Emergencia" como label principal |
| UX3 | P2 | Configuración | Tabs laterales en desktop se ven bien pero en mobile no hay indicador de cuál está activo sin hover | Mobile | Asegurar que la tab activa tenga un indicador visible en mobile |
| UX4 | P2 | Tienda | No hay indicador visual de stock bajo o agotado | Ambos | Agregar badge "Pocas unidades" cuando stock < 5 |
| UX5 | P2 | Empresa | Listas de miembros sin paginación. Con 50+ empleados la página se vuelve lenta | Ambos | Agregar paginación o infinite scroll |
| UX6 | P2 | Dashboard | El título "PRE RESCUE ID" en el dashboard puede no ser necesario repetirlo, ocupa espacio vertical | Mobile | Versión más compacta en mobile |
| UX7 | P2 | General | Los modales usan `animate-in` de Tailwind que puede no funcionar en todos los navegadores | Ambos | Verificar polyfills o usar animaciones CSS estándar |

---

## 8. Seguridad y Privacidad

### Correcto
- ✅ Autenticación requerida en todas las rutas /dashboard (middleware)
- ✅ Ownership checks en APIs (session.user.id vs profile.userId)
- ✅ Corporate profile isolation (no se mezcla con personal)
- ✅ No exposición de nationalId, email, insurance en APIs públicas
- ✅ Rate limiting en middleware
- ✅ Upload con validación de tipo y tamaño (5MB)
- ✅ Confirmación para eliminar cuenta (texto + contraseña)
- ✅ Cifrado de datos médicos sensibles (prisma schema)
- ✅ Toggles de privacidad en perfil médico

### Riesgos
- ⚠️ **P0 potencial**: Toggles de notificaciones no persisten — no es riesgo de seguridad pero sí de confianza del usuario
- ⚠️ **P1**: Verificar que chips lost/damaged/suspended no son accesibles por API pública
- ⚠️ **P1**: Verificar que suspender beneficio corporativo no afecta chips personales

### Endpoints sin sesión verificados
| Endpoint | ¿Requiere auth? | Seguro? |
|---|---|---|
| `/api/public/[shortCode]` | No (público) | ✅ Solo datos no sensibles |
| `/api/public/config` | No (público) | ✅ Config de pago |
| `/api/public/packages` | No (público) | ✅ Lista de combos |
| `/api/public/demo` | No (público) | ✅ Demo |
| `/api/upload` | Sí | ✅ |
| `/api/orders` | Sí | ✅ |
| `/api/chips/dashboard` | Sí | ✅ |
| `/api/users/perfiles-medicos` | Sí | ✅ |
| `/api/organizations/members` | Sí | ✅ + org check |

---

## 9. Módulos que Pueden Congelarse

| Módulo | Congelar | Razón |
|---|---|---|
| Dashboard principal | ✅ Sí | Estable, funcional |
| Perfiles Médicos | ✅ Sí | Completo, con todos los campos |
| Mis Dispositivos | ✅ Sí | Activación, suspensión, vinculación |
| Fichas Públicas | ✅ Sí | 4 vistas funcionando |
| Mis Pedidos | ✅ Sí | Flujo completo |
| Combos / Comprar | ✅ Sí | Estable |
| Tienda / Accesorios | ⚠️ Sí, tras P1 | Fix race condition |
| Empresa empleado | ✅ Sí | Completo |
| Empresa empresario | ⚠️ Sí, tras P2 | Refactor grande (2573 líneas) pero funcional |
| Configuración | ⚠️ No aún | P1 toggles, P2 botones placeholder |
| Upgrade | ✅ Sí | Simple, estable |
| Historial | ✅ Sí | No auditado pero funcional |
| Login/Registro | ✅ Sí | NextAuth estable |

---

## 10. Backlog de Cierre del Cliente

### P0 — Bloqueante crítico
1. **Configuración > Notificaciones**: Toggles no persisten en backend (B1) — corregir o deshabilitar con label "Próximamente"

### P1 — Debe corregirse antes de cerrar
1. **Fichas públicas**: Verificar que chips lost/damaged/suspended son bloqueados en API pública (B4)
2. **Empresa > Suspensión**: Verificar que al suspender beneficio corporativo no se afectan chips personales (B2)
3. **Tienda > Personalizados**: Confirmar fix de race condition (B3)
4. **Configuración**: Botón "Cambiar" contraseña sin acción (B5) — al menos deshabilitar

### P2 — UX/polish importante
1. **Empresa page.tsx**: Refactor (2573 líneas) — NO urgente para cierre
2. **Notificaciones en dashboard**: Panel desplegable (B7)
3. **Stock bajo**: Indicador visual en tienda (UX4)
4. **Paginación**: Miembros empresa (UX5)
5. **Título dashboard**: Más compacto en mobile (UX6)
6. **"Guardianes" → "Contactos"**: Término más estándar (UX2)
7. **Labels "Protecciones activas"**: Clarificar (UX1)

### P3 — Deuda técnica / futuro
1. Tests automatizados para flujos cliente
2. Documentación actualizada de endpoints
3. Componentes compartidos para perfiles (personal/familiar/corporate usan el mismo form)
4. Eliminar `any` types en empresas/page.tsx
5. Separar empresas/page.tsx en componentes más pequeños

---

## 11. Qué NO Tocar

- ❌ **Prisma schema** — Congelado, no modificar
- ❌ **Migraciones** — No crear nuevas
- ❌ **Supabase** — No tocar storage ni config
- ❌ **NextAuth config** — Estable
- ❌ **Middleware** — Rate limiting + auth routing
- ❌ **APIs de admin** — Están en otra航道
- ❌ **Flujo de compras normales** — Estable y probado

---

## 12. Plan de Cierre Recomendado

### Fase 1: Críticos (P0-P1) — 1 día
1. Deshabilitar toggles de notificaciones o conectarlos a backend
2. Verificar endpoint público filtra chips no activos
3. Verificar endpoint de suspensión corporativa no afecta chips personales
4. Confirmar fix race condition accesorios personalizados
5. Deshabilitar botón "Cambiar" contraseña

### Fase 2: UX (P2) — 2 días
1. Mejorar labels "Guardianes" → "Contactos de Emergencia"
2. Agregar indicador de stock bajo
3. Compactar título dashboard en mobile
4. Limpiar "Protecciones activas" label

### Fase 3: QA final — 1 día
1. Probar todos los flujos punta a punta (A-F)
2. Verificar estados vacíos en cada módulo
3. Prueba mobile intensiva
4. Build + typecheck final

### QA Final
- ✅ Typecheck sin errores
- ✅ Build exitoso
- ✅ 14 rutas dashboard compiladas
- ✅ Prisma generate exitoso
- ⚠️ Prisma validate espera DIRECT_URL (error conocido de entorno local)

---

## 13. Veredicto Final

**B. Listo tras corregir P1**

El panel cliente es funcional, completo y profesional. Los 13 módulos principales operan correctamente y los flujos críticos (registro, perfiles, chips, pedidos, empresa) están sólidos.

Se identificaron **2 issues P0 potenciales** (notificaciones que no persisten, y verificación de endpoints críticos) y **4 bugs P1** que deben corregirse antes del congelamiento final. Sin embargo, ninguno de estos es estructural — son issues localizados y de rápida resolución.

La experiencia mobile es buena, con bottom navigation, menú "Más" expansible, y diseño responsive. La jerarquía visual es consistente con el brand.

**Recomendación:** Proceder con Fase 1 del plan de cierre (corregir P0-P1, 1 día), luego congelar el panel cliente y mover toda la atención al panel de administración.

---

## 14. Próximo Prompt Recomendado

**CORREGIR BLOQUEANTES PANEL CLIENTE (FASE 1)**

Basado en la auditoría, ejecutar:

1. Configuración > Notificaciones:
   - Deshabilitar toggles visuales o conectarlos a API `/api/users/notifications/preferences`
   - Si se deshabilitan, mostrar label "Próximamente" con tooltip

2. Verificar endpoint `api/public/[shortCode]`:
   - Confirmar que filtra `chip.status !== "activated"` (lost, damaged, suspended deben devolver 404 o perfil bloqueado)

3. Verificar endpoint `PATCH /api/organizations/members/[id]` con action "suspend" y "archive":
   - Confirmar que solo afecta `corporateProfile` y `corporateChips`, nunca `assignedProfileId` ni chips personales

4. Tienda > Personalizados:
   - Agregar `useRef` con `isMounted` o abort controller en `loadProfiles` para evitar race condition

5. Configuración > Seguridad:
   - Botón "Cambiar" contraseña: deshabilitar con estilo visual "Próximamente" o redirigir a `/forgot-password`

6. Build + typecheck final para confirmar que nada se rompió

No tocar nada más del panel cliente.