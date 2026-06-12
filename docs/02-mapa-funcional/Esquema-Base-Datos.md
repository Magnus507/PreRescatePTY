# Registro del Esquema de Base de Datos - PreRescatePTY

Este documento contiene el registro meticuloso de todos los modelos y campos definidos en la infraestructura de datos (Prisma), sus tipos y roles en el sistema.

## Modelos del Núcleo (Core)

### [[User]]
Cuentas de acceso al sistema.
- `id`: String (CUID) - Clave primaria.
- `accountId`: String - Referencia a la cuenta propietaria.
- `email`: String (Único) - Correo de acceso.
- `phone`: String? - Teléfono de contacto.
- `passwordHash`: String - Credenciales cifradas.
- `role`: String (Default: "owner") - Privilegios del usuario.
- `isAdmin`: Boolean - Flag para panel administrativo.
- `adminRole`: String? - Rol específico (admin, superadmin, imprenta).
- `status`: String (Default: "active") - Estado de la cuenta.

### [[Account]]
Contenedor principal de negocio (Tenancy).
- `id`: String (CUID) - Clave primaria.
- `accountType`: String (Default: "personal").
- `packageId`: String - Vínculo con el plan adquirido.
- `status`: String - Estado de facturación/servicio.
- `maxChipsAllocated`: Int - Límite de dispositivos permitidos.
- `maxProfilesAllocated`: Int - Límite de fichas médicas.

### [[Profile]] (Ficha Médica)
El corazón de la información vital.
- `id`: String (CUID) - Identificador único de la ficha.
- `firstName`: String - Nombre(s).
- `lastName`: String - Apellido(s).
- `displayNamePublic`: String? - Alias mostrado en escaneo.
- `birthDate`: DateTime? - Fecha de nacimiento.
- `sex`: String? - Género.
- `bloodType`: String - Grupo sanguíneo (CRÍTICO).
- `allergies`: String - Lista de alergias.
- `chronicConditions`: String - Enfermedades preexistentes.
- `medications`: String - Medicinas actuales.
- `photoUrl`: String? - Foto de identificación.
- `address`: Text - Dirección física (Bio-dirección).

## Modelos de Identificación (Hardware)

### [[Chip]] (Bio-Link)
Vínculo entre el mundo físico y digital.
- `serialPublic`: String (Único) - Número de serie visible.
- `shortCode`: String (Único) - Código corto de la URL (ej. /e/[shortCode]).
- `nfcUrl`: String - Link programado en chip NFC.
- `qrUrl`: String - Contenido del código QR.
- `status`: String - (inventory, sold, activated, suspended).
- `isPhysical`: Boolean - Si es un sticker físico o entrega digital.
- `serviceEndDate`: DateTime - Fecha de vencimiento de la protección.

## Interconexiones de Emergencia

### [[ScanEvent]]
Registro de cada interacción con un chip.
- `chipId`: Referencia al Chip escaneado.
- `geoLat`, `geoLng`, `geoAccuracy`: Coordenadas de GPS capturadas.
- `ipAddress`, `userAgent`: Datos técnicos del escaneador.
- `emergencyMode`: Boolean - Si el escaneo fue marcado como emergencia real.

### [[Notification]]
Alertas disparadas por el motor de emergencia.
- `chipId`, `eventId`: Origen de la alerta.
- `channel`: (sms, email, whatsapp).
- `recipient`: Destinatario (Contacto de auxilio).
- `status`: (pending, sent, failed).

## Interconexiones Corporativas

### [[Organization]]
- `accountId`: Vínculo con la cuenta pagadora.
- `legalName`: Nombre legal de la empresa.
- `organizationType`: (company, school, fleet).

### [[OrganizationMember]]
- `organizationId`, `profileId`: Vínculo entre empresa y persona.
- `memberStatus`: Estado del empleado/miembro.

---
**Notas Técnicas:**
- Todas las interconexiones críticas (Profile -> ScanEvent) utilizan `ON DELETE CASCADE` para mantener la limpieza de la base de datos si se borra un perfil.
- Se utilizan índices en `email`, `serialPublic`, `shortCode` y `accountId` para optimizar búsquedas masivas en el panel administrativo.
