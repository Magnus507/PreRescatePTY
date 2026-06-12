# Módulo Administrativo: Suministro (Inventario)

Este módulo gestiona la logística de hardware, el stock físico y la fabricación industrial de nuevos lotes de identificadores.

## Vistas / Sub-pestañas
- **Pestaña "Inventario"**: Listado de todos los chips en estado `inventory`.
- **Pestaña "Crear Lote"**: Interfaz para generar nuevos identificadores masivamente.

## Pestaña: Inventario

### Filtros y Controles de Navegación
- **Selector Stock Físico / Entrega Digital**: Filtra chips por el campo `isPhysical`.
- **Buscador**: Filtra por `shortCode`, `serialPublic` o `internalLabel`.
- **Botón Recargar (Loading icon)**: Ejecuta `loadChips()` para refrescar desde el backend.

### Campos por Registro (Tabla)
- **Checkbox de Selección**: Permite operaciones en lote.
- **Etiqueta Interna (Input)**: Edición directa del campo `internalLabel` de [[Esquema-Base-Datos#Chip]].
- **Identificadores**: Muestra `serialPublic` y `shortCode`.
- **Código de Activación**: Muestra el `activationCode` asociado en [[Esquema-Base-Datos#ChipClaimToken]].
- **Preparación Física (Toggle)**: Alterna entre "En Físico" y "Solo Digital" (actualiza `isPhysical`).
- **NFC / Ver QR / Físico (Botones rápidos)**: Acciones de visualización y copia de URLs.

### Acciones en Lote
- **Botón Eliminar (Rojo)**: Ejecuta eliminación permanente configurada con Protección de Integridad.
- **Botón Exportar Códigos**: Genera archivo CSV para imprenta.

## Pestaña: Crear Lote

### Campos de Formulario
- **Cantidad de Identificadores**: Input numérico para definir el tamaño del lote.
- **Base de Etiqueta (Opcional)**: Prefijo para `internalLabel` (ej. "LOTE-A").
- **Inicio de Numeración**: Punto de partida para el conteo de etiquetas.

### Interconexiones Técnicas
- **Función `createBatch`**: Invoca el endpoint `/api/admin/chips/inventory` mediante [[chips.service.ts]].
- **Efecto Secundario**: Genera registros únicos en las tablas `Chip` y `ChipClaimToken` simultáneamente.
- **Vínculo con Comunidad**: Un chip en "Suministro" no está vinculado a ninguna [[Account]] hasta su activación.

---
**Protocolo de Obsidian:**
- Relacionado con: [[Admin-Identificadores]], [[Esquema-Base-Datos#Chip]].
- Nivel de Seguridad: Requiere rol `admin`, `superadmin` o `imprenta`.
