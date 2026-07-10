# BRAND-B - Sistema Visual Base PreRescue ID

## 1. Diagnóstico visual actual

PreRescue ID ya tiene una base reconocible y no parte de cero. La identidad actual vive en tres capas:

- una marca roja de emergencia clara y consistente
- una atmósfera oscura premium para dashboard, hero y superficies de protección
- un lenguaje glass suave con sombras limpias y estados bien diferenciados

### Lo que ya tiene identidad

- El rojo `#DA1A21` funciona como ancla de marca y acción.
- El azul noche y los fondos oscuros dan sensación de seguridad y seriedad médica.
- Las cards del dashboard ya usan jerarquía clara, radios amplios y lectura rápida.
- La home cliente ya prioriza estado, chip activo, perfiles y accesos principales.
- La ficha pública ya está orientada a legibilidad, no a decoración.
- Los assets existentes en `public/` ya sostienen la narrativa visual:
  - `logo.png`
  - `logo.jpeg`
  - `sticker-official.png`
  - `hero-helmet.png`
  - `backpack-safety.png`
  - `og/pre-rescue-social-card.png`

### Lo que se siente genérico

- Algunos fondos y tarjetas todavía dependen demasiado de defaults de Tailwind o ShadCN.
- La relación entre rojo de marca y superficies oscuras aún puede volverse más intencional.
- El sistema tiene buenas piezas, pero falta una guía explícita de cuándo usar cada superficie.
- La experiencia móvil puede perder carácter si se simplifica demasiado sin una estructura de tokens.

### Lo que se debe mantener

- La claridad clínica.
- La lectura rápida en dashboard y ficha pública.
- La jerarquía por estado, no por decoración.
- El uso de rojo solo como acento de acción y rescate.
- La sensación de confianza premium, no de app genérica de administración.

### Lo que se debe corregir

- Reducir dependencia de colores arbitrarios fuera del sistema base.
- Unificar superficies para home, cards y sidebar.
- Formalizar botones y estados para que no parezcan variantes aisladas.
- Hacer que las cards de perfiles, dispositivos y tienda compartan un mismo lenguaje.

## 2. Tokens de color

### Core

- `brand-red` `#DA1A21`
- `brand-red-deep` `#B9141B`
- `night-blue` `#05070D`
- `charcoal-blue` `#0F1419`
- `cool-white` `#EFF4FF`
- `clinical-gray` `#A0AEC0`

### Semánticos

- `protected-green` `#10B981`
- `warning-amber` `#F59E0B`
- `support-blue` `#2563EB`
- `danger-red` `#DC2626`

### Usos recomendados

- CTA principal: `brand-red`
- CTA hover o estado activo: `brand-red-deep`
- Hero oscuro y fondos de marca: `night-blue` y `charcoal-blue`
- Superficies claras clínicas: `cool-white`
- Texto secundario: `clinical-gray`
- Estados protegidos: `protected-green`
- Advertencias y stock crítico: `warning-amber`
- Links y soporte: `support-blue`
- Alertas destructivas: `danger-red`

### Reglas de uso

- No usar más de un rojo dominante por pantalla.
- El rojo debe reservarse para acción, riesgo o foco.
- El verde debe comunicar protegido, nunca compra.
- El ámbar debe advertir, no competir con el CTA.
- El azul de soporte debe usarse con moderación.

## 3. Gradientes oficiales

### 1. Hero premium

- `linear-gradient(135deg, #05070D 0%, #0F1419 52%, rgba(218, 26, 33, 0.16) 100%)`

### 2. CTA emergencia

- `linear-gradient(135deg, #DA1A21 0%, #B9141B 100%)`

### 3. Superficie oscura

- `linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)`

### 4. Superficie clínica clara

- `linear-gradient(180deg, #EFF4FF 0%, #FFFFFF 100%)`

### 5. Fondo mobile

- `linear-gradient(180deg, #05070D 0%, #0F1419 60%, #101828 100%)`

### Reglas

- Los gradientes deben ser suaves y legibles.
- El hero puede tener halo rojo sutil.
- Las superficies de cards no deben competir con el contenido.
- En mobile, el gradiente debe favorecer contraste y no ruido.

## 4. Superficies

### Hero cards

- Radio amplio.
- Fondo con gradiente premium.
- Borde muy sutil.
- Sombra de marca o premium, no pesada.

### Cards normales

- Fondo blanco o casi blanco en contextos claros.
- Fondo glass tenue en contexto oscuro.
- Borde fino y sombra corta.
- Jerarquía simple: título, descripción, acción.

### Cards de perfil

- Deben sentirse humanas y cercanas.
- Avatar, nombre, estado y un preview breve.
- No más de una intención principal por card.

### Cards de dispositivos

- Más técnicas que perfiles.
- Pueden usar chips, shortCode, señal o serial público como protagonista visual.
- Deben mostrar estado operativo con claridad.

### Cards de tienda

- Más expresivas y comerciales.
- Más profundidad visual.
- Deben destacar disponibilidad y valor.

### Sidebar

- Glass premium oscuro en desktop.
- Estado activo rojo.
- Espaciado amplio, iconografía clara.

### Mobile cards

- Apiladas, de alto contraste y lectura rápida.
- Menos ornamentación.
- CTA cómodo y táctil.

### Glass surfaces

- Usarlas para navegación, hero y cards ligeras.
- No abusar de blur fuerte en pantallas densas.
- El glass debe sugerir profundidad, no distraer.

## 5. Botones

### Primary emergency

- Uso: CTA principal de la home, activar chip, acciones urgentes.
- Fondo: `brand-red`.
- Texto: blanco frío.
- Radio: amplio, estilo premium.
- Sombra: marca suave.
- Hover: subir levemente saturación o profundidad.
- Active: compress sutil.
- Disabled: baja opacidad y sin glow.
- Loading: spinner pequeño o pulso sutil.

### Secondary outline

- Uso: ver perfiles, gestionar, explorar.
- Borde visible.
- Fondo translúcido o blanco.
- Hover: elevar contraste y borde.

### Ghost

- Uso: acciones secundarias o links de apoyo.
- Fondo transparente.
- Texto fuerte.
- Hover: halo leve.

### Success / protected

- Uso: estados positivos o protegidos.
- Fondo verde suave o borde verde.
- Debe comunicar seguridad, no venta.

### Shop / commercial

- Uso: tienda, explorar productos.
- Puede usar rojo de marca o azul soporte, según contexto.
- Debe sentirse más comercial que operativo.

### Danger / emergency only

- Uso: alertas críticas, nunca para CTAs comunes.
- Debe reservarse para rescate, bloqueo o riesgo.

### Reglas generales

- Altura mínima móvil: cómoda para toque.
- No mezclar dos CTAs del mismo peso en la misma card.
- Mantener consistencia de radio y sombra.
- El CTA primario debe ser visualmente dominante.

## 6. Cards

### Card hero

- La más grande y expresiva.
- Puede incluir marca, estado, chip activo y preview de perfiles.
- Debe equilibrar emoción y claridad.

### Card preview perfil

- Avatar o foto.
- Nombre y estado resumido.
- Un badge máximo relevante.

### Card dispositivo

- Código público o shortCode.
- Estado del chip.
- Relación con perfil vinculado.

### Card tienda

- Producto, disponibilidad y beneficio.
- Puede tener más color y foco comercial.

### Card pedido secundario

- Debe ser discreta.
- Sirve como acceso útil, no como protagonista.

### Empty state card

- Debe guiar con un siguiente paso claro.
- Nunca dejarla vacía sin contexto.
- Usar tono humano y corto.

## 7. Tipografía y jerarquía

### Escala recomendada

- H1: grande, fuerte y breve.
- H2: claro, con presencia de marca.
- H3: para tarjetas y secciones.
- Body: legible y sobrio.
- Microcopy: breve, orientado a acción.

### Números y métricas

- Deben ser grandes y simples.
- No saturar con más de 3 o 4 métricas visibles.
- El número debe respaldar la historia, no dominarla.

### Labels

- En mayúsculas pequeñas o tracking amplio.
- Solo para contexto, no para gritar.

### Badges

- Cortos.
- Un estado por badge.
- No acumular demasiadas etiquetas en la misma vista.

## 8. Iconografía

### Estilo

- Line icons sólidos.
- Geometría simple.
- Trazo claro.
- Sin detalles demasiado finos.

### Íconos clave

- Escudo: protección.
- Pulso: estado médico.
- Chip: dispositivo.
- QR / NFC: acceso y activación.
- Mapa: retorno seguro.
- Contacto: rescate.
- Tienda: comercio.
- Pedido: seguimiento.

### Reglas

- El icono debe reforzar la lectura del bloque.
- No usar iconos decorativos sin función.
- Mantener consistencia de peso visual.

## 9. Fondos y patrones

### Fondos base

- Oscuro premium para home y dashboard.
- Blanco frío para lectura amplia o páginas clínicas.
- Fondo mobile con contraste fuerte y limpio.

### Patrones sugeridos

- Halo radial suave detrás del hero.
- Grid técnico muy sutil en dashboard.
- Ondas NFC discretas en chip o activación.
- Noise liviano para evitar planitud.

### Reglas

- El patrón nunca debe competir con el contenido.
- En emergencias, el fondo debe ser sobrio.
- En mobile, menos ruido y más contraste.

## 10. Motion futuro

### Reglas propuestas

- Brillo leve en CTA principal.
- Hover card con elevación mínima.
- Pulso protegido para estados positivos.
- Ondas NFC al activar o ver chip.
- Check animado al proteger un perfil.
- Transición suave del sidebar.
- Respetar `prefers-reduced-motion`.

### Lo que sí

- Animaciones cortas.
- Easing suave.
- Feedback inmediato.

### Lo que no

- Parpadeo agresivo.
- Movimiento constante sin propósito.
- Efectos pesados que afecten mobile.

## 11. Aplicación inicial recomendada

### BRAND-C debe implementar primero

- Hero de la home cliente.
- Botones principales.
- Cards principales de perfiles, dispositivos y tienda.
- Sidebar activo.
- Ajustes mobile de spacing y contraste.

### Prioridad

1. Home cliente.
2. Botón primario y secundarios.
3. Cards base.
4. Navegación lateral.
5. Pulido mobile.

## 12. Qué NO hacer

- No abusar de 3D.
- No convertir la marca en algo gamer.
- No usar animación agresiva o chillona.
- No saturar la ficha pública médica.
- No añadir demasiados colores.
- No esconder información crítica por estética.
- No hacer que la UI se sienta como un template.

## 13. Plan siguiente

### BRAND-C

- Aplicar hero y home cliente.

### BRAND-D

- Unificar cards y botones en dashboard.

### BRAND-E

- Motion controlado y microinteracciones.

### BRAND-F

- Assets 3D reales solo donde aporten valor.

## 14. Recomendación final

El sistema visual de PreRescue ID debe sentirse como marca real, no como decoración. La combinación correcta es:

1. base clínica clara
2. protección emocional
3. profundidad premium controlada

Ese balance permite que la home, la ficha pública y la tienda convivan sin pelear entre sí y sin perder la sensación de rescate confiable.
