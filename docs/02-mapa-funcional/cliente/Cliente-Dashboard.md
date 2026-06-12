# Panel del Cliente: Dashboard Principal

Vista centralizada de la protección vital del usuario, estado de hardware y gestión de perfiles familiares o corporativos.

## Indicadores de Estado Superior
- **Nivel de Protección**: Muestra el nombre del combo activo (Ej: COMBO FAMILIAR).
    - **Estados de Alerta**: Inactiva (Rojo), Expirado (Destructivo), Protegido (Primario).
- **Contador de Chips**: Relación entre `activeChipsCount` y `maxChipsAllocated`.
- **Notificaciones del Sistema**: Banner dinámico para alertas críticas (ej. escaneo detectado o cuenta sin configurar).

## Secciones Principales

### 1. Gestión de Perfiles Médicos (Fichas Vitales)
Muestra tarjetas interactivas de cada persona protegida bajo la cuenta.
- **Tarjeta de Perfil**:
    - **Campos**: Nombre completo, Foto (actualizable mediante `/api/upload`), Tipo de Sangre, Cantidad de Chips vinculados.
    - **Check Completo**: Icono verde si `firstName`, `lastName` y `bloodType` están llenos.
    - **Botón: Ver Pantallazo del Chip**: Abre la vista pública [[Web-Publica]] para verificar cómo lo vería un Paramédico.
    - **Función**: Al hacer clic, redirige a [[Cliente-Perfiles-Medicos]].

### 2. Acciones Rápidas
- **Botón: Activar Nuevo Chip**: Redirige al flujo de activación en [[Cliente-Dispositivos]].
- **Banner: Hardware en Camino**: Aparece cuando hay pedidos físicos en proceso de envío (Logística).

### 3. Centro de Adquisición (Upsell)
- **Combo Familiar**: Recomendación para usuarios con cuenta personal.
- **Compra de Chips Extra**: Acceso directo para aumentar la capacidad de la red vital.

## Interconexiones Técnicas
- **Consumo de API**:
    - `GET /api/users/familia`: Obtiene el estado de la cuenta y resumen de perfiles.
    - `GET /api/users/notifications`: Carga alertas de seguridad pendientes.
- **Efecto de Red**: Las acciones aquí realizadas (ej. subir foto) actualizan instantáneamente lo que se muestra en el [[Admin-Comunidad]].

## Navegación Lateral (Basado en Captura)
- **Dashboard**: Vista actual.
- **Mis Dispositivos**: [[Cliente-Dispositivos]].
- **Tienda de Chips**: Compra de unidades individuales.
- **Tienda PTY**: Acceso al catálogo de productos.
- **Configuración**: Ajustes de cuenta y seguridad.
- **Perfiles Médicos**: Gestión detallada de la información vital.
- **Historial de Rescate**: Registro de escaneos y emergencias.
- **Contactos de Auxilio**: [[Cliente-Contactos-Auxilio]].

---
**Protocolo de Obsidian:**
- Relacionado con: [[Esquema-Base-Datos#Account]], [[Cliente-Perfiles-Medicos]].
- Nota: Esta es la página de aterrizaje después de que [[User]] inicia sesión.
