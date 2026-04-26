# Módulo Administrativo: Ajustes (Cimientos)

Configuración global de las pasarelas de pago manuales, comunicaciones y parámetros de demostración del sistema.

## Secciones de Configuración

### 1. Yappy Merchant (Cobro Instantáneo)
Parametrización para la recepción de pagos vía Yappy de Banco General.
- **Handle / Usuario**: Identificador comercial de Yappy (Ej: `@PreRescue.ID`).
- **Código QR**: Imagen cargable que el cliente escanea desde su dashboard.
    - **Función**: Al subir, se utiliza el endpoint `/api/upload` con optimización de bucket general.

### 2. Transferencia ACH (Pagos Bancarios)
Datos para transferencias locales en Panamá.
- **Nombre del Banco**: (Ej: Banco General).
- **Tipo de Cuenta**: (Ahorros / Corriente).
- **Número de Cuenta**: Texto del identificador bancario.
- **Beneficiario**: Nombre legal de la entidad receptora.

### 3. Comunicaciones del Sistema
Configuración técnica de mensajería.
- **Remitente Predeterminado (FROM)**: Correo electrónico vinculado a Resend para el envío de tokens y facturas.
- **Perfil de Demostración (ShortCode)**: Código único utilizado para la vista de "Showcase" y demos públicas.

## Interacciones Técnicas (Botones)
- **Botón Guardar Cambios**: Ejecuta una petición `PATCH` a `/api/admin/config`, actualizando la tabla `SystemConfig` en la base de datos PostgreSQL.
- **Botón Subir QR**: Dispara flujo de carga de archivos multimedia a Supabase Storage.

## Interconexiones Técnicas
- **Impacto en [[Cliente-Dashboard]]**: Todos los datos aquí configurados se reflejan en tiempo real en la vista de "Checkout" del cliente cuando realiza un pedido.
- **Impacto en [[Web-Publica]]**: El perfil de demostración alimenta la landing page para mostrar la capacidad del sistema.

---
**Protocolo de Obsidian:**
- Relacionado con: [[Admin-Inteligencia]], [[Esquema-Base-Datos#SystemConfig]].
-### 4. Seguridad Avanzada (Trust & Compliance)
- **Encriptación en Reposo**: Los campos médicos (`Alergias`, `Condiciones`, `Sangre`) se almacenan mediante AES-256-CBC con llaves rotativas.
- **Borrado Seguro (Protocolo Ley 81)**: Implementado proceso de anonimización completa ante solicitudes de eliminación de cuenta.
- **MFA Administrativo**: Soporte para autenticación de segundo factor para roles de alta jerarquía.
- Integridad: Cambios aquí afectan la visualización de datos sensibles en el front-end del cliente.
