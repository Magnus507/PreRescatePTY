---
name: prerescate-rules
description: Reglas permanentes del proyecto PreRescatePTY para desarrollo, git, Prisma, módulos empresariales, chips, pedidos, distribución, activación, administración y auditorías.
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
- auditorías

---

# Filosofía

Priorizar siempre:

- KISS (Keep It Simple)
- DRY (Don't Repeat Yourself)
- YAGNI (You Aren't Gonna Need It)
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
6. Push (solo cuando el usuario lo autorice)

Nunca saltar pasos.

Si el usuario pide únicamente una auditoría:

- NO modificar código.
- NO crear commits.
- NO hacer push.

---

# Reglas de Git

Nunca usar:

```bash
git add .
```

Siempre agregar únicamente los archivos modificados.

Ejemplo:

```bash
git add app/api/organizations/corporate-chip/activate/route.ts
git add app/(app)/dashboard/empresas/page.tsx
```

Nunca ejecutar sin autorización explícita del usuario:

- git push
- git push --force
- git rebase
- git commit --amend
- git reset
- squash

Antes de crear cualquier commit ejecutar obligatoriamente:

```bash
git status --short
git diff
git diff --check
npm run typecheck
npm run build
```

Si cualquiera falla:

Detener implementación.

Corregir primero.

Nunca asumir que build o typecheck pasaron.

---

# Auditoría

Antes de modificar código:

- comprender el flujo completo
- identificar todos los archivos afectados
- buscar componentes reutilizables
- buscar endpoints existentes
- buscar helpers existentes
- buscar validaciones existentes
- entender impacto sobre otros módulos

Si existe una forma de reutilizar código:

Preferir reutilización antes que crear archivos nuevos.

---

# Prisma y Base de Datos

Nunca modificar sin autorización explícita:

- prisma/schema.prisma
- migraciones
- modelos
- relaciones
- enums
- índices

Antes de crear nuevas tablas o campos:

Preguntarse:

¿Ya existe un modelo que resuelva este problema?

Preferir reutilizar modelos existentes.

Separar:

- cambios de esquema
- migraciones
- backfills
- lógica

Nunca crear migraciones innecesarias.

---

# Arquitectura

Mantener completamente separados estos módulos.

## Usuario Particular

Incluye:

- tienda
- pedidos normales
- chips normales
- perfiles médicos
- activación normal

Nunca romper compatibilidad.

---

## Empresa

Incluye:

- organizaciones
- colaboradores
- solicitudes empresariales
- pedidos corporativos
- distribución
- activación empresarial
- RRHH

Nunca mezclar lógica con usuarios particulares.

---

## Administración

Incluye:

- aprobación de pagos
- revisión de comprobantes
- gestión de pedidos
- fabricación
- logística
- entrega de lotes

Nunca reutilizar componentes del dashboard usuario cuando exista un componente admin.

---

# Flujo Empresarial Oficial

El flujo correcto siempre es:

Solicitud del colaborador

↓

Aprobación por la empresa

↓

Pago corporativo

↓

Pago aprobado por Admin

↓

PreRescue prepara el lote

↓

Admin marca:

corporateDeliveryStatus = "delivered"

↓

La empresa distribuye internamente

↓

RRHH marca entregado al colaborador

↓

El colaborador activa su chip

↓

Perfil público disponible

Nunca alterar este flujo sin autorización.

---

# Primer Chip Empresarial

El primer chip empresarial:

- productType === "initial_chip"
- precio USD 25
- solo una vez por colaborador
- solicitado desde Empresa
- aprobado por empresa
- pagado
- entregado por PreRescue
- distribuido por RRHH
- activado por el colaborador

Nunca tratar este flujo como una compra normal.

---

# Distribución Empresarial

La empresa solamente puede distribuir cuando:

```ts
corporateDeliveryStatus === "delivered"
```

Antes de eso:

Mostrar estado:

Pendiente de entrega por PreRescue.

Nunca permitir distribución anticipada.

---

# Activación Empresarial

La activación empresarial pertenece únicamente al módulo Empresa.

Archivo principal:

```text
app/(app)/dashboard/empresas/page.tsx
```

No mezclar con:

- activación normal
- tienda
- perfiles médicos normales

Si el flujo empresarial comienza a afectar:

```text
app/api/chips/activate/route.ts
```

evaluar crear un endpoint exclusivo empresarial.

---

# API

Antes de crear un endpoint nuevo:

- buscar si ya existe
- revisar contratos existentes
- validar permisos
- mantener REST consistente

Los endpoints deben validar siempre:

- sesión
- permisos
- pertenencia a organización
- estado del recurso
- ownership

Respuestas consistentes.

Usar HTTP correcto.

Mensajes claros.

---

# Backend

Reutilizar:

- helpers
- servicios
- middleware
- validaciones
- utilidades

Evitar duplicación.

No crear lógica enorme cuando un cambio pequeño resuelve el problema.

---

# Frontend

Priorizar:

- componentes existentes
- hooks existentes
- cards simples
- badges consistentes
- estados claros
- loading
- empty states
- mensajes útiles

Evitar UI decorativa.

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

Toda operación empresarial debe validar pertenencia a la organización.

---

# Manejo de errores

Los errores deben ser:

- claros para usuario
- útiles para logs
- seguros
- sin detalles internos

Ejemplos:

✅ No tienes un vínculo empresarial activo.

✅ El pedido aún no ha sido entregado por PreRescue.

✅ No tienes paquetes pendientes de activación.

✅ Este código ya fue utilizado.

Nunca mostrar stack traces al usuario.

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

Si alguna validación no fue ejecutada:

Indicarlo explícitamente.

Nunca afirmar que una validación pasó sin ejecutarla.

---

# Reporte Final Obligatorio

Toda implementación debe terminar con el siguiente formato:

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

## Endpoints modificados

## Qué se implementó

## Qué NO se tocó

## Validaciones ejecutadas

- git status --short
- git diff
- git diff --check
- npm run typecheck
- npm run build

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
refactor(profile):
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
- ser fácilmente auditable
- pasar todas las validaciones antes del commit