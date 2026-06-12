# Panel del Cliente: Mis Dispositivos (Stickers)

Gestión técnica, activación y vinculación de los identificadores físicos (NFC/QR) con los perfiles médicos de la cuenta.

## Vistas Disponibles
- **Mis Stickers**: Listado de dispositivos ya vinculados a la cuenta.
- **Activar Nuevo**: Interfaz para registrar hardware recién adquirido.

## Pestaña: Mis Stickers

### Tarjeta de Dispositivo (Control de Hardware)
Cada sticker posee los siguientes elementos registrados:
- **Identificadores Visuales**:
    - **Número de Serie Físico** (`serialPublic`).
    - **ID Corto de Emergencia** (`shortCode`).
- **Estado de Protección**:
    - `Activo`: Visible para paramédicos y enviando notificaciones.
    - `Suspendido`: El perfil se oculta temporalmente (Modo privacidad).
- **Métricas de Impacto**: Conteo de escaneos realizados sobre ese sticker específico.
- **Vigencia**: Fecha de vencimiento del servicio de protección vital.

### Vinculación de Perfiles (Interconexión)
- **Selector de Perfil**: Permite elegir qué [[Cliente-Perfiles-Medicos]] será mostrado cuando alguien escanee ese sticker específico.
- **Efecto de Red**: Cambiar el perfil aquí actualiza instantáneamente la URL pública de emergencia para ese chip.

### Acciones (Botones)
- **Ver Perfil (Negro)**: Abre la vista pública [[Web-Publica]] asociada a ese sticker.
- **Suspender/Reactivar**: Alterna el estado de visibilidad del chip.

## Pestaña: Activar Nuevo

### Proceso de Activación (Seguridad)
1. **Código de Activación**: Input de 12-14 dígitos (proveniente del empaque físico).
2. **Validación**: Verifica contra la tabla [[Esquema-Base-Datos#ChipClaimToken]].
3. **Efecto Secundario**: Marca el chip como `activated` y lo vincula permanentemente a la [[Esquema-Base-Datos#Account]] del usuario.

### Reglas de Negocio
- Un sticker solo puede activarse una vez.
- Requiere un código generado previamente en el módulo [[Admin-Suministro]].

## Interconexiones Técnicas
- **Consumo de API**:
    - `GET /api/chips/dashboard`: Lista chips vinculados.
    - `POST /api/chips/activate`: Procesa el código de activación.
    - `PATCH /api/chips/dashboard`: Cambia el perfil asignado o suspende el servicio.

---
**Protocolo de Obsidian:**
- Relacionado con: [[Admin-Identificadores]], [[Esquema-Base-Datos#Chip]].
- Nota: Al activar un nuevo chip, se recomienda vincularlo inmediatamente a un perfil en [[Cliente-Dashboard]].
