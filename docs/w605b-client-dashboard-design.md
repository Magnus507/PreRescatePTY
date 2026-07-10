# W6.05B - Diseño del Nuevo Panel Cliente

## 1. Principio de Diseño

El panel cliente debe dejar de sentirse como una mezcla de cuenta, catálogo y operaciones sueltas, y pasar a ser un centro de control claro para la vida del usuario dentro de PreRescatePTY.

### Principios rectores

- Primero entender, después actuar.
- El usuario debe ver su estado, sus perfiles y sus dispositivos antes de entrar a compra o activación.
- Chip, sticker, dispositivo y código público deben convivir con vocabulario consistente.
- La ficha pública es una salida del sistema, no el foco principal del panel.
- Tienda, activación y pedidos deben estar separados visualmente aunque estén conectados operacionalmente.

## 2. Navegación Propuesta

La navegación principal propuesta para W6.05B es:

1. Inicio
2. Perfiles médicos
3. Mis dispositivos
4. Activar chip
5. Tienda
6. Mis pedidos
7. Empresa
8. Ajustes

### Reglas de navegación

- `Accesorios` deja de existir como ítem independiente y pasa a ser una sección dentro de `Tienda`.
- `Combos` deja de vivir como CTA suelto y se integra dentro de `Tienda`.
- `Historial PreRescue ID` debe integrarse en `Mis dispositivos` o en `Inicio` como actividad reciente.
- `Perfil` y `Ajuste de Perfil` pueden mantenerse separados solo si `Ajustes` no compite con `Inicio` como centro principal.
- En móvil, la navegación debe priorizar acceso rápido a Inicio, Perfiles, Dispositivos, Activación y Tienda.

## 3. Dashboard Inicio Propuesto

El inicio debe funcionar como un resumen operativo y no como una tarjeta de marketing.

### Tarjetas principales

#### Estado de cuenta

- cuenta activa, inactiva o vencida
- tipo de cuenta: personal, multiusuario o empresarial
- estado de protección general

#### Perfiles médicos

- cantidad de perfiles
- perfiles protegidos
- perfiles sin chip
- CTA: `Gestionar perfiles`

#### Dispositivos / chips

- chips activos
- chips disponibles
- chips pendientes de activar
- CTA: `Activar chip`
- CTA: `Ver dispositivos`

#### Ficha pública

- acceso rápido a la ficha pública de perfiles con chip
- copiar enlace
- ver ficha

#### Tienda

- compra de sticker o dispositivo
- acceso a secciones de productos
- productos con base operativa real

#### Pedidos

- últimos pedidos
- estado resumido
- acceso directo a historial

### Métricas recomendadas

La métrica actual `chips activos / límite total` debe evolucionar a un bloque más claro:

- chips activos
- chips disponibles
- chips comprados
- perfiles usados
- capacidad total
- pendientes de activar

### Criterio visual

- La cuenta debe ser la tarjeta de contexto.
- Perfiles y dispositivos deben ser las tarjetas de acción.
- Tienda y pedidos deben ser tarjetas de salida/comercio.
- La ficha pública debe aparecer como una acción útil, no como una curiosidad técnica.

## 4. Perfiles Médicos Propuesto

La vista de perfiles médicos debe reflejar lo ya cerrado en W6.10.

### Cada tarjeta de perfil debe mostrar

- foto o avatar
- nombre
- alias
- principal / adicional
- edad si existe
- sangre
- alergias resumidas
- condiciones resumidas

### Badges obligatorios

- con chip
- sin chip
- retorno seguro
- asistencia especial
- menor de edad
- ficha pública activa

### Acciones por perfil

- `Gestionar perfil`
- `Ver ficha pública`
- `Activar chip` o `Vincular chip` si no tiene chip
- `Contactos`

### Criterios de copy

- Evitar `Ver pantallazo del chip`.
- Preferir `Ver ficha pública`.
- Preferir `Gestionar perfil`.
- Preferir `Activar chip`.

### Estado de protección

- Un perfil con chip activo debe verse como protegido.
- Un perfil sin chip debe verse como pendiente de vinculación o activación.
- Un perfil con retorno seguro o asistencia especial debe comunicarlo como contexto útil, no como adorno.

## 5. Mis Dispositivos Propuesto

La página de dispositivos debe separar con claridad los estados operativos.

### Estados a mostrar

- chips activos
- chips sin asignar
- chips pendientes de activar
- chips suspendidos
- chips vencidos, si existen

### Datos por dispositivo

- código operativo o `internalLabel`, cuando aplique
- `shortCode` público
- estado
- perfil vinculado
- expiración, si aplica
- escaneos, si aporta valor

### Acciones por dispositivo

- `Ver ficha pública`
- `Vincular perfil`
- `Suspender` o `Reactivar` si la funcionalidad ya existe
- `Activar nuevo chip`

### Reglas semánticas

- `internalLabel` es operativo.
- `shortCode` es público.
- `serialPublic` sirve como identificador visible de hardware.
- El usuario no debería tener que adivinar cuál es el código correcto para compartir.

## 6. Activar Chip Propuesto

La pantalla de activación debe separar intención y compra.

### Estructura

1. Tengo un código de activación
2. Quiero comprar un chip

### Mensajes clave

- Comprar un chip no equivale a activarlo.
- Activar requiere un código ya adquirido.
- Pedidos y activación deben sentirse como pasos relacionados, no como una sola acción.

### Criterio UX

- La activación debe ser un flujo corto y directo.
- La compra debe llevar a tienda/pedido.
- No debe mezclarse el texto de activación con el de compra.

## 7. Tienda Propuesta

La tienda debe alinearse con W6.03 y dejar de ser una mezcla de catálogo y combo legado.

### Organización

- tienda única por secciones
- productos personales
- productos empresariales
- accesorios
- productos personalizados
- futuros módulos

### Reglas operativas

- Solo mostrar productos válidos con base operativa real.
- Productos sin base operativa no deben aparecer.
- Stock 0 debe mostrarse como agotado.
- Chips Extra debe venir de `ProductOperationalMapping` o de la lógica operativa real, no hardcodeado visualmente.

### Convivencia con precios

- El precio no debe parecer un texto fijo si en realidad sale de un producto/ regla de negocio.
- `Combos` debe integrarse dentro de la tienda o desaparecer como entrada separada.

## 8. Empresa Propuesta

Empresa debe aparecer como módulo existente, no como rediseño completo.

### Lo que sí debe mostrar

- estado de vinculación
- acceso a productos empresariales
- solicitudes
- pedidos corporativos

### Lo que no debe intentar resolver todavía

- el flujo empresarial completo
- la navegación corporativa total
- la edición profunda de colaboradores

### Criterio de convivencia

- Mientras W6.07 no llegue, Empresa debe estar visible como ruta clara pero no dominando el panel consumidor.

## 9. Responsive / Mobile

El diseño debe funcionar bien en escritorio y móvil sin duplicar demasiada complejidad.

### Desktop

- sidebar colapsable al estilo admin
- mejor aprovechamiento del ancho de pantalla
- tarjetas con jerarquía clara
- menos scroll vertical improductivo

### Móvil

- bottom nav o drawer accesible
- botones grandes y separados
- cards apiladas
- evitar overflow horizontal
- CTAs críticos visibles sin saturación

### Accesibilidad visual

- acciones de compra y activación no deben estar pegadas
- cada tarjeta debe tener un CTA principal claro
- el usuario debe entender qué puede hacer en cada bloque sin leer demasiado

## 10. Relación con W6.05A, W6.04 y W6.10

- W6.05A confirmó que el panel actual mezcla demasiadas funciones.
- W6.04 sigue siendo la capa de seguridad pública.
- W6.10 dejó estable la ficha pública y los perfiles médicos.
- W6.05B debe diseñar el nuevo panel sin romper lo ya estabilizado.

## 11. Recomendación Final

El nuevo panel cliente debería construirse como una experiencia por etapas:

1. Resumen
2. Perfiles
3. Dispositivos
4. Activación
5. Tienda
6. Pedidos
7. Empresa
8. Ajustes

Ese orden deja la operación médica y de chips primero, y el comercio después, sin perder los flujos existentes.
