# W6.06B - Sistema Cliente Premium Emergency

## Propósito

Este documento define el sistema visual oficial del panel cliente de PreRescue ID / PreRescatePTY.

La meta de esta fase no es rediseñar pantallas completas. La meta es unificar el lenguaje visual para que las siguientes iteraciones de `Inicio`, `Mis dispositivos`, `Tienda`, `Mis pedidos`, `Empresa` y `Ajustes` se construyan sobre la misma gramática.

## Qué debe sentir el usuario

- `mi protección está lista`
- `sé qué hacer ahora`
- `mis datos están ordenados`
- `esto es serio, pero fácil de usar`
- `la interfaz protege sin estorbar`

## Principios del sistema

### 1. Protección inmediata

La interfaz debe transmitir reacción rápida, estado claro y acceso directo a la acción útil.

### 2. Confianza médica

Los detalles clínicos deben sentirse precisos, limpios y confiables.

### 3. Tecnología discreta

La tecnología debe sostener la experiencia, no competir con ella.

### 4. Emergencia sin caos

El rojo y los estados críticos deben usarse con intención, no como decoración.

### 5. Premium sin perder legibilidad

La interfaz puede ser aspiracional, pero nunca debe sacrificar lectura o claridad.

### 6. Operativo pero humano

La capa visual debe sentirse útil y cálida a la vez.

## Lenguaje visual base

El panel cliente ya muestra dos referencias fuertes:

- `Inicio`
- `Mis dispositivos`

Estas pantallas marcan la dirección del sistema:

- hero oscuro con presencia de marca;
- tarjetas amplias y legibles;
- botones con jerarquía fuerte;
- estados semánticos muy claros;
- ritmo visual premium, no administrativo genérico.

## Paleta funcional

### Rojo

Uso:

- marca;
- acción principal;
- emergencia controlada;
- CTA principal;
- foco de decisión.

Regla:

- no usar rojo solo para decorar;
- no duplicar varios rojos dominantes en la misma pantalla.

### Negro / navy oscuro

Uso:

- heroes;
- módulos premium;
- superficies de protección;
- cards protagonistas;
- shell visual del dashboard.

Regla:

- reservarlo para pantallas donde la presencia de marca ayude a orientar al usuario.

### Blanco / slate claro

Uso:

- formularios;
- detalle;
- listas;
- lectura prolongada;
- contextos clínicos o de cuenta.

Regla:

- usarlo cuando la densidad de información necesita aire.

### Verde

Uso:

- éxito real;
- activo;
- protegido;
- comprobante enviado;
- vinculación activa.

Regla:

- verde solo para confirmación o estado positivo verificable.

### Azul

Uso:

- información;
- guía;
- estado neutro importante;
- pago en revisión cuando corresponda.

Regla:

- usarlo como apoyo semántico, no como color principal de marca.

### Morado

Uso:

- módulos secundarios;
- producción;
- sistema.

Regla:

- usarlo con moderación para no romper la identidad del producto.

### Ámbar

Uso:

- pendiente;
- advertencia;
- requiere acción.

Regla:

- ámbar alerta, no distrae.

## Patrones de pantalla

### Pantalla principal premium

Uso:

- `Inicio`
- `Mis dispositivos`
- `Tienda`

Características:

- hero dark;
- título fuerte;
- subtítulo corto;
- CTA principal;
- resumen rápido;
- sensación de marca y protección.

### Pantalla funcional clínica

Uso:

- `Perfiles médicos`
- `Ajustes`

Características:

- header claro;
- cards blancas amplias;
- badges semánticos;
- acciones ordenadas;
- prioridad en lectura y precisión.

### Pantalla operativa transaccional

Uso:

- `Mis pedidos`
- `Empresa`

Características:

- título claro;
- estado visible;
- resumen operativo primero;
- detalle después;
- navegación sin ruido.

## Reglas de composición

### Headers

- un header principal por pantalla;
- título corto y accionable;
- subtítulo breve;
- evitar párrafos largos en la cabecera;
- el CTA principal debe tener un solo foco.

### Cards

- una intención principal por card;
- bordes y sombras deben apoyar la jerarquía;
- no competir con el contenido;
- hero cards oscuras para presencia;
- cards blancas para detalle y formularios.

### Badges

- un badge por concepto principal;
- texto breve y semántico;
- no saturar una sola línea con demasiados chips;
- el color debe acompañar el significado.

### CTAs

- CTA principal: rojo;
- CTA secundario: neutro;
- CTA destructivo: rojo con lenguaje explícito;
- CTA positivo: verde solo si confirma una acción clara.

### Empty states

- mensaje corto;
- una siguiente acción clara;
- tono humano, no técnico de más;
- no llenar el vacío con ilustración innecesaria.

### Helper text

- breve;
- contextual;
- útil para completar una decisión;
- no repetir el texto del título.

## Superficies oficiales

### Hero premium oscuro

- fondo oscuro con halo rojo sutil;
- radios amplios;
- borde tenue;
- sombra controlada;
- ideal para `Inicio`, `Dispositivos`, `Tienda`.

### Card funcional clara

- fondo blanco o casi blanco;
- borde fino;
- sombra corta;
- ideal para `Perfiles médicos` y `Ajustes`.

### Card operativa

- más densidad;
- estado visible;
- foco en procesos y revisión;
- ideal para `Mis pedidos` y `Empresa`.

## Qué no debe hacer el sistema

- no usar colores fuertes solo por estética;
- no mezclar demasiados lenguajes cromáticos en la misma pantalla;
- no dejar que una tarjeta secundaria robe el protagonismo del hero;
- no convertir la interfaz en un panel administrativo genérico;
- no tocar lógica operativa para resolver un problema visual;
- no rediseñar pantallas completas en esta fase.

## Referencia de implementación actual

La base visual vigente ya vive en:

- `app/globals.css`
- `tailwind.config.ts`
- `app/(app)/dashboard/layout.tsx`
- `app/(app)/dashboard/page.tsx`
- `app/(app)/dashboard/perfiles-medicos/page.tsx`
- `app/(app)/dashboard/chips/page.tsx`
- `app/(app)/dashboard/tienda/page.tsx`
- `app/(app)/dashboard/pedidos/page.tsx`
- `app/(app)/dashboard/empresas/page.tsx`
- `app/(app)/dashboard/configuracion/page.tsx`

## Siguiente paso recomendado

La siguiente fase natural es convertir este documento en helpers compartidos para:

- heroes;
- cards;
- badges;
- empty states;
- buttons;
- helper texts.

Eso permitiría refinar pantalla por pantalla sin inventar variantes nuevas cada vez.
