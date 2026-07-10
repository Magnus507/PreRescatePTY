# BRAND-D2-UX2 - Auditoría Visual Integral de Home, Responsive, Contraste y Sidebar

## 1. Resumen ejecutivo

La home cliente ya tiene una base de marca sólida y reconocible, pero aún no termina de sentirse como una app completamente resuelta en desktop y mobile. El hero tiene presencia, las cards ya hablan el lenguaje visual correcto y la microinteracción básica está bien encaminada. Aun así, hay cuatro problemas persistentes:

- el ancho útil de escritorio sigue sin sentirse totalmente aprovechado;
- algunos fondos claros y badges todavía generan contraste irregular;
- el hero se percibe más estático que el resto de la home;
- el sidebar y el shell general todavía limitan la sensación de “app amplia”.

### Qué está bien

- El sistema de marca ya existe y se reconoce.
- El hero y las cards ya comparten intención visual.
- La navegación está ordenada y funcional.
- El mobile no está roto ni sobrecargado.

### Qué sigue mal

- La home todavía se siente algo centrada y no completamente abierta.
- Hay zonas blancas o semiglass que lavan textos y badges.
- El hero no responde visualmente al mismo nivel que las cards inferiores.
- El sidebar aún comunica shell utilitario antes que producto premium.

### Qué es urgente corregir

- Contraste de fondos y textos en hero, cards y preview de perfiles.
- Uso real del ancho en desktop.
- Coherencia entre hero, cards y sidebar.
- Reducción de superficies lavadas o ambiguas.

### Qué se debe dejar para después

- Rehacer el sidebar completo.
- Motion más elaborado.
- Assets 3D reales.
- Revisión fina del layout shell si requiere una intervención mayor.

## 2. Auditoría por zona

### A. Hero

- Hallazgo: el hero tiene identidad, pero se siente algo rígido y estático frente a las cards inferiores.
- Recomendación: darle una sensación más abierta, con mejor balance entre fondo oscuro y áreas informativas.
- Riesgo: si se sobrecarga, volverá a sentirse pesado o “pegado”.
- Prioridad: alta.

### B. Preview de perfiles

- Hallazgo: la legibilidad mejoró, pero sigue dependiendo demasiado de la superficie semitransparente.
- Recomendación: reforzar contraste de nombre, estado y badge.
- Riesgo: que el glass se vea lindo pero lavado.
- Prioridad: alta.

### C. Mis dispositivos

- Hallazgo: es la card más sensible a contraste lavada por el degradado.
- Recomendación: oscurecer la base y controlar mejor la intensidad del brillo lateral.
- Riesgo: perder legibilidad del número, badge y CTA.
- Prioridad: alta.

### D. Tienda

- Hallazgo: conserva buena intención comercial, pero el gradiente todavía puede leerse algo uniforme o “manchado” en ciertos tamaños.
- Recomendación: simplificar el fondo y reforzar el CTA.
- Riesgo: que el rojo se sienta separado del resto de la marca.
- Prioridad: media-alta.

### E. Pedidos

- Hallazgo: cumple como secundario, pero visualmente se siente más plano que el resto.
- Recomendación: subir su integración al sistema de superficies sin volverlo dominante.
- Riesgo: que parezca una tarjeta prestada de otra UI.
- Prioridad: media.

### F. Sidebar

- Hallazgo: funcional y correcto, pero sigue siendo la parte que más recuerda a shell clásico.
- Recomendación: tratarlo como siguiente fase de branding.
- Riesgo: si se toca demasiado pronto, puede romper la estructura que ya funciona.
- Prioridad: alta para BRAND-D3, no para este bloque.

### G. Layout desktop

- Hallazgo: el contenedor general y el sidebar hacen que la página se perciba más angosta de lo que debería.
- Recomendación: usar mejor el ancho visible y revisar límites del shell antes de seguir sumando polish en la home.
- Riesgo: el contenido seguirá sintiéndose centrado aunque las cards mejoren.
- Prioridad: alta.

### H. Mobile

- Hallazgo: funciona, pero aún se ve más como versión reducida del desktop que como experiencia móvil totalmente afinada.
- Recomendación: reforzar contraste, disminuir sensación de bloque centrado y controlar mejor los radios.
- Riesgo: que el móvil se sienta correcto pero no especialmente bien resuelto.
- Prioridad: alta.

## 3. Auditoría por skill

### `impeccable` findings

- Hallazgo: la jerarquía existe, pero el balance de ancho y centro sigue siendo mejorable.
- Recomendación: usar más del viewport y reducir la sensación de tarjeta flotante aislada.
- Riesgo: composición correcta pero poco expansiva.
- Prioridad: alta.

### `brandkit` findings

- Hallazgo: la paleta base es buena, pero hay demasiada mezcla entre oscuro premium y claro lavado.
- Recomendación: endurecer las superficies clave y reservar el blanco frío para donde realmente aporte.
- Riesgo: inconsistencia visual entre bloques.
- Prioridad: alta.

### `high-end-visual-design` findings

- Hallazgo: la UI va en dirección premium, pero algunas superficies siguen viéndose accidentales.
- Recomendación: refinar sombras, radios y contraste como sistema.
- Riesgo: premium parcial, no premium total.
- Prioridad: alta.

### `design-taste-frontend` findings

- Hallazgo: la home aún puede verse como dashboard centrado si no se abre mejor el layout.
- Recomendación: usar el ancho y la distribución como parte del branding.
- Riesgo: el hero y las cards no se sienten de la misma familia espacial.
- Prioridad: alta.

### `gpt-taste` findings

- Hallazgo: no hay slop fuerte, pero sí restos de “correcto sin mucho carácter”.
- Recomendación: hacer que cada superficie tenga una razón visual clara.
- Riesgo: que la UI parezca buena sin dejar huella.
- Prioridad: alta.

### `emil-design-eng` findings

- Hallazgo: la home responde, pero el hero sigue sin competir en feedback con las cards.
- Recomendación: el hero necesita una presencia más viva, incluso sin motion nuevo.
- Riesgo: que el usuario perciba la zona superior como estática.
- Prioridad: media-alta.

### `animation-vocabulary` findings

- Hallazgo: todavía hay margen para definir mejor qué bloques deberían moverse y cuáles deben permanecer sobrios.
- Recomendación: el hero puede tener un feedback mínimo de profundidad, pero no más motion por ahora.
- Riesgo: agregar movimiento donde el problema real es composición/contraste.
- Prioridad: media.

### `review-animations` findings

- Hallazgo: la home no necesita más animación todavía.
- Recomendación: mantener motion futuro bloqueado hasta que layout y contraste estén resueltos.
- Riesgo: agregar ruido para compensar problemas de base.
- Prioridad: alta.

### `imagegen-mobile findings`

- Hallazgo: el mobile debería sentirse más abierto, con bloques menos “centrados dentro de una hoja”.
- Recomendación: simplificar la sensación de card flotante y reforzar la secuencia vertical.
- Riesgo: versionar demasiado el desktop en pantalla pequeña.
- Prioridad: alta.

### `imagegen-web findings`

- Hallazgo: desktop necesita más uso del ancho y una distribución menos comprimida.
- Recomendación: el hero debe respirar más y las cards inferiores deben alinearse con ese ancho.
- Riesgo: que el layout siga sintiéndose contenido a la fuerza.
- Prioridad: alta.

## 4. Nuevo lenguaje visual recomendado

### Concepto visual

La dirección debe seguir siendo rescate premium, pero con menos “bloque flotante” y más sensación de app amplia, clara y viva. El sistema ya existe; ahora falta corregir cómo ocupa el espacio.

### Uso de marca

- Rojo: foco y CTA.
- Azul noche / carbón: estructura.
- Blanco frío: lectura donde sí aporta.
- Verde / ámbar: estados.

### Fondos

- Oscuros más profundos para hero y cards clave.
- Claros solo en zonas que realmente necesitan aire.
- Menos mezcla de gris lavado + rosa suave.

### Patrón y halo

- Halo rojo más controlado.
- Menos resplandor que “aplane”.
- Patrones sutiles solo si no afectan legibilidad.

### Cards

- Hero: más ancho, más integrado, menos “burbuja”.
- Dispositivos: base más sólida, menos lavado.
- Tienda: comercial, pero limpia.
- Pedidos: claro, sobrio, más integrado.

### Botones

- CTA principal fuerte, claro y consistente.
- Secundarios con suficiente contraste.
- Comportamiento visual uniforme entre estados.

### Badges

- Legibles sobre oscuro.
- Sin depender solo del color.
- Menos ruido.

## 5. Motion y microinteracciones

### Lo que sí conviene

- Hover suave en desktop.
- Focus-visible claro.
- Feedback sutil en active.

### Lo que no conviene

- Nuevos keyframes.
- Glow infinito.
- Animación para tapar contraste o layout.

### Regla

- Primero composición y contraste.
- Motion después.

## 6. 3D ligero / profundidad

### CSS posible

- Halo.
- Noise.
- Bordes más ricos.
- Sombras graduadas.

### Assets futuros

- Sticker o chip más expresivo.
- Escudo flotante.

### Qué dejar para después

- 3D pesado.
- Motion promocional.

## 7. Plan recomendado

### BRAND-D3

- Sidebar y navegación con polish.

### BRAND-D4

- Ajustes finos de móvil.

### BRAND-D5

- Revisión de shell / layout si el ancho sigue sintiéndose corto.

### BRAND-D6

- Motion final si la base ya está resuelta.

## 8. Conclusión

El problema principal ya no es “falta de marca”; es que la marca todavía está atrapada en un layout demasiado centrado y en algunas superficies demasiado lavadas. La corrección prioritaria es de composición, contraste y ancho real antes de volver a sumar capas visuales.
