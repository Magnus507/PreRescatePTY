# W6.05G-C — Implementación Visual Tienda Cliente Híbrida

## 1. Resumen ejecutivo

Se rediseñó visualmente `/dashboard/tienda` como una experiencia híbrida guiada que transforma la tienda de un formulario/checkout inicial a una tienda de protección PreRescueID. El flujo ahora es: elegir combo/protección → revisar selección → completar datos/envío → crear pedido → revisar pago en Mis pedidos → activar después desde Mis dispositivos.

## 2. Qué se implementó

### 2.1 Hero compacto (nuevo)
- Fondo oscuro `#05070D` con gradiente y halo rojo controlado, sin imagen externa.
- Eyebrow: `Protección para activar` con icono ShieldCheck.
- Título: `Elige tu protección` con acento rojo en "protección".
- Subtítulo: `Compra tus chips PreRescueID y actívalos desde Mis dispositivos cuando los recibas.`
- Microcopy: `Pedido con pago en revisión manual` con icono Clock.
- CTA secundario: `Ver mis pedidos` → `/dashboard/pedidos`.
- Altura compacta: min-h-[200px] en mobile, min-h-[220px] en desktop.

### 2.2 Selector de combos personales (nuevo)
- Sección principal `Combos personales` con subtítulo `Protección para ti y tu familia`.
- Grid responsive: 1 col mobile, 2 sm, 3 lg, 4 xl.
- Cada card incluye:
  - Icono contextual según combo (UserRound, Heart, Home, Shield).
  - Nombre del combo.
  - Caso de uso (ej: "Para una persona", "Para ti y un familiar").
  - Chips incluidos con icono Cpu.
  - Descripción del producto.
  - Badge de disponibilidad: `Disponible` (verde) o `Agotado temporalmente` (ámbar).
  - Precio con label "Precio".
  - CTA: `Elegir combo` / `Seleccionado` / `Agotado`.
- Badge `Recomendado` en esquina superior derecha para Combo Hogar Full.
- Cards con borde rojo y fondo tintado cuando están seleccionadas.

### 2.3 Separación Empresa / Corporativo (nuevo)
- Sección colapsable `Para empresas` con acordeón.
- Aparece solo si hay productos empresariales en la data.
- Cada card empresarial incluye:
  - Icono Briefcase.
  - Label: `Combo Empresa` o `Corporativo`.
  - Nota: `Los pedidos empresariales requieren revisión y flujo separado.`
  - CTA: `Solicitar atención empresarial` (indigo, no rojo).
- No se toca lógica empresarial; solo separación visual.

### 2.4 Resumen de selección (nuevo)
- Aparece después de elegir un combo, antes del formulario.
- Muestra: combo seleccionado, chips incluidos, precio.
- Botón `Cambiar combo` para volver a selección.
- Microcopy: `Cuando recibas tus chips, actívalos desde Mis dispositivos.`
- Borde rojo semitransparente y fondo tintado.

### 2.5 Formulario después de selección (reorganizado)
- El formulario ya no domina al inicio; aparece solo después de elegir combo.
- Mismos campos y payload: address, city, notes.
- Labels claros: `Dirección exacta`, `Ciudad / Área`, `Método de pago`, `Notas adicionales`.
- Placeholders más humanos.
- Método de pago: `Yappy Manual` (solo visual, no cambia lógica).
- Total con precio en rojo.
- CTA: `Crear pedido` (rojo).
- Microcopy: `Al crear tu pedido, quedará en revisión. Recibirás instrucciones de pago.`

### 2.6 Post-compra / éxito (mejorado)
- Copy: `Tu pedido fue creado. Sube tu comprobante y revisa el estado en Mis pedidos.`
- CTA principal: `Ir a Mis pedidos`.
- CTA secundario: `Ver Mis dispositivos` (nuevo).
- Se mantiene subida de comprobante y datos de pago (Yappy QR + ACH/Banco).

### 2.7 Estados (mejorados)
- **Loading**: spinner con fondo rojo tenue, texto "Cargando tienda...".
- **Error**: icono AlertTriangle, mensaje claro, botón `Reintentar`.
- **Empty state**: `La tienda está temporalmente sin productos disponibles.` con CTAs a Mis dispositivos e inicio.
- **Producto disponible**: badge verde `Disponible`.
- **Producto agotado**: badge ámbar `Agotado temporalmente` (reemplaza "Sin stock operativo").
- **Sin productos**: empty state con CTAs.

### 2.8 Accesorios (secundario)
- Sección `Personalizados` aparece solo si hay productos con `storeSection === "custom_products"`.
- No es protagonista; aparece después de combos personales y empresa.
- Muestra imagen si existe, precio, disponibilidad y requisito de perfil/chip activo.

### 2.9 Mobile-first
- Hero compacto (min-h-[200px]).
- Cards apiladas en 1 columna.
- Una card completa visible en iPhone.
- CTA táctil (padding generoso).
- Formulario sin dos columnas en mobile.
- Bottom nav no tapa botón final (padding inferior en layout).
- Sin overflow horizontal.
- Sin tracking excesivo en textos pequeños.

### 2.10 Desktop
- Grid de combos hasta 4 columnas.
- Resumen de selección compacto antes del formulario.
- Empresa separada en acordeón.
- Modal de éxito con dos columnas para datos de pago.
- Coherencia visual con Mis dispositivos (mismos radios, colores, tipografía).

### 2.11 Accesibilidad
- Contraste real en todos los textos.
- Labels visibles (no solo placeholders).
- focus-visible rings en inputs y botones.
- Botones no dependen solo de color (tienen texto).
- Inputs con labels explícitos.
- CTA deshabilitado legible (opacity + cursor-not-allowed).
- Errores claros con toast.

## 3. Cómo quedó el flujo híbrido

1. **Hero compacto**: entrada visual de tienda con promesa de protección.
2. **Selector de combos**: cards de combos personales como decisión principal.
3. **Resumen de selección**: aparece al elegir combo, muestra lo incluido.
4. **Formulario de envío**: aparece después de la selección, no al inicio.
5. **Crear pedido**: mismo payload, mismo endpoint (`POST /api/orders`).
6. **Éxito**: pantalla post-compra con instrucciones de pago y CTAs a Mis pedidos + Mis dispositivos.

## 4. Cómo se separó empresa/corporativo

- Se filtran productos por nombre: si contiene "Combo Empresa" o "Corporativo" se consideran empresariales.
- Sección colapsable `Para empresas` con acordeón.
- CTA: `Solicitar atención empresarial` (indigo, no rojo).
- Nota visible: `Los pedidos empresariales requieren revisión y flujo separado.`
- No se modificó lógica de compra empresarial; si el usuario selecciona un producto empresarial, el flujo de creación de pedido es el mismo que antes (no se rompe).

## 5. Qué pasó con accesorios

- Los accesorios (`custom_products`) se muestran como sección secundaria solo si existen en la data.
- No son protagonistas; aparecen después de combos personales y empresa.
- Si no hay accesorios publicados, no se muestra sección vacía.
- No se inventaron accesorios desde UI.

## 6. Qué NO se tocó

- **schema.prisma**: no se modificó.
- **Migraciones**: no se crearon.
- **Base de datos**: no se tocó.
- **Backend**: no se modificó ningún endpoint.
- **Payloads**: no se cambiaron (mismos campos: productType, quantity, unitPrice, shippingAddress, shippingCity, shippingNotes, profileId).
- **Lógica de tienda**: no se cambió (misma creación de pedido, mismo fetch de productos).
- **Lógica de pedidos**: no se modificó.
- **Lógica de pagos**: no se modificó.
- **ProductOperationalMapping**: no se tocó.
- **W6.03**: no se rompió (se consume `/api/products` que respeta mapping).
- **W6.04**: no se tocó.
- **W6.05F**: no se tocó (chips/dispositivos).
- **W6.10**: no se tocó.
- **Empresarial funcionalmente**: no se tocó (solo separación visual).
- **Mascotas**: no se tocó.
- **KLFUFPK8**: no se tocó.
- **`/dashboard/compras`**: no se redirigió ni modificó.
- **Dependencias**: no se agregaron.
- **Motion complejo**: no se usó.
- **Imágenes externas**: se eliminó la imagen de Unsplash del hero.

## 7. Cómo se protegió W6.03

- Se sigue consumiendo `GET /api/products` que filtra por mapping publicado y base operacional.
- No se muestran productos sin mapping válido.
- No se cambió la lógica de creación de pedido.
- No se modificó `ProductOperationalMapping`.
- No se agregaron nuevos endpoints.

## 8. Cómo se protegieron pedidos/pagos

- Mismo payload de creación de pedido.
- Mismo endpoint `POST /api/orders`.
- Misma validación de perfil/chip para accesorios personalizados.
- Misma subida de comprobante a `POST /api/orders/[id]/payment-proof`.
- No se cambió lógica de pago.
- No se aprobaron/rechazaron pagos.

## 9. Skills usadas

- `prerescate-rules`: reglas del proyecto.
- `verification-loop`: verificación sistemática.
- `dashboard-builder`: estructura de dashboard.
- `frontend-a11y`: accesibilidad.
- `frontend-patterns`: patrones frontend.
- `design-system`: sistema de diseño.
- `brandkit`: identidad de marca.
- `design-taste-frontend`: criterio de diseño.
- `high-end-visual-design`: diseño visual premium.
- `impeccable`: calidad de interfaz.
- `apple-design`: principios de diseño Apple.
- `minimalist-ui`: minimalismo controlado.
- `industrial-brutalist-ui`: solo como inspiración limitada para precisión visual.

## 10. Validaciones ejecutadas

- `git status --short`: solo archivos tocados.
- `git diff`: cambios solo en tienda page y nuevo doc.
- `git diff --check`: sin whitespace errors.
- `npx prisma validate`: schema válido ✅
- `npm run typecheck`: typecheck pasa ✅
- `npm run build`: build exitoso ✅

## 11. Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `app/(app)/dashboard/tienda/page.tsx` | Rediseño completo visual híbrido |
| `docs/w605g-c-client-store-visual-implementation.md` | Documentación de implementación |

## 12. Backend tocado

**No.** No se modificó ningún archivo backend.

## 13. Frontend tocado

**Sí.** Solo `app/(app)/dashboard/tienda/page.tsx`.

## 14. Prisma modificado

**No.**

## 15. Migraciones

**No.**

## 16. Endpoints modificados/creados

**Ninguno.**

## 17. Estado Git

- HEAD = `01dc327` (origin/master)
- Workspace limpio salvo `tmp/`
- Archivos staged: `app/(app)/dashboard/tienda/page.tsx`, `docs/w605g-c-client-store-visual-implementation.md`

## 18. Commit

```
W6.05G-C implement client store hybrid visual experience
```

## 19. Push

Push normal a origin/master después de validaciones.

## 20. Pendientes

- Revisión visual post-push.
- Validar que la navegación del sidebar apunte a `/dashboard/tienda` en lugar de `/dashboard/compras` (futura fase).
- Considerar redirección de `/dashboard/compras` a `/dashboard/tienda` en fase posterior.
- Validar sync operacional por `productCode` (separado de esta fase).