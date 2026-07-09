# W6.03B - Diseño Técnico de Mapeo Canónico Producto / Tienda / Inventario / Tipo de Dispositivo

## Contexto

Este diseño parte de la auditoría W6.03A y no modifica nada todavía.

Lo que ya existe:

- `Product` como catálogo comercial
- `TiendaSection` consumiendo catálogo y stock operativo
- `OperationFinishedGood`, `OperationDigitalBatch`, `OperationFinishedGoodUnit` y `OperationProductionOrder` como base operativa real
- `Chip`, `DigitalPass`, `Profile`, `Organization` y `OrganizationMember` como soporte de activación y empresarial

Lo que falta:

- una taxonomía canónica entre catálogo comercial, producto terminado e inventario
- una publicación explícita de tienda
- un contrato unificado de tipos de dispositivo

## 1. Principio Central

La separación conceptual debe quedar así:

- `Product` = catálogo comercial, qué se vende y cómo se presenta
- `OperationFinishedGood` = producto terminado operativo, qué se fabrica
- `OperationFinishedGoodUnit` = unidad física, qué se reserva, entrega y activa
- `Product` → `OperationFinishedGood` = puente canónico entre tienda y operación

Frase clave:

> El nombre/precio se copian al pedido para histórico, pero `productId`/`finishedGoodId`/`productCode` gobiernan la operación.

Consecuencia:

- Pedidos conserva el histórico de compra
- Operaciones usa identificadores estables
- la tienda no inventa lógica nueva por sí sola

## 2. Modelo Conceptual Propuesto

Se recomienda una capa delgada de mapeo canónico, por ejemplo:

- `ProductOperationalMapping`

o un nombre equivalente que el proyecto considere más natural.

Campos conceptuales sugeridos:

- `productId`
- `finishedGoodId`
- `productCode`
- `deviceType`
- `storeSection`
- `purchaseFlow`
- `activationFlow`
- `visibilityRules`
- `requiresCompanyContext`
- `requiresApproval`
- `requiresPersonalization`
- `isPublished`
- `sortOrder`
- `badges`
- `labels`

Propósito de esta capa:

- separar catálogo de operación
- definir comportamiento de tienda y activación sin duplicar reglas en múltiples sitios
- permitir tipos futuros sin ensuciar `Product` con lógica de negocio específica

## 3. Tipos de Dispositivo Canónicos

Se propone un contrato extensible, con nombres que puedan alinearse con la convención actual del proyecto.

Propuesta base:

- `personal`
- `business`
- `pet`
- `custom_personal`
- `custom_business`
- `future`

Cada tipo debería declarar:

- sección de tienda
- módulo destino
- tipo de perfil permitido
- flujo de compra o solicitud
- flujo de activación
- si requiere empresa activa
- si requiere aprobación
- si permite compra directa

### Ejemplo conceptual

`personal`

- sección de tienda: Dispositivos personales
- compra directa
- activación normal
- perfil personal o familiar

`business`

- sección de tienda: Dispositivos empresariales
- solicitud desde tienda única
- aprobación empresarial
- activación empresarial
- perfil empresarial del empleado

`pet`

- sección de tienda: Mascotas
- futuro módulo mascotas
- perfil mascota

Observación:

- los nombres exactos pueden ajustarse después
- lo importante ahora es que el contrato sea único y extensible

## 4. Tienda Única por Secciones

La tienda debe seguir siendo una sola.

Lo que cambia es:

- sección
- visibilidad
- flujo disparado por el tipo de dispositivo

Estructura conceptual propuesta:

- Dispositivos personales
- Dispositivos empresariales
- Mascotas
- Personalizados
- Futuros

Regla:

- la tienda no se divide en módulos aislados por tipo
- la misma tienda enruta a distintos flujos según el mapeo canónico

## 5. Publicación Explícita

No conviene seguir infiriendo publicación desde `description`.

Opciones a considerar:

### A. Agregar campos a `Product`

Pros:

- simple de leer
- pocos joins

Contras:

- mezcla catálogo con comportamiento de tienda
- difícil de extender sin ensuciar `Product`

### B. Nueva tabla de publicación

Pros:

- separa catálogo de reglas de exposición
- permite cambiar visibilidad sin tocar el catálogo base

Contras:

- más tablas y más joins

### C. Tabla de mapeo canónico

Pros:

- concentra catálogo, tienda e inventario en una sola capa delgada
- permite definir publicación y flujo en el mismo punto
- es la opción con menor riesgo arquitectónico para este momento

Recomendación:

- usar una tabla de mapeo canónico como fuente principal
- mantener `Product` como catálogo base
- evitar meter demasiadas reglas de publicación dentro de `Product`

Campos conceptuales posibles para publicación:

- `isPublishedInStore`
- `storeSection`
- `storeVisibility`
- `storeBadge`
- `storeDescription`
- `displayName`
- `displayPrice`
- `displayImage`
- `requiresLogin`
- `requiresBusinessModule`
- `requestOnly`
- `buyNow`
- `comingSoon`

## 6. Relación con Pedidos Congelado

Pedidos no debe reinterpretarse por cambios en catálogo o tienda.

Reglas de compatibilidad:

- `OrderItem` copia nombre y precio al momento de compra
- `OrderItem` conserva referencia operativa estable si ya existe o se agrega luego
- no recalcular pedidos históricos por cambios en `Product`
- no cambiar tabs ni estados de admin
- no tocar aprobación, reserva, despacho ni activación
- reserva debe usar `productCode` o `finishedGoodId`, no el nombre visible
- activación sigue separada

Este bloque es clave:

- si cambia el catálogo visual, el pedido histórico no debe cambiar
- si cambia el inventario, el pedido histórico no debe reinterpretarse

## 7. Relación con Producción

La producción debe seguir siendo la fuente que fabrica inventario físico.

Reglas:

- producción sigue creando `OperationFinishedGoodUnit`
- producción debe seleccionar `OperationFinishedGood`
- `OperationFinishedGood` debe tener `productCode` estable y único
- tienda no crea inventario
- producción alimenta inventario
- tienda muestra disponibilidad calculada o informativa

Conclusión:

- producción y tienda se conectan por mapeo, no por acoplamiento directo

## 8. Relación con Inventario

Inventario real vive en `OperationFinishedGoodUnit`.

Reglas:

- el stock por producto se calcula por `finishedGoodId` / `productCode` / `status`
- `Product.stock` no debe ser la única fuente de verdad si existe stock operativo
- si `Product.stock` se mantiene, debe quedar documentado como cache, display o compatibilidad legacy

La intención es:

- evitar que el catálogo comercial reemplace al inventario real
- permitir que inventario operativo y tienda convivan sin duplicar reglas

## 9. Admin UX Esperado

### En productos / admin

Debe mostrarse:

- badge Normal / Empresarial / Mascota / Personalizado
- producto terminado asociado
- stock operativo
- sección de tienda
- publicado / no publicado
- flujo: compra directa / solicitud / aprobación

### En producto terminado

Debe mostrarse:

- botón ver inventario
- producto comercial asociado
- tipo de dispositivo
- `productCode`
- unidades por estado

Objetivo visual:

- que el admin entienda de inmediato qué se vende, qué se fabrica y qué se entrega

## 10. Migración Futura Segura

### W6.03C

- implementar solo la capa mínima de mapeo
- no romper `Product` actual
- backfill seguro para los 4 productos actuales

### W6.03D

- UI admin con badges y mapeo visual

### W6.03E

- tienda única por secciones

### W6.03F

- pruebas visuales y auditoría de Pedidos

## 11. Riesgos y Decisiones Pendientes

Decisiones que siguen abiertas:

- si la tabla nueva debe vivir junto a `Product` o como entidad separada
- si `Product.productType` debe normalizarse o mantenerse como campo flexible
- cómo manejar `Product.stock` actual
- cómo mapear los 4 productos actuales
- cómo preservar compatibilidad con `TiendaSection`
- cómo evitar romper Pedidos
- cómo dejar listo `business` y `pet` sin implementarlos por completo

Riesgo principal:

- construir una nueva abstracción sin un puente claro podría duplicar reglas y crear deuda mayor

## 12. Recomendación Final

La mejor dirección para W6.03 es:

- mantener `Product` como catálogo comercial base
- introducir una capa canónica de mapeo para tienda e inventario
- dejar `OperationFinishedGood` y `OperationFinishedGoodUnit` como verdad operativa
- no tocar Pedidos congelado
- no mezclar activación con catálogo

En resumen:

- catálogo vende
- producto terminado fabrica
- unidad física se reserva y se entrega
- la tienda expone secciones
- el mapeo canónico gobierna el comportamiento

