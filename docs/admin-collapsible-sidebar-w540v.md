# W5.40V - Admin sidebar colapsable y contenido full width

## Objetivo

Reducir el ancho lateral del Admin para que los módulos operativos usen más espacio horizontal.

## Cambios

- Sidebar izquierdo colapsable en el layout de Admin.
- Estado persistido en `localStorage` con la clave `admin-sidebar-collapsed`.
- Menú con modo expandido y colapsado.
- Contenido principal con ancho más libre cuando el sidebar está colapsado.
- Centro de Operaciones y módulos grandes aprovechan mejor el ancho disponible.

## Reglas

- Solo UI / layout.
- Sin backend.
- Sin Prisma.
- Sin migraciones.
- Sin tocar flujo operativo.
- Sin tocar checkout legacy.
- Sin tocar `Order` / `Product` legacy.
- Sin tocar activación legacy.
- Sin tocar QR / link / NFC.
