---
*Este registro es dinámico y debe actualizarse tras cada cambio estructural.*

## [2026-04-18] Fase 2: Corrección de Pedidos y Enlazado Maestro
**Objetivo**: Resolver errores en pasarela de pedidos y sincronizar datos entre módulos.

### Cambios Técnicos
- **Frontend (Tienda)**: Migración de payload plano a `items[]` array para cumplir con el esquema Zod.
- **Backend (API Orders)**: Implementación de guardado de `providerReference` y `customerDocument`.
- **Sincronización**: Actualización atómica del perfil del usuario con la dirección de envío del pedido.
- **Global Demo Migration**: El entorno de demostración ha sido migrado oficialmente a `https://pre-rescate-pty.vercel.app/e/44R6DBNQ?demo=true`. Se actualizaron las referencias hardcoded en la Landing Page y se modificó la configuración del sistema (`demo_profile_shortcode`) en la base de datos para asegurar consistencia total.
- **SystemConfig Standardization**: Refactorización completa del acceso a configuraciones del sistema. Se eliminaron los casteos `as any` tras regenerar el cliente prisma y se centralizó la gestión a través de `ConfigRepository`.
- **Admin Settings Expansion**: Se añadió el campo `demo_profile_shortcode` a la interfaz de administración para permitir el cambio dinámico del perfil oficial de demostración sin tocar el código.

## [2026-04-17] Fase 1: Migración de QR Local y Estabilización v2.7.0
**Objetivo**: Eliminar dependencias externas de Google APIs y corregir errores de visualización.

### Cambios Técnicos
- **Proxy de QR Local**: Implementación de `/api/public/qr` usando la librería `qrcode` para generación local 100% segura.
- **Cero Dependencias**: Eliminación de `chart.googleapis.com` y `qrserver.com` en los componentes `Showcase` y `ChipDetail`.
- **Migración de Data**: Ejecución de script de limpieza para actualizar los 15 registros de chips existentes al nuevo formato local.
- **Versionado (v2.7.0)**: Incremento de versión y forzado de limpieza de caché vía `Service Worker` para todos los clientes.

---
**Próximos Pasos**:
- [ ] Validación de notificaciones en tiempo real al escanear.
- [ ] Auditoría de seguridad en el acceso a perfiles privados.
