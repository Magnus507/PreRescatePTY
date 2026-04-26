# Arquitectura PreRescue ID

Este es el índice principal (Obsidian) para organizar mentalmente la aplicación. La web está separada en 3 pilares fundamentales para evitar enredos de código y saber exactamente dónde se debe intervenir cuando hay un error.

## 1. Website (Público)
Rutas en: `app/(public)/*`
- Landing Page
- Proceso de Registro (`/registro`)
- Tienda Pública (`/tienda`)
- Validación de Chips Pública (`/validar`)

*Consulta el archivo `01_Website.md` para detalles.*

## 2. Cliente (Dashboard y Ficha Médica)
Rutas en: `app/(app)/dashboard/*`
- Ficha Médica / Identidad (Sección de perfiles de usuario y familiares)
- Chips Activos
- Tienda Interna
- Configuración de Cuenta

*Consulta el archivo `02_Cliente.md` para detalles.*

## 3. Admin (Gestión y Logística)
Rutas en: `app/(admin)/admin/*`
- Inventario de Chips (Asignación manual/digital)
- CRM y Gestión de Pedidos (Picking de almacén, Validación de Pagos)
- Control de Usuarios y Planes

*Consulta el archivo `03_Admin.md` para detalles.*
