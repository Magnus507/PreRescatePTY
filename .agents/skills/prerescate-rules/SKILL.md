---
name: prerescate-rules
description: Reglas permanentes del proyecto PreRescatePTY para desarrollo, git, Prisma, módulos empresariales, chips, pedidos, distribución, activación, administración, Stock & Fábrica y auditorías.
---

# PreRescatePTY Development Rules

## Objetivo

Este skill define las reglas permanentes de desarrollo para PreRescatePTY.

Debe utilizarse antes de implementar cualquier cambio relacionado con:

- módulos empresariales
- usuarios particulares
- administración
- chips
- pedidos
- perfiles
- activación
- distribución
- pagos
- Stock & Fábrica
- Prisma
- auditorías

---

# Filosofía

Priorizar siempre:

- KISS
- DRY
- YAGNI
- Reutilizar componentes existentes
- Reutilizar endpoints existentes
- Reutilizar helpers existentes
- Cambios pequeños, auditables y reversibles

---

# Flujo obligatorio

Todo trabajo debe seguir este orden:

1. Auditoría
2. Análisis
3. Implementación
4. Verificación
5. Commit
6. Push solo cuando el usuario lo autorice

Nunca saltar pasos.

Si el usuario pide únicamente auditoría:

- NO modificar código
- NO crear commit
- NO hacer push

---

# Git

Nunca usar:

```bash
git add .
```

Siempre usar staging explícito por archivo.

Nunca ejecutar sin autorización explícita:

- git push
- git push --force
- git rebase
- git commit --amend
- git reset
- squash

Antes de commit ejecutar:

```bash
git status --short
git diff
git diff --check
npm run typecheck
npm run build
```

Si algo falla, detenerse y corregir.

---

# Prisma y Base de Datos

Nunca modificar sin autorización explícita:

- prisma/schema.prisma
- migraciones
- modelos
- relaciones
- enums
- índices

Nunca usar sin autorización explícita:

- prisma migrate reset
- prisma db push
- prisma migrate resolve

Si Prisma muestra drift, checksum mismatch, P3006, P1014 o pide reset:

- detener implementación
- NO seguir editando migraciones una por una
- auditar primero:
  - historial local de migraciones
  - tabla `_prisma_migrations`
  - schema.prisma
  - BD real
- proponer baseline controlado si el historial está desalineado
- no continuar con nuevas migraciones hasta sanear Prisma

---

# Arquitectura

Mantener separados estos módulos:

## Usuario Particular

Incluye:

- tienda normal
- pedidos normales
- chips normales
- perfiles médicos normales
- activación normal

Nunca romper compatibilidad.

## Empresa

Incluye:

- organizaciones
- colaboradores
- solicitudes empresariales
- pedidos corporativos
- distribución interna
- activación empresarial
- RRHH

Nunca mezclar lógica empresarial con usuarios particulares.

## Administración

Incluye:

- aprobación de pagos
- revisión de comprobantes
- gestión de pedidos
- fabricación
- logística
- entrega de lotes

Debe permanecer aislado del dashboard usuario/empresa.

---

# Flujo Empresarial Oficial

El flujo correcto es:

Solicitud del colaborador
↓
Aprobación por la empresa
↓
Pago corporativo
↓
Pago aprobado por Admin
↓
PreRescue prepara lote
↓
Admin marca lote como entregado a empresa
↓
Empresa distribuye internamente
↓
RRHH marca entregado al colaborador
↓
Colaborador activa chip empresarial
↓
Perfil público disponible

No alterar este flujo sin autorización.

---

# Primer Chip Empresarial

El primer chip empresarial:

- `productType === "initial_chip"`
- precio USD 25
- solo una vez por colaborador
- se solicita desde Empresa
- la empresa lo aprueba
- la empresa paga
- PreRescue entrega lote físico
- RRHH distribuye
- colaborador activa el chip

No tratarlo como compra normal de tienda.

---

# Distribución Empresarial

La empresa solo puede distribuir cuando:

```ts
corporateDeliveryStatus === "delivered"
```

Antes de eso:

- mostrar pendiente de entrega por PreRescue
- no permitir distribución anticipada

---

# Activación Empresarial

La activación empresarial pertenece al módulo Empresa.

Archivo principal:

```text
app/(app)/dashboard/empresas/page.tsx
```

Endpoint empresarial:

```text
/api/organizations/corporate-chip/activate
```

No mezclar con:

- activación normal
- tienda normal
- perfiles médicos normales
- pedidos normales

Evitar modificar:

```text
app/api/chips/activate/route.ts
```

para lógica empresarial.

---

# Reglas Empresariales Consolidadas

- Un colaborador no puede solicitar más de un primer chip empresarial.
- Un colaborador no puede solicitar accesorios antes de activar su primer chip.
- Un colaborador no puede tener dos chips empresariales activos.
- Los reemplazos de chip deben ser un flujo formal independiente.
- RRHH distribuye paquetes internamente.
- PreRescue entrega lotes a la empresa, no chips individuales a cada colaborador.

---

# Stock & Fábrica

Stock & Fábrica debe separar:

- inventario normal para clientes particulares
- producción corporativa para empresas
- lotes normales
- lotes corporativos
- empaque
- despacho
- historial

Nunca mezclar stock físico normal con producción corporativa.

## Lote normal

Sirve para crear stock físico disponible para venta normal.

Flujo:

Inventario digital
↓
Crear lote normal
↓
Convertir a físico
↓
Disponible para tienda / venta normal

## Lote corporativo

Sirve para cumplir un pedido empresarial específico.

Flujo:

Pedido corporativo aprobado
↓
Producción
↓
Lote corporativo
↓
Etiquetas internas
↓
Fabricación
↓
Empaque
↓
Despacho
↓
Empresa

Debe vincularse a:

- orden
- empresa
- items corporativos
- etiquetas internas
- trazabilidad

---

# Etiquetas Internas

Las etiquetas internas sirven para operación, no para activación.

Ejemplo:

```text
DICAPA-494-001
DICAPA-494-002
```

No reemplazan:

- shortCode
- activationCode
- serialPublic
- QR

La etiqueta interna identifica paquete/lote para fábrica, empaque y despacho.

---

# API

Antes de crear endpoint nuevo:

- buscar si ya existe
- revisar contratos existentes
- validar permisos
- mantener REST consistente

Los endpoints deben validar:

- sesión
- permisos
- pertenencia a organización
- estado del recurso
- ownership

Usar HTTP correcto y mensajes claros.

---

# Backend

Reutilizar:

- helpers
- servicios
- middleware
- validaciones
- utilidades

Evitar duplicación.

No crear lógica enorme si un cambio pequeño resuelve el flujo.

---

# Frontend

Priorizar:

- componentes existentes
- hooks existentes
- cards simples
- badges consistentes
- estados claros
- loading states
- empty states
- mensajes útiles

Evitar UI decorativa sin valor operativo.

Todo dashboard debe responder:

- ¿Está sano?
- ¿Qué está pendiente?
- ¿Qué cambió?
- ¿Qué debo hacer ahora?

---

# Seguridad

Nunca exponer:

- tokens
- secretos
- credenciales
- variables de entorno
- stack traces

Nunca eliminar validaciones de permisos.

Toda operación empresarial debe validar pertenencia a la organización correcta.

---

# Manejo de errores

Los errores deben ser:

- claros para usuario
- útiles para logs
- seguros
- sin detalles internos

Ejemplos correctos:

- "No tienes un vínculo empresarial activo."
- "El pedido aún no ha sido entregado por PreRescue a la empresa."
- "No tienes paquetes pendientes de activación."
- "Este código ya fue utilizado."
- "Ya tienes un chip empresarial activo. Contacta a tu empresa para gestionar un reemplazo."

---

# Verificación Obligatoria

Antes de reportar una implementación ejecutar:

```bash
git status --short
git diff
git diff --check
npm run typecheck
npm run build
```

Si alguna validación no fue ejecutada, decirlo claramente.

Nunca afirmar que una validación pasó sin ejecutarla.

---

# Reporte Final Obligatorio

Toda implementación debe terminar con:

## Archivos modificados

## Archivos NO modificados

## Backend tocado

Sí / No

## Frontend tocado

Sí / No

## Prisma modificado

Sí / No

## Migraciones

Sí / No

## Endpoints modificados/creados

## Qué se implementó

## Qué NO se tocó

## Validaciones ejecutadas

## Estado Git

## Commit

Hash o "No commit"

## Push

Sí / No

---

# Calidad del Código

Siempre buscar:

- funciones pequeñas
- nombres descriptivos
- responsabilidades únicas
- bajo acoplamiento
- alta cohesión
- evitar lógica duplicada

Cada commit debe tener una sola responsabilidad.

Ejemplos:

```text
feat(admin):
feat(enterprise):
fix(chips):
fix(api):
feat(prisma):
chore(tools):
```

Nunca mezclar múltiples funcionalidades en un mismo commit.

---

# Objetivo Final

Toda implementación debe:

- mantener compatibilidad
- minimizar cambios
- evitar regresiones
- reutilizar código existente
- respetar el flujo operativo real de PreRescatePTY
- producir código limpio
- ser auditable
- pasar validaciones antes del commit