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
- sin cambiar schema

### W6.10D

- reorganizar `MedicalProfileForm` en pasos más claros
- usando campos actuales

### W6.10E

- mejorar la vista ciudadano y la vista paramédico

### W6.10F

- auditoría final visual y técnica

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

