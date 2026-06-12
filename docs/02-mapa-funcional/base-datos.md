# Base de datos - PreRescatePTY

## Descripción funcional
Esquema Prisma con todos los modelos: usuarios, fichas médicas, chips, órdenes, pagos, empresas, notificaciones, auditoría.

## Modelos principales (~40 modelos identificados)
- `User` - Usuario del sistema
- `Account` - Cuenta (tipo cliente/empresa)
- `Profile` - Ficha médica + contactos/alergias
- `Chip` - Dispositivo físico + claims + scans
- `Organization` - Empresa + miembros + ubicaciones
- `Order`, `OrderItem` - Órdenes + items
- `Product`, `Inventory` - Productos + stock
- `AccountPackage` - Capacidad de cuenta
- `PasswordResetToken` - Recuperación
- `DigitalPass` - Pases digitales

## Estructura actual
```
prisma/
  schema.prisma (~749 líneas)
  seed.ts
  migrations/
```

## Tests existentes
Ninguno para integración Prisma.

## Tests faltantes recomendados
- Tests de queries críticos
- Tests de constraints/relaciones
- Tests de migraciones

## Riesgos detectados
- Modelos críticos como strings (status, roles)
- Sin tests de integridad
- Sin documentación de schema

## Pendientes
- Enums para estados críticos
- Documentación de modelos
- Tests de queries complejas