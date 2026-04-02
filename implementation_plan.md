# Plan de Mejoras Finales para PreRescatePTY

Este documento detalla todas las modificaciones necesarias para satisfacer los requerimientos solicitados, enlazando correctamente el panel de administración, el panel de clientes, los planes de compra y resolviendo los errores de plataforma.

## User Review Required

> [!IMPORTANT]
> **Sobre los "Chips" de Empresa:** Actualmente, al crear una empresa, el sistema le **asigna una cuota** (ej. 30 chips) pero **no los genera físicamente en la base de datos**.
> **Decisión requerida:** Modificaré el código para que al crear una nueva empresa, el sistema *genere automáticamente* la cantidad de chips especificados (ej. 30) y los asigne a la cuenta de esa empresa. Confirmame si esto es lo ideal.

> [!NOTE]
> **Sobre los Errores de Supabase (RLS):** Supabase arroja advertencias de "Row Level Security is disabled" porque no tenemos políticas restrictivas por fila creadas. Añadiré el código SQL para habilitarlo en la base de datos y callar la advertencia. Prisma seguirá funcionando gracias a que usa el usuario `postgres` (bypassea RLS).
> **Sobre los Errores de Vercel:** Los 4 errores fueron causados por el fallo previo de los "perfiles huérfanos" (que ya reparamos). En el próximo deploy, esos errores desaparecerán.

## Proposed Changes

---

### Panel de Administración (`src/app/admin`)

#### [MODIFY] `src/app/admin/page.tsx`
- **Detalle de Usuario completo:** Modificar la tabla de usuarios en la pestaña "Usuarios". Al hacer clic en un usuario, se desplegará una **vista de detalle** que mostrará toda su información personal, médica y los chips que le pertenecen, con botones para suspender/reactivar el usuario.
- **Detalle de Empresa y sus Chips:** Crear una vista de detalle para cuando se haga clic en una empresa. Aquí se listarán los chips que le pertenecen a la empresa.
- **Reactivación:** El botón de "Reactivar Servicio (+2 años)" ya existe dentro de la *Vista Detallada de cada Chip*. Me aseguraré de que sea sumamente visible y fácil de acceder desde el detalle del usuario/empresa.

#### [MODIFY] `src/app/api/admin/organizations/route.ts`
- Modificar el endpoint de creación de organizaciones para que ejecute una generación masiva de chips (`maxChips`) automáticamente en el mismo momento en que se crea la empresa. De esta forma, si asignas 30 chips, se crean al instante para esa empresa.

---

### Dashboard de Cliente (`src/app/dashboard`)

#### [MODIFY] `src/app/dashboard/page.tsx`
- **Módulo de Tipo de Cuenta & Upgrade:** Añadir una sección visual en el dashboard donde el cliente vea su tipo de cuenta ("Individual", "Familiar", "Corporativo"). Si es individual o familiar, le aparecerá una invitación para hacer _upgrade_ hacia los **Módulos Extra** (Empresas y Colegios).
- Mostrar los datos de su "Empresa" si es un usuario corporativo (dueño / miembro).

#### [MODIFY] `src/app/dashboard/contactos/page.tsx` y `src/app/dashboard/perfil/page.tsx`
- Modificar el botón ficticio `Renueva tu servicio` para que redirija a WhatsApp (con un mensaje predefinido anunciando la necesidad de renovación). 

---

### Páginas de Marketing / Públicas

#### [MODIFY] `src/app/comprar/page.tsx`
- Agregar la vista o mencionar claramente los paquetes adicionales disponibles ("Empresas" y "Institucional/Colegios"), en vez de mostrar únicamente los 2 iniciales, sincronizando esto con los planes backend.

#### [MODIFY] `src/app/faq/page.tsx`
- Actualizar el costo del plan básico que aparece en las preguntas frecuentes, armonizándolo con la información más reciente de la página de Comprar.

---

### Base de Datos Supabase

#### [NEW] `prisma/enable-rls.sql`
- Script con las sentencias SQL (`ALTER TABLE "MiTabla" ENABLE ROW LEVEL SECURITY;` + Políticas abiertas limitadas a Prisma) que eliminará la advertencia de 15 errores en el Security Advisor de Supabase.

## Open Questions

1. **Precios Exactos:** ¿Qué precio debo ponerle al "Módulo Empresa" (por ejemplo, Empresa de 30 stickers) y al "Módulo Colegio" en la pestaña de Comprar/FAQ? Por el momento usaré textos de "Contactar a Ventas" / "Cotizar", ¿te parece bien?
2. **Botón de Renovación:** Cuando hacen clic en "renovar tu servicio" en modo limitado en el Dashboard, los mandaré al WhatsApp oficial con un texto pidiendo renovación. ¿Deseas algún número diferente a los ya configurados?

## Verification Plan

### Automated Tests
- Validaré la compilación con `npm run build` para asegurar de que no existan errores Typescript.

### Manual Verification
- En un entorno local de prueba, crearé una nueva empresa como Administrador y verificaré que aparezcan los chips automáticamente.
- Probaré la interfaz del Dashboard para garantizar que los botones fluyan hacia Whatsapp y se presenten correctamente los Upsells (módulos extra).
