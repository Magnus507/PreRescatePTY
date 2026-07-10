# Open Design Skills Audit - PreRescueID

Fecha: 2026-07-10

## Objetivo

Evaluar qué skills de Open Design conviene probar para fortalecer la identidad visual de PreRescueID sin instalar nada todavía.

## Fuentes revisadas

- Open Design README: [github.com/nexu-io/open-design](https://github.com/nexu-io/open-design)
- Skills directory: [github.com/nexu-io/open-design/tree/main/skills](https://github.com/nexu-io/open-design/tree/main/skills)
- Skills protocol: [github.com/nexu-io/open-design/blob/main/docs/skills-protocol.md](https://github.com/nexu-io/open-design/blob/main/docs/skills-protocol.md)

## Hallazgos generales

- Open Design usa skills como unidades atómicas de capacidad de diseño.
- La plataforma distingue bien entre `prototype`, `deck`, `template` y `design-system`.
- Para PreRescueID convienen especialmente skills que ayuden a:
  - extraer y formalizar marca
  - definir tokens visuales
  - revisar jerarquía y consistencia
  - producir pantallas mobile-first
  - generar motion y assets ligeros
- Hay habilidades muy potentes, pero varias pueden meter ruido si se usan demasiado pronto en un producto médico.

## Grupo A - Recomendadas para instalar o probar primero

### 1. `brand-extract`

- Sirve para extraer una base de marca desde assets o referencias existentes.
- Ayudaría a convertir lo que ya existe en PreRescueID en una lectura más consistente de color, tono y superficies.
- Riesgo: bajo, si se usa para consolidar lo que ya tenemos en vez de reinventarlo.
- Prioridad: alta.

### 2. `brand-guidelines`

- Sirve para traducir decisiones de marca en reglas utilizables por el agente.
- Ayudaría a evitar que cada nueva pieza visual derive en una estética distinta.
- Riesgo: bajo.
- Prioridad: alta.

### 3. `color-expert`

- Sirve para decisiones de paleta, contraste y uso de color.
- Ayudaría a afinar la mezcla actual de rojo de emergencia, fondos oscuros y acentos de estado.
- Riesgo: medio, porque puede empujar a paletas demasiado sofisticadas para un producto médico.
- Prioridad: alta.

### 4. `design-review`

- Sirve para criticar composición, jerarquía, consistencia y ejecución.
- Ayudaría a revisar si una propuesta visual se siente premium, médica y legible sin perder foco.
- Riesgo: bajo.
- Prioridad: alta.

### 5. `creative-director`

- Sirve para mantener una visión más editorial y coherente de la pieza final.
- Ayudaría a que la marca no quede como una suma de cards sueltas, sino como una experiencia con narrativa.
- Riesgo: medio, si se usa sin límites puede empujar a demasiada “dirección” y poca claridad operativa.
- Prioridad: alta.

### 6. `impeccable-design-polish`

- Sirve para pulir spacing, bordes, contraste y acabado visual.
- Ayudaría a elevar el dashboard cliente y la home sin cambiar la lógica funcional.
- Riesgo: bajo.
- Prioridad: alta.

### 7. `imagegen-frontend-mobile`

- Sirve para generar conceptos o piezas visuales pensadas para móvil.
- Ayudaría a explorar branding y héroes mobile-first sin sobrecargar desktop.
- Riesgo: medio, porque la salida generativa debe controlarse para no producir assets demasiado “AI”.
- Prioridad: alta.

## Grupo B - Útiles después

### 8. `brandkit`

- Sirve para empaquetar una marca ya más definida.
- Ayudaría después de consolidar la identidad para llevarla a más superficies.
- Riesgo: medio, porque puede dar una falsa sensación de cierre demasiado pronto.
- Prioridad: media.

### 9. `design-brief`

- Sirve para transformar una intención en brief operativo.
- Ayudaría a preparar exploraciones más precisas para dashboard, tienda o ficha pública.
- Riesgo: bajo.
- Prioridad: media.

### 10. `design-md`

- Sirve para formalizar reglas de diseño como `DESIGN.md`.
- Ayudaría si PreRescueID decide convertir la identidad visual en un contrato de marca vivo.
- Riesgo: medio, porque si se hace muy pronto puede congelar decisiones aún inmaduras.
- Prioridad: media.

### 11. `emilkowalski-motion`

- Sirve para motion elegante, con énfasis en microinteracciones fluidas.
- Ayudaría a reforzar la sensación de marca viva sin caer en animación pesada.
- Riesgo: medio, porque motion mal calibrado puede competir con la lectura médica.
- Prioridad: media.

### 12. `gsap-timeline`

- Sirve para secuencias de motion más controladas y narrativas.
- Ayudaría a proponer animaciones de hero, scan y transición de estado.
- Riesgo: medio-alto si se aplica en exceso en views de emergencia.
- Prioridad: media.

### 13. `fal-3d`

- Sirve para experimentar con assets 3D.
- Ayudaría a crear sticker, chip, escudo o pulso médico más memorables para hero y tienda.
- Riesgo: alto en móvil si el 3D se vuelve pesado o decorativo de más.
- Prioridad: media.

### 14. `image-enhancer`

- Sirve para mejorar assets existentes.
- Ayudaría a pulir logo, sticker y piezas visuales sin rehacer todo.
- Riesgo: bajo.
- Prioridad: media.

### 15. `ecommerce-image-workflow`

- Sirve para piezas visuales de producto.
- Ayudaría a tienda y catálogo cuando toque hacer cards más expresivas.
- Riesgo: medio, porque puede orientarse más a venta que a urgencia médica.
- Prioridad: media.

### 16. `apple-hig`

- Sirve para inspirar consistencia de interfaz y claridad tipo iOS.
- Ayudaría especialmente en mobile y superficies de alta legibilidad.
- Riesgo: bajo a medio, porque puede volver el sistema demasiado “Apple-like” y menos propio.
- Prioridad: media.

## Grupo C - No recomendadas por ahora

### 17. `brutalist-skill`

- Puede dar una estética fuerte, pero no encaja bien con un producto de emergencia médica que necesita confianza inmediata.
- Riesgo: alto.
- Prioridad: baja.

### 18. `card-twitter`

- Útil para formato social, pero no aporta directamente a dashboard, tienda o ficha pública.
- Riesgo: bajo, pero poco valor ahora.
- Prioridad: baja.

### 19. `card-xiaohongshu`

- Similar al caso anterior: útil para redes, no para la experiencia core del producto.
- Riesgo: bajo, pero desalineado con la necesidad actual.
- Prioridad: baja.

### 20. `after-hours-editorial-template`

- Puede ser visualmente atractivo, pero podría alejar la marca de su tono médico y operativo.
- Riesgo: medio-alto.
- Prioridad: baja.

### 21. `8-bit-orbit-video-template`

- Demasiado estilizado para el contexto principal de PreRescueID.
- Riesgo: alto por distraer del mensaje de protección.
- Prioridad: baja.

## Recomendación final

Para PreRescueID, el orden más sensato de prueba sería:

1. `brand-extract`
2. `brand-guidelines`
3. `color-expert`
4. `design-review`
5. `impeccable-design-polish`
6. `creative-director`
7. `imagegen-frontend-mobile`

Ese set cubre la base de marca, el control visual y la sensibilidad mobile-first antes de entrar a motion o 3D.

## Propuesta de instalación futura en sandbox

Si se decide probar Open Design, la secuencia sugerida sería:

1. Instalar solo las skills del Grupo A.
2. Hacer una prueba con la identidad visual de PreRescueID ya documentada en `BRAND-A`.
3. Revisar si el resultado mejora:
   - hero del dashboard cliente
   - fichas de tarjetas
   - tono visual de fichas públicas
   - estética de tienda
4. Luego evaluar una segunda ola con `emilkowalski-motion` y `fal-3d`.

## Riesgos generales

- Demasiadas skills al mismo tiempo pueden empujar a una estética incoherente.
- El contexto médico necesita claridad antes que espectacularidad.
- 3D y motion deben ser acentos, no protagonistas permanentes.
- La identidad debe seguir siendo confiable y rápida en móvil.

## Conclusión

Open Design sí tiene skills valiosas para PreRescueID, pero la mejor ruta es comenzar por marca, color, review y polish. Primero cerrar la base visual; después sumar motion y 3D si la experiencia sigue clara, seria y memorable.
