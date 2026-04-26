# 03 - Módulo Admin (Gestión Logística)

## Responsabilidad
El área exclusiva para el equipo interno y operaciones de PreRescue ID (`app/(admin)/admin/*`). Se centra en el inventario, envíos y control de gobernanza.

## Funciones Principales
- **Inventario y Chips (`/admin/chips`):** Activar, suspender o revocar chips. Todo cambio aquí invalida la caché del usuario para que, cuando entre a su dashboard, ya no vea chips suspendidos.
- **Gestión de Pedidos (`/admin/pedidos`):**
  - **Interconexión con Caché:** Cuando se aprueba el envío de un pedido o pago, el cliente debe verlo de inmediato. Esto lo solucionamos inyectando `?_t=${Date.now()}` en el dashboard de usuario para burlar el caché del navegador.
- **Acciones sobre Usuarios (`api/admin/users/[id]/actions`):**
  - Actualizar el Plan de Protección (Combo).
  - Añadir Chips Manuales.
  - Reset de Emergencia o Eliminación total del usuario.
  
## Estado de Modificación Actual (Errores Similares Corregidos)
- **Des-sincronización de Identidad (Sincronización Bidireccional):** Encontramos otro error "fantasma" donde, si el usuario editaba su Ficha Médica Principal desde el dashboard familiar y cambiaba su Teléfono, éste se guardaba en el "Perfil Médico" pero NO en su cuenta maestra de "Usuario", dejándolos des-sincronizados. 
- **Solución Aplicada:** En `api/users/familia/[profileId]/route.ts`, inserté una lógica de cruce: si el perfil que se edita pertenece al titular de la cuenta (`existing.userId !== null`), su número de teléfono se replica automáticamente a la tabla maestra `User`, manteniendo la gobernanza limpia y las bases de datos perfectamente sincronizadas.
