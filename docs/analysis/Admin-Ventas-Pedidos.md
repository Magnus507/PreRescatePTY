# Módulo Administrativo: Ventas & Pedidos

Gestión logística de despacho, validación de pagos (CRM) y cumplimiento de órdenes de hardware.

## Estados del Pedido
- **Pendiente**: Orden creada, esperando comprobante o validación inicial.
- **Revisión Pagos**: El usuario ha subido un comprobante que debe ser verificado.
- **Enviado**: Los chips físicos han sido asignados y despachados.
- **Completado**: Vínculo digital finalizado y tokens de activación generados.
- **Cancelada**: Pedido declinado o expirado.

## Panel de Listado
### Filtros
- **Pestañas**: Todos, Por Revisar, Enviados, Completados.
- **Botón Limpiar Cancelados**: Borrado masivo de órdenes en estado `cancelled`.

### Campos por Registro
- **ID / Fecha**: Número de orden (truncado) y fecha de creación.
- **Cliente**: Nombre completo y documento de identidad (`customerDocument`).
- **Contacto**: Email y link directo a WhatsApp habilitado para el número registrado.
- **Monto (Items)**: Precio total de la transacción y cantidad de artículos.
- **Estado**: Badge visual de estado y marca de "✓ Pago Subido" si existe evidencia.

## Vista Detallada (Logística & Despacho)

### Sección: Destinatario & Envío
- **Información del Cliente**: Datos de contacto con botón para abrir WhatsApp.
- **Dirección de Envío**: Detalles geográficos y notas especiales de entrega.

### Sección: Picking Físico (Asignación)
Es el puente entre el pedido y el stock de [[Admin-Suministro]].
- **Buscador de Inventario**: Permite escanear o buscar chips disponibles en stock.
- **Contador de Chips**: Muestra cuántos chips se han asignado frente a los requeridos por el combo comprado (Ej: Combo Dúo = 2 chips).
- **Asignación Manual**: Los chips seleccionados se vinculan a la orden al "Finalizar Pedido".

### Sección: Comprobante & Pago
- **Monto Total**: Visualización destacada en USD.
- **Evidencias**: Visualizador de imagen del comprobante de pago subido por el cliente.

## Acciones de Gestión (Botones)
- **Eliminar Permanente**: Solo disponible para órdenes canceladas.
- **Declinar Orden**: Cambia estado a `cancelled`.
- **Marcar como Enviado**: Cambia estado a `shipped` tras asignar los chips.
- **Finalizar Pedido**: Ejecuta la lógica de generación de tokens de activación y cierra la transacción.

## Interconexiones Técnicas
- **Generación de Tokens**: Al completar el pedido, se disparan entradas en la tabla `ChipClaimToken` de [[Esquema-Base-Datos#ChipClaimToken]].
- **Vínculo con Cliente**: El usuario recibe una notificación en su [[Cliente-Dashboard]] cuando el pedido cambia de estado.

---
**Protocolo de Obsidian:**
- Relacionado con: [[Admin-Suministro]], [[Cliente-Pedidos]], [[Esquema-Base-Datos#Order]].
- Nota: Una orden completada habilita automáticamente la capacidad de activación en el panel del cliente.
