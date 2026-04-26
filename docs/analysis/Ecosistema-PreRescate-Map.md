# Mapa General del Ecosistema PreRescate PTY

Este documento es el nodo central de la auditoría técnica. Define las interconexiones entre los tres grandes pilares del sistema.

## 🏛️ [[Panel-Administrativo]] (Control Maestro)
*El cerebro operativo del sistema.*
- [[Admin-Inteligencia]]: Monitoreo de KPIs y salud del sistema.
- [[Admin-Suministro]]: Gestión de inventario físico y lotes NFC.
- [[Admin-Comunidad]]: Gestión de usuarios y protección legal.
- [[Admin-Ventas-Pedidos]]: Logística de despacho y validación de pagos.
- [[Admin-Ajustes]]: Configuración de pasarelas y comunicaciones.

## 👤 [[Panel-del-Cliente]] (Control de Usuario)
*La interfaz de protección del ciudadano.*
- [[Cliente-Dashboard]]: Centro de mando y estado de protección.
- [[Cliente-Dispositivos]]: Activación y vinculación de stickers físicos.
- [[Cliente-Perfiles-Medicos]]: Gestión de fichas clínicas vitales.
- [[Cliente-Contactos-Auxilio]]: Configuración de la red de guardianes.
- [[Cliente-Historial-Rescate]]: Trazabilidad de emergencias y escaneos.

## 🌐 [[Website-Publico]] (Captación y Emergencia)
*La cara externa y motor de respuesta.*
- [[Web-Publica]]: Landing page y propuesta de valor.
- [[Web-Tienda]]: Adquisición de kits y registro de miembros.
- [[Web-Motor-Emergencia]]: Entrega de información vital a paramédicos.

## 💾 Infraestructura de Datos
- [[Esquema-Base-Datos]]: Definición de modelos Prisma y relaciones.

---
## Diagrama de Flujo Crítico (Interconexiones)

1. **Adquisición**: El usuario entra por [[Web-Publica]], compra en [[Web-Tienda]], creando una orden en [[Admin-Ventas-Pedidos]].
2. **Activación**: Tras recibir el sticker, el usuario lo activa en [[Cliente-Dispositivos]], consumiendo stock de [[Admin-Suministro]].
3. **Emergencia**: Ante un accidente, el rescatista accede a [[Web-Motor-Emergencia]], lo cual dispara alertas a [[Cliente-Contactos-Auxilio]] e historial en [[Cliente-Historial-Rescate]].
4. **Supervisión**: El administrador monitorea el éxito del rescate y KPIs en [[Admin-Inteligencia]].

---
**Protocolo Obsidiana:**
- Esta carpeta `docs/analysis/` es de **SÓLO LECTURA**.
- Cualquier cambio en la estructura del código debe reflejarse aquí instantáneamente.
- Los enlaces `[[WikiLinks]]` permiten una navegación no lineal e inmediata.
