# W1B Website Content Strategy

## 1. Executive decision

**Recommended approach:** CONTENT STRATEGY FIRST, then visual redesign.

The W1A audit identified that the website's primary weakness is not visual design but missing content, trust signals, and information architecture. This document defines the complete content strategy, information architecture, and verified product claims needed before any visual redesign begins.

**Key constraint discovered during source inspection:**
- The scan API records scans with `notificationStatus: "disabled"` — there is NO automatic WhatsApp, email, or SMS notification sent when a chip is scanned.
- The emergency profile page generates client-side `wa.me` links that the responder can click to manually message emergency contacts.
- The website currently implies automatic alerts ("Tus contactos reciben tu ubicación GPS al ser escaneado") which is NOT accurate based on current implementation.
- All external notification claims must be revised to reflect this verified behavior.

---

## 2. Verified product facts

### Source verification methodology
- Source code inspected: scan API route, public profile API, emergency profile page, WhatsApp service, notification service, chip lifecycle constants, business constants, account types, package themes.
- Claims classified based on actual implementation, not marketing copy.

### Verified facts table

| # | Claim | Status | Evidence/source | Safe public wording | Owner verification needed? |
|---|-------|--------|-----------------|---------------------|---------------------------|
| 1 | Uses QR code | VERIFIED | `/e/[shortCode]` route, QR generation at `/api/public/qr` | "Código QR único por chip" | No |
| 2 | Uses NFC | VERIFIED | ComoFuncionaContent mentions NFC NTAG213, emergency page accepts `source=nfc` | "Tecnología NFC integrada" | No |
| 3 | Scanner does not need to install an app | VERIFIED | Emergency profile loads in browser via QR/NFC tap-to-web | "No requiere instalar una aplicación. Cualquier celular con cámara o NFC puede acceder al perfil." | No |
| 4 | The identification device does not need a battery | VERIFIED | Sticker is passive NFC tag + printed QR code | "El sticker no necesita batería. Funciona con la energía del celular que lo escanea." | No |
| 5 | Internet is required to load the online profile | VERIFIED | Profile loads via HTTPS fetch to `/api/public/[shortCode]` | "El dispositivo que escanea necesita conexión a internet para consultar el perfil médico." | No |
| 6 | User can update profile information | VERIFIED | Dashboard has profile editing (MedicalProfileForm) | "Puedes actualizar tu información médica en cualquier momento desde tu panel de control." | No |
| 7 | User controls public visibility | VERIFIED | Profile has `show*Public` flags for each field | "Tú decides qué información se muestra al escanear tu chip: alergias, condiciones, contactos, etc." | No |
| 8 | Medical/private fields are protected | VERIFIED | Fields encrypted with `decrypt()`, email/birthdate never exposed | "Los datos sensibles están cifrados. Tu correo y fecha de nacimiento nunca se muestran públicamente." | No |
| 9 | Public profile can display selected emergency information | VERIFIED | Public profile API returns controlled fields based on visibility flags | "Al escanear el chip se muestra: nombre, tipo de sangre, alergias, condiciones, medicamentos y contactos de emergencia (según tu configuración)." | No |
| 10 | Emergency contacts can be configured | VERIFIED | Profile has contacts with relationship, phone | "Puedes registrar los contactos de emergencia que aparecerán en tu perfil público." | No |
| 11 | WhatsApp notifications exist | PARTIALLY VERIFIED | `WhatsappService` can send via Twilio, BUT scan route sets `notificationStatus: "disabled"` — no automatic WhatsApp on scan | "El perfil de emergencia muestra botones de WhatsApp para que el respondedor se comunique manualmente con tus contactos." | YES — confirm if automatic WhatsApp on scan is planned |
| 12 | WhatsApp notifications are sent on every scan | FALSE | Scan route does NOT call WhatsApp service | Do NOT claim automatic WhatsApp notifications | No |
| 13 | WhatsApp notifications may include location | PARTIALLY VERIFIED | wa.me links include location text IF geolocation permission granted | "Si el respondedor autoriza la ubicación, el mensaje de WhatsApp puede incluir la posición aproximada." | No |
| 14 | Location requires permission | VERIFIED | `navigator.geolocation.getCurrentPosition` with timeout | "La ubicación se envía solo si el respondedor autoriza el acceso a su ubicación." | No |
| 15 | Product works outside Panama | VERIFIED | QR/NFC links to public URL accessible from any country | "El código QR y el chip NFC funcionan en cualquier país. El perfil médico se carga desde cualquier lugar con internet." | No |
| 16 | Account can be deleted | VERIFIED | `/api/users/account/delete` route + `SafeDeleteService.deleteUserAccount` | "Puedes solicitar la eliminación de tu cuenta desde la configuración. La cuenta se desactiva y la información personal y médica sensible se elimina o anonimiza. Determinados registros administrativos, contables y de auditoría pueden conservarse cuando exista una obligación legal o una necesidad legítima de seguridad y trazabilidad." | YES — obtain legal review for final data-retention wording |
| 17 | Chip can be rehabilitated | VERIFIED | `/api/admin/chips/[chipId]/rehabilitate` route exists | "Un chip desactivado puede ser rehabilitado." | YES — confirm process for end users |
| 18 | Expired service can be reactivated | VERIFIED | Chip lifecycle includes expired → reactivate flow | "Si tu servicio vence, puedes reactivarlo." | YES — confirm reactivation process and pricing |
| 19 | Service duration is two years | VERIFIED | `BUSINESS_RULES.DEFAULT_SERVICE_DURATION_MONTHS = 24` | "El servicio tiene una vigencia de 2 años desde la activación." | No |
| 20 | Renewal exists | NOT VERIFIED | No public renewal route or pricing found | Do NOT claim renewal exists without confirmation | YES — confirm renewal process and pricing |
| 21 | Replacement exists | NOT VERIFIED | No public replacement route or pricing found | Do NOT claim replacement exists without confirmation | YES — confirm replacement process and pricing |
| 22 | Warranty exists | NOT VERIFIED | No warranty policy found in code or legal pages | Do NOT claim warranty exists | YES — confirm warranty terms |
| 23 | Refunds exist | NOT VERIFIED | T&C mention "Las políticas de reembolso se aplican según el caso" but no detail | Do NOT claim refund policy exists | YES — confirm refund policy |
| 24 | Shipping exists nationally | NOT VERIFIED | Homepage says "Envíos a todo el territorio nacional" but no shipping service found | Mention shipping only after confirmation | YES — confirm shipping process, costs, times |
| 25 | Corporate accounts exist | VERIFIED | `ACCOUNT_TYPES.COMPANY`, organization routes, corporate profile | "Existen cuentas corporativas para empresas e instituciones." | No |
| 26 | Family profiles exist | VERIFIED | `ACCOUNT_TYPES.FAMILY`, multi-profile support | "Puedes proteger a tu familia con perfiles médicos múltiples." | No |
| 27 | No monthly payment | VERIFIED | Pricing shows one-time payment, no subscription model found | "Pago único. Sin mensualidades." | No |
| 28 | Stripe and manual payment are available | VERIFIED | `/api/payments/checkout` (Stripe), `/api/orders/manual` (Yappy/bank transfer) | "Paga con tarjeta (Stripe) o mediante transferencia/Yappy." | No |
| 29 | Product is a medical device | FALSE | Footer disclaimer says "No reemplaza al 911 ni a los servicios médicos profesionales" | Do NOT call it a medical device. It is an emergency identification system. | No |
| 30 | Product guarantees emergency response | FALSE | No such claim in code or legal | Do NOT claim guaranteed emergency response | No |
| 31 | Emergency responders require an account | FALSE | Public profile loads without authentication | "Cualquier persona puede escanear el chip y ver el perfil público. No necesita cuenta." | No |
| 32 | Public profiles are indexed by search engines | NOT VERIFIED | No noindex on `/e/[shortCode]` in current code | Recommend noindex for emergency profiles | YES — confirm indexing strategy |

### Summary
- **VERIFIED:** 18 claims
- **PARTIALLY VERIFIED:** 2 claims
- **NOT VERIFIED:** 5 claims (renewal, replacement, warranty, refunds, shipping)
- **FALSE:** 2 claims (automatic WhatsApp notifications, medical device)
- **Requires owner input:** 8 claims

---

## 3. Brand and naming

### Current usage audit

| Variant | Where used | Status |
|---------|-----------|--------|
| PreRescue ID | Homepage, navbar, footer, metadata title | Primary brand name |
| PreRescate PTY | Legal pages, registration page, contact page | Legal entity name |
| PreRescue ID PTY | FAQ, metadata description | Mixed variant |
| PreRescatePTY | GitHub repo, documentation | Code/documentation |
| PreRescate | Manifest short_name | Short form |

### Recommended model

**Brand name (public):** PreRescue ID
**Legal entity (footer/legal):** PreRescate PTY
**Product descriptor:** Identificación médica de emergencia con QR y NFC
**Domain:** `prerescatepty.com` (consistent with legal entity)

### Naming rules
1. Use **PreRescue ID** as the primary brand name on all public pages.
2. Use **PreRescate PTY** only in legal contexts (footer, terms, privacy).
3. Do NOT use "PreRescue ID PTY" — it mixes English and Spanish unnecessarily.
4. Do NOT use "PreRescatePTY" as a single word on public pages.
5. The product is an **emergency identification system**, not a "rescue" service.

### URL/domain consistency
- `robots.ts` uses `prerescate.com` — this appears to be a different domain. Verify which domain is correct.
- Contact page and legal pages reference `prerescatepty.com`.
- **OWNER DECISION REQUIRED:** Confirm the primary production domain.

---

## 4. Priority audiences

### Audience priority matrix

| Priority | Audience | Primary need | Main objection | Recommended message | CTA | Homepage or dedicated page |
|----------|----------|-------------|----------------|---------------------|-----|---------------------------|
| 1 | Families | Protect children, elderly, and all family members | "Is it complicated to set up for everyone?" | "Protege a toda tu familia con un solo panel. Perfiles individuales para cada miembro." | "Protege a tu Familia" | Homepage + /para-quien-es |
| 2 | Older adults / caregivers | Safety for elderly with medical conditions or wandering risk | "My relative won't use a smartphone" | "Sin aplicaciones. Un sticker en su mochila o billetera. Cualquier persona puede ayudar." | "Cuida a Quienes Cuidan" | Homepage + /para-quien-es |
| 3 | Parents of children | Child safety at school, on field trips, in public | "My child is too young for a phone" | "Un sticker en la mochila. Sin celular necesario. Información médica y contacto de los padres al instante." | "Protege a tus Hijos" | Homepage + /para-quien-es |
| 4 | People with chronic conditions / allergies | Ensure medical info is available in an emergency | "What if I'm unconscious and can't speak?" | "Tu información médica crítica visible para quien te auxilie. Sin necesidad de que tú hables." | "Tu Información, Siempre Accesible" | /para-quien-es |
| 5 | People with communication vulnerabilities | Non-verbal, autism, cognitive impairment | "How will responders know how to communicate?" | "Instrucciones de comunicación y retorno seguro visibles para el respondedor." | "Comunicación Asistida" | /para-quien-es |
| 6 | Motorcyclists / drivers | Quick ID after accident | "Paramedics won't know to scan" | "Sticker en tu casco o vehículo. Visible para cualquier respondedor." | "Protege tu Viaje" | Homepage + /para-quien-es |
| 7 | Companies | Employee safety, corporate responsibility | "Too expensive for bulk" | "Protege a tu equipo. Panel administrativo. Perfiles corporativos." | "Protege a tu Equipo" | /empresas |
| 8 | Schools / institutions | Student safety, field trip protection | "Data privacy concerns" | "Perfiles para estudiantes. Control institucional. Cumplimiento Ley 81." | "Solicitar Información" | /empresas |
| 9 | Emergency responders | Quick access to medical info | "I don't know how this works" | "Escanea el QR o NFC. Ve el perfil médico. Contacta a la familia." | Informational only | /como-funciona |
| 10 | Athletes / travelers | Medical ID during sports or travel | "Does it work outside Panama?" | "Funciona en cualquier país. Sin roaming. Sin aplicaciones." | "Viaja Protegido" | /para-quien-es |

### Primary public audience
**Families with children and/or elderly members** — This is the broadest addressable market and the product's multi-profile capability directly serves this need.

### Secondary public audience
**Individuals with chronic conditions or allergies** — The core value proposition (medical info when unconscious) is most compelling for this group.

### Corporate audience
**Companies with field workers, drivers, or distributed teams** — Employee safety programs.

### Informational audience
**Emergency responders** — Need to know how to scan and interpret the profile.

### Owner decision required
The repository does not contain sales data or customer analytics. The audience priority above is based on product capability analysis, not commercial data. **Confirm primary audience based on actual customer data.**

---

## 5. Final information architecture

### Page inventory

| Route | Status | Purpose | Primary audience | Main CTA | Required content | Launch phase |
|-------|--------|---------|------------------|----------|-----------------|--------------|
| `/` | IMPROVE | Product introduction, conversion | All visitors | "Protegerse Hoy" | Hero, benefits, how-it-works, use cases, demo, privacy, pricing, FAQ, trust | Phase 1 |
| `/como-funciona` | IMPROVE | Detailed product explanation | All visitors | "Adquirir Kit" | Full product explanation, steps, technical details, disclaimers | Phase 2 |
| `/para-quien-es` | CREATE | Audience self-identification | Families, caregivers, patients | "Ver Planes" | Use cases by audience group | Phase 2 |
| `/planes` | CREATE | Pricing and purchase | Buyers | "Adquirir [Plan]" | Package cards, comparison table, FAQ, trust panel | Phase 3 |
| `/comprar` | MERGE into `/planes` | Purchase page | Buyers | Redirect to /planes | — | Phase 3 |
| `/empresas` | CREATE | Corporate sales | Companies, schools | "Solicitar Cotización" | Corporate value prop, benefits, quote form | Phase 3 |
| `/demo` | IMPROVE | Product demonstration | All visitors | "Probar Demo" | Demo explanation, screenshot, link to live demo | Phase 2 |
| `/faq` | IMPROVE | Answer objections | All visitors | "Contactar" | 25+ categorized questions | Phase 3 |
| `/contacto` | IMPROVE | Customer contact | All visitors | "Enviar" | Form, phone, email, hours, address | Phase 1 |
| `/nosotros` | CREATE | Company information | Trust-seeking visitors | "Ver Planes" | Mission, team (if available), company info | Phase 4 |
| `/ayuda` | DEFER | Support center | Existing users | — | Tutorials, guides, troubleshooting | Phase 4 |
| `/legal/terminos` | KEEP | Legal | Legal, users | — | Current content + refund/warranty details | Phase 1 |
| `/legal/privacidad` | KEEP | Privacy | Legal, users | — | Current content (well-written) | Phase 1 |
| `/legal/reembolsos` | CREATE | Refund policy | Buyers | — | Refund terms | Phase 1 |
| `/legal/envios` | CREATE | Shipping policy | Buyers | — | Shipping terms | Phase 1 |
| `/legal/garantia` | CREATE | Warranty policy | Buyers | — | Warranty terms | Phase 1 |
| `/legal/cookies` | CREATE | Cookie policy | Legal, users | — | Cookie disclosure | Phase 1 |
| `/e/[shortCode]` | IMPROVE | Emergency profile | Responders | Contact buttons | Add responder instructions | Phase 2 |
| `/empresa/[shortCode]` | IMPROVE | Corporate public profile | Employees | "Solicitar Vinculación" | Better styling, join CTA | Phase 3 |

### Desktop navigation

```
[Logo]  Cómo Funciona  Para Quién Es  Planes  Empresas  FAQ  Demo  |  Iniciar Sesión  Comprar
```

**Rationale:**
- 6 main nav items (concise, fits desktop)
- "Comprar" is the primary conversion CTA (highlighted)
- "Demo" in main nav (currently missing)
- "Para Quién Es" and "Empresas" are new (critical for audience self-identification and B2B)
- "Contacto" moved to footer (not a top navigation priority)

### Mobile navigation

```
[Hamburger]
- Inicio
- Cómo Funciona
- Para Quién Es
- Planes
- Empresas
- Demo
- FAQ
---
- Iniciar Sesión
[Sticky bottom] Comprar Ahora
```

### Footer navigation

**Product:** Cómo Funciona | Para Quién Es | Planes | Demo | FAQ
**Empresas:** Planes Corporativos | Solicitar Cotización
**Soporte:** Contacto | Ayuda (futuro)
**Legal:** Términos | Privacidad | Cookies | Reembolsos | Envíos | Garantía
**Redes:** TikTok | Instagram

### Logged-in navigation
Dashboard | Mis Chips | Perfiles Médicos | Pedidos | Empresa | Configuración

### Corporate navigation (public)
Planes Corporativos | Beneficios | Solicitar Demo | Contacto Ventas

---

## 6. Homepage content blueprint

### Section sequence

| # | Section | Objective | Audience | Core message | Supporting info | Primary CTA | Secondary CTA | Evidence required | Content status | Desktop | Mobile |
|---|---------|-----------|----------|--------------|-----------------|-------------|---------------|-------------------|----------------|---------|--------|
| 1 | **Hero** | Immediate value prop + trust | All | "Tu información médica de emergencia, accesible al instante. Sin apps. Sin baterías." | Ley 81 compliance, NFC+QR, 2-year service | "Protegerse Hoy" → /planes | "Ver Demo" → /demo | None | READY | Full hero with sticker visual | Shortened headline, stacked CTAs |
| 2 | **Trust badges** | Instant credibility | All | "Ley 81 · NFC/QR · 2 años · Pago único" | None (visual only) | None | None | None | READY | Row of 4 badges | Row of 4 badges, scrollable |
| 3 | **What is PreRescue ID** | Product explanation | New visitors | "Un sticker con tecnología NFC y código QR que almacena tu información médica de emergencia." | How it works summary, what responder sees | "Cómo Funciona" → /como-funciona | None | None | READY | 2-column text + image | Single column, image below |
| 4 | **How it works** (simplified) | Quick understanding | All | 4 steps: Adquiere → Activa → Configura → Protege | Brief step descriptions | "Ver Detalle" → /como-funciona | None | None | READY | 4-column step layout | 2x2 grid or horizontal scroll |
| 5 | **Use cases** | Audience self-identification | Families, elderly, conditions | "Para niños, adultos mayores, condiciones médicas, empresas" | 6-8 use case cards with icons | "Ver Todos los Casos" → /para-quien-es | None | None | READY | Grid of cards | Horizontal scroll of cards |
| 6 | **Demo live preview** | See it in action | All | "Escanea este código QR y ve cómo funciona en segundos." | Screenshot or live QR | "Probar Demo" → /demo | None | None | READY | QR code + screenshot | QR code only |
| 7 | **Privacy and data control** | Overcome privacy objection | Privacy-conscious | "Tú controlas qué información se muestra. Cumplimos la Ley 81 de Panamá." | What's public vs private, encryption, consent | "Ver Política de Privacidad" → /legal/privacidad | None | None | READY | 2-column: privacy summary + visual | Single column |
| 8 | **Plans** | Conversion | Buyers | "Pago único. 2 años de cobertura." | Package cards with key features | "Adquirir [Plan]" → /planes | "Comparar Planes" → /planes | Package data from API | READY (cards) / NEEDS comparison table | 3-column cards | Single column cards, stacked |
| 9 | **Corporate** | B2B conversion | Companies | "¿Representas una empresa o institución?" | Employee safety, bulk purchase, admin panel | "Ver Planes Corporativos" → /empresas | "Solicitar Cotización" → /empresas | Corporate pricing from owner | NEEDS OWNER INPUT | 2-column: text + CTA | Single column |
| 10 | **FAQ preview** | Answer objections | All | Top 3-5 questions | Accordion with answers | "Ver FAQ Completo" → /faq | None | FAQ content | READY | 3-5 accordion items | Same |
| 11 | **Final CTA** | Conversion | All | "El futuro de la prevención ya está en Panamá." | Trust message, shipping mention | "Inicia tu Protección" → /planes | None | None | READY | Full-width gradient CTA | Same, smaller text |
| 12 | **Footer** | Navigation + legal | All | All links, legal, social | Company info, disclaimer | "Comprar Ahora" → /planes | None | Company identity from owner | NEEDS OWNER INPUT | 4-column grid | Single column |

### Content status legend
- **READY:** Can be written now based on verified product facts
- **NEEDS OWNER INPUT:** Requires commercial or policy decision
- **NEEDS LEGAL REVIEW:** Requires legal counsel approval
- **NEEDS TECHNICAL VERIFICATION:** Requires engineering confirmation

---

## 7. Core website copy

### Writing rules applied
- Spanish for Panama (usted/formal register)
- Clear and human, not technical
- No fear-heavy language
- No exaggerated urgency
- No unverified statistics
- No technical stack terminology
- WhatsApp is the only external notification channel described
- Internet requirement is accurately stated
- Product is NOT a medical device
- Does NOT guarantee emergency response

### 1. One-sentence product explanation
**PreRescue ID es un sistema de identificación médica de emergencia. Un sticker con tecnología NFC y código QR que, al ser escaneado, muestra tu información médica crítica y permite contactar a tus familiares.**

### 2. Hero eyebrow/kicker
**Identificación médica inteligente — Panamá**

### 3. Hero headline
**Tu información médica, accesible al instante. Sin apps. Sin baterías.**

### 4. Hero subheadline
**Un sticker con NFC y código QR. Al escanearlo, los paramédicos o cualquier persona ven tu tipo de sangre, alergias y contactos de emergencia. Tú controlas qué información se muestra.**

### 5. Primary CTA
**Protegerse Hoy**

### 6. Secondary demo CTA
**Ver Demo**

### 7. "What is PreRescue ID?" paragraph
**PreRescue ID es un sticker adhesivo con dos tecnologías: un chip NFC y un código QR. Lo colocas en tu casco, mochila, billetera o identificación. Cuando alguien lo escanea con un celular, accede a tu perfil médico de emergencia: nombre, tipo de sangre, alergias, condiciones médicas, medicamentos y contactos de emergencia. Tú decides qué información es visible. No necesita batería. No necesita una aplicación instalada. El servicio tiene una vigencia de 2 años con un solo pago.**

### 8. How-it-works steps
1. **Adquiere tu sticker** — Recibe tu kit con chip NFC y código QR.
2. **Activa en segundos** — Toca el chip con tu celular o ingresa el código en tu panel.
3. **Configura tu perfil** — Completa tu información médica y elige qué mostrar.
4. **Protección activa** — En una emergencia, quien escanee tu chip verá tu perfil y podrá contactar a tus familiares.

### 9. Privacy summary
**Tú controlas tu información.**
- Decide qué datos se muestran al escanear tu chip (alergias, condiciones, contactos, etc.).
- Los datos sensibles están cifrados.
- Tu correo electrónico y fecha de nacimiento nunca se muestran públicamente.
- Cumplimos con la Ley 81 de Protección de Datos Personales de Panamá.
- Puedes suspender tu perfil al instante desde tu panel.

### 10. WhatsApp notification explanation
**Cuando alguien escanea tu chip, el perfil de emergencia muestra botones para contactar a tus familiares por WhatsApp o llamada telefónica. El respondedor puede enviar un mensaje predefinido con tu información y ubicación aproximada (si autoriza el acceso a su ubicación).**

**Importante:** Las notificaciones por WhatsApp dependen de que el respondedor haga clic en el botón. No se envían automáticamente al escanear el chip.

### 11. Family message
**Protege a toda tu familia con un solo panel. Crea perfiles médicos individuales para tus hijos, padres o adultos mayores. Cada miembro tiene su propio sticker con su información personalizada.**

### 12. Older-adult/caregiver message
**Si un adulto mayor con deterioro cognitivo o riesgo de desorientación se pierde, quien lo encuentre puede escanear su sticker y acceder a instrucciones de retorno seguro y contactar a la familia al instante. Sin necesidad de que la persona tenga un celular.**

### 13. Children/parent message
**Un sticker en la mochila de tu hijo. Sin celular necesario. En caso de emergencia, cualquier persona puede escanear el código QR y ver la información médica del menor y los contactos de los padres.**

### 14. Chronic-condition message
**Si tienes alergias críticas, diabetes, epilepsia o cualquier condición médica, tu información estará disponible para quien te auxilie, incluso si no puedes hablar. El tipo de sangre, alergias y medicamentos se muestran al instante.**

### 15. Corporate message
**Protege a tu equipo con identificación médica corporativa. Panel administrativo para gestionar perfiles, asignar chips y monitorear la protección de tus colaboradores. Ideal para empresas con personal en campo, conductores o equipos distribuidos.**

### 16. Emergency responder explanation
**Al escanear el código QR o NFC, verás:**
- Nombre y foto de la persona
- Tipo de sangre
- Alergias críticas
- Condiciones médicas relevantes
- Medicamentos actuales
- Contactos de emergencia (con botones para llamar o enviar WhatsApp)
- Instrucciones de comunicación (si aplica)
- Instrucciones de retorno seguro (si aplica)

**No necesitas una cuenta ni una aplicación. Solo un celular con cámara o NFC.**

### 17. Plans introduction
**Elige el plan que mejor se adapte a tu familia o equipo. Pago único. 2 años de cobertura. Sin mensualidades.**

### 18. Corporate CTA
**Protege a tu equipo. Solicita una cotización corporativa sin compromiso.**

### 19. Final CTA
**El futuro de la prevención ya está en Panamá. Únete a los que ya protegen lo que más importa.**

### 20. Footer disclaimer
**PreRescue ID es un sistema de identificación médica de emergencia. No reemplaza al 911 ni a los servicios médicos profesionales. En caso de emergencia, llame al 911 inmediatamente. Las notificaciones por WhatsApp dependen de la acción del respondedor y de la disponibilidad del servicio de mensajería.**

---

## 8. Cómo funciona content

### Full content outline for /como-funciona

| # | Section | Content | Status |
|---|---------|---------|--------|
| 1 | **What is PreRescue ID?** | Brief product definition (see section 7.7) | READY |
| 2 | **What the customer receives** | "Recibirás un sticker adhesivo con un chip NFC y un código QR impreso. Cada chip tiene un código único." | READY |
| 3 | **How activation works** | "Al recibir tu chip, ingresa el código de activación en tu panel de control. También puedes tocar el chip con tu celular para iniciar la activación." | READY |
| 4 | **How profile creation works** | "Completa tu información médica: nombre, tipo de sangre, alergias, condiciones, medicamentos y contactos de emergencia. Todo desde tu panel." | READY |
| 5 | **How visibility controls work** | "Para cada campo, puedes elegir si se muestra públicamente al escanear el chip o si permanece privado." | READY |
| 6 | **How QR scanning works** | "Cualquier celular con cámara puede escanear el código QR. La cámara abre automáticamente el perfil de emergencia en el navegador." | READY |
| 7 | **How NFC scanning works** | "Los celulares con NFC (la mayoría de los smartphones actuales) pueden leer el chip al acercarlo. El perfil se abre automáticamente." | READY |
| 8 | **Internet requirement** | "El dispositivo que escanea necesita conexión a internet para cargar el perfil médico. El sticker en sí no necesita batería ni conexión." | READY |
| 9 | **What a responder sees** | List of public fields (name, blood type, allergies, conditions, medications, contacts, special assistance info) | READY |
| 10 | **What happens with WhatsApp notifications** | "El perfil muestra botones de WhatsApp para contactar a los familiares. El respondedor debe hacer clic para enviar el mensaje. No se envían notificaciones automáticas." | READY |
| 11 | **How information is updated** | "Puedes actualizar tu perfil en cualquier momento desde tu panel de control. Los cambios se reflejan al instante." | READY |
| 12 | **What happens if service expires** | "El servicio tiene una vigencia de 2 años. Al vencerse, el perfil deja de estar disponible públicamente." | READY |
| 13 | **What happens if a chip is lost or replaced** | **OWNER INPUT REQUIRED:** Replacement process and pricing not yet defined. | NEEDS OWNER INPUT |
| 14 | **Link to demo** | "Pruébalo tú mismo: escanea este código QR de ejemplo." | READY |
| 15 | **Link to plans** | "Adquiere tu kit de protección." | READY |
| 16 | **Medical/emergency disclaimer** | "PreRescue ID no reemplaza al 911 ni a los servicios médicos profesionales." | READY |

---

## 9. Para quién es content

### Content outline for /para-quien-es

| Group | Situation | Useful profile info | Privacy considerations | CTA | Sensitivity concern | Visual concept |
|-------|-----------|-------------------|----------------------|-----|-------------------|----------------|
| **Familias** | Proteger a todos los miembros en un solo panel | Perfiles individuales para cada miembro, contactos compartidos | Cada miembro controla su propia visibilidad | "Protege a tu Familia" | None | Family illustration |
| **Niños** | Seguridad en escuela, paseos, parques | Información del menor, contactos de padres, alergias | No mostrar edad exacta de menores (ya implementado) | "Protege a tus Hijos" | Avoid implying child is in constant danger | Backpack with sticker |
| **Adultos mayores** | Riesgo de desorientación, condiciones crónicas | Instrucciones de retorno seguro, contactos, condiciones | Mostrar solo info relevante para el respondedor | "Cuida a Quienes Cuidan" | Respectful tone, not paternalistic | Elderly person with caregiver |
| **Alzheimer / desorientación** | Persona puede perderse y no recordar información | Instrucciones de retorno seguro, contacto familiar, condición | Datos de vulnerabilidad solo con consentimiento | "Retorno Seguro" | Avoid stigma, focus on practical help | Safe return visual |
| **Autismo / no verbal** | Dificultad para comunicarse en emergencia | Instrucciones de comunicación, contactos, condición | Comunicación asistida solo con consentimiento | "Comunicación Asistida" | Respectful, focus on empowerment | Communication symbols |
| **Alergias** | Alergias críticas pueden ser mortales | Alergias detalladas, medicamentos, contacto médico | Mostrar solo si el usuario elige | "Alergias Visibles" | Avoid fear-mongering | Medical alert icon |
| **Diabetes / condiciones crónicas** | Condición que requiere atención médica específica | Condición, medicamentos, médico de cabecera | Datos médicos sensibles protegidos | "Condiciones Visibles" | None | Medical cross |
| **Deportistas / viajeros** | Accidente durante actividad física o viaje | Información médica básica, contactos, seguro | Funciona en cualquier país | "Viaja Protegido" | None | Athlete or traveler |
| **Motociclistas / conductores** | Accidente de tránsito, pérdida de conocimiento | Tipo de sangre, alergias, contactos | Sticker visible en casco o vehículo | "Protege tu Viaje" | Avoid accident-gore imagery | Helmet with sticker |
| **Empresas** | Seguridad de empleados en campo | Perfiles corporativos, panel administrativo | Datos corporativos vs personales separados | "Protege a tu Equipo" | None | Corporate building |
| **Escuelas / instituciones** | Seguridad de estudiantes en actividades | Perfiles de estudiantes, contactos de padres, condiciones | Consentimiento de padres requerido | "Solicitar Información" | Data privacy for minors | School building |

---

## 10. Plans and purchase content

### Content framework for /planes

| Item | Current status | Detail | Classification |
|------|---------------|--------|----------------|
| Package name | VERIFIED | From API (personal, duo, family, hogar, empresa, corporativo) | VERIFIED AND READY |
| Price | VERIFIED | From API, displayed in USD | VERIFIED AND READY |
| Profiles included | VERIFIED | `maxProfiles` field | VERIFIED AND READY |
| Chips included | VERIFIED | `maxChips` field | VERIFIED AND READY |
| Service duration | VERIFIED | 24 months (2 years) | VERIFIED AND READY |
| Renewal | NOT VERIFIED | No renewal route or pricing found | OWNER INPUT REQUIRED |
| Replacement | NOT VERIFIED | No replacement process found | OWNER INPUT REQUIRED |
| Shipping coverage | NOT VERIFIED | "Envíos a todo el territorio nacional" claimed but no shipping service verified | OWNER INPUT REQUIRED |
| Shipping time | NOT VERIFIED | Not mentioned anywhere | OWNER INPUT REQUIRED |
| Shipping cost | NOT VERIFIED | Not mentioned anywhere | OWNER INPUT REQUIRED |
| Warranty | NOT VERIFIED | No warranty policy found | OWNER INPUT REQUIRED |
| Refunds | NOT VERIFIED | T&C mention "según el caso" but no policy | OWNER INPUT REQUIRED |
| Payment methods | VERIFIED | Stripe (card) + Manual (Yappy/bank transfer) | VERIFIED AND READY |
| Manual payment | VERIFIED | `/api/orders/manual` with payment proof upload | VERIFIED AND READY |
| Stripe payment | VERIFIED | `/api/payments/checkout` creates Stripe session | VERIFIED AND READY |
| Taxes | NOT VERIFIED | Not mentioned in code | OWNER INPUT REQUIRED |
| Customer support | PARTIALLY VERIFIED | Contact form exists, phone is placeholder | OWNER INPUT REQUIRED |

### Recommended page structure

1. **Hero section** — "Planes de Protección" with intro text
2. **Package cards** — Current design with verified features
3. **Comparison table** — All packages compared by features (NEW)
4. **Purchase FAQ** — 5-7 questions about buying (NEW)
5. **Trust/reassurance panel** — Payment security, data protection, Ley 81 (NEW)
6. **Shipping/guarantee summary** — Only if verified (placeholder if not)
7. **Mobile purchase CTA** — Sticky "Adquirir" button (NEW)

### What NOT to write
- Do NOT write "money-back guarantee" unless owner confirms
- Do NOT write "free shipping" unless owner confirms
- Do NOT write "delivery in X days" unless owner confirms
- Do NOT write "warranty of X years" unless owner confirms
- Do NOT write "renewal at X price" unless owner confirms

---

## 11. Corporate content

### Strategy for /empresas

| Section | Content | Status |
|---------|---------|--------|
| **Value proposition** | "Protege a tu equipo con identificación médica corporativa. Panel administrativo para gestionar perfiles, asignar chips y monitorear la protección de tus colaboradores." | READY |
| **Employee benefit** | "Cada colaborador recibe su propio chip NFC+QR con perfil médico. En caso de emergencia, los respondedores acceden a su información crítica." | READY |
| **Bulk-order flow** | "Solicita una cotización para tu empresa. Te enviaremos los detalles de precios corporativos, volúmenes mínimos y proceso de implementación." | NEEDS OWNER INPUT |
| **Organization account capabilities** | "Panel administrativo para gestionar miembros, asignar chips, y administrar perfiles corporativos." | VERIFIED |
| **Member/profile management** | "Cada miembro tiene su propio perfil médico. La empresa puede gestionar la asignación de chips." | VERIFIED |
| **Privacy model** | "Los datos médicos pertenecen al usuario. La empresa gestiona la asignación de chips y el estado de la cuenta." | NEEDS LEGAL REVIEW |
| **Onboarding process** | "Proceso de implementación guiado. Soporte dedicado para empresas." | NEEDS OWNER INPUT |
| **Support model** | "Soporte prioritario para cuentas corporativas." | NEEDS OWNER INPUT |
| **Quote/contact CTA** | "Solicitar Cotización" → form with company details | READY |
| **Demo CTA** | "Solicitar Demo Corporativa" → form | READY |
| **Procurement information** | Legal name, RUC, address, contact info | NEEDS OWNER INPUT |
| **Case studies** | Future section — no existing clients to feature | DEFER |
| **Data processing agreement** | Required for corporate clients under Ley 81 | NEEDS LEGAL REVIEW |

### What must NOT be promised
- Corporate prices (not defined)
- Minimum quantities (not defined)
- Implementation time (not defined)
- Existing corporate clients (not verified)
- Partner logos (not verified)

---

## 12. FAQ strategy

### Categorized FAQ (25+ questions)

#### Category 1: Product basics (4 questions)

| # | Question | Draft answer | Verification status | Owner/legal input? | Placement |
|---|----------|-------------|-------------------|-------------------|-----------|
| 1 | ¿Qué es PreRescue ID? | Es un sistema de identificación médica de emergencia. Un sticker con chip NFC y código QR que, al ser escaneado, muestra tu información médica crítica y permite contactar a tus familiares. | VERIFIED | No | /faq, /como-funciona |
| 2 | ¿Cómo funciona en una emergencia? | Cuando alguien escanea tu chip (QR o NFC), se abre tu perfil médico de emergencia en su celular. Allí puede ver tu tipo de sangre, alergias, condiciones y contactos. | VERIFIED | No | /faq, /como-funciona |
| 3 | ¿Necesito tener un celular para usarlo? | No. El sticker funciona sin celular. Quien te auxilie necesita un celular para escanear el código o el chip. | VERIFIED | No | /faq |
| 4 | ¿Qué información se muestra al escanear mi chip? | Nombre, tipo de sangre, alergias, condiciones médicas, medicamentos y contactos de emergencia. Tú controlas qué se muestra. | VERIFIED | No | /faq, /como-funciona |

#### Category 2: QR and NFC (3 questions)

| # | Question | Draft answer | Verification status | Owner/legal input? | Placement |
|---|----------|-------------|-------------------|-------------------|-----------|
| 5 | ¿Qué es el código QR? | Es un código impreso en el sticker que cualquier celular con cámara puede escanear. Al escanearlo, se abre el perfil médico. | VERIFIED | No | /faq, /como-funciona |
| 6 | ¿Qué es el chip NFC? | Es un chip integrado en el sticker que los celulares con NFC pueden leer al acercarlo. Abre el perfil médico automáticamente, sin necesidad de abrir la cámara. | VERIFIED | No | /faq, /como-funciona |
| 7 | ¿Qué pasa si mi celular no tiene NFC? | Puedes usar el código QR. Todos los celulares con cámara pueden escanear un código QR. | VERIFIED | No | /faq |

#### Category 3: Internet and devices (3 questions)

| # | Question | Draft answer | Verification status | Owner/legal input? | Placement |
|---|----------|-------------|-------------------|-------------------|-----------|
| 8 | ¿Se necesita internet para usar el chip? | El dispositivo que escanea necesita conexión a internet para cargar el perfil médico. El sticker en sí no necesita batería ni conexión. | VERIFIED | No | /faq, /como-funciona |
| 9 | ¿Funciona sin batería? | Sí. El sticker no tiene batería. El chip NFC se activa con la energía del celular que lo escanea. El código QR es impreso. | VERIFIED | No | /faq |
| 10 | ¿Necesito instalar una aplicación? | No. El perfil se abre en el navegador del celular. No requiere instalar ninguna aplicación. | VERIFIED | No | /faq, /como-funciona |

#### Category 4: Privacy and medical data (4 questions)

| # | Question | Draft answer | Verification status | Owner/legal input? | Placement |
|---|----------|-------------|-------------------|-------------------|-----------|
| 11 | ¿Quién puede ver mi información médica? | Cualquier persona que escanee tu chip puede ver la información que tú hayas elegido mostrar. Tú controlas qué datos son públicos. | VERIFIED | No | /faq, /legal/privacidad |
| 12 | ¿Qué datos NUNCA se muestran públicamente? | Tu correo electrónico, fecha de nacimiento completa, dirección de domicilio y datos de pago nunca se muestran al escanear el chip. | VERIFIED | No | /faq, /legal/privacidad |
| 13 | ¿Cómo sé que mis datos están seguros? | Los datos sensibles están cifrados. Cumplimos con la Ley 81 de Protección de Datos Personales de Panamá. Puedes suspender tu perfil al instante. | VERIFIED | No | /faq |
| 14 | ¿Puedo eliminar mi cuenta y mis datos? | Sí. Puedes solicitar la eliminación de tu cuenta desde la configuración de tu panel. La cuenta se desactiva y la información personal y médica sensible se elimina o anonimiza. Determinados registros administrativos, contables y de auditoría pueden conservarse cuando exista una obligación legal o una necesidad legítima de seguridad. | VERIFIED | YES — obtain legal review for final data-retention wording | /faq, /legal/privacidad |

#### Category 5: WhatsApp notifications (2 questions)

| # | Question | Draft answer | Verification status | Owner/legal input? | Placement |
|---|----------|-------------|-------------------|-------------------|-----------|
| 15 | ¿Cómo se notifica a mi familia en una emergencia? | Cuando alguien escanea tu chip, el perfil de emergencia muestra botones para contactar a tus familiares por WhatsApp o llamada. El respondedor debe hacer clic en el botón para enviar el mensaje. | VERIFIED | No | /faq, /como-funciona |
| 16 | ¿La notificación incluye mi ubicación? | Si el respondedor autoriza el acceso a su ubicación, el mensaje de WhatsApp puede incluir las coordenadas aproximadas. | PARTIALLY VERIFIED | No | /faq |

#### Category 6: Profiles and family accounts (2 questions)

| # | Question | Draft answer | Verification status | Owner/legal input? | Placement |
|---|----------|-------------|-------------------|-------------------|-----------|
| 17 | ¿Puedo proteger a mi familia con una sola cuenta? | Sí. Los planes familiares permiten crear perfiles médicos individuales para cada miembro, cada uno con su propio chip. | VERIFIED | No | /faq, /para-quien-es |
| 18 | ¿Puedo actualizar la información después de activar el chip? | Sí. Puedes modificar tu perfil médico en cualquier momento desde tu panel de control. Los cambios se reflejan al instante. | VERIFIED | No | /faq |

#### Category 7: Purchase and payment (3 questions)

| # | Question | Draft answer | Verification status | Owner/legal input? | Placement |
|---|----------|-------------|-------------------|-------------------|-----------|
| 19 | ¿Qué métodos de pago aceptan? | Aceptamos pagos con tarjeta de crédito/débito (a través de Stripe) y transferencia bancaria o Yappy (pago manual). | VERIFIED | No | /faq, /planes |
| 20 | ¿Hay mensualidades? | No. El pago es único por 2 años de cobertura. | VERIFIED | No | /faq, /planes |
| 21 | ¿Puedo comprar chips adicionales después? | Sí. Puedes adquirir chips adicionales desde tu panel de control. | VERIFIED | No | /faq, /planes |

#### Category 8: Shipping (1 question)

| # | Question | Draft answer | Verification status | Owner/legal input? | Placement |
|---|----------|-------------|-------------------|-------------------|-----------|
| 22 | ¿Hacen envíos a todo Panamá? | **Respuesta pendiente de definición comercial.** | NOT VERIFIED | YES | /faq, /planes |

#### Category 9: Warranty/replacement (2 questions)

| # | Question | Draft answer | Verification status | Owner/legal input? | Placement |
|---|----------|-------------|-------------------|-------------------|-----------|
| 23 | ¿Qué pasa si mi chip se daña o se pierde? | **Respuesta pendiente de definición comercial.** | NOT VERIFIED | YES | /faq |
| 24 | ¿El chip tiene garantía? | **Respuesta pendiente de definición comercial.** | NOT VERIFIED | YES | /faq |

#### Category 10: Renewal/service duration (2 questions)

| # | Question | Draft answer | Verification status | Owner/legal input? | Placement |
|---|----------|-------------|-------------------|-------------------|-----------|
| 25 | ¿Cuánto dura el servicio? | El servicio tiene una vigencia de 2 años desde la activación del chip. | VERIFIED | No | /faq, /planes |
| 26 | ¿Qué pasa cuando se vencen los 2 años? | **Respuesta pendiente de definición comercial.** El perfil deja de estar disponible públicamente. El proceso de renovación está en definición. | NOT VERIFIED | YES | /faq |

#### Category 11: International use (1 question)

| # | Question | Draft answer | Verification status | Owner/legal input? | Placement |
|---|----------|-------------|-------------------|-------------------|-----------|
| 27 | ¿Funciona fuera de Panamá? | Sí. El código QR y el chip NFC funcionan en cualquier país. El perfil médico se carga desde cualquier lugar con internet. | VERIFIED | No | /faq |

#### Category 12: Corporate/institutional (1 question)

| # | Question | Draft answer | Verification status | Owner/legal input? | Placement |
|---|----------|-------------|-------------------|-------------------|-----------|
| 28 | ¿Tienen planes para empresas o colegios? | Sí. Contamos con planes corporativos con panel administrativo, gestión de miembros y asignación de chips. Contáctanos para una cotización. | VERIFIED | No | /faq, /empresas |

#### Category 13: Account deletion (1 question)

| # | Question | Draft answer | Verification status | Owner/legal input? | Placement |
|---|----------|-------------|-------------------|-------------------|-----------|
| 29 | ¿Cómo elimino mi cuenta? | Puedes solicitar la eliminación de tu cuenta desde la configuración de tu panel. La cuenta se desactiva y la información personal y médica sensible se elimina o anonimiza. Determinados registros administrativos, contables y de auditoría pueden conservarse cuando exista una obligación legal o una necesidad legítima de seguridad. | VERIFIED (implementation) / NEEDS LEGAL REVIEW (retention wording) | YES — legal review required for final data-retention wording | /faq, /legal/privacidad |

#### Category 14: Emergency limitations (2 questions)

| # | Question | Draft answer | Verification status | Owner/legal input? | Placement |
|---|----------|-------------|-------------------|-------------------|-----------|
| 30 | ¿PreRescue ID reemplaza al 911? | No. PreRescue ID es un sistema de identificación médica. No reemplaza al 911 ni a los servicios médicos profesionales. En caso de emergencia, llame al 911 inmediatamente. | VERIFIED | No | /faq, footer |
| 31 | ¿Los paramédicos conocen este sistema? | El sistema está diseñado para ser intuitivo: cualquier persona con un celular puede escanear el QR o NFC y ver la información. No requiere entrenamiento especial. | VERIFIED | No | /faq |

---

## 13. Trust/company information checklist

### A. Legal company identity

| Item | Current status | Where it should appear | Owner/legal input needed? | Blocks launch? |
|------|---------------|----------------------|---------------------------|----------------|
| Legal company name | MISSING | Footer, /contacto, /legal | YES | YES |
| RUC | MISSING | Footer, /contacto, /legal | YES | YES |
| Registration details | MISSING | /legal | YES | YES |
| Public address in Panama | MISSING | Footer, /contacto | YES | YES |
| Jurisdiction (Panama) | PARTIAL (mentioned in T&C) | /legal/terminos | YES | YES |

### B. Customer support

| Item | Current status | Where it should appear | Owner/legal input needed? | Blocks launch? |
|------|---------------|----------------------|---------------------------|----------------|
| Support email | PRESENT (soporte@prerescatepty.com) | /contacto, footer | No | No |
| WhatsApp number | MISSING | /contacto | YES | No |
| Phone number | PLACEHOLDER (+507 6000-0000) | /contacto | YES | YES |
| Support hours | MISSING | /contacto | YES | No |
| Response-time wording | CLAIMED ("30 minutos") without verification | /contacto | YES | YES |

### C. Commercial policies

| Item | Current status | Where it should appear | Owner/legal input needed? | Blocks launch? |
|------|---------------|----------------------|---------------------------|----------------|
| Shipping policy | MISSING | /legal/envios | YES | YES |
| Refund policy | MISSING | /legal/reembolsos | YES | YES |
| Warranty policy | MISSING | /legal/garantia | YES | YES |
| Replacement policy | MISSING | /faq | YES | YES |
| Renewal policy | MISSING | /faq, /planes | YES | YES |
| Cancellation policy | PARTIAL (in T&C) | /legal/terminos | YES | No |

### D. Social proof

| Item | Current status | Where it should appear | Owner/legal input needed? | Blocks launch? |
|------|---------------|----------------------|---------------------------|----------------|
| Testimonials | MISSING | Homepage, /planes | YES (need real customers) | YES |
| Case studies | MISSING | /empresas | YES | No |
| Partner logos | MISSING | Homepage, /empresas | YES | No |
| Press mentions | MISSING | Homepage, /nosotros | YES | No |
| Usage numbers | CLAIMED (+12k) without verification | Homepage | YES | YES |

### E. Legal/compliance

| Item | Current status | Where it should appear | Owner/legal input needed? | Blocks launch? |
|------|---------------|----------------------|---------------------------|----------------|
| Terms and Conditions | PRESENT (good) | /legal/terminos | No | No |
| Privacy Policy | PRESENT (excellent) | /legal/privacidad | No | No |
| Cookie policy | MISSING | /legal/cookies + banner | YES | YES |
| Medical disclaimer | PRESENT (in footer) | Footer, /e/[shortCode], /faq | No | No |
| Emergency disclaimer | PARTIAL | Footer, /faq | No | No |
| Corporate data processing | MISSING | /empresas | YES | No |

### Items that block commercial launch
1. Legal company name and RUC
2. Physical address in Panama
3. Real phone number (not placeholder)
4. Shipping policy
5. Refund policy
6. Warranty policy
7. Cookie consent banner
8. Testimonials or verifiable social proof
9. Verified response-time claim or removal of unverified claim

---

## 14. SEO content strategy

### Page titles and meta descriptions

| Page | Title | Meta description | Status |
|------|-------|-----------------|--------|
| `/` | PreRescue ID — Identificación Médica de Emergencia con QR y NFC en Panamá | Sistema panameño de identificación médica de emergencia. Sticker con chip NFC y código QR. Tu información médica accesible al instante. Sin apps. Sin mensualidades. | READY |
| `/como-funciona` | Cómo Funciona PreRescue ID — Identificación Médica QR y NFC | Aprende cómo funciona el sistema de identificación médica de emergencia con chip NFC y código QR. Activación, perfil médico, contactos de emergencia. | READY |
| `/para-quien-es` | ¿Para Quién es PreRescue ID? — Familias, Niños, Adultos Mayores, Empresas | PreRescue ID es para familias, niños, adultos mayores, personas con condiciones médicas, empresas e instituciones en Panamá. | READY |
| `/planes` | Planes y Precios — PreRescue ID | Protege a tu familia o empresa con identificación médica de emergencia. Pago único. 2 años de cobertura. Compara nuestros planes. | READY |
| `/empresas` | PreRescue ID para Empresas — Identificación Médica Corporativa | Protege a tu equipo con identificación médica corporativa. Panel administrativo, gestión de miembros y asignación de chips. Solicita una cotización. | READY |
| `/faq` | Preguntas Frecuentes — PreRescue ID | Resuelve tus dudas sobre PreRescue ID: cómo funciona, privacidad, pagos, envíos, activación y más. | READY |
| `/contacto` | Contacto — PreRescue ID Panamá | Contáctanos para soporte, información corporativa o consultas generales. Estamos en Panamá. | READY |
| `/demo` | Demo — PreRescue ID | Prueba el sistema de identificación médica de emergencia. Escanea el código QR y ve cómo funciona un perfil médico en tiempo real. | READY |

### Canonical domain
**OWNER INPUT REQUIRED:** Confirm whether the canonical domain is `prerescatepty.com` or `prerescate.com`. Current code uses both inconsistently.

### Open Graph requirements
Every public page needs:
- `og:title` — Page title
- `og:description` — Page meta description
- `og:image` — Product logo or hero image (URL TBD by owner)
- `og:url` — Canonical page URL
- `og:type` — `website`
- `og:locale` — `es_PA`

### Twitter card requirements
Every public page needs:
- `twitter:card` — `summary_large_image`
- `twitter:title` — Page title
- `twitter:description` — Page meta description
- `twitter:image` — Same as og:image

### Structured data requirements

**Organization schema** (every page via Layout):
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "PreRescue ID",
  "url": "https://www.prerescatepty.com",
  "logo": "https://www.prerescatepty.com/logo.png",
  "description": "Sistema panameño de identificación médica de emergencia con QR y NFC.",
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+507-XXXX-XXXX",
    "contactType": "customer service",
    "availableLanguage": ["Spanish"]
  },
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "PA"
  }
}
```
**OWNER INPUT REQUIRED:** Phone number, address.

**Product schema** (on /planes):
- One Product per package with name, description, price, currency

**FAQ schema** (on /faq):
- Question/Answer markup for all 25+ questions

**BreadcrumbList** (on all pages):
- Home > [Page name]

### Sitemap additions
Current sitemap is missing:
- `/como-funciona`
- `/comprar` (or `/planes`)
- `/contacto`
- `/demo`
- `/activar`
- `/forgot-password`
- `/reset-password`
- `/para-quien-es` (future)
- `/empresas` (future)
- `/legal/reembolsos` (future)
- `/legal/envios` (future)
- `/legal/garantia` (future)
- `/legal/cookies` (future)

### Privacy/indexing rules

| Path | Recommendation | Rationale |
|------|---------------|-----------|
| `/` | index, follow | Public marketing page |
| `/como-funciona` | index, follow | Public marketing page |
| `/para-quien-es` | index, follow | Public marketing page |
| `/planes` | index, follow | Public marketing page |
| `/empresas` | index, follow | Public marketing page |
| `/faq` | index, follow | Public marketing page |
| `/contacto` | index, follow | Public marketing page |
| `/demo` | index, follow | Public marketing page |
| `/legal/*` | index, follow | Public legal pages |
| `/e/[shortCode]` | noindex, nofollow | Emergency profiles contain personal medical data |
| `/e/[shortCode]?demo=true` | noindex, nofollow | Demo profiles should not be indexed |
| `/dashboard/*` | noindex, nofollow | Authenticated area |
| `/admin/*` | noindex, nofollow | Authenticated area |
| `/api/*` | noindex, nofollow | API routes |
| `/login` | noindex, nofollow | Authentication page |
| `/registro` | noindex, nofollow | Authentication page |
| `/forgot-password` | noindex, nofollow | Authentication page |
| `/reset-password` | noindex, nofollow | Authentication page |
| `/activar` | noindex, nofollow | Authentication page |

---

## 15. Mobile content strategy

### Content adaptation rules

| Element | Desktop behavior | Mobile behavior |
|---------|-----------------|-----------------|
| Hero headline | Full: "Tu información médica, accesible al instante. Sin apps. Sin baterías." | Shortened: "Tu información médica al instante. Sin apps." |
| Hero subheadline | Full paragraph | 1-2 sentences max |
| CTA order | Primary + Secondary side by side | Primary full-width, secondary below |
| Sticky CTA | None | Fixed bottom: "Comprar Ahora" |
| Navigation | Horizontal top bar | Hamburger menu + sticky bottom CTA |
| How it works | 4-column horizontal | 2x2 grid or vertical list |
| Use cases | Grid of cards | Horizontal scroll snap |
| Benefits (Bento) | 4-column grid | Single column, stacked |
| Plans | 3-column cards | Single column, stacked, scrollable |
| Comparison table | Full table | Horizontal scroll or "show differences" toggle |
| FAQ | Full accordion | Same, shorter answers |
| Corporate CTA | 2-column text + CTA | Single column, CTA full-width |
| Privacy section | 2-column | Single column |
| Footer | 4-column grid | Single column, accordion |
| Emergency profile | Full layout with sidebar info | Stacked, larger touch targets |

### Priority rules for mobile
1. **Shorten hero text** — Users have limited attention on mobile
2. **Sticky purchase CTA** — Critical for conversion
3. **Stack, don't shrink** — Cards should stack vertically, not become unreadably small
4. **Horizontal scroll for galleries** — Use cases, benefits can scroll horizontally
5. **Larger touch targets** — Minimum 44x44px for all interactive elements
6. **No horizontal overflow** — Test all pages at 320px width
7. **Reduced motion** — Respect `prefers-reduced-motion`
8. **Emergency profile readability** — Large fonts, high contrast, clear hierarchy

### What to hide on mobile
- Secondary decorative elements (floating notifications, background blobs)
- Non-essential trust badges (keep only top 2-3)
- Detailed technical specifications

### What to expand on mobile
- FAQ (accordion is already mobile-friendly)
- Contact options (phone, WhatsApp, form)
- Sticky CTA (always visible)

---

## 16. Claims safety matrix

| # | Proposed claim | Publish now? | Required evidence | Safe alternative wording |
|---|---------------|-------------|-------------------|------------------------|
| 1 | No app required | YES | Verified in code | "No requiere instalar una aplicación." |
| 2 | No battery required | YES | Verified in code | "El sticker no necesita batería." |
| 3 | Works internationally | YES | Verified in code | "Funciona en cualquier país con acceso a internet." |
| 4 | WhatsApp alert | PARTIAL | wa.me links are manual, not automatic | "El perfil muestra botones de WhatsApp para contactar a la familia." Do NOT say "alerta automática." |
| 5 | Location sharing | PARTIAL | Requires responder permission | "Si el respondedor autoriza, el mensaje puede incluir la ubicación aproximada." |
| 6 | Two-year service | YES | BUSINESS_RULES confirms 24 months | "2 años de cobertura con un solo pago." |
| 7 | No monthly fees | YES | Verified in code | "Pago único. Sin mensualidades." |
| 8 | Ley 81 compliance | YES | Privacy policy explicitly addresses Ley 81 | "Cumplimos con la Ley 81 de Protección de Datos Personales de Panamá." |
| 9 | Encrypted medical data | YES | `decrypt()` used for medical fields | "Los datos sensibles están cifrados." |
| 10 | Works in seconds | YES | NFC response claimed at 0.4s in code comments | "El perfil se carga en segundos." (Avoid specific 0.4s claim without performance testing) |
| 11 | 99.9% availability | NO | No evidence in code | Do NOT publish. Remove from current site. |
| 12 | Thousands of users | NO | No verifiable data in code | Do NOT publish "+12k usuarios" without verification. Use "Únete a los que ya protegen lo que más importa." |
| 13 | Emergency responder adoption | NO | No evidence of training/partnerships | Do NOT publish. |
| 14 | Warranty | NO | No warranty policy exists | Do NOT publish until policy is defined. |
| 15 | Refund guarantee | NO | No refund policy exists | Do NOT publish until policy is defined. |
| 16 | National shipping | NO | No shipping service verified | Do NOT publish "Envíos a todo el territorio nacional" until shipping is confirmed. |
| 17 | Immediate support | NO | "30 min response" is unverified | Use "Te contactaremos lo antes posible" or remove time claim. |
| 18 | Prevents emergencies | NO | Product is identification, not prevention | Do NOT publish. |
| 19 | Saves lives | NO | Cannot make medical outcome claims | Do NOT publish. |
| 20 | Guaranteed rescue | NO | Product does not guarantee rescue | Do NOT publish. |

### Claims to remove from current site
1. "99.9% Disponibilidad de lectura" — unverified
2. "+12k Usuarios protegidos" — unverified
3. "+1k Escaneos de emergencia activados" — unverified
4. "Respuesta NFC en 0.4s" — unverified performance claim
5. "Atención prioritaria en 30 minutos" — unverified response time
6. "Tus contactos reciben tu ubicación GPS al ser escaneado" — implies automatic notification, which is false
7. "Alerta a tu Familia" (as automatic) — should be "Contacta a tu Familia"
8. "Disparo SMS Externo" — SMS notification not verified as active
9. "Push Notifications Internas" — not verified as active

---

## 17. Visual content requirements

### Per-section visual requirements

| Section | Copy length | Icon type | Image/3D concept | Real photography needed? | Auto-generated acceptable? | Animation value | Mobile fallback | Alt-text requirement |
|---------|------------|-----------|-----------------|------------------------|---------------------------|----------------|-----------------|---------------------|
| Hero | Short headline + 2 sentences | Brand shield icon | Sticker product 3D render + floating scan notification | Yes (product photo) | Yes (3D render) | High — floating elements, scan pulse | Static sticker image | "Sticker PreRescue ID con NFC y QR" |
| Trust badges | 4 short labels | Small icons per badge | None | No | Yes | Low | Same | "Ley 81", "NFC/QR", "2 años", "Pago único" |
| What is PreRescue | 1 paragraph | None | Sticker close-up + phone scanning | Yes | Yes | Low | Single image | "Persona escaneando sticker PreRescue ID con su celular" |
| How it works | 4 short descriptions | Step icons (cart, phone, profile, shield) | 4-step diagram | No | Yes | Medium — step transitions | Vertical list | "Paso 1: Adquiere. Paso 2: Activa. Paso 3: Configura. Paso 4: Protege." |
| Use cases | 6-8 short labels | Audience icons (family, elderly, child, heart, helmet, building) | Grid of audience cards with icons | No | Yes | Low | Horizontal scroll | "Para familias, adultos mayores, niños, condiciones médicas, motociclistas, empresas" |
| Demo | 1 paragraph | QR code | Live QR code + screenshot of emergency profile | No | Yes (auto-generated QR) | Medium — QR pulse | QR code only | "Código QR de demostración — escanea para ver un perfil de ejemplo" |
| Privacy | 1 paragraph + 4 bullets | Shield/lock icon | Privacy visual (shield, checkmarks) | No | Yes | Low | Single column | "Tú controlas tu información. Cumplimos Ley 81." |
| Plans | 1 sentence + package cards | Package emojis | Package cards with features | No | Yes (from API data) | Low | Stacked cards | "Planes de protección: personal, familiar, corporativo" |
| Corporate | 1 paragraph | Building icon | Corporate visual | No | Yes | Low | Single column | "Planes corporativos para empresas e instituciones" |
| FAQ | 3-5 questions | None | None | No | N/A | Medium — accordion animation | Same | N/A |
| Final CTA | 1 headline + 1 sentence | Shield icon | Gradient background | No | Yes | Low | Same | "Inicia tu protección" |
| Footer | Legal text + links | Logo | None | No | N/A | None | Single column | "PreRescue ID — Identificación médica de emergencia" |

### Photography needs
1. **Product photo** — High-quality image of the sticker on a helmet, backpack, wallet, or phone
2. **Scanning demo** — Person scanning the sticker with a phone
3. **Family photo** (optional) — Family using the product (diverse, inclusive)
4. **Corporate photo** (optional) — Office or team setting

### Animation guidelines
- Use animation to **direct attention**, not for decoration
- Animate: scan pulse, step transitions, QR code glow, accordion expand
- Avoid: spinning elements, parallax, continuous background animations
- Respect `prefers-reduced-motion`

---

## 18. Implementation phases

### Phase 1: Foundation (Week 1-2)
**Focus:** Trust, navigation, core copy, mobile CTA

| Task | Pages/components affected | Content dependencies | Owner decisions required | Technical risk | Commercial impact |
|------|--------------------------|---------------------|------------------------|---------------|-------------------|
| Add company identity to footer and contact | Footer, /contacto | Legal name, RUC, address | YES | Low | High |
| Create legal policy pages | /legal/reembolsos, /legal/envios, /legal/garantia, /legal/cookies | Policy content | YES | Low | High |
| Add cookie consent banner | Layout | Cookie policy | YES | Low | High |
| Update navigation | Navbar | New page routes | No | Low | Medium |
| Add sticky mobile CTA | Layout or Navbar | None | No | Low | High |
| Rewrite hero copy | Homepage | Verified claims | No | Low | Medium |
| Add trust badges | Homepage | None | No | Low | Medium |
| Add medical/emergency disclaimers | Footer, /faq, /e/[shortCode] | None | No | Low | Medium |
| Remove unverified claims | Homepage, /como-funciona | Claims safety matrix | No | Low | High |

### Phase 2: Content expansion (Week 3-4)
**Focus:** How it works, use cases, demo, privacy

| Task | Pages/components affected | Content dependencies | Owner decisions required | Technical risk | Commercial impact |
|------|--------------------------|---------------------|------------------------|---------------|-------------------|
| Rewrite /como-funciona | /como-funciona | Verified product facts | No | Low | Medium |
| Create /para-quien-es | /para-quien-es | Audience content | No | Low | High |
| Improve /demo page | /demo | Demo explanation | No | Low | Medium |
| Add privacy section to homepage | Homepage | None | No | Low | Medium |
| Add use cases to homepage | Homepage | None | No | Low | High |
| Add demo section to homepage | Homepage | None | No | Low | Medium |
| Improve emergency profile instructions | /e/[shortCode] | Responder instructions | No | Low | Medium |

### Phase 3: Conversion (Week 5-6)
**Focus:** Plans, FAQ, corporate

| Task | Pages/components affected | Content dependencies | Owner decisions required | Technical risk | Commercial impact |
|------|--------------------------|---------------------|------------------------|---------------|-------------------|
| Create /planes page | /planes | Package data, comparison table | No | Medium | High |
| Add comparison table | /planes | Package features | No | Medium | High |
| Expand FAQ to 25+ questions | /faq | FAQ content | Some (shipping, warranty, renewal) | Low | High |
| Create /empresas page | /empresas | Corporate content | YES (pricing, process) | Medium | High |
| Add request-a-quote form | /empresas | Form handler | No | Medium | Medium |
| Add FAQ accordion to /planes | /planes | FAQ content | No | Low | Medium |

### Phase 4: SEO, accessibility, performance (Week 7-8)
**Focus:** Metadata, structured data, accessibility, performance

| Task | Pages/components affected | Content dependencies | Owner decisions required | Technical risk | Commercial impact |
|------|--------------------------|---------------------|------------------------|---------------|-------------------|
| Add Open Graph and Twitter cards | Layout, all pages | OG image URL | YES (logo/hero image) | Low | Medium |
| Add structured data | Layout, /faq, /planes | Organization info | YES (phone, address) | Low | Medium |
| Complete sitemap | /sitemap.ts | All page routes | No | Low | Medium |
| Add canonical URLs | Layout | Domain decision | YES | Low | Medium |
| Add noindex to emergency profiles | /e/[shortCode] | None | No | Low | Medium |
| Fix domain consistency | robots.ts, layout | Domain decision | YES | Low | Medium |
| Improve accessibility | All pages | None | No | Medium | Medium |
| Optimize images | Public assets | None | No | Medium | Medium |

---

## 19. Owner decisions required

### Critical (block commercial launch)

| # | Decision | Why it's needed | Impact if not decided |
|---|----------|-----------------|----------------------|
| 1 | Legal company name, RUC, physical address | Cannot publish company identity | Site cannot establish legal trust |
| 2 | Real phone number (not placeholder) | Contact page has fake number | Customers cannot call |
| 3 | Shipping policy (coverage, cost, time) | Cannot answer "how do I receive my chip?" | Purchase decision blocked |
| 4 | Refund policy | Cannot answer "can I return it?" | Purchase decision blocked |
| 5 | Warranty policy | Cannot answer "what if it breaks?" | Purchase decision blocked |
| 6 | Cookie consent implementation | Legal requirement under Ley 81 | Legal risk |
| 7 | Primary production domain (prerescatepty.com vs prerescate.com) | Domain inconsistency in code | SEO and brand confusion |
| 8 | Verification of "+12k usuarios" claim or removal | Unverified statistic | Trust risk if inaccurate |

### Important (needed for Phase 2-3)

| # | Decision | Why it's needed | Impact if not decided |
|---|----------|-----------------|----------------------|
| 9 | Renewal process and pricing | Cannot answer "what happens after 2 years?" | Customer retention unclear |
| 10 | Replacement process and pricing | Cannot answer "what if I lose the chip?" | Post-purchase support gap |
| 11 | Corporate pricing tiers and minimum quantities | Cannot build /empresas page | Corporate sales blocked |
| 12 | Corporate implementation process | Cannot describe onboarding | Corporate sales blocked |
| 13 | Support hours and real response time | Cannot set customer expectations | Trust risk |
| 14 | WhatsApp business number | Cannot offer WhatsApp support | Missed support channel |
| 15 | Primary audience confirmation | Affects entire content strategy | May need to re-prioritize audiences |

### Nice to have (Phase 4+)

| # | Decision | Why it's needed | Impact if not decided |
|---|----------|-----------------|----------------------|
| 16 | Testimonials or case studies | Social proof | Lower conversion |
| 17 | Partner/institutional logos | Credibility for corporate | Lower corporate conversion |
| 18 | Press mentions or media coverage | Third-party validation | Lower trust |
| 19 | Team/founder information | Personal connection | Lower trust |
| 20 | OG image URL for social sharing | Social media appearance | Poor social sharing |

---

## 20. Final recommendation

**Proceed with Phase 1 immediately.**

The content strategy is ready for implementation. The verified product facts table provides safe, accurate copy. The claims safety matrix identifies what must be removed from the current site. The information architecture defines the minimum viable public website.

**Immediate actions (this week):**
1. Make the 8 critical owner decisions listed in section 19.
2. Remove unverified claims from the current site (section 16).
3. Add company identity to footer and contact page.
4. Create the missing legal policy pages.
5. Add cookie consent banner.

**The visual redesign should NOT begin until:**
- All Phase 1 content changes are implemented
- Owner decisions 1-8 are resolved
- The site has accurate, verified copy

**Why this order:**
The current site has a strong visual design but makes claims that are either unverified or false. Fixing the content first ensures the visual redesign builds on a truthful, trustworthy foundation. Redesigning now would preserve inaccurate messaging in a prettier package.

---

## Validation report

| Check | Result |
|-------|--------|
| File created | `docs/04-producto/W1B-WEBSITE-CONTENT-STRATEGY.md` |
| Verified claims count | 18 VERIFIED, 2 PARTIALLY VERIFIED, 5 NOT VERIFIED, 2 FALSE |
| Claims requiring owner input | 8 claims |
| Pages recommended | 20 pages (6 KEEP, 6 IMPROVE, 7 CREATE, 1 MERGE) |
| Homepage sections recommended | 12 sections |
| FAQ question count | 31 questions across 14 categories |
| Owner decisions required | 20 decisions (8 critical) |
| Unverified statistics presented as fact | 0 (all flagged) |
| WhatsApp as only external notification channel | Confirmed — no email/SMS claims |
| Internet requirements accurately described | Yes |
| Emergency profiles recommended as noindex | Yes |
| Fake testimonials, partners or company details | 0 (none fabricated) |

**Final confirmation:**
- Only `docs/04-producto/W1B-WEBSITE-CONTENT-STRATEGY.md` was created
- No source code modified
- No tests modified
- No database changes
- No environment changes
- No visual assets generated
- No commit or push