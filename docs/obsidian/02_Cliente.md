# 02 - Módulo Cliente

## Responsabilidad
Todo lo que interactúa con el usuario que ha iniciado sesión. Está dividido estrictamente en dos partes conceptuales para evitar que la lógica colisione:
1. **Identidad / Configuración de la Cuenta:** Datos de contacto, nombre, apellidos, teléfono, correo. (Ubicado en `app/(app)/dashboard/configuracion`)
2. **Ficha Médica (El Perfil Médico):** Tipos de sangre, alergias, medicamentos, condiciones crónicas. (Ubicado en las secciones de la Ficha Médica de la familia o personal).

## Estado de Modificación Actual (Registro del Agente)
- **Error Corregido:** "Tipo de sangre inválido" al guardar la cuenta.
- **Razón del Error:** El formulario de `Configuracion` (que sólo guarda la Identidad) estaba usando el mismo esquema rígido (`profileUpdateSchema`) que exige el Tipo de Sangre. Como la identidad no enviaba sangre, el API fallaba.
- **Solución Aplicada:** En `api/users/profile/route.ts` cambiamos el `PATCH` para usar `profileUpdateSchema.partial()`, lo que permite guardar campos de identidad sin exigir los campos médicos, respetando la separación de los módulos.
- **Solución Aplicada (Imágenes de Perfil):** Añadimos un `upsert` a `api/upload/route.ts` para que si el perfil no existía al subir la foto, se cree automáticamente con campos por defecto (`bloodType: "Pendiente"`), evitando fallos en la base de datos de Prisma y asegurando que la foto se guarde.
