# BRAND-D0 - Auditoría Creativa Avanzada del Branding PreRescueID

## 1. Diagnóstico de la home actual

La home cliente ya dio un salto real con BRAND-B y BRAND-C. Hoy se siente más PreRescueID que antes, pero todavía hay espacio para convertirla en una experiencia más memorable y menos parecida a un dashboard estándar.

### Qué funciona bien

- La jerarquía principal ya es clara: estado, chip activo, perfiles y accesos útiles.
- El hero tiene más identidad de marca y mejor presencia visual.
- El rojo de emergencia ya no se siente decorativo; cumple función de foco.
- La home sigue siendo mobile-first y fácil de entender.
- El preview de perfiles comunica protección sin abrir demasiada información.

### Qué ya se siente premium

- El fondo oscuro con halo rojo controlado.
- Los radios amplios y las sombras limpias.
- El contraste entre marca fría y acento rojo.
- La tarjeta hero con sensación de profundidad.

### Qué ya se ve memorable

- La marca aparece como sistema, no solo como logo.
- El hero tiene mejor presencia emocional.
- El botón `Activar chip` ya tiene peso visual real.

### Qué sigue plano o genérico

- Algunas cards secundarias todavía se leen como variaciones correctas, pero no distintivas.
- La home aún puede ganar ritmo visual entre hero, perfiles y accesos inferiores.
- Falta una firma más fuerte de microinteracción y profundidad ligera.
- La navegación lateral sigue siendo funcional, pero todavía podría tener más “producto de marca” y menos “panel utilitario”.

### Qué puede mejorar en desktop

- Mejor uso de ancho en las cards secundarias.
- Más cohesión entre hero y elementos debajo.
- Una transición visual más elegante entre secciones.

### Qué puede mejorar en móvil

- Una firma visual más compacta y con más carácter.
- Menos sensación de bloques apilados sin narrativa.
- Mejor diferenciación entre card primaria y secundarias.

## 2. Auditoría por skill

### `impeccable` findings

- Hallazgo: La home ya tiene buena jerarquía, pero todavía puede ganar en ritmo, balance y lectura por bloques.
- Recomendación: Afinar separación visual entre hero, cards y navegación secundaria.
- Riesgo: Si se sobrecarga la home con demasiado contenido, vuelve la sensación administrativa.
- Prioridad: Alta.

### `brandkit` findings

- Hallazgo: La marca está bien encaminada, pero aún falta un sistema más rígido para halo, rojo, glass y superficies.
- Recomendación: Formalizar reglas de uso por componente y estado.
- Riesgo: Que cada card termine “interpretando” la marca de forma distinta.
- Prioridad: Alta.

### `high-end-visual-design` findings

- Hallazgo: El hero tiene base premium, pero la experiencia general todavía puede verse más intencional y más cara.
- Recomendación: Subir la calidad percibida de bordes, sombras, fondos y composición.
- Riesgo: Que la UI siga siendo buena, pero no inolvidable.
- Prioridad: Alta.

### `design-taste-frontend` findings

- Hallazgo: La home ya evita varios patrones genéricos, pero aún hay espacios donde la composición podría sentirse más editorial y menos “dashboard por defecto”.
- Recomendación: Darle más identidad a las cards secundarias y al orden visual de la home.
- Riesgo: Que la app pierda diferenciación frente a cualquier sistema estándar.
- Prioridad: Alta.

### `gpt-taste` findings

- Hallazgo: El peligro principal no es exceso de complejidad, sino caer en una ejecución demasiado correcta y poco memorable.
- Recomendación: Mantener pocos elementos, pero con fuerte intención visual.
- Riesgo: Slop premium: limpio, pero sin alma.
- Prioridad: Alta.

### `emil-design-eng` findings

- Hallazgo: Falta una capa fina de feedback visual que haga que la UI “responda” más.
- Recomendación: Introducir microinteracciones discretas en CTA, cards y estados.
- Riesgo: Que la interfaz se vea estática aunque esté bien diseñada.
- Prioridad: Media.

### `animation-vocabulary` findings

- Hallazgo: Ya hay espacio para nombrar y controlar mejor el motion antes de implementarlo.
- Recomendación: Definir vocabulario para glow, pulse, wave, shimmer y state transitions.
- Riesgo: Implementar animaciones sin nombre ni propósito termina en inconsistencia.
- Prioridad: Media.

### `review-animations` findings

- Hallazgo: La marca tolera motion, pero necesita disciplina para no volverse ruidosa.
- Recomendación: Limitar duración, frecuencia y cantidad de animaciones simultáneas.
- Riesgo: Que la vista de rescate o la home parezcan marketing excesivo.
- Prioridad: Alta.

### `mobile composition` findings

- Hallazgo: Móvil ya es usable, pero todavía puede ganar personalidad y claridad táctil.
- Recomendación: Priorizar un hero compacto, CTA fuerte y cards sin ruido.
- Riesgo: Que el diseño mobile se sienta como versión reducida del desktop.
- Prioridad: Alta.

### `desktop composition` findings

- Hallazgo: Desktop ya aprovecha el ancho, pero todavía puede contar mejor la historia de marca.
- Recomendación: Reforzar profundidad, ritmo y cohesión visual entre hero y secciones.
- Riesgo: Ancho disponible desaprovechado o usado sin intención narrativa.
- Prioridad: Alta.

## 3. Nuevo lenguaje visual recomendado

### Concepto visual

PreRescueID debería evolucionar hacia una identidad de rescate premium, clínica y táctil. No debe verse como un sistema de administración, sino como una interfaz viva de protección.

### Uso de marca

- Rojo como foco principal de acción.
- Azul noche como base de confianza y profundidad.
- Blanco frío para legibilidad y calma.
- Verde solo para protegido.
- Ámbar solo para advertencia.

### Fondos

- Oscuros con halo rojo controlado para home y dashboard.
- Claros clínicos para lectura amplia y vistas informativas.
- Mobile con fondo más limpio y contraste fuerte.

### Patrones

- Grid técnico suave.
- Noise ligero.
- Ondas NFC discretas.
- Halo radial detrás del hero.

### Halos

- Rojo para acción, CTA y marca.
- Azul para profundidad o soporte.
- Siempre suaves, nunca agresivos.

### Brillos

- Solo en CTA principal, chip o elementos de foco.
- Nunca como decoración constante.

### Cards

- Hero: premium, profunda, memorable.
- Perfil: humana, clara, cercana.
- Dispositivo: técnica, precisa, operativa.
- Tienda: expresiva, comercial, limpia.

### Botones

- Primario: rojo emergencia.
- Secundario: outline o glass.
- Ghost: solo para apoyo.
- Danger: solo para riesgo real.

### Badges

- Uno o dos por card, como máximo.
- Con lenguaje operativo, no ornamental.

### Estados

- Protegido.
- Sin chip.
- Retorno seguro.
- Pendiente.
- Agotado.

### Iconografía

- Escudo, pulso, chip, NFC, mapa, contacto, tienda y pedido con trazo simple y consistente.

### Preview de perfiles

- Debe verse más “persona protegida” que “fila de datos”.
- Mostrar nombres, estado y chip de forma breve.

### Dispositivos / chips

- El código público debe sentirse visible y confiable.
- El chip puede tomar protagonismo visual ligero.

### Tienda

- Más visual que operativa.
- Producto, disponibilidad y CTA deben leerse rápido.

### Sidebar

- Más premium, menos mecánica.
- Mejor integración con el resto de la identidad.

## 4. Motion y microinteracciones

### 1. Glow suave en CTA Activar chip

- Cuándo usar: home y pantallas de activación.
- Duración sugerida: 180-260ms para hover, 300-420ms para entrada.
- Easing sugerido: `cubic-bezier(0.4, 0, 0.2, 1)`.
- Mobile: sí, pero solo en estados estáticos o focus.
- Reduced motion: sí, debe desactivarse.

### 2. Onda NFC en hover o activación

- Cuándo usar: tarjetas de chip, activación, dispositivos.
- Duración sugerida: 700-1200ms.
- Easing sugerido: `ease-out`.
- Mobile: sí, de forma muy sutil.
- Reduced motion: sí, debe desactivarse.

### 3. Pulso de protección muy sutil

- Cuándo usar: cuenta activa, protegido, estado OK.
- Duración sugerida: 2.2-3.2s.
- Easing sugerido: `ease-in-out`.
- Mobile: sí, pero mínimo.
- Reduced motion: sí, debe desactivarse.

### 4. Check protegido animado

- Cuándo usar: confirmaciones, chip vinculado, perfil protegido.
- Duración sugerida: 220-360ms.
- Easing sugerido: `cubic-bezier(0.2, 0.8, 0.2, 1)`.
- Mobile: sí.
- Reduced motion: sí, debe desactivarse.

### 5. Entrada suave de cards

- Cuándo usar: carga inicial de home y listados.
- Duración sugerida: 280-520ms.
- Easing sugerido: `cubic-bezier(0.16, 1, 0.3, 1)`.
- Mobile: sí.
- Reduced motion: sí, debe desactivarse.

### 6. Hover premium de cards

- Cuándo usar: desktop en cards de perfiles, dispositivos y tienda.
- Duración sugerida: 160-240ms.
- Easing sugerido: `ease-out`.
- Mobile: no como hover, solo estados táctiles/focus.
- Reduced motion: sí, debe desactivarse.

### 7. Transición sidebar

- Cuándo usar: colapsar/expandir navegación.
- Duración sugerida: 220-320ms.
- Easing sugerido: `cubic-bezier(0.4, 0, 0.2, 1)`.
- Mobile: sí, para drawer o panel.
- Reduced motion: sí, debe desactivarse.

### 8. Shimmer controlado en stickers/chips

- Cuándo usar: elementos destacados, solo en piezas con valor visual.
- Duración sugerida: 1.8-2.8s.
- Easing sugerido: lineal o `ease-in-out`.
- Mobile: muy limitado.
- Reduced motion: sí, debe desactivarse.

### 9. Loading con pulso médico

- Cuándo usar: estados de espera en panel, perfiles, chips y carga de datos.
- Duración sugerida: 1.6-2.4s.
- Easing sugerido: `ease-in-out`.
- Mobile: sí.
- Reduced motion: sí, debe desactivarse.

## 5. 3D ligero / profundidad

### Recomendaciones

- Sticker 3D ligero para marca y tienda.
- Chip/NFC con profundidad simple.
- Escudo flotante solo como recurso de hero o landing.
- Ondas NFC en CSS/SVG para no cargar assets pesados.
- Grid/puntos sutiles como fondo técnico.
- Halo rojo/azul controlado para marcar foco.

### Qué se puede hacer solo con CSS

- Halo radial.
- Noise ligero.
- Ondas simples.
- Brillo controlado.
- Sombras premium.
- Elevación de cards.

### Qué requeriría asset SVG/WebP/Lottie

- Sticker más expresivo.
- Chip con diseño más realista.
- Escudo o pulso con acabado de marca.
- Check animado más pulido.

### Qué dejar para futuro

- 3D pesado.
- Animaciones complejas de producto.
- Motion de hero promocional muy avanzado.

## 6. Aplicación por zonas

### A. Home cliente

- Hero: más firma visual y más intención de marca.
- Preview de perfiles: más humana y menos técnica.
- Dispositivos: más claridad de código y estado.
- Tienda: más visual, sin ruido.
- Pedidos: secundarios y sobrios.
- Sidebar: más pulida, menos utilitaria.

### B. Perfiles médicos

- Cards con identidad clara.
- Badges con lenguaje de protección.
- Estado protegido/sin chip visible sin sobreexplicar.
- Retorno seguro como contexto útil, no adorno.

### C. Mis dispositivos

- Chip activo con protagonismo.
- Código público visible y confiable.
- Vinculación clara.
- Estado operativo al frente.

### D. Tienda

- Producto más expresivo.
- Agotado/disponible muy claro.
- CTA compra con más presencia.

### E. Ficha pública

- Mantener sobria.
- Cero exceso de motion.
- Prioridad absoluta a lectura médica.

## 7. Plan de implementación recomendado

### BRAND-D1

- Cards y botones del dashboard cliente.

### BRAND-D2

- Microinteracciones seguras.

### BRAND-D3

- Sidebar y navegación con polish.

### BRAND-D4

- Mobile polish.

### BRAND-D5

- Assets visuales o 3D ligeros.

### BRAND-D6

- Aplicar lenguaje a tienda.

### BRAND-D7

- Aplicar lenguaje a perfiles médicos.

### BRAND-D8

- Auditoría final de branding.

## 8. Qué NO hacer

- No meter animaciones por decoración.
- No exagerar el 3D.
- No convertir la UI en algo gamer.
- No perder legibilidad médica.
- No usar demasiados colores.
- No saturar con badges.
- No convertir la home en un panel operativo complejo.
- No esconder la acción principal.

## 9. Recomendación final

PreRescueID ya está en una base buena. La siguiente evolución no debería ser “más cosas”, sino más intención. La marca puede volverse memorable si cada superficie, botón y estado parece diseñado por una misma mano: sobria, cálida, premium y claramente de rescate.

El paso correcto ahora es pasar de “home correcta” a “sistema con firma visual propia”.
