# Account Capacity Policy

## Objetivo
Definir la política oficial de capacidad de cuenta para futuras compras, upgrades y top-ups en PreRescatePTY, sin cambiar aún schema ni lógica productiva.

---

## Estado actual del código (resumen funcional)

Hoy conviven dos rutas principales de aplicación de paquetes:

- **Manual**: aprobación admin (`app/api/admin/orders/[id]/approve/route.ts`)
- **Stripe legacy**: webhook (`app/api/payments/webhook/route.ts`)

En ambos flujos, la cuenta se actualiza con datos del paquete comprado (package/accountType/capacidades), pero el comportamiento deseado a consolidar es:

- evitar downgrade accidental,
- tratar la compra de combo como **plan base**,
- dejar top-ups acumulativos para una fase posterior.

---

## Política recomendada (oficial) — Modelo Mixto

### 1) Compra de combo como plan base

- La capacidad resultante de la cuenta debe ser el **máximo** entre la capacidad actual y la capacidad del combo comprado.
- Regla:
  - `maxChipsAllocated = max(actual, plan.maxChips)`
  - `maxProfilesAllocated = max(actual, plan.maxProfiles)`
- **Nunca hacer downgrade automático** por comprar un combo menor.

Ejemplo:

- Cuenta con 5 chips disponibles.
- Compra “Combo Dúo” (2 chips).
- Resultado: mantiene 5 (no baja a 2).

### 2) Top-up futuro (acumulativo)

- Si se crea un producto tipo **“chip adicional”**, ese producto sí debe operar en modo acumulativo.
- Regla futura esperada:
  - `maxChipsAllocated += chipsTopUp`
- Aún no mezclar lógica de combos con top-ups en esta etapa.

### 3) Renovación futura

- Renovar debe extender vigencia del servicio.
- Renovación **no implica automáticamente** sumar capacidad de chips.
- Definición exacta de renovación queda pendiente de diseño comercial/financiero.

---

## Ejemplos de negocio

1. **Compra inicial**
   - Cliente nuevo compra combo 1 chip.
   - Cuenta queda con capacidad base de 1.

2. **Upgrade natural**
   - Cliente con 2 chips compra combo 5 chips.
   - Capacidad sube a 5.

3. **Compra de combo menor posterior**
   - Cliente con 5 chips compra combo 2 chips.
   - Capacidad se mantiene en 5.

4. **Top-up futuro (cuando exista)**
   - Cliente con base 5 compra top-up +1.
   - Capacidad pasa a 6.

---

## Riesgos a controlar

1. **Doble conteo de capacidad**
   - Mezclar lógica de combo base y top-up sin separación clara puede inflar cupos.

2. **Downgrade accidental**
   - Reemplazar capacidad con valor menor rompe expectativa del cliente.

3. **Compras duplicadas / idempotencia**
   - Especialmente en webhooks Stripe: prevenir aplicación doble del mismo pago.

4. **Vigencia de 24 meses y expiración**
   - Alinear capacidad con ciclo de servicio para evitar cuentas “con cupo” pero con servicio vencido.

5. **Renovación futura ambigua**
   - Si no se define pronto, habrá inconsistencias entre manual/stripe y soporte operativo.

---

## Decisiones pendientes de negocio

1. Definir catálogo formal de top-ups (SKU, precio, límites).
2. Definir reglas de renovación (solo tiempo vs tiempo + capacidad opcional).
3. Definir política para cuentas empresa con múltiples perfiles y lotes.
4. Unificar implementación final en una sola capa de dominio para manual + stripe.

---

## Conclusión

Para PreRescatePTY, se adopta **modelo mixto**:

- **Combo = plan base con regla `max(actual, plan)`**
- **Top-up futuro = acumulativo**
- **Renovación = extensión de vigencia (capacidad por definir aparte)**

Esta política minimiza riesgo comercial y técnico mientras se prepara una fase posterior de implementación formal.
