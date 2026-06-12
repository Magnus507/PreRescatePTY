# Módulo Administrativo: Comunidad (Usuarios)

Gestión centralizada de perfiles vitales, cuentas de usuario y niveles de protección.

## Vistas de Filtrado
- **Todos**: Listado completo de usuarios registrados.
- **Activos**: Usuarios que tienen al menos 1 chip vinculado a su cuenta.
- **Sin Chip**: Usuarios registrados que aún no han activado ningún dispositivo.

## Navegación y Búsqueda
- **Barra de Búsqueda**: Permite filtrar por `email`, `nombre` o `teléfono`.
- **Acceso por ID**: Al hacer clic en una fila, se abre la vista detallada del usuario [[Admin-Comunidad-Detalle]].

## Campos por Registro (Tabla)
- **Usuario**: Muestra el `email` y la fecha de creación de la cuenta.
- **Perfil Médico**: Extrae datos de la tabla [[Esquema-Base-Datos#Profile]].
    - Nombre completo (`firstName`, `lastName`).
    - Teléfono (`phone`).
    - Tipo de Sangre (`bloodType`) - Resaltado en rojo si existe.
- **Activaciones**: Conteo de chips vinculados (`_count.chips`).
- **Estado**: Etiqueta visual (Activa/Inactiva) basada en si tiene chips.

## Elementos Interactivos (Botones)
- **Botón Buscar (Lupa)**: Abre la ficha técnica completa del usuario.
- **Botón Eliminar (Rojo)**: Ejecuta `handleDeleteUser` (Eliminación en cascada de cuenta, perfiles y vínculos).

## Interconexiones Técnicas
- **Conexión con [[Admin-Identificadores]]**: Permite rastrear qué dispositivos pertenecen a qué usuario.
- **Conexión con [[Admin-Corporativo]]**: Identifica si el usuario es miembro de una organización.
- **API Call**: Las acciones de búsqueda invocan `loadUsers()` que sincroniza el estado local con la base de datos PostgreSQL.

---
**Protocolo de Obsidian:**
- Relacionado con: [[Esquema-Base-Datos#User]], [[Esquema-Base-Datos#Profile]].
- Roles de Acceso: Master Admin / Super Admin solamente.
