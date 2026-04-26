# 01 - Módulo Website (Público)

## Responsabilidad
Todo lo que interactúa con visitantes no autenticados o funciones de utilidad pública de PreRescue ID. 
Rutas bajo `app/(public)/*` y `app/api/public/*`.

## Funciones Principales
- **Landing Pages:** Portada, cómo funciona.
- **Tienda Pública:** (Rutas `/tienda`) Visualización de paquetes y compra directa que redirige al flujo de pago o registro.
- **Módulo de Escaneo Público (QR):** (Ruta `app/api/public/[shortCode]/scan/route.ts`)
  - **Manejo Sensible:** Cuando alguien escanea el chip o pulsera, este endpoint dispara notificaciones y guarda la geolocalización.
  - **Integridad:** *Nunca* debe exigir estar logueado.
- **Registro de Usuarios:** `app/api/auth/register/route.ts`
  - *Interconexión Crítica:* Cuando un usuario se registra, no solo se crea su `User` y su `Account`, sino que **debe** crearse un `Profile` médico vacío (con `bloodType: "Pendiente"`) para que esté listo cuando decidan subir su foto o activar su chip de inmediato.

## Estado de Modificación Actual
- El proceso de Registro (`/api/auth/register`) está blindado. Crea la cuenta, usuario y perfil médico simultáneamente en una sola transacción (`prisma.$transaction`) para prevenir desajustes.
