# W6.05G-B - Diseno de Experiencia Tienda Cliente

## 1. Resumen ejecutivo

La tienda cliente debe ser una experiencia hibrida: primero ayuda a elegir una proteccion clara y despues guia al checkout. No debe abrir como un formulario largo ni como un catalogo generico de ecommerce.

La decision recomendada para PreRescueID ahora es:

1. mostrar una entrada visual de tienda con promesa de proteccion;
2. presentar combos/chips como decision principal;
3. mostrar resumen de seleccion;
4. pedir datos de cliente/envio en un paso posterior;
5. crear pedido y llevar a `Mis pedidos`;
6. recordar que la activacion ocurre despues desde `Mis dispositivos`.

Esto responde al estado real actual: el usuario ve combos como foco principal y no accesorios publicados como protagonistas. La tienda debe vender "proteccion lista para activar", no inventario.

## 2. Decision catalogo / checkout / hibrido

### No conviene una tienda solo catalogo

Una tienda puramente catalogo seria visualmente mas moderna, pero podria ocultar el paso critico: el usuario necesita elegir proteccion, entregar datos y entender que el pago queda en revision.

### No conviene un checkout directo desde el primer vistazo

El estado actual se siente como formulario/checkout de combos. Eso vuelve la compra intimidante, poco emocional y poco alineada con Home, Perfiles y Mis dispositivos.

### Recomendacion

Usar una experiencia hibrida:

- modo inicial: `Elige tu proteccion`;
- modo posterior: `Completa tu pedido`;
- modo final: `Paga y revisa en Mis pedidos`;
- modo futuro: `Activa desde Mis dispositivos cuando recibas tu chip`.

La tienda debe sentirse como una guia de compra, no como una pagina de inventario.

## 3. Principios de experiencia

- Mobile-first: el flujo debe funcionar primero en celular.
- Comprar proteccion, no inventario: el lenguaje debe hablar de personas protegidas.
- Claridad comercial: precio, chips incluidos y caso de uso visibles sin buscar.
- Confianza: explicar que el pedido queda registrado y el pago se revisa.
- Minima friccion: elegir primero, llenar datos despues.
- Conexion con activacion: compra y activacion no se mezclan, pero se conectan.
- Respetar `ProductOperationalMapping`: no mostrar productos invalidos.
- No mezclar personal y empresa sin separacion visual.
- Pedidos y pagos seguros: precio desde servidor, pago manual bajo revision.

La tienda debe responder en segundos:

- Que compro?
- Que incluye?
- Para quien sirve?
- Cuanto cuesta?
- Que pasa despues de comprar?
- Como activo mi chip despues?

## 4. Arquitectura recomendada de `/dashboard/tienda`

### A. Header / Hero

Objetivo: abrir la tienda como PreRescueID, no como formulario.

Contenido recomendado:

- titulo: `Elige tu proteccion`
- subtitulo: `Compra tus chips PreRescueID y activalos desde Mis dispositivos cuando los recibas.`
- microestado: `Pedidos con pago en revision manual`
- CTA secundario: `Ver mis pedidos`

Visual:

- fondo azul noche/carbon con acento rojo controlado;
- una pieza visual simple de chip/sticker;
- sin imagen stock generica;
- no ocupar demasiada altura en mobile.

Evitar:

- "Catalogo Oficial" como protagonista;
- hero tipo ecommerce;
- formulario visible antes de elegir producto.

### B. Selector de combos / productos

Debe ser la seccion principal. Los combos visibles hoy son:

- Combo Estandar
- Combo Duo
- Combo Familiar
- Combo Hogar Full
- Combo Empresa
- Corporativo

Para personales, cada card debe incluir:

- nombre del combo;
- precio;
- chips incluidos;
- caso de uso;
- disponibilidad;
- CTA claro;
- badge recomendado si aplica.

Jerarquia ideal:

1. nombre + caso de uso;
2. chips incluidos;
3. precio;
4. disponibilidad;
5. CTA.

### C. Resumen de seleccion

Debe aparecer despues de elegir un combo.

Contenido:

- combo seleccionado;
- chips incluidos;
- precio;
- que pasa despues;
- CTA: `Continuar con envio`;
- enlace secundario: `Cambiar combo`.

En desktop puede vivir como panel lateral o bloque superior pegajoso si no compite con las cards.

En mobile debe ser compacto y aparecer justo despues de seleccionar, con scroll suave al siguiente paso.

### D. Datos del cliente / envio

Debe aparecer como paso claro, no como inicio de pantalla.

Agrupacion recomendada:

- contacto: nombre, correo, telefono;
- envio: direccion, ciudad/provincia, notas;
- pago: instrucciones despues de crear pedido, no antes.

Reglas UX:

- labels visibles, no placeholders como unica guia;
- mensajes cortos;
- CTA principal fijo o cercano al final;
- evitar formularios de dos columnas en mobile;
- no pedir mas datos de los necesarios.

### E. Confirmacion / pedido

El exito debe sentirse claro y tranquilo.

Contenido:

- `Pedido creado`;
- numero o referencia de pedido si esta disponible;
- total;
- estado: `Pago pendiente de revision`;
- pasos siguientes:
  - realiza el pago;
  - sube el comprobante;
  - revisa estado en `Mis pedidos`;
  - cuando recibas tus chips, activalos en `Mis dispositivos`.

CTA principal:

- `Ir a Mis pedidos`

CTA secundario:

- `Ver Mis dispositivos`

## 5. Personal vs Empresa / Corporativo

### Problema actual

`Combo Empresa` y `Corporativo` aparecen mezclados con combos personales. Eso puede hacer que un cliente particular crea que puede comprar flujo empresarial como producto normal.

### Opciones

#### Opcion A - Separar en seccion "Para empresas"

Ventaja:

- mantiene visibilidad comercial;
- aclara que es otro flujo.

Riesgo:

- si el backend aun no soporta compra directa segura, puede crear confusion.

#### Opcion B - Mostrar como solicitud empresarial, no compra directa

Ventaja:

- protege el flujo empresarial;
- evita compra erronea;
- alinea con reglas de empresa.

Riesgo:

- menos conversion directa si el usuario queria comprar sin hablar con ventas.

#### Opcion C - Ocultar en tienda personal

Ventaja:

- maxima seguridad;
- evita mezclar modulos.

Riesgo:

- se pierde descubrimiento del producto empresarial.

### Recomendacion

Usar Opcion B para W6.05G-C: mostrar `Para empresas` como bloque separado con CTA de solicitud/contacto, no como compra directa normal.

Texto recomendado:

- titulo: `Para empresas`
- subtitulo: `Proteccion para equipos, colaboradores o instituciones.`
- CTA: `Solicitar atencion empresarial`
- nota: `Los pedidos empresariales requieren revision y flujo separado.`

Antes de permitir compra corporativa directa, auditar backend/pedidos empresariales y reglas de aprobacion.

## 6. Accesorios

Los accesorios ya no aparecen claramente para cliente. No deben volverse protagonistas sin evidencia del mapping/publicacion actual.

Diseno recomendado:

- no crear seccion publica principal de accesorios en W6.05G-C;
- si `/api/products` devuelve accesorios publicados, mostrarlos como seccion secundaria;
- si requieren perfil/chip activo, explicar `Requiere perfil con chip activo`;
- si no hay accesorios, no mostrar seccion vacia;
- no inventar stock ni productos desde UI.

Accesorios deben ser complemento contextual, no el flujo principal de tienda.

## 7. Vocabulario recomendado

### Usar

- `Tienda`
- `Elige tu proteccion`
- `Combo`
- `Chips incluidos`
- `Activar despues de recibir`
- `Envio`
- `Pedido`
- `Disponible`
- `Agotado`
- `Para empresas`

### Evitar

- `inventario`
- `stock operacional`
- `mapping`
- `finished good`
- `productCode`
- `ID interno`
- `manual` como etiqueta visible principal
- `accesorios` como protagonista si no hay productos publicados

### Textos concretos

- Titulo de tienda: `Elige tu proteccion`
- Subtitulo: `Compra tus chips PreRescueID y activalos desde Mis dispositivos cuando los recibas.`
- CTA principal: `Continuar con envio`
- CTA de combo: `Elegir combo`
- CTA de pedido: `Crear pedido`
- Empty state: `La tienda esta temporalmente sin productos disponibles.`
- Agotado: `Agotado temporalmente`
- Empresa/corporativo: `Solicitar atencion empresarial`
- Post-compra: `Tu pedido fue creado. Sube tu comprobante y revisa el estado en Mis pedidos.`
- Activacion posterior: `Cuando recibas tus chips, activalos desde Mis dispositivos.`

## 8. Cards de producto

### Card ideal para combo personal

Debe incluir:

- nombre del combo;
- precio;
- chips incluidos;
- caso de uso;
- recomendacion si aplica;
- disponibilidad;
- CTA;
- visual de proteccion.

### Casos de uso sugeridos

- Combo Estandar: `Para una persona`
- Combo Duo: `Para ti y un familiar`
- Combo Familiar: `Para el hogar`
- Combo Hogar Full: `Mayor cobertura familiar`
- Combo Empresa: `Para equipos pequenos`
- Corporativo: `Solicitar atencion empresarial`

### Layout recomendado

Mobile:

- card vertical compacta;
- nombre + precio arriba;
- chips incluidos como badge claro;
- caso de uso en una linea;
- CTA full width;
- estado disponible/agotado visible.

Desktop:

- grid de 2 a 4 columnas segun ancho;
- card destacada para recomendada;
- no todas las cards deben tener igual peso si una es la opcion ideal;
- resumen de seleccion separado.

### Visual

- superficie clara fria o carbon suave;
- acento rojo para seleccion/CTA;
- verde solo para disponibilidad;
- ambar solo para agotado/pendiente;
- icono simple de chip/sticker/escudo;
- no usar imagen stock.

## 9. Flujo UX propuesto

### Paso 1 - Elegir combo

El usuario ve combos personales primero. Cada card explica para quien sirve.

### Paso 2 - Revisar que incluye

Al seleccionar:

- se resalta la card;
- aparece resumen;
- se explica chips incluidos y precio.

### Paso 3 - Completar datos/envio

Formulario aparece despues de seleccionar. En mobile debe estar debajo del resumen.

### Paso 4 - Crear pedido

CTA: `Crear pedido`. El servidor sigue recalculando precio y validando.

### Paso 5 - Ir a Mis pedidos

Tras exito:

- mostrar instrucciones de pago;
- permitir subir comprobante;
- CTA principal a `Mis pedidos`.

### Paso 6 - Activar desde Mis dispositivos

Microcopy:

`Cuando recibas tus chips, entra a Mis dispositivos y toca Activar chip.`

No activar en tienda.

## 10. Estados y casos

### Producto disponible

- Badge: `Disponible`
- CTA habilitado.
- Precio visible.

### Producto agotado

- Badge: `Agotado temporalmente`
- CTA deshabilitado o `Avisarme cuando vuelva`.
- No ocultar si mapping/base operacional existen.

### Producto sin mapping valido

- No se muestra.
- No se resuelve en cliente.
- Mantener filtro por `/api/products`.

### Tienda sin productos

Texto:

`La tienda esta temporalmente sin productos disponibles. Te avisaremos cuando vuelva el inventario.`

CTA:

`Ver Mis dispositivos` o `Ir al inicio`.

### Error de carga

Mostrar estado recuperable:

- `No pudimos cargar la tienda.`
- CTA: `Reintentar`

### Usuario con datos incompletos

Form debe pedir solo lo necesario y validar inline.

### Pedido pendiente / pago pendiente

Post-compra debe indicar:

- `Pago pendiente de revision`;
- `Sube tu comprobante`;
- `Puedes revisar el estado en Mis pedidos`.

### Pedido completado

Desde tienda no hace falta detalle completo; enviar a `Mis pedidos`.

### Usuario ya tiene chip activo

No bloquear compra de combos familiares. Puede necesitar mas chips.

### Usuario sin perfiles medicos

No bloquear compra de combos normales. Solo bloquear accesorios personalizados que requieren perfil/chip activo.

### Combo empresarial

Separar y tratar como solicitud, no compra directa personal.

### Legacy `/dashboard/compras`

Debe dejar de ser la experiencia principal visible cuando W6.05G-C implemente la tienda nueva.

## 11. Legacy `/dashboard/compras`

### Problema

Convive con `/dashboard/tienda` y actualmente se percibe como el flujo real de combos/formulario.

### Recomendacion

- Ruta principal futura: `/dashboard/tienda`.
- `/dashboard/compras`: mantener como legacy temporal o redirigir en una fase posterior.
- No redirigir todavia sin auditar links internos y dependencias de paquetes.
- Evitar dos tiendas visibles en navegacion.
- Si se conserva, documentarla como compatibilidad y no como experiencia cliente principal.

### Decision para W6.05G-C

Implementar visualmente en `/dashboard/tienda` sin tocar `/dashboard/compras` inicialmente, salvo que se detecte un link directo roto o duplicado de navegacion que confunda.

## 12. Seguridad / limites backend

La implementacion futura debe respetar:

- precios no dependen solo del cliente;
- no comprar productos no publicados;
- no comprar productos sin mapping valido;
- no comprar productos sin base operacional;
- no manipular stock/reservas desde UI cliente;
- no aprobar pagos automaticamente;
- no mezclar pedidos personales/corporativos;
- no tocar activacion desde tienda;
- no exponer IDs internos como lenguaje visible;
- cuidado con sync operacional basado en nombre comercial vs `productCode`.

Recomendacion tecnica para fase posterior:

- si W6.05G-C solo cambia UI, no tocar endpoints;
- si se necesita corregir sync por `productCode`, abrir una fase tecnica separada con auditoria de pedidos/operaciones.

## 13. Mobile-first

### Estructura mobile

1. hero compacto;
2. cards apiladas;
3. resumen de seleccion;
4. formulario;
5. confirmacion.

### Reglas

- no mostrar formulario primero;
- CTA visible y tactil;
- campos con labels reales;
- no usar dos columnas;
- bottom nav no debe tapar CTA;
- evitar texto pequeno con tracking excesivo;
- cards no deben ocupar una pantalla completa cada una.

### Densidad ideal

El usuario debe poder ver al menos una card completa y parte de la siguiente en un iPhone moderno.

## 14. Desktop

### Estructura desktop

- hero compacto ancho;
- grid de combos;
- resumen lateral solo despues de seleccion;
- formulario en paso o columna ordenada;
- seccion empresa separada abajo o lateral sobria.

### Reglas

- no formulario gigante primero;
- no sidebar-like layout dentro de la pagina;
- usar ancho sin convertirlo en tabla;
- mantener coherencia con Mis dispositivos;
- no llenar de metricas.

## 15. Direccion visual

### Concepto

`Comprar proteccion que despues cobra vida.`

La tienda debe sentirse como parte del ecosistema PreRescueID: proteccion, tecnologia y confianza.

### Colores

- Azul noche `#05070D` para hero/superficies premium.
- Azul carbon `#0F1419` para profundidad.
- Rojo emergencia `#DA1A21` para CTA principal y seleccion.
- Blanco frio `#EFF4FF` para texto sobre oscuro.
- Gris clinico para descripciones.
- Verde protegido solo para disponible.
- Ambar prevencion solo para agotado/pendiente.

### Superficies

- hero oscuro con halo rojo controlado;
- cards claras frias o dark cards segun contraste;
- resumen con borde definido y fondo sobrio;
- formulario claro, limpio y menos redondeado que el actual;
- no repetir exactamente Mis dispositivos, pero compartir profundidad, radios y contraste.

### Badges

- `Disponible`
- `Agotado`
- `Recomendado`
- `Para empresas`
- `Chips incluidos`

### Iconos

- chip;
- escudo;
- caja/envio;
- pedido;
- pago en revision;
- activacion.

### CTA

- principal: rojo emergencia;
- secundario: borde/ghost;
- empresa: oscuro sobrio o outline con copy claro;
- agotado: disabled legible.

### Tipografia

- titulos compactos y fuertes;
- subtitulos legibles;
- menos uppercase extremo;
- precio visible, no exagerado;
- microcopy con contraste real.

## 16. Plan para W6.05G-C

### Archivos probables

- `app/(app)/dashboard/tienda/page.tsx`
- documentacion de cierre W6.05G-C

### Cambios permitidos recomendados

- reorganizar layout visual;
- hacer selector de combos/productos primero;
- mover formulario despues de seleccion;
- mejorar estados de disponible/agotado/error;
- separar empresa;
- mejorar copy;
- mantener llamadas existentes si alcanzan.

### Evitar en C

- no tocar backend inicialmente;
- no tocar endpoints;
- no tocar schema;
- no modificar `ProductOperationalMapping`;
- no cambiar pedidos/pagos;
- no tocar activacion;
- no resolver legacy `/dashboard/compras` con redirect todavia si hay riesgo.

### Riesgos

- romper compra manual si se cambia payload;
- romper productos publicados si se ignora mapping;
- confundir empresa con personal;
- hacer una UI bonita pero menos clara;
- reintroducir accesorios como protagonistas sin data.

## 17. Criterios de aceptacion para W6.05G-C

- La tienda se entiende en 5 segundos.
- El usuario entiende que primero elige combo/proteccion.
- El producto elegido, precio y chips incluidos quedan claros.
- Empresa/corporativo no se mezcla confusamente con personal.
- El formulario no domina antes de elegir.
- CTA principal es claro.
- Mobile es comodo y sin overflow.
- Bottom nav no tapa acciones.
- Productos invalidos no se muestran.
- Productos agotados se entienden sin jerga tecnica.
- W6.03 no se rompe.
- Pedidos y pagos no se rompen.
- Activacion sigue en `Mis dispositivos`.

## 18. Skills usadas como criterio

- `prerescate-rules`
- `verification-loop`
- `dashboard-builder`
- `frontend-a11y`
- `frontend-patterns`
- `design-system`
- `brandkit`
- `design-taste-frontend`
- `high-end-visual-design`
- `impeccable`
- `api-design`
- `backend-patterns`
- `security-review`
- `error-handling`
- `apple-design`
- `minimalist-ui`
- `industrial-brutalist-ui` como inspiracion limitada para precision, sin llevar la tienda a estetica agresiva.

## 19. Que NO se toco

- No se toco codigo productivo.
- No se toco frontend productivo.
- No se toco backend.
- No se tocaron endpoints.
- No se toco `schema.prisma`.
- No hubo migraciones.
- No se toco BD.
- No se cambio logica de tienda.
- No se cambio logica de pedidos.
- No se cambiaron pagos.
- No se aprobaron ni rechazaron pagos.
- No se crearon ni cancelaron ordenes.
- No se reservaron ni despacharon unidades.
- No se activaron ni asignaron chips.
- No se toco `ProductOperationalMapping`.
- No se toco W6.03, W6.04, W6.05F ni W6.10.
- No se toco empresarial salvo diseno de separacion.
- No se toco mascotas ni `KLFUFPK8`.
- No se modifico `/dashboard/tienda`.
- No se modifico `/dashboard/compras`.

## 20. Validaciones

- `git status --short`
- `git diff`
- `git diff --check`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`

## 21. Conclusion

W6.05G-B define la tienda cliente como una experiencia guiada de proteccion: elegir combo, revisar lo incluido, completar envio, crear pedido y activar despues desde Mis dispositivos. La implementacion futura debe concentrarse en claridad y confianza sin tocar la capa sensible de W6.03, pedidos, pagos, stock ni activacion.
