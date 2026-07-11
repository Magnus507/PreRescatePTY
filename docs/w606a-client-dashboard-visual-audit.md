# W6.06A - Auditoría visual del panel cliente

## Resumen ejecutivo

Se auditó visualmente el panel cliente completo de PreRescatePTY para entender qué tan unificado se siente el producto entre Inicio, Perfiles médicos, Mis dispositivos, Tienda, Mis pedidos, Empresa y Ajustes/Configuración.

La conclusión general es clara: el panel ya tiene una base sólida y reconocible, especialmente en Inicio, Mis dispositivos y Tienda, pero todavía no comparte una gramática visual única. Algunas pantallas se sienten premium y oscuras, mientras que otras se ven más funcionales, más blancas o más genéricas. No es un problema de producto; es un problema de sistema visual.

La recomendación es no tocar pantalla por pantalla todavía. Primero conviene crear un sistema visual cliente unificado y, a partir de ahí, aplicar polish por bloque. Eso evitaría rehacer componentes varias veces y ayudaría a que la marca se sienta más consistente.

## Diagnóstico general

### Lo que ya funciona bien

- `Inicio` tiene una identidad fuerte, oscura y memorable.
- `Mis dispositivos` se siente técnico, premium y alineado con una app de protección.
- `Tienda` comunica valor, cantidad y confianza sin verse caótica.
- `Perfiles médicos` tiene claridad funcional y densidad útil.
- La sidebar del dashboard es sólida, con navegación clara y estados activos bien definidos.

### Lo que todavía se siente fragmentado

- `Mis pedidos` se ve más funcional que premium.
- `Empresa` usa una energía visual más básica y más verde, con menos presencia de marca.
- `Ajustes/Configuración` parece venir de otra familia visual, más blanca y más tradicional.
- Hay demasiadas identidades cromáticas compitiendo a la vez: rojo, azul, verde, morado y cyan.
- No todas las pantallas usan el mismo tipo de header, card, badge o CTA.

### Diagnóstico resumido

El panel cliente no está roto. Está desalineado visualmente. La base es buena, pero la experiencia todavía mezcla al menos tres lenguajes:

- uno premium oscuro;
- uno funcional blanco;
- uno corporativo/operativo.

## Auditoría por pantalla

### Inicio

Estado:

- muy sólido visualmente;
- hero dark premium bien resuelto;
- jerarquía fuerte;
- buen uso de rojo como acento de marca;
- la vista rápida de perfiles aporta contexto sin saturar.

Observaciones:

- el contraste del texto pequeño puede depender mucho del fondo;
- el bloque de métricas y la tarjeta de vista rápida tienen calidad alta y sirven como referencia visual para el resto del panel;
- es la pantalla que mejor representa la marca hoy.

### Perfiles médicos

Estado:

- claro, completo y funcional;
- las cards contienen mucha información útil sin perder el orden;
- las acciones son entendibles.

Observaciones:

- la pantalla tiene un lenguaje visual más operativo que Inicio;
- la densidad de datos es alta, pero todavía legible;
- el tono de acciones como `Ficha pública`, `Editar`, `Contactos` y `Eliminar` es correcto, aunque no siempre homogéneo con otras pantallas;
- sirve mejor como módulo clínico que como pieza de marca.

### Mis dispositivos

Estado:

- muy alineada con la identidad premium;
- hero oscuro fuerte;
- tabs claras;
- la sensación técnica está bien controlada.

Observaciones:

- hay un buen equilibrio entre estilo técnico y simplicidad;
- la pantalla se siente más cerrada y más moderna que `Ajustes` o `Empresa`;
- es una de las pantallas más consistentes del sistema.

### Tienda

Estado:

- limpia, clara y comercialmente confiable;
- el producto tiene mejor percepción de valor que antes;
- la selección de cantidad y el bloque de empresa ya quedaron ordenados.

Observaciones:

- el hero oscuro ayuda a la coherencia con Inicio y Mis dispositivos;
- el producto podría ganar más presencia visual para parecer más valioso;
- la tienda ya no se siente confusa, pero todavía comparte parte del lenguaje funcional de panel.

### Mis pedidos

Estado:

- útil y funcional;
- el pago/comprobante se entiende;
- el resumen de backorder y producción ya aporta claridad.

Observaciones:

- es la pantalla que más se siente “panel” y menos “marca”;
- la tarjeta blanca grande domina más que el sistema visual;
- el título y la jerarquía necesitan más intención si se quiere que quede al nivel del resto;
- hoy cumple, pero no es la pantalla más aspiracional del dashboard.

### Empresa

Estado:

- funciona;
- separa bien el contexto empresarial;
- resuelve el flujo operativo sin mezclarlo con la tienda personal.

Observaciones:

- es la pantalla más marcada por verde y por una estética más básica;
- parece un módulo aparte dentro del mismo producto;
- necesita más presencia de marca para no sentirse como un sistema distinto;
- los productos empresariales activos y las solicitudes están bien estructurados, pero visualmente aún no se integran con el lenguaje premium general.

### Ajustes / Configuración

Estado:

- es la pantalla más formal y tradicional;
- comunica gestión de cuenta de manera clara;
- tiene estructura de tabs y se entiende bien.

Observaciones:

- se ve más blanca y más genérica que Inicio o Mis dispositivos;
- parece de otra familia visual;
- tiene buena jerarquía funcional, pero poca personalidad de marca;
- es la principal candidata a recibir un polish de sistema después de definir tokens comunes.

## Problemas principales

### 1. Falta una gramática visual única

Hay varias familias de cards, headers y botones coexistiendo. El usuario puede navegar sin perderse, pero la interfaz no siempre parece construida por el mismo sistema.

### 2. Demasiadas paletas fuertes compiten

El rojo de marca es potente y útil, pero convive con azul, verde, morado y cyan. Eso funciona por estados, pero hoy todavía se percibe como mezcla de módulos más que como un sistema coordinado.

### 3. Inicio y Mis dispositivos están arriba del resto

Son las pantallas más maduras visualmente. Eso hace que contraste más la diferencia con Mis pedidos, Empresa y Ajustes.

### 4. Mis pedidos es correcto, pero menos memorable

Tiene buena función, pero no comparte el mismo nivel de acabado premium que Inicio o Dispositivos.

### 5. Empresa y Ajustes se sienten más genéricos

Son las pantallas con mayor riesgo de “otra app dentro de la app”.

## Dirección visual recomendada

### Nombre propuesto

**Sistema Cliente Premium Emergency**

### Principios

- Fondo general oscuro solo donde aporte presencia de marca.
- Cards blancas solo para contexto funcional, detalle y formularios.
- Rojo como color de marca y acción principal.
- Verde solo para éxito, estado positivo o confirmación.
- Azul solo para información, soporte o estado neutro útil.
- Morado con moderación, preferiblemente para módulos secundarios o producción.
- Cyan solo para estados operativos muy específicos.

### Patrón de pantalla

- Hero superior consistente en todas las pantallas principales.
- Título corto, fuerte y legible.
- Subtítulo descriptivo sin exceso de ruido.
- Bloque de resumen rápido antes del detalle.
- CTA principal único y claro.

### Patrón de cards

- Card primaria: fondo oscuro o blanco según contexto, con presencia fuerte y borde claro.
- Card secundaria: superficie más simple, menor jerarquía, sin robar atención.
- Card de estado: usar color con intención, no como decoración.

### Patrón de CTAs

- CTA principal: rojo.
- CTA secundario: neutral o de bajo contraste.
- CTA destructivo: rojo con lenguaje explícito.
- CTA positivo: verde solo cuando confirma una acción clara.

### Patrón de badges

- Un badge por concepto principal.
- No depender solo del color.
- Texto corto y semántico.
- Evitar saturación de chips visuales en una misma línea.

### Patrón de módulos críticos

- módulos técnicos: más densidad, pero con jerarquía clara;
- módulos de cuenta: más aire, más luz, menos carga visual;
- módulos comerciales: equilibrio entre confianza y claridad operativa.

## Plan W6.06B-J

### W6.06B - Design system cliente

- tokens visuales;
- headers;
- cards;
- buttons;
- badges;
- empty states;
- helper texts.

### W6.06C - Sidebar y shell cliente

- navegación;
- botones inferiores;
- active states;
- mobile nav.

### W6.06D - Inicio polish final

- microtext contrast;
- hero/card consistency;
- vista rápida.

### W6.06E - Perfiles médicos visual polish

- cards;
- actions;
- badges;
- density.

### W6.06F - Mis dispositivos visual polish

- chip card;
- tabs;
- active/suspended states.

### W6.06G - Tienda visual polish

- value perception;
- product card;
- checkout section.

### W6.06H - Mis pedidos visual polish

- payment/proof card;
- backorder summary;
- order card hierarchy.

### W6.06I - Empresa visual polish

- enterprise identity;
- first chip flow;
- products/requests.

### W6.06J - Ajustes visual polish

- account settings UI;
- sections;
- consistency.

## Riesgos

- si se intenta arreglar pantalla por pantalla sin sistema común, se puede duplicar trabajo;
- si se mantienen demasiadas paletas como protagonistas, la marca se seguirá sintiendo fragmentada;
- si no se define un header base, cada módulo seguirá pareciendo un producto distinto;
- si Ajustes y Empresa no reciben atención específica, seguirán siendo los módulos menos integrados visualmente.

## Decisión

**Recomendación: crear primero W6.06B Design System Cliente y luego aplicar por pantalla.**

Motivo:

- ya hay pantallas muy buenas que sirven como referencia;
- lo que falta no es reescribir todo, sino unificar lenguaje visual;
- el sistema base evitará inconsistencias al refinar Inicio, Perfiles, Dispositivos, Tienda, Pedidos, Empresa y Ajustes.

## Qué no se tocó

- no se modificó código productivo;
- no se modificó `schema.prisma`;
- no se hicieron migraciones;
- no se tocó la BD;
- no se tocó el backend;
- no se tocó admin;
- no se tocó Stripe;
- no se tocaron comprobantes;
- no se tocaron chips;
- no se tocaron pedidos reales.

## Skills usadas

- `prerescate-rules`
- `verification-loop`
- `impeccable`
- `frontend-patterns`
- `frontend-a11y`
- `design-system`
- `dashboard-builder`
- `design-taste-frontend`
- `high-end-visual-design`
- `brandkit`
- `coding-standards`

## Validaciones

- `git status --short`
- `git diff`
- `git diff --check`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`

## Conclusión

El panel cliente ya tiene buenas piezas, pero todavía no tiene una sola voz visual. La dirección correcta es consolidar primero el sistema visual y luego pulir cada pantalla en orden, empezando por Inicio y Dispositivos como referencias premium.
