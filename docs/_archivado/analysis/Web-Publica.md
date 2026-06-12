# Web Pública (Landing Page & Captación)

Portal principal de comunicación, educación y embudo de conversión para el ecosistema PreRescue ID.

## Estrategia de Diseño (Rich Aesthetics)
- **Concepto Visual**: "Rescate Inteligente". Uso de contrastes entre Azul Profundo (`#050814`), Rojo Vital (`#DA1A21`) y blanco premium.
- **Micro-animaciones**: Utiliza `framer-motion` para blobs cinéticos, shimmers en botones y entradas suaves (fade-in-up) de secciones.
- **Tipografía**: Basada en pesos extra-bold (Black) con inclinaciones itálicas para transmitir urgencia y modernidad.

## Secciones del Embudo

### 1. Hero: Propuesta de Valor
- **Mensaje**: "Información que habla por ti cuando tú no puedes".
- **Visual**: Render 3D del Sticker/Chip con notificaciones flotantes simuladas.
- **CTA**: Acceso directo a la tabla de precios.

### 2. Educación del Problema
- **Conector Emocional**: "El silencio es tu mayor enemigo".
- **Dato Crítico**: Reducción del tiempo de identificación de 15 minutos a menos de 1 segundo.

### 3. Demo en Vivo (Showcase Interactiva)
- **Simulador de Chip**: Representación visual de un Sticker de PreRescue.
- **Acción**: Permite al usuario escanear un QR real o hacer clic para abrir la [[Web-Motor-Emergencia]] con un perfil de prueba.
- **Interconexión**: Alimentado por el campo `demo_profile_shortcode` en [[Admin-Ajustes]].

### 4. Segmentos de Mercado
- **Motociclistas/Conductores**: Enfoque en accidentes de tránsito.
- **Niños/Escuela**: Enfoque en mochilas e identificación rápida.
- **Adultos Mayores**: Enfoque en condiciones crónicas y extravío.

### 5. Planes y Precios (PricingSection)
Muestra los combos disponibles (Digital, Dúo, Familiar).
- **Interconexión**: Los botones de compra redirigen a [[Web-Tienda]].

## Metadatos y SEO
- **Título**: PreRescate ID | Escudo Digital de Emergencia
- **Performance**: Optimizado mediante componentes de imagen nativos de Next.js y fuentes locales.

---
**Protocolo de Obsidian:**
- Relacionado con: [[Web-Tienda]], [[Web-Motor-Emergencia]].
- Nota: Todos los enlaces internos utilizan anclas inteligentes (`#how-it-works`) para una navegación de una sola página (SPA).
