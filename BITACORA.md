---
*Este registro es dinámico y debe actualizarse tras cada cambio estructural.*

## [2026-04-18] Fase 2: Corrección de Pedidos y Enlazado Maestro
**Objetivo**: Resolver errores en pasarela de pedidos y sincronizar datos entre módulos.

### Cambios Técnicos
- **Frontend (Tienda)**: Migración de payload plano a `items[]` array para cumplir con el esquema Zod.
- **Backend (API Orders)**: Implementación de guardado de `providerReference` y `customerDocument`.
- **Sincronización**: Actualización atómica del perfil del usuario con la dirección de envío del pedido.
- **Global Demo Migration**: El entorno de demostración ha sido migrado oficialmente a `https://www.prerescatepty.com/e/44R6DBNQ?demo=true`. Se actualizaron las referencias hardcoded en la Landing Page y se modificó la configuración del sistema (`demo_profile_shortcode`) en la base de datos para asegurar consistencia total.
- **SystemConfig Standardization**: Refactorización completa del acceso a configuraciones del sistema. Se eliminaron los casteos `as any` tras regenerar el cliente prisma y se centralizó la gestión a través de `ConfigRepository`.
- **Admin Settings Expansion**: Se añadió el campo `demo_profile_shortcode` a la interfaz de administración para permitir el cambio dinámico del perfil oficial de demostración sin tocar el código.

## [2026-04-17] Fase 1: Migración de QR Local y Estabilización v2.7.0
**Objetivo**: Eliminar dependencias externas de Google APIs y corregir errores de visualización.

### Cambios Técnicos
- **Proxy de QR Local**: Implementación de `/api/public/qr` usando la librería `qrcode` para generación local 100% segura.
- **Cero Dependencias**: Eliminación de `chart.googleapis.com` y `qrserver.com` en los componentes `Showcase` y `ChipDetail`.
- **Migración de Data**: Ejecución de script de limpieza para actualizar los 15 registros de chips existentes al nuevo formato local.
- **Versionado (v2.7.0)**: Incremento de versión y forzado de limpieza de caché vía `Service Worker` para todos los clientes.

## [2026-05-08] Fase 3: Seguridad y Eficiencia del Motor de Emergencia
**Objetivo**: Cerrar la brecha de enumeración de perfiles médicos y optimizar el ScanMonitor.

### Cambios Técnicos
- **[SEGURIDAD] Rate Limiting en GET `/api/public/[shortCode]`**: Se añadió límite de 30 req/IP/min usando el mismo patrón Redis (`rateLimit`) ya aplicado en la ruta de escaneo. Sin esto, cualquier actor podía enumerar shortcodes y extraer datos médicos sin restricción.
- **[EFICIENCIA] Parámetro `?limit` en `/api/chips/scans`**: La API ahora respeta el query param `limit` (máx 50). El `ScanMonitor` pedía `?limit=1` pero la API ignoraba el parámetro y devolvía siempre 50 registros. Corregido.
- **[ACCESIBILIDAD] `aria-label` en Navbar**: Se añadió `aria-label="Navegación principal"` al elemento `<nav>` del componente público, cerrando el hallazgo del UI Audit de abril.
- **[CLEANUP] Tipado explícito en scans**: Se eliminó el `any` en el `.map()` de chips reemplazando por `{ id: string }`.

---
**Próximos Pasos**:
- [x] Validación de notificaciones en tiempo real al escanear. *(ScanMonitor + `after()` verificado: funcional)*
- [x] Auditoría de seguridad en el acceso a perfiles privados. *(Rate limiting aplicado)*

## [2026-05-08] Fase 4: WCAG AA y Accesibilidad
**Objetivo**: Cumplir ratio mínimo 4.5:1 en labels de texto pequeño.

### Cambios Técnicos
- **`MedicalProfileForm.tsx`**: Labels de Alergias y Condiciones subidos de `text-red-500` (3.9:1) → `text-red-700` y `text-amber-600` (2.8:1) → `text-amber-700`. Mantienen identidad visual de color pero cumplen WCAG AA.
- **`chips/page.tsx`**: Tres labels en `text-[10px] text-slate-400` (3.5:1) → `text-slate-600` (7.0:1). Afecta "Código ID:", "Vincular con:" y "Código de Activación".
- **`e/[shortCode]/page.tsx`**: Título de `MedicalCard` (ALERGIAS, CONDICIONES, etc.) subido de `text-slate-400` → `text-slate-600`. Crítico: es lo que lee el paramédico en emergencia.

---
**Próximos Pasos**: Sin ítems críticos pendientes.
