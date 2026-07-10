# W6.05F-B - Diseño de experiencia Mis Dispositivos / Chips del cliente

## 1. Objetivo

Rediseñar la experiencia de `Mis dispositivos` para que deje de sentirse como una lista operativa larga y pase a leerse como un panel de control claro, mobile-first y fácil de escanear.

La pantalla debe ayudar al cliente a responder rápido estas preguntas:

1. ¿Qué chips tengo?
2. ¿Cuáles están activos?
3. ¿A qué perfil protege cada chip?
4. ¿Cómo activo uno nuevo?
5. ¿Qué hago si un chip necesita acción?

## 2. Diagnóstico de la pantalla actual

### Lo que ya funciona

- La información crítica ya está disponible.
- Existe separación entre lista y activación.
- El panel ya respeta la sesión del usuario.
- La activación tiene un flujo propio y no depende de inventar estado.
- `serialPublic` y `shortCode` ya existen como referencias claras.

### Lo que hoy se siente pesado

- El título `Mis Dispositivos` arranca en modo administrativo.
- `Mis Stickers` y `Activar Nuevo` suenan a módulo de inventario, no a app cliente.
- Cada tarjeta mezcla demasiado estado, código, perfil, accesorios y acciones.
- `Suspender` compite visualmente con `Ver Perfil`, cuando debería ser secundaria.
- La activación ocupa demasiado peso visual frente a la lista.
- Desktop y mobile usan la misma gramática general, pero no la misma prioridad.

### Lo que conviene corregir

- Más jerarquía entre estado, referencia del chip y acción principal.
- Menos vocabulario técnico visible para cliente final.
- Lista más compacta y más escaneable.
- Activación más simple y más separada del modo listado.

## 3. Concepto visual recomendado

### Idea central

`Mis dispositivos` debe sentirse como una pared de tarjetas vivas, no como un sistema de inventario.

Cada chip debe leerse como una unidad de protección:

- estado;
- referencia visible;
- perfil protegido;
- acceso público;
- acción secundaria.

### Lenguaje de marca

- `Dispositivo` como palabra principal.
- `Chip activo` como estado principal.
- `Vincular perfil` como acción útil.
- `Ver ficha pública` como salida.
- `Suspender chip` como acción peligrosa, pero no protagonista.

## 4. Arquitectura propuesta de la pantalla

### A. Encabezado simple

El header debería responder a una lógica de cliente final:

- título corto: `Mis dispositivos`;
- subtítulo breve y útil;
- una sola línea de contexto, sin sonar a panel técnico.

### B. Resumen superior

Antes de la lista, mostrar un resumen pequeño de cuenta:

- chips activos;
- chips sin asignar;
- chips en activación o suspensión si aplica.

Esto ayuda a abrir la vista sin necesidad de leer todas las tarjetas.

### C. Segmentación clara

Separar visualmente dos intenciones:

1. `Mis dispositivos`
2. `Activar chip`

No deben competir en la misma franja.

### D. Lista de chips

Cada chip debe vivir en una card con esta prioridad:

1. estado;
2. `serialPublic`;
3. perfil vinculado;
4. acciones.

## 5. Propuesta de tarjeta de chip

### Jerarquía ideal

1. Estado arriba y visible.
2. `serialPublic` como identificador principal.
3. `shortCode` reservado a uso secundario o soporte contextual.
4. Perfil vinculado en lenguaje humano.
5. Acciones al final, con una principal y una secundaria.

### Contenido recomendado

- Estado: `Activo`, `Suspendido`, `Sin asignar`.
- Referencia visible: `serialPublic`.
- Perfil: `Protege a ...` o `Sin perfil vinculado`.
- Acción principal: `Ver perfil`.
- Acción secundaria: `Vincular perfil`.
- Acción peligrosa: `Suspender chip`, más discreta.

### Lo que conviene ocultar o reducir

- `Código ID` como etiqueta dominante.
- `Activación Instantánea NFC` como texto repetido dentro de la lista.
- `Seguro Ley 81` como badge redundante si no aporta decisión.
- `Accesorios vinculados` como bloque pesado si desplaza la lectura principal.

## 6. Propuesta de activación

### Separación de modo

La activación debe sentirse como una tarea distinta de la lista.

### Experiencia ideal

- CTA claro en la lista: `Activar chip`.
- Bloque de activación más enfocado.
- Un solo objetivo visible:
  - ingresar código;
  - seleccionar perfil;
  - confirmar activación.

### Reglas

- el formulario no debe parecer más importante que la lista;
- el éxito de activación debe sentirse celebratorio, pero contenido;
- el error debe ser claro y corto;
- mobile debe mantener botones grandes y lectura rápida.

## 7. Mobile-first

### Principios

- una tarjeta por chip;
- poco texto técnico;
- estados bien arriba;
- acciones apiladas o en bloques cortos;
- activar y listar no deben mezclarse.

### Qué se debe evitar en móvil

- filas demasiado horizontales;
- badges múltiples compitiendo entre sí;
- `Suspender` con el mismo peso que `Ver perfil`;
- espacio visual desperdiciado en descripciones largas.

### Qué sí conviene

- chips con aire entre sí;
- título y subtítulo compactos;
- botón de activación fuerte;
- selector de perfil simple y claro;
- leer rápido sin hacer zoom.

## 8. Desktop

### Oportunidad

Desktop puede mostrar más información, pero sin perder foco.

### Recomendación

- tarjetas anchas, pero con contenido bien agrupado;
- bloque de estado visual arriba;
- acciones alineadas;
- accesorios solo si no compiten con la tarea principal.

### Qué evitar

- demasiado aire entre bloques;
- demasiadas columnas sin jerarquía;
- una lista que parezca inventario de admin.

## 9. Sistema visual recomendado

### Tarjetas

- fondo oscuro o semioscuro para chips activos;
- superficie clara solo si el contraste está garantizado;
- borde sutil y sombra premium moderada.

### Estados

- `Activo`: verde protegido, claro y confiable.
- `Suspendido`: ámbar o rojo suave, pero no alarmista.
- `Sin asignar`: neutro, legible y sobrio.

### Botones

- botón primario: `Activar chip`.
- botón secundario: `Ver perfil`.
- botón terciario: `Vincular perfil`.
- acción peligrosa: `Suspender chip`.

### Texto

- `serialPublic` como dato principal visible.
- `shortCode` como dato auxiliar.
- evitar jerga interna delante del cliente.

## 10. Lo que no debe pasar

- No convertir `Mis dispositivos` en una pantalla de inventario.
- No darle a `Suspender` el peso de una acción principal.
- No mezclar demasiadas etiquetas técnicas.
- No dejar la activación compitiendo con la lista.
- No esconder la relación chip-perfil detrás de accesorios.

## 11. Recomendación para implementación futura

### W6.05F-B debería llevar esto

1. header más claro;
2. resumen superior corto;
3. cards de chips más compactas;
4. acciones más ordenadas;
5. activación separada y simple;
6. mejor lectura en mobile;
7. mejor uso del ancho en desktop.

### W6.05F-C podría resolver después

- refinamiento visual de badges;
- estados vacíos más expresivos;
- mejor integración de accesorios vinculados;
- polish fino de microcopy y densidad.

## 12. Skills usadas como criterio

- `prerescate-rules`
- `verification-loop`
- `impeccable`
- `frontend-patterns`
- `frontend-a11y`
- `design-system`
- `brandkit`
- `design-taste-frontend`
- `high-end-visual-design`

## 13. Conclusión

`Mis dispositivos` ya tiene la información correcta. El siguiente paso es hacer que esa información se lea como una experiencia de protección clara y moderna, no como una tabla operativa.

La mejor dirección es:

- menos ruido;
- más jerarquía;
- activación más separada;
- acciones más honestas;
- vocabulario más humano;
- mobile primero.
