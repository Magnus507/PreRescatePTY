# Panel del Cliente: Historial de Rescate (Bitácora Vital)

Registro cronológico y forense de todos los accesos realizados a las fichas médicas del usuario mediante el escaneo de hardware (NFC/QR).

## Registro de Eventos (ScanEvents)
Cada entrada en el historial representa un momento en que el escudo digital fue activado por un tercero o el usuario.

### Información Técnica del Escaneo
- **Origen**: Identifica si fue vía **NFC** (Sensor táctil) o **QR** (Cámara).
- **Identidad del Dispositivo**: Muestra el número de serie físico (`serialPublic`) y el alias del chip si existe.
- **Rastro Digital**: Dirección IP del dispositivo que escaneó y UserAgent (Tipo de navegador/celular).

### Inteligencia de Ubicación
- **Geolocalización**: Si el rescatista permite compartir su ubicación, se muestra la dirección exacta, ciudad y país.
- **Sin Ubicación**: Si no se comparte, se registra una advertencia de "Ubicación Geográfica No Compartida".

### Estado de Notificación (Respuesta de Red)
Indica qué sucedió con los guardianes en el momento del escaneo:
- **✓ Notificado**: Ráfaga enviada con éxito (Email/SMS).
- **✗ Error Notif**: Fallo técnico en el envío.
- **— No Contacts**: El sistema no encontró guardianes configurados para alertar.
- **⏳ Pendiente**: En cola de procesamiento.

## Canales Alertados
Desglose de a quién se le informó de la emergencia:
- **Canal**: Muestra si fue por SMS o Email.
- **Destinatario**: Muestra el destino (truncado por privacidad).
- **Estado Individual**: Indica si el mensaje específico llegó a su destino.

## Interconexiones Técnicas
- **Consumo de API**:
    - `GET /api/chips/scans`: Recupera la lista de eventos vinculados a la cuenta del usuario.
- **Vínculo con [[Web-Publica]]**: Los datos aquí mostrados son generados en tiempo real por el controlador de visualización de perfiles de emergencia.
- **Uso Forense**: Sirve como evidencia de actividad en caso de pérdida de un chip o uso no autorizado.

---
**Protocolo de Obsidian:**
- Relacionado con: [[Cliente-Dashboard]], [[Admin-Inteligencia]], [[Esquema-Base-Datos#ScanEvent]].
- Nota: Un alto volumen de escaneos sin notificación indica que se deben revisar los [[Cliente-Contactos-Auxilio]].
