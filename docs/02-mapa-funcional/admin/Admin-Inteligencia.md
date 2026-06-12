# Módulo Administrativo: Inteligencia (Panel Raíz)

Centro de comando principal para la monitorización de métricas críticas, salud del ecosistema y alertas operativas.

## Indicadores Clave de Desempeño (KPIs)
- **Usuarios Totales**: Conteo general de registros en [[Esquema-Base-Datos#User]].
- **Chips en Red**: Total de identificadores producidos (vínculo con [[Admin-Suministro]]).
- **Salud del Sistema**: Número de identificadores activados (`activated`).
- **Impacto**: Total de eventos registrados en [[Esquema-Base-Datos#ScanEvent]].

## Secciones de Análisis

### 1. Radar de Crecimiento (Marketing)
Muestra oportunidades de negocio basadas en el comportamiento del usuario.
- **Campo: Usuarios Sin Chip**: Identifica el segmento que completó el registro pero no la compra/activación.
- **Función**: Sugerencia automática de campañas para conversión.

### 2. Pendientes Críticos (Operaciones)
Tareas que requieren intervención administrativa inmediata.
- **Pagos por Validar**: Órdenes en estado `pending` de la tabla [[Esquema-Base-Datos#Order]].
    - **Botón**: Al hacer clic, redirige a [[Admin-Ventas-Pedidos]].
- **Chips Sin Perfil**: Usuarios que activaron un chip pero no han llenado su [[Esquema-Base-Datos#Profile]].

### 3. Pulso de la Red (Actividad en Tiempo Real)
Visualización de los escaneos más recientes a nivel nacional.
- **Campos**: Código ID (`shortCode`), Ciudad, Fuente (QR o NFC) y marca de tiempo.
- **Botón Recargar**: Sincroniza los últimos escaneos sin refrescar toda la página.

### 4. Nuevos Miembros
Feed vertical con los últimos registros.
- **Campos**: Email, Primera letra del nombre (avatar), Fecha de registro.
- **Funcionalidad**: Al hacer clic, abre el detalle del usuario en [[Admin-Comunidad]].

## Herramientas de Mantenimiento
- **Botón: Purgar Caché**: Ejecuta el endpoint `/api/admin/maintenance/clear-cache` (Purga Redis).
- **Alerta de Almacenamiento**: Banner dinámico que se dispara al superar el 80% de capacidad en Supabase.

## Interconexiones Técnicas
- **Consumo de Datos**: Utiliza el hook `useAdminManager` para consolidar datos de múltiples dominios.
- **Dependencias**: [[Admin-Comunidad]], [[Admin-Suministro]], [[Admin-Ventas-Pedidos]].

---
**Protocolo de Obsidian:**
- Relacionado con: [[Admin-Gobernanza]], [[Admin-Soberania]].
- Nota: Este módulo es el "Cerebro" del sistema y centraliza alertas de todos los demás.
