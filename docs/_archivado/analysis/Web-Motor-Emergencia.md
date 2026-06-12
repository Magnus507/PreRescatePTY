# Motor de Emergencia (Vista Pública de Rescate)

Interfaz crítica de entrega de información vital y ráfaga de alertas inmediatas ante el escaneo de un chip.

## Flujo de Activación al Escaneo
1. **Detección Automática**: Al cargar la URL `web.com/e/[shortCode]`, se dispara una petición `POST` oculta a `/api/public/[shortCode]/scan`.
2. **Inteligencia de Geocerca**: Intenta obtener la ubicación GPS del rescatista vía `navigator.geolocation`.
3. **Filtro de Rol (Triaje)**:
    - **Paramédico**: Acceso completo a la ficha médica (Sangre, alergias, condiciones).
    - **Ciudadano**: Muestra el "Protocolo Ciudadano" (Instrucciones de primeros auxilios).
4. **Alerta a Guardianes**: El backend dispara automáticamente los mensajes a los contactos configurados en [[Cliente-Contactos-Auxilio]].

## Componentes de la Interfaz

### Botón de Pánico (911)
Elemento de máxima jerarquía siempre visible. Permite llamar directamente a la central de urgencias desde el navegador móvil.

### Protocolo Ciudadano (Modo No-Médico)
Guía de 4 pasos para evitar errores comunes en el lugar de un accidente:
- **01 Asegurar Entorno**: Seguridad perimetral.
- **02 Evaluar Daño**: Riesgos secundarios (combustible/atropello).
- **03 Manejo del Trauma**: Prohibición de movimiento cervical.
- **04 Comunicación**: Instrucciones para mantener la consciencia del paciente.

### Ficha Médica Vital (Modo Paramédico)
- **Cabecera de Identidad**: Nombre, Foto, Edad, Sexo y el dato más crítico: **Tipo de Sangre** (Badge rojo).
- **Tarjetas Médicas**:
    - **Alergias**: Marcada como crítica si existe rastro.
    - **Condiciones**: Enfermedades crónicas relevantes para RCP/Triaje.
    - **Medicamentos**: Fármacos actuales.
    - **Instrucciones**: Bio-dirección o notas del usuario.

### Contactos de Rescate
Listado de familiares con botón directo de llamada.

## Interconexiones Técnicas
- **Integridad**: Esta vista no requiere sesión (Es pública), pero está protegida por el `shortCode` único del chip.
- **Vínculo con el Dueño**: Cada carga de esta página genera una entrada en el [[Cliente-Historial-Rescate]].
- **Modo Demo**: Identificado visualmente con una corona dorada si el chip pertenece a la cuenta de administración de Showcase.

---
**Protocolo de Obsidian:**
- Relacionado con: [[Web-Publica]], [[Cliente-Historial-Rescate]].
- Nota: Diseñado para máxima legibilidad bajo estrés (Fuentes negras, alto contraste, badges de tamaño aumentado).
