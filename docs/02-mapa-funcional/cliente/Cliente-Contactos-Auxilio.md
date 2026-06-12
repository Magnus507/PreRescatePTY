# Panel del Cliente: Contactos de Auxilio (Guardianes)

Configuración de la red de seguridad humana encargada de recibir alertas inmediatas en caso de una emergencia real.

## Red de Protección (Guardianes)
El sistema permite registrar contactos de confianza ("Ángeles Guardianes") que actúan como respondedores primarios.

### Atributos del Guardián
- **Identificación**: Nombre completo y Parentesco (Madre, Cónyuge, etc.).
- **Canales de Alerta**:
    - **Email**: Notificación con mapa de ubicación y enlace al perfil médico.
    - **SMS**: Alerta rápida de texto (Requiere suscripción activa).
    - **WhatsApp**: Enlace directo y mensaje pre-configurado (Requiere suscripción activa).
- **Alcance de la Alerta**:
    - **Global**: Protege automáticamente a todos los perfiles médicos de la cuenta.
    - **Específico**: Vinculado solo a un perfil particular (Configurable desde [[Cliente-Perfiles-Medicos]]).

## Estados de Alerta de Canal
Si la suscripción de la cuenta ha expirado o está inactiva, se muestra un banner de **"Canales Desactivados"**, suspendiendo el envío de SMS y WhatsApp por falta de fondos técnicos (Tethering con Twilio/Warp).

## Gestión de Contactos
- **Límite Sugerido**: El diseño está optimizado para 3 guardianes principales por cuenta para evitar saturación de alertas.
- **Acciones**:
    - **Agregar Guardia**: Abre formulario de registro blindado.
    - **Editar**: Permite actualizar número de teléfono o canales de notificación.
    - **Eliminar**: Rompe todos los vínculos de alerta del contacto con la cuenta.

## Interconexiones Técnicas
- **Flujo de Notificación**: Cuando ocurre un escaneo en un chip vinculado, el sistema consulta esta tabla para disparar las ráfagas de mensajes.
- **Consumo de API**:
    - `GET /api/contacts/dashboard`: Recupera la lista de guardianes.
    - `POST /api/contacts/dashboard`: Registra un nuevo contacto.
    - `PATCH /api/contacts/dashboard`: Actualiza datos o estado global.
    - `DELETE /api/contacts/dashboard`: Borrado irreversible.

---
**Protocolo de Obsidian:**
- Relacionado con: [[Cliente-Perfiles-Medicos]], [[Esquema-Base-Datos#EmergencyContact]].
- Seguridad: Los números de teléfono deben estar en formato internacional (Ej: +507) para garantizar el envío de SMS/WhatsApp.
