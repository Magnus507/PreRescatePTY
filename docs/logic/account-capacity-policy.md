# Account Capacity Policy (Fase 1)

## Objetivo
Definir una política clara para capacidad de cuenta (`maxChipsAllocated`, `maxProfilesAllocated`) mientras conviven flujos `manual`, `stripe` y `legacy`.

---

## Principios

1. **No downgrade accidental**
   - Una compra no debe reducir capacidad ya otorgada por error.

2. **Plan base como piso mínimo**
   - Al aplicar un plan base, la capacidad efectiva se calcula como:
   - `max(capacidadActual, capacidadDelPlan)`

3. **Top-up como fase futura**
   - Las compras de expansión (top-up) serán acumulativas (`+N`).
   - **No implementado en esta fase**: solo documentado para diseño futuro.

4. **Compatibilidad con producción actual**
   - No se cambia Prisma schema ni migraciones en esta etapa.
   - No se altera lógica de Stripe ni flujo de emergencia en esta fase documental.

---

## Reglas por tipo de compra

## A) Plan base (actual y recomendado)

- Campos funcionales:
  - `account.packageId`
  - `account.accountType`
  - `account.maxChipsAllocated`
  - `account.maxProfilesAllocated`

- Aplicación recomendada:
  - actualizar `packageId` al plan comprado
  - actualizar `accountType` según plan
  - asignar capacidad con:
    - `maxChipsAllocated = max(actual, plan.maxChips)`
    - `maxProfilesAllocated = max(actual, plan.maxProfiles)`

Esto evita pérdida de capacidad por recompras o cambios operativos.

## B) Top-up (futuro)

- Caso objetivo: aumentar capacidad sin reemplazar plan base.
- Regla futura:
  - `maxChipsAllocated += chipsTopUp`
  - `maxProfilesAllocated += profilesTopUp` (si aplica)
- Estado: pendiente de decisión de negocio y diseño de catálogo/top-up.

---

## Casos de negocio pendientes

1. ¿Compra futura reemplaza plan o acumula?
2. ¿Se permite downgrade comercial con capacidad histórica preservada?
3. ¿Cómo se modela top-up en catálogo y facturación?
4. ¿Qué política aplica por provider (`manual`, `stripe`, `legacy`) si difieren?

---

## Recomendación operativa inmediata

- Mantener política conservadora:
  - **nunca reducir capacidad automáticamente**
  - usar `max(actual, plan)` en activaciones de plan base
- Posponer acumulación explícita hasta cerrar diseño de top-up.

---

## Próximo paso (fase implementación)

1. Unificar la política en `OrderService` para todos los providers.
2. Evitar divergencia entre approve manual y webhook stripe.
3. Añadir pruebas de regresión para:
   - no downgrade
   - idempotencia
   - consistencia entre providers
