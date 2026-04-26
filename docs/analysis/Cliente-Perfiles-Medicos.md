# Panel del Cliente: Perfiles Médicos (Expedientes Vitales)

Gestión profunda de la información vital para la atención en emergencias. Permite configurar múltiples fichas (Personales, Familiares o Corporativas).

## Dashboard de Gestión
- **Contador de Espacios**: Muestra el uso de la capacidad según el combo adquirido (Ej: 3 de 5 espacios utilizados).
- **Acceso a Upgrade**: Acceso directo a [[Tienda-Chips]] si se alcanza el límite de perfiles.

## Registro y Edición (MedicalProfileForm)
Cada perfil contiene campos obligatorios y opcionales críticos para el triaje médico:

### Información Básica
- **Nombre y Apellido**: Requeridos para identificación.
- **Alias Público**: Nombre que se muestra al escáner sin revelar identidad completa (Privacidad Ley 81).
- **Fecha de Nacimiento y Sexo**: Datos biológicos base.
- **Teléfono Propio**: Número asignado directamente al portador del chip.

### Información Clínica (VITAL)
- **Tipo de Sangre**: Selector obligatorio (O+, O-, A+, A-, B+, B-, AB+, AB-).
- **Alergias**: Campo de texto enriquecido para reacciones medicamentosas o alimenticias.
- **Condiciones Crónicas**: Enfermedades preexistentes (Ej: Diabetes, Hipertensión).
- **Medicaciones**: Lista de fármacos de uso diario.
- **Notas Adicionales**: Espacio para instrucciones especiales o bio-dirección.

## Gestión de Guardianes (Contactos de Emergencia)
Cada perfil puede estar vinculado hasta con **3 Guardianes** específicos.
- **Vínculo**: Familiar, Cónyuge, Amigo, etc.
- **Canales de Alerta**: Configuración de notificaciones vía Email, SMS o WhatsApp.
- **Pool de Contactos**: Los contactos se crean en [[Cliente-Contactos-Auxilio]] y se "vinculan" o "desvinculan" de cada perfil médico de forma independiente.

## Interconexiones Técnicas
- **Consumo de API**:
    - `POST /api/users/familia`: Creación de nuevos perfiles.
    - `PATCH /api/users/familia/[id]`: Actualización de ficha clínica.
    - `DELETE /api/users/familia/[id]`: Eliminación con limpieza de vínculos de chips.
- **Vínculo con Hardware**: Permite vincular un "Chip Disponible" (visto en [[Cliente-Dispositivos]]) directamente desde la edición del perfil.
- **Impacto Público**: Los cambios aquí se reflejan instantáneamente en el motor de emergencia [[Web-Publica]].

---
**Protocolo de Obsidian:**
- Relacionado con: [[Esquema-Base-Datos#Profile]], [[Cliente-Contactos-Auxilio]], [[Web-Publica]].
- Nota: Un perfil sin tipo de sangre se marca con una alerta roja en el dashboard principal.
