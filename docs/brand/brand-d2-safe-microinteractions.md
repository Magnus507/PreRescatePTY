# BRAND-D2 - Microinteracciones Seguras y Hover/Focus

## 1. Qué se agregaron

BRAND-D2 añadió microinteracciones ligeras a la home cliente sin alterar estructura ni lógica.

### Aplicaciones principales

- CTA principal `Activar chip`
- CTA secundario `Ver perfiles`
- Cards `Mis dispositivos`, `Tienda` y `Mis pedidos`
- Filas del preview de perfiles
- Botón de actualizar panel
- CTA `Ver pedidos`

## 2. Qué comportamiento visual se incorporó

- Hover más fino en cards y botones.
- Elevación leve en desktop.
- Feedback sutil en active/tap.
- Focus-visible claro y accesible.
- Borde/sombra algo más presentes al interactuar.
- Preview de perfiles con respuesta visual suave en desktop.

## 3. Duración y easing

### Duraciones usadas

- Hover / focus suave: 200ms
- Elevación de cards: 200ms
- Active/tap: inmediato con scale mínimo
- Transiciones de borde/sombra: 200ms

### Easing recomendado

- `ease-out` para hover y elevación
- `ease-in-out` solo cuando el feedback lo necesita

## 4. Cómo se respetó mobile

- No se agregaron animaciones pesadas.
- Los botones mantienen altura cómoda.
- Las cards no dependen de hover para entenderse.
- El feedback móvil se limita a estados táctiles y foco.
- No se introdujo overflow ni cambios estructurales.

## 5. Cómo se respetó reduced motion

- Las transiciones usan `motion-reduce:transition-none` donde aplica.
- No se añadieron keyframes nuevas.
- No se incorporaron animaciones infinitas.
- El feedback sigue siendo comprensible aun sin motion.

## 6. Qué no se hizo

- No se tocó `schema.prisma`.
- No hubo migraciones.
- No se tocó BD.
- No se cambió lógica funcional.
- No se tocó pedidos, chips, activación, tienda o empresarial.
- No se modificó `globals.css` ni `tailwind.config`.
- No se introdujo motion complejo.

## 7. Qué skills guiaron la decisión

- `emil-design-eng`
- `animation-vocabulary`
- `review-animations`
- `impeccable`
- `design-taste-frontend`

## 8. Pendientes para BRAND-D3

- Refinar sidebar si necesita polish propio.
- Evaluar microfeedback adicional en navegación.
- Revisar si alguna superficie merece estado activo más expresivo.
- Mantener el motion bajo control para no sobrecargar la home.

## 9. Conclusión

BRAND-D2 suma vida suficiente para que la home responda al usuario sin volverse ruidosa ni comprometer el rendimiento móvil.
