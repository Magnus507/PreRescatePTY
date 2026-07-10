# W6.05-BRANDING-A - Propuesta de Identidad Visual PreRescue ID

## 1. Contexto y hallazgos

Tras revisar la base actual del producto, la marca ya tiene una dirección reconocible:

- color rojo de emergencia como ancla visual (`#DA1A21`)
- fondos oscuros profundos para superficies premium y de confianza
- glassmorphism suave en tarjetas, menús y secciones
- brillos y sombras para enfatizar acciones críticas
- animaciones sutiles ya preparadas en el sistema de estilos
- assets existentes con valor de marca: `logo.png`, `sticker-official.png`, `hero-helmet.png`, `backpack-safety.png`
- hero y contenidos públicos con tono de protección, urgencia controlada y claridad médica

La oportunidad no es inventar una marca desde cero, sino volverla más memorable, táctil y viva sin perder seriedad clínica.

## 2. Concepto central de marca

### Opción A - Protección que cobra vida

La interfaz se siente como un sistema de protección activo. La marca no solo informa, también responde.

### Opción B - Tu información vital, siempre lista

Pone el foco en disponibilidad, rapidez y lectura inmediata durante una emergencia.

### Opción C - Una señal de rescate para cada persona

Más emocional y memorable. Funciona bien para campañas, landing y piezas de marca.

### Recomendación

Usar **Protección que cobra vida** como línea conceptual principal, con el tono secundario de **Tu información vital, siempre lista** para páginas funcionales y fichas de producto.

## 3. Sistema visual propuesto

### Paleta principal

- Rojo emergencia: `#DA1A21`
- Rojo profundo: `#B9141B`
- Azul noche: `#05070D`
- Azul carbón: `#0F1419`
- Blanco frío: `#EFF4FF`
- Gris clínico: `#A0AEC0`

### Paleta secundaria

- Verde señal / protegido: `#10B981`
- Ámbar prevención: `#F59E0B`
- Azul soporte: `#2563EB`
- Violeta técnico: solo como acento mínimo, no como color dominante

### Gradientes sugeridos

- Emergencia premium: rojo a rojo profundo
- Rescate nocturno: azul noche a carbón con halo rojo tenue
- Seguridad clínica: blanco frío a azul muy suave
- CTA principal: rojo emergencia con brillo controlado

### Fondos

- fondos oscuros para héroes, dashboard y secciones de marca
- fondos claros solo para lectura extensiva, pricing o formularios
- ruido muy sutil o textura ligera para evitar planitud
- halos radiales discretos en rojo o azul para dar profundidad

### Sombras

- sombra media y limpia en tarjetas de producto
- sombra más intensa solo en CTAs principales y elementos 3D
- evitar sombras moradas o excesivamente difusas

### Bordes

- radios amplios para una sensación más humana y moderna
- bordes finos en glass cards
- bordes de estado en chip, protección y ficha pública

### Iconografía

- line icons sólidos, de trazo claro
- formas simples y reconocibles: escudo, pulso, chip, QR, mapa, alerta
- evitar iconos demasiado técnicos o abstractos

### Estilo de tarjetas

- cards con profundidad moderada
- jerarquía clara: título, breve descripción, acción
- una tarjeta debe comunicar una sola intención principal

### Estilo de botones

- CTA primario: rojo sólido, alto contraste, brillo suave
- CTA secundario: borde visible, fondo translúcido
- CTA de emergencia / rescate: prioridad visual, pero sin exagerar

## 4. Elementos 3D recomendados

### Objetos recomendados

- sticker PreRescueID 3D
- chip o NFC 3D
- escudo de protección
- pulso médico
- ficha pública / tarjeta flotante
- ondas NFC
- mapa o símbolo de retorno seguro

### Uso sugerido

- ligeros para web:
  - sticker 3D estilizado
  - chip 3D pequeño
  - escudo de protección
  - ondas NFC simples
- para hero o landing:
  - ficha pública flotante
  - pulso médico con profundidad
  - mapa / safe return con más composición

### Recomendación de producción

- preferir SVG, Lottie liviano o renders estáticos optimizados
- reservar 3D pesado para una landing o hero principal
- no llenar el dashboard de elementos volumétricos

## 5. Motion y microinteracciones

La animación debe sugerir vida, no distracción.

### Propuestas

- hover de tarjetas con elevación leve
- brillo suave en CTA principal
- ondas NFC al activar o ver chip
- check animado cuando un perfil queda protegido
- pulso médico sutil en estados de cuenta o scan
- transición fluida entre cards y estados
- loading con pulso médico en lugar de spinners genéricos

### Reglas

- animaciones cortas
- easing suave
- nada de parpadeos agresivos
- respetar `prefers-reduced-motion`
- evitar saturación en listados o paneles densos
- no comprometer performance móvil

## 6. Aplicación al dashboard cliente

### Hero principal

- debe sentirse como bienvenida y estado de protección
- usar una pieza visual pequeña de marca: chip, escudo o sticker
- titular corto, humano y confiable
- CTA principal claro

### Tarjeta de perfiles médicos

- preview real de perfiles o avatares
- badges de estado sutiles
- sensación de control, no de reporte administrativo

### Tarjeta de dispositivos

- visual más técnico que la tarjeta de perfiles
- chip, shortCode o señal NFC como protagonista visual
- estados claros: activo, sin asignar, pendiente

### Tarjeta de tienda

- más visual y comercial
- producto con profundidad, sombra y foco en disponibilidad
- CTA claro para explorar o comprar

### Sidebar

- más compacta, con iconografía consistente
- estado activo bien marcado
- en desktop puede tener un tratamiento glass / premium

### Mobile

- cards apiladas y muy legibles
- hero corto y emocional
- CTAs táctiles grandes
- evitar que la animación compita con la lectura

## 7. Aplicación a ficha pública

La ficha pública debe mantener el tono médico serio.

### Principios

- la marca debe estar presente, pero en segundo plano
- legibilidad antes que ornamentación
- color de emergencia solo como acento y estado
- nada de animación excesiva en emergencias

### Recomendación visual

- encabezado sobrio
- sello o mini marca discreta
- jerarquía fuerte en sangre, alergias, condiciones y contactos
- microinteracciones mínimas

### Evitar

- fondos muy cargados
- brillo decorativo innecesario
- animaciones que parezcan marketing en una vista de rescate

## 8. Aplicación a tienda

La tienda puede ser el espacio más expresivo sin perder consistencia.

### Direcciones visuales

- cards de producto más visuales
- sticker y chip con render 3D o ilustración
- estados agotado / disponible muy claros
- CTA llamativo con marca

### Recomendación

- usar profundidad, precio y stock como señales de decisión
- reservar elementos brillantes para productos destacados
- no convertir la tienda en un catálogo ruidoso

## 9. Accesibilidad y performance

- respetar `prefers-reduced-motion`
- mantener contraste alto en texto y CTA
- no depender solo del color para comunicar estado
- usar targets táctiles cómodos
- optimizar assets en WebP, SVG o Lottie liviano
- evitar 3D pesado en móvil
- medir carga antes de sumar nuevas animaciones

## 10. Plan de implementación sugerido

### BRAND-A

- documentación de identidad visual y narrativa

### BRAND-B

- tokens visuales, colores, fondos y superficies

### BRAND-C

- hero del dashboard cliente

### BRAND-D

- tarjetas y botones con sistema visual consistente

### BRAND-E

- motion y microinteracciones

### BRAND-F

- assets 3D reales para landing, tienda y piezas promocionales

## 11. Riesgos

- demasiada animación puede verse poco seria en contexto médico
- exceso de 3D puede penalizar la experiencia móvil
- en emergencia la claridad debe ganar sobre la decoración
- la marca debe equilibrar lo divertido, confiable y vital

## 12. Recomendación final

La identidad visual de PreRescue ID debe sentirse como una señal viva de rescate: moderna, memorable y cálida, pero siempre legible y confiable.

Mi recomendación es construirla sobre tres capas:

1. una base clínica clara
2. una capa emocional de protección
3. una capa visual premium con brillo, profundidad y movimiento controlado

Eso permite que la app cliente se sienta como una experiencia de marca real sin perder su función principal: ayudar rápido y con claridad.
