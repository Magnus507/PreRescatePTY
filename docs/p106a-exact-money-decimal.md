# P1-06A - Dinero exacto con Prisma Decimal

**Fecha:** 14 de julio de 2026
**Estado:** fase activa cerrada localmente para revisión y validación
**Objetivo:** migrar importes monetarios críticos a `Prisma.Decimal` con serialización estable sin tocar estados de dominio.

## 1. Decisión

Se eligió **Prisma Decimal** para los importes monetarios críticos.

Motivos:

- preserva precisión exacta en persistencia y cálculo;
- encaja con Prisma y con el stack actual sin introducir una librería monetaria nueva;
- permite mantener compatibilidad temporal en rutas y servicios;
- evita el sesgo de redondeo binario de `number` para importes de pago, precio, subtotal y total.

No se adoptó centavos enteros porque esta fase necesitaba el menor cambio estructural posible sobre el esquema actual y porque Prisma ya ofrece `Decimal` como tipo exacto.

## 2. Campos migrados

Campos convertidos a `Decimal(18,2)` en Prisma:

- `Order.amount`
- `OrderItem.unitPrice`
- `OrderItem.totalPrice`
- `CorporateOrderEmployeeItem.unitPrice`
- `CorporateOrderEmployeeItem.subtotal`
- `CorporateProductRequestItem.unitPrice`
- `CorporateProductRequestItem.subtotal`
- `Product.price`
- `Package.price`
- `OperationCommercialOrder.totalAmount`
- `OperationCommercialOrderItem.unitPrice`
- `OperationCommercialOrderItem.totalPrice`

## 3. Campos no migrados

Se dejaron fuera de esta fase:

- `paymentStatus`
- `orderStatus`
- `adminReviewStatus`
- `corporateDeliveryStatus`
- `Chip.serviceStatus`
- `Chip.status`
- estados `Operation*`
- `OrganizationMember` statuses
- `ScanEvent.notificationStatus`
- `CommerceOrderSyncOutbox.status`

También quedaron fuera métricas, cantidades físicas, porcentajes y estados string.

## 4. Precisión y escala

- Precisión: `18`
- Escala: `2`
- Moneda actual: USD y flujos existentes con escala 2

Se rechazan inputs comerciales con más de dos decimales en la capa de negocio. Si aparece un caso especial, debe documentarse explícitamente antes de ampliarlo.

## 5. Serialización

Toda API que expone importes migrados debe devolver strings estables como:

```json
"25.00"
```

No se deben exponer:

- objetos `Decimal` de Prisma;
- notación científica;
- `number` cuando exista riesgo de precisión perdida.

La serialización queda centralizada en `lib/money.ts`.

## 6. Helpers

Helpers creados para esta fase:

- `parseMoney`
- `addMoney`
- `multiplyMoney`
- `serializeMoney`
- `moneyEquals`

Uso esperado:

- `parseMoney` para normalizar entrada desde `string`, `number` o `Decimal` compatible;
- `addMoney` para acumulación exacta;
- `multiplyMoney` para cantidades por precio;
- `serializeMoney` para API/DTO;
- `moneyEquals` para comparaciones exactas en tests y reglas.

## 7. Migración

La migración generada usa cast explícito y no destructivo hacia `DECIMAL(18,2)`.

Reglas de la migración:

- revisar SQL generado antes de aplicar;
- no truncar silenciosamente;
- detectar valores con más de dos decimales antes de ejecutar en un entorno real;
- no aplicar la migración en producción desde Codex.

La base de datos actual se trata como datos de prueba, pero eso no habilita borrado masivo ni suposiciones de cero impacto.

## 8. Compatibilidad

Se actualizaron las capas de lectura y escritura para mantener compatibilidad temporal donde fue necesario.

Puntos cubiertos:

- rutas de compra personal;
- rutas de compra manual;
- órdenes corporativas;
- solicitudes corporativas;
- productos públicos;
- resúmenes internos y notificaciones;
- sincronización operacional de órdenes.

## 9. Pruebas

La fase debe cubrir, como mínimo:

- `0.1 + 0.2`;
- cantidad × precio;
- subtotales;
- suma de líneas;
- total de pedido;
- pedido multiproducto;
- pedido corporativo;
- producto;
- package legacy;
- `OperationCommercialOrder`;
- cero;
- negativos rechazados donde corresponda;
- más de dos decimales;
- valores grandes;
- serialización a string;
- parseo desde string;
- compatibilidad de APIs;
- no regresión de pago manual;
- no regresión de reserva, backorder o producción.

## 10. Despliegue

- aplicar primero en entorno local y de prueba;
- revisar el SQL de migración antes de cualquier ejecución;
- validar `prisma validate`, `prisma generate`, typecheck, lint, tests, coverage, build y audit;
- no promover a producción desde esta fase.

## 11. Rollback

Rollback recomendado:

- revertir migración si aún no se aplicó en un entorno persistente;
- si ya se aplicó en un entorno de prueba, volver a `number` solo con una migración inversa explícita;
- preservar la serialización a string hasta que el schema vuelva a `number`;
- no mezclar rollback de dinero con cambios de estados.

## 12. Conclusión

**¿Persisten Float en importes críticos cubiertos por esta fase? No.**

La fase P1-06A deja los importes críticos migrados a `Prisma.Decimal` y serializados como string en las superficies auditadas. Los estados de dominio quedan para P1-06B.
