# W6.10B - Diseño UX y Técnico de Perfiles Médicos Normales

## Principio Central

Todo perfil médico normal comparte una base médica común:

- datos básicos
- tipo de sangre
- alergias
- medicamentos
- condiciones médicas
- contactos de emergencia
- notas críticas o instrucciones especiales

Sobre esa base pueden existir capas especiales:

- menor de edad
- adulto mayor o dependiente
- autismo o comunicación asistida
- Alzheimer, demencia o riesgo de desorientación
- discapacidad o condición especial

Las capas especiales no reemplazan la base médica común. Solo la enriquecen.

## Formulario Privado Propuesto

### Paso 1: Identidad básica

- nombre
- apellido
- alias público
- fecha de nacimiento
- sexo
- teléfono
- ubicación general, si aplica

### Paso 2: Base médica esencial

- tipo de sangre
- alergias
- condiciones médicas
- medicamentos
- notas críticas

### Paso 3: Contactos de emergencia

- contacto principal
- contacto secundario
- relación
- teléfono
- WhatsApp, si aplica
- prioridad

### Paso 4: Capas especiales / asistencia

- menor de edad, detectado por fecha de nacimiento o selector manual
- adulto mayor o dependiente
- comunicación asistida o no verbal
- deterioro cognitivo
- riesgo de desorientación
- instrucciones de retorno seguro
- qué hacer y qué evitar

### Paso 5: Seguro / médico tratante

- aseguradora
- hospital preferido
- médico tratante
- teléfono del médico
- visibilidad pública de estos datos

### Paso 6: Privacidad y vista pública

- qué ve ciudadano
- qué ve médico o paramédico
- toggles existentes
- vista previa pública

## Pantalla Pública Inicial

La entrada pública final debería ser simple y con una decisión principal:

**¿Qué tipo de ayuda estás prestando?**

- Soy ciudadano
- Soy médico / paramédico

Los contextos de perfil deben mostrarse como badges arriba o dentro de la vista:

- Menor de edad
- Adulto mayor
- Requiere asistencia
- Riesgo de desorientación
- Comunicación asistida
- Alergia crítica
- Medicación importante

No conviene convertir esos contextos en la primera decisión del usuario.

## Vista Ciudadano

Debe mostrar una versión simple y segura:

- nombre o alias público
- edad aproximada o badge menor / adulto mayor, si aplica
- alerta crítica
- alergias críticas
- condiciones relevantes
- instrucciones rápidas
- qué hacer
- qué evitar
- contacto de emergencia principal
- botón de llamada
- botón de WhatsApp
- botón de emergencia, si aplica
- retorno seguro, si está habilitado

La prioridad es claridad, no densidad técnica.

## Vista Médico / Paramédico

Debe mostrar una versión más completa:

- datos básicos
- tipo de sangre
- alergias
- medicamentos
- condiciones médicas
- notas críticas
- seguro, si es visible
- hospital preferido, si es visible
- médico tratante, si es visible
- contactos de emergencia
- asistencia especial

Debe ser más rica que la vista ciudadano, pero sin romper la separación de privacidad.

## Badges y Contextos

Los badges pueden derivarse de los datos actuales:

- menor de edad: `birthDate`
- adulto mayor: edad, si se define umbral o selector futuro
- alergia crítica: `allergies` no vacío
- medicación importante: `medications` no vacío
- deterioro cognitivo: `hasCognitiveImpairment`
- riesgo de desorientación: `hasWanderingRisk`
- comunicación asistida: `isNonVerbal` o `communicationAssistance`
- retorno seguro: `safeReturnInstructions`

## Campos Actuales vs Campos Futuros

La base vive hoy en `Profile`, así que la siguiente fase debería priorizar UX antes que normalización.

Recomendación:

- usar los campos existentes para mejorar la experiencia
- evitar una migración inmediata si no aporta valor funcional claro
- normalizar tablas médicas separadas más adelante solo si realmente hace falta

## Compatibilidad con W6.04

La vista pública sigue protegida por `Chip.shortCode` activo.

Reglas a conservar:

- perfil sin chip activo no debe abrirse públicamente
- W6.10 no debe cambiar el acceso público
- W6.10 solo cambia presentación y estructura visual

## Qué No Toca W6.10

- empresarial
- mascotas
- activación
- pedidos
- productos
- inventario
- `KLFUFPK8`

## Plan de Implementación

### W6.10C

- rediseñar la pantalla pública inicial ciudadano / médico
- mantener los badges como contexto visual
- mover asistencia especial y retorno seguro fuera de la decisión principal
- sin cambiar schema

### W6.10D

- reorganizar `MedicalProfileForm` en pasos más claros
- usando campos actuales

### W6.10E

- mejorar la vista ciudadano y la vista paramédico

### W6.10F

- auditoría final visual y técnica

## W6.10C - Pantalla Pública Inicial

La pantalla pública inicial se simplificó para que la primera decisión sea:

- Soy ciudadano
- Soy médico / paramédico

### Qué cambió

- Se reemplazó la pregunta genérica por una decisión directa de ayuda.
- Se reubicó la asistencia especial como contexto dentro de la ficha, no como botón principal.
- Los badges clínicos quedan visibles como información secundaria.
- La vista ciudadano conserva la guía breve y la información crítica.
- La vista médico / paramédico conserva la información más completa.

### Qué no cambió

- no cambió la ruta pública
- no cambió `Chip.shortCode` como puerta de acceso
- no cambió el helper de resolución pública
- no cambió la seguridad de W6.04
- no se tocaron chips, activación, pedidos, productos ni inventario

### Compatibilidad

La pantalla sigue dependiendo de un chip activo y asignado. Si el perfil no es publicable, no se expone públicamente.

## W6.10D - Formulario Privado Reorganizado

El formulario privado quedó reorganizado en una secuencia más clara usando los campos actuales de `Profile`.

### Pasos finales

1. Identidad básica
2. Base médica esencial
3. Contactos de emergencia
4. Asistencia especial / retorno seguro
5. Seguro y médico tratante
6. Privacidad y vista pública

### Qué quedó en cada paso

- Identidad básica: nombre, apellido, alias público, fecha de nacimiento, sexo, teléfono y ubicación general si aplica.
- Base médica esencial: tipo de sangre, alergias, condiciones médicas, medicamentos y notas críticas.
- Contactos de emergencia: bloque guiado para recordar que los contactos siguen gestionándose en el perfil, sin cambiar el modelo actual.
- Asistencia especial / retorno seguro: deterioro cognitivo, desorientación, comunicación asistida, notas críticas y retorno seguro.
- Seguro y médico tratante: aseguradora, póliza, hospital preferido, teléfono de emergencia del seguro, médico tratante y visibilidad asociada.
- Privacidad y vista pública: toggles públicos existentes y explicación clara de ciudadano/paramédico.

### Qué no cambió

- no cambió el schema
- no hubo migración
- la base médica sigue en `Profile`
- los contactos siguen en `ProfileContact` / `Contact`
- no cambió el acceso público
- no se tocaron chips, activación, pedidos, productos, inventario ni empresarial

### Observación UX

Se añadió un resumen visual de contexto privado con badges derivados de los datos actuales, sin introducir lógica de negocio nueva.

## W6.10E - Vista Ciudadano y Vista Médico / Paramédico

La vista pública normal quedó afinada para separar mejor la experiencia de ayuda rápida y la experiencia clínica.

### Vista ciudadano

- mantiene una lectura simple y segura
- prioriza nombre o alias, alertas críticas, alergias, condiciones relevantes e instrucciones rápidas
- muestra contactos de emergencia y acciones de llamada o WhatsApp cuando aplican
- conserva el retorno seguro y la comunicación asistida como contexto, no como acción principal
- permite volver al inicio o pasar a la vista médica completa

### Vista médico / paramédico

- mantiene una ficha más completa y clínica
- enfatiza tipo de sangre, alergias, condiciones, medicamentos y notas críticas
- muestra seguros y médico tratante solo cuando la visibilidad lo permite
- conserva los contactos de emergencia al final para no romper la jerarquía clínica
- ofrece retorno al inicio y cambio a vista ciudadana sin alterar el acceso público

### Qué no cambió

- no cambió `Chip.shortCode` como puerta de acceso
- no cambió el helper de resolución pública
- no cambió la seguridad de W6.04
- no se tocaron chips, activación, pedidos, productos ni inventario
- no se cambió el schema
- no hubo migración

### Compatibilidad

La experiencia pública sigue dependiendo de un chip activo y asignado. La mejora de W6.10E solo reorganiza presentación y jerarquía visual.

## W6.10E-FIX - Simplificación de Vista Pública y Capas Especiales

Se aplicó un ajuste visual adicional para reducir redundancia en la vista médico / paramédico.

### Qué cambió

- se eliminó la tarjeta grande de "Resumen clínico" porque repetía sangre, edad, sexo y contacto rápido ya visibles en la ficha superior
- la vista paramédico ahora pasa directo a bloques clínicos útiles
- se agregó un bloque condicional de "Asistencia especial y retorno seguro" cuando existen datos relevantes
- el bloque usa lenguaje prudente y no inventa diagnósticos
- la vista ciudadano se mantiene simple y no se sobrecarga

### Criterios de asistencia especial

El bloque aparece cuando existe al menos uno de estos campos:

- `hasCognitiveImpairment`
- `hasWanderingRisk`
- `isNonVerbal`
- `communicationAssistance`
- `safeReturnInstructions`

### Lenguaje cuidadoso

- "Deterioro cognitivo reportado" en lugar de afirmar un diagnóstico específico
- "Riesgo de desorientación"
- "Comunicación asistida"
- "Instrucciones de retorno seguro"

### Qué no cambió

- no cambió `Chip.shortCode` como puerta de acceso
- no cambió el helper de resolución pública
- no cambió la seguridad de W6.04
- no se tocaron chips, activación, pedidos, productos ni inventario
- no se cambió el schema
- no hubo migración

### Compatibilidad

La pantalla sigue dependiendo de un chip activo y asignado. La simplificación solo ajusta jerarquía visual y claridad clínica.

## W6.10F - Reconstrucción del Formulario Médico Normal y Persistencia Completa

Se reconstruyó la experiencia del formulario privado para que el usuario entienda qué perfil está creando y para que los campos actuales persistan al crear, guardar y volver a editar.

### Qué cambió

- se añadió una guía inicial con contexto de perfil: adulto, menor de edad, adulto mayor / dependiente y asistencia especial
- se mejoró la sección de asistencia especial para que tenga una sola zona clara de retorno seguro
- se eliminó la duplicación visual de notas críticas en la experiencia de escritorio
- se rehidrató `showSafeReturnLocationPublic` en el editor
- el retorno seguro quedó más visible y más fácil de revisar al reabrir el formulario

### Persistencia reforzada

Se audita y se mantiene alineado el flujo:

- formulario privado
- payload de creación
- payload de actualización
- edición de perfil
- vista pública

Campos especiales y de visibilidad implicados:

- `hasCognitiveImpairment`
- `hasWanderingRisk`
- `isNonVerbal`
- `communicationAssistance`
- `safeReturnInstructions`
- `showVulnerabilityStatusPublic`
- `showCommunicationStatusPublic`
- `showSafeReturnPublic`
- `showSafeReturnLocationPublic`
- `additionalNotes`
- `showAdditionalNotesPublic`

### Qué no cambió

- no cambió el schema
- no hubo migración
- no se tocaron chips, activación, pedidos, productos, inventario, empresarial ni mascotas
- no cambió la regla pública de W6.04
- no cambió el helper de acceso público

### Compatibilidad

La experiencia pública sigue dependiendo de un chip activo y asignado. La reconstrucción solo fortalece edición, persistencia y claridad del formulario médico normal.

## W6.10F-UX2 - Formulario Médico Modular y Contraíble

La experiencia del formulario se refinó para eliminar la guía inicial grande y convertir el editor en módulos contraíbles, más claros y más rápidos de recorrer.

### Qué cambió

- se reemplazó la guía inicial extensa por un encabezado mínimo con contexto visual
- el formulario quedó organizado en módulos/cajas contraíbles
- cada bloque concentra su propia visibilidad pública cuando aplica
- la experiencia separa mejor menores, asistencia especial, cognición, retorno seguro y seguro médico
- la vista de escritorio dejó de depender de una estructura tipo wizard

### Módulos finales

1. Identidad básica
2. Información médica esencial
3. Contactos de emergencia
4. Niño / menor de edad
5. Asistencia especial / condición especial
6. Deterioro cognitivo / Alzheimer / demencia
7. Retorno seguro / persona perdida
8. Seguro y médico tratante

### Visibilidad por módulo

- `showAdditionalNotesPublic` quedó en el módulo médico esencial
- `showCommunicationStatusPublic` quedó en asistencia especial
- `showVulnerabilityStatusPublic` quedó en deterioro cognitivo
- `showSafeReturnPublic` y `showSafeReturnLocationPublic` quedaron en retorno seguro
- `showInsuranceProviderPublic`, `showPreferredHospitalPublic`, `showPrimaryDoctorPublic` y `showPrimaryDoctorPhonePublic` quedaron en el módulo de seguro y médico

### Qué no cambió

- no cambió el schema
- no hubo migración
- la base médica sigue en `Profile`
- los contactos siguen en `ProfileContact` / `Contact`
- no cambió el acceso público
- no se tocaron chips, activación, pedidos, productos, inventario ni empresarial

### Resultado UX

El formulario ahora se percibe como una colección de módulos editables y plegables, más cercana a una interfaz moderna de 2026 y más fácil de revisar sin perder persistencia.

## W6.10F-UX3 - Persistencia Real y Módulos Útiles

Se corrigió la persistencia real de retorno seguro y se eliminaron bloques visuales que no aportaban edición útil.

### Qué se corrigió

- `safeReturnInstructions`, `showSafeReturnPublic` y `showSafeReturnLocationPublic` quedaron rehidratados en edición
- los campos estructurados de retorno seguro se conservan porque ya existen en el schema y en los endpoints
- el editor deja de mostrar módulos muertos que no tenían acción real
- la experiencia de asistencia especial y deterioro cognitivo se apoya en datos reales y en copy útil

### Qué se quitó o compactó

- el bloque grande de contactos de emergencia dentro del formulario
- el módulo visual de menor de edad como formulario aparte
- el bloque “Privacidad y vista pública” global

### Qué quedó en módulos útiles

- Deterioro cognitivo / memoria / desorientación
- Asistencia especial / condición especial
- Retorno seguro / persona perdida
- Seguro y médico tratante

### Qué se mantiene

- la base médica sigue en `Profile`
- los contactos siguen administrándose en su bloque propio del perfil
- no se agregaron campos falsos
- no se tocaron schema, migraciones ni acceso público

### Resultado

El formulario ahora prioriza persistencia real, módulos con acción concreta y una edición más honesta para el usuario.

## Riesgos y Decisiones Pendientes

- si se normalizan tablas médicas o no
- si adulto mayor se calcula por edad o selector
- cómo manejar menor de edad sin pedir demasiados datos
- qué datos son sensibles para ciudadano
- qué datos se muestran al paramédico
- cómo construir una vista previa pública útil

## Recomendación Final

La dirección correcta para W6.10B es:

- simplificar la entrada pública
- ordenar el formulario privado por capas lógicas
- mantener la base médica común dentro de `Profile` por ahora
- dejar la normalización de tablas como decisión futura, no inmediata
