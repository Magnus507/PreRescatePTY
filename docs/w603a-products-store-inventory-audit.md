# W6.03A - Auditoría de Productos, Tienda Única, Inventario y Tipos de Dispositivo

## Estado General

La arquitectura actual ya tiene piezas útiles para unificar catálogo, tienda e inventario sin reconstruir todo desde cero.

Lo que existe hoy:

- `Product` como catálogo comercial simple
- `TiendaSection` consumiendo `Product` y stock operativo
- `OperationFinishedGood` como producto terminado operativo
- `OperationDigitalBatch` y `OperationFinishedGoodUnit` como origen de labels y unidades físicas
- `Chip` y `DigitalPass` como capas separadas para activación y perfil público
- `OrganizationMember` y `CorporatePublicProfile` como base empresarial

Lo que falta:

- una taxonomía única y fuerte entre catálogo comercial, producto terminado e inventario
- una capa explícita de publicación de productos en vez de inferirla desde `description`
- una relación canónica entre `Product` y `OperationFinishedGood`
- un contrato unificado para tipos de dispositivo

## Catálogo / Product

`Product` existe y tiene estos campos relevantes:

- nombre
- descripción
- precio
- categoría
- stock
- imagen
- `isActive`
- `productType`
- `estimatedProductionTime`
- `requiresPersonalization`

Observación:

- `Product` es suficiente como catálogo visual/comercial, pero hoy no representa por sí solo el inventario físico ni la producción.

## Producto Terminado

Sí existe un modelo separado: `OperationFinishedGood`.

Relación operativa:

- `OperationProductionOrder` define la orden de producción
- `OperationDigitalBatch` define rangos y códigos operativos
- `OperationFinishedGoodUnit` materializa la unidad física

Conclusión:

- el sistema ya tiene una línea operativa real para fabricar y rastrear inventario
- lo que falta es una unión más explícita con el catálogo comercial

## Tienda Única

La tienda admin actual:

- vive en [`app/(admin)/admin/_components/sections/TiendaSection.tsx`](/Users/geancusatti/Documentos/Proyectos/PreRescatePTY/app/(admin)/admin/_components/sections/TiendaSection.tsx)
- consume `/api/admin/products`
- consume `/api/admin/operations/inventory/stock`
- muestra productos publicados y el stock operativo asociado

Hallazgo:

- la publicación comercial no parece estar modelada como entidad propia
- se infiere de metadata textual en `description` y del stock operativo

## Inventario Físico

Modelos relevantes:

- `OperationFinishedGoodUnit`
- `OperationDigitalBatch`
- `OperationDigitalBatchItem`
- `OperationFinishedGood`
- `OperationDispatch`

Campos útiles ya existentes:

- `internalLabel`
- `shortCode`
- `status`
- `productCode`
- `productName`
- `productType`
- `activationStatus`
- `reservedOrderId`
- `deliveredAt`

Estado actual observado:

- el inventario operativo ya está limpio tras W6.01
- las unidades se agrupan por `productCode`
- `available`, `reserved`, `qa_pending`, `delivered` y `activated` ya existen como estados de trabajo

## Producción

La producción ya tiene una arquitectura operativa clara:

- `OperationProductionOrder` como cabecera
- `OperationProductionOrderItem` para consumos
- `OperationFinishedGood` para producto terminado
- `OperationDigitalBatch` para secuencias y rangos
- `OperationFinishedGoodUnit` para unidades físicas

Conclusión:

- sí existe una base real para fabricar inventario
- no conviene reconstruirla; conviene mapearla mejor al catálogo

## Tipos de Dispositivo

Campos que ya sugieren extensibilidad:

- `Product.productType`
- `OperationFinishedGood.productType`
- `OperationDigitalBatch.productType`
- `OperationFinishedGoodUnit.productType`
- `Chip.productType`
- `Profile.profileType`
- `Account.accountType`
- `Organization.organizationType`
- `Chip.nicheType`

Conclusión:

- el sistema ya admite tipos, pero no hay un contrato único que los normalice
- para soportar tipos futuros conviene crear una capa de mapeo y no más campos sueltos

## Empresarial

Sí existe base empresarial:

- `Organization`
- `OrganizationMember`
- `CorporatePublicProfile`
- `CorporateProductRequest`
- `CorporateOrderEmployeeItem`

Conclusión:

- el módulo empresarial ya está presente
- W6.07 debería reutilizar esta base sin mezclarla con la tienda normal

## Riesgos Contra Pedidos

Riesgos detectados:

- si `Product.name` o `Product.price` cambian, Pedidos podría romper el historial si toma valores vivos en vez de persistidos
- si la tienda depende de `description` para publicación, editar textos puede ocultar productos por accidente
- inventario y pedidos comparten códigos y nombres operativos, así que hace falta una frontera más explícita

## Qué Se Puede Adaptar

- `Product` como catálogo base
- `OperationFinishedGood` como producto terminado
- `OperationFinishedGoodUnit` como inventario real
- `OperationDigitalBatch` como secuenciador
- `TiendaSection` como vista comercial

## Qué No Debe Reconstruirse

- no reconstruir pedidos
- no reconstruir activación
- no reconstruir inventario operativo desde cero
- no reconstruir tienda sin necesidad

## Recomendación para W6.03B

W6.03B debería introducir una capa delgada de mapeo canónico entre catálogo comercial e inventario operativo.

Objetivo técnico:

- mantener Pedidos congelado
- mejorar claridad de tienda e inventario
- permitir nuevos tipos de dispositivo sin fragmentar el modelo

