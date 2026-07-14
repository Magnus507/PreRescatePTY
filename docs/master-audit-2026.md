# Auditoria maestra 2026 - PreRescue ID / PreRescatePTY

**Fecha de corte:** 14 de julio de 2026

**Revision:** `812e124` (`master`)

**Alcance:** repositorio completo, aplicacion Next.js, API, Prisma, operaciones, pruebas, scripts y documentacion.

**Tipo:** auditoria estatica y validacion local; no incluye inspeccion de datos ni configuracion de produccion.

## 1. Resumen ejecutivo

PreRescatePTY tiene una base funcional amplia y controles valiosos: separacion visual por areas, autenticacion central, MFA, cifrado de datos medicos, validacion de archivos, firma de webhooks, resolucion publica centralizada y un modelo operacional detallado. Prisma valida, TypeScript compila y el build de produccion termina correctamente.

La conclusion de CTO es, sin embargo, **NO-GO para una promesa de operacion de emergencia confiable o para escalar transacciones concurrentes**. Hay cuatro hechos de prioridad inmediata:

1. La reserva de unidades puede asignar la misma unidad a dos pedidos concurrentes porque selecciona y actualiza sin bloqueo ni compare-and-set.
2. La idempotencia del webhook Stripe depende de un `findFirst`, pero el esquema y las migraciones activas no imponen unicidad para `(provider, providerReference)`.
3. El escaneo registra eventos, pero las notificaciones automaticas de emergencia estan explicitamente deshabilitadas.
4. El formulario de contacto publico llama una URL que no existe.

A esto se suman 19 vulnerabilidades conocidas en dependencias de produccion, autorizacion JWT potencialmente obsoleta durante 30 dias, cifrado CBC sin autenticacion, consumo no atomico de tokens de recuperacion, suite completa y lint en rojo, y ausencia de CI.

**Puntuacion global:** **5.3/10**. El producto puede sostener desarrollo y pruebas controladas, pero requiere cerrar P0 y los controles de salida definidos en este documento antes de declarar confiabilidad operacional.

### Semaforo

| Area | Nota | Estado | Lectura ejecutiva |
|---|---:|---|---|
| Arquitectura | 6/10 | Amarillo | Dominios visibles, pero logica repartida entre routes, `lib`, `domains` y UI. |
| Backend y API | 6/10 | Amarillo | Cobertura funcional alta; contratos, validacion y errores inconsistentes. |
| Frontend | 6/10 | Amarillo | Producto amplio y responsive; componentes gigantes y sistema UI debil. |
| Base de datos | 5/10 | Rojo | Modelo rico; faltan restricciones criticas, tipos monetarios y estados fuertes. |
| Flujo producto-operaciones | 5/10 | Rojo | Flujo coherente nominalmente; integridad concurrente y retries no garantizados. |
| Seguridad | 5/10 | Rojo | Buenos controles puntuales; dependencias y criptografia requieren accion. |
| Pruebas | 5/10 | Rojo | 351 pruebas, pero suite roja y sin concurrencia DB/E2E real. |
| Documentacion | 4/10 | Rojo | Mucha evidencia historica, poca gobernanza de vigencia. |
| Performance | 5/10 | Amarillo | Correcta para volumen bajo; N+1, polling y cargas no acotadas. |
| Calidad operativa | 5/10 | Rojo | Build verde, pero lint/tests/coverage/CI no conformes. |

## 2. Alcance, metodo y limites

### Inventario observado

- 896 archivos versionados.
- 532 archivos TypeScript/TSX y aproximadamente 107,855 lineas TS/TSX.
- 299 archivos bajo `app`, 296 bajo `docs`, 87 bajo `scripts` y 40 archivos de prueba.
- 160 route handlers API, 40 paginas y 142 archivos TSX en `app`/`components`.
- 59 modelos Prisma, 20 migraciones activas y 181 declaraciones de indices en el esquema.
- 351 pruebas en 59 bloques `describe`.
- No existe `.github/` ni otro pipeline CI versionado.

### Metodo

- Inventario por archivos, tamanos, imports locales, rutas, modelos y migraciones.
- Lectura de flujos criticos: compra, webhook, ordenes corporativas, sincronizacion operacional, reserva, despacho, activacion, escaneo, autenticacion y recuperacion.
- Busqueda de duplicacion, codigo sin consumidores, hardcoding, estados string, consultas no acotadas, N+1 y deuda documental.
- Validaciones locales de Prisma, tipos, lint, pruebas, coverage, build y dependencias.
- Clasificacion separada entre evidencia comprobada, inferencia estatica y puntos que requieren verificar datos/infraestructura.

### Limites

- No se conecto a la base de datos de produccion ni se inspecciono `_prisma_migrations`.
- No se verificaron variables, proveedores, colas, alertas, CDN, backups ni observabilidad desplegada.
- No se ejecutaron pruebas de carga, DAST, pentest ni navegacion E2E.
- Un archivo con cero imports puede ser una entrada externa o reserva intencional; se clasifica para revision, no para borrado automatico.

## 3. Hallazgos prioritarios

### P0-01 - Reserva de stock no atomica

**Evidencia:** `lib/operations/commercial-order-reservation.ts:55` hace `findMany` de unidades disponibles y luego `updateMany` por IDs en `:79`, sin lock, nivel `Serializable`, condicion de estado en el update ni comprobacion del conteo actualizado. La implementacion duplicada en `app/api/admin/operations/commercial-orders/[id]/reserve-units/route.ts` conserva el mismo patron.

**Impacto:** dos transacciones pueden leer la misma unidad como disponible, ambas reportarla reservada y la ultima sobrescribir `reservedOrderId`. Esto compromete inventario, despacho y trazabilidad.

**Cobertura enganosa:** la prueba denominada como competencia ejecuta `first` y luego `second` secuencialmente (`tests/lib/commercial-order-reservation.test.ts:240`), sobre memoria compartida; no reproduce aislamiento de PostgreSQL.

**Accion:** una unica implementacion con `SELECT ... FOR UPDATE SKIP LOCKED`, o claim condicional verificando conteo dentro de transaccion serializable con retry; prueba de integracion contra PostgreSQL con dos transacciones realmente simultaneas.

### P0-02 - Idempotencia Stripe sin restriccion activa

**Evidencia:** el webhook consulta por proveedor/referencia (`app/api/payments/webhook/route.ts:96`) y crea despues (`:120`). `Order.providerReference` no tiene indice unico compuesto en `prisma/schema.prisma:568`. El indice parcial historico existe solo en `docs/prisma-migrations-legacy`, no en la cadena activa.

**Impacto:** webhooks concurrentes pueden crear ordenes duplicadas. La unicidad de `orderNumber` no constituye idempotencia de pago y puede convertir el problema en error transaccional.

**Accion:** migracion activa con unicidad adecuada para referencias no nulas, schema alineado, upsert/gestion de `P2002` y prueba concurrente de integracion. Verificar primero si produccion conserva un indice legado para evitar migracion conflictiva.

### P0-03 - Alertas de emergencia deshabilitadas

**Evidencia:** el escaneo persiste `notificationStatus: "disabled"` (`app/api/public/[shortCode]/scan/route.ts:60`) y responde que las notificaciones estan deshabilitadas (`:122`). El cron devuelve siempre `disabled` (`app/api/cron/notify/route.ts:5`). `lib/notifications.ts` no tiene consumidores de runtime.

**Impacto:** el producto registra el escaneo pero no avisa automaticamente a contactos. Esto contradice cualquier promesa comercial de alerta automatica y es especialmente sensible por la finalidad de emergencia.

**Accion:** decision ejecutiva explicita: restaurar con outbox/cola, retries, deduplicacion, consentimiento, auditoria y monitoreo de proveedores; o retirar esa promesa de todo contrato, UI y documentacion hasta tener el servicio.

### P0-04 - Dependencias vulnerables

**Evidencia:** `npm audit --omit=dev` reporta 19 vulnerabilidades de produccion: 4 altas, 14 moderadas y 1 baja. Incluye `next@15.5.15` con correccion disponible en 15.5.20, `next-auth@4.24.11`, `@sentry/nextjs`, `resend` y transitivas de Twilio/Supabase.

**Impacto:** exposicion a vulnerabilidades publicadas, incluyendo advisories altos de Next. Los guards internos reducen parte del impacto de un bypass de middleware, pero no eliminan la superficie.

**Accion:** upgrades pequenos y separados, audit despues de cada grupo, suite completa y smoke de autenticacion, pagos, perfil publico y uploads.

### P1-01 - Formulario publico roto

`app/(public)/contacto/ContactoContent.tsx:20` llama `/api/contacts/publics/public`; la ruta implementada es `app/api/contacts/public/route.ts`. El envio termina en 404. La correccion es pequena y debe incluir prueba de contrato UI/API.

### P1-02 - Autorizacion JWT obsoleta

`lib/auth.ts:12` usa JWT por 30 dias y solo copia `role`/`accountId` cuando existe `user` en el callback (`:90`). Los guards basados en sesion no revalidan sistematicamente `status`, `isAdmin` o rol en DB. Un usuario desactivado o degradado puede conservar permisos hasta renovar sesion.

### P1-03 - Recuperacion de contrasena no atomica y token en claro

`PasswordResetToken.token` se almacena unico pero en claro (`prisma/schema.prisma:141`). La ruta lee el token, cambia la contrasena y lo elimina en operaciones separadas (`app/api/auth/reset-password/route.ts:28-56`). Dos solicitudes concurrentes pueden consumir el mismo token; una falla al borrar tambien deja una ventana de reutilizacion.

### P1-04 - Cifrado no autenticado

`lib/encryption.ts:25` usa AES-256-CBC sin MAC. CBC no detecta manipulacion del ciphertext; ademas, ante fallo, `decrypt` devuelve el texto de entrada (`:48`), confundiendo datos corruptos con plaintext. Se requiere formato versionado y migracion a AES-256-GCM.

### P1-05 - Sincronizacion operacional fragil

`lib/operations/sync-real-order-to-operations.ts:92` busca idempotencia mediante un marcador dentro de `notes`, sin columnas fuente ni restriccion unica. Los callers sincronizan despues de confirmar la orden principal y capturan el error; no hay outbox ni retry durable. Una orden puede quedar creada sin reflejo operacional.

`OrderItem` no guarda `productId`, `operationalMappingId` ni snapshot operacional (`prisma/schema.prisma:617`). Un retry posterior pierde el contexto original. Los items corporativos si preservan Product, por lo que ambos caminos tienen capacidades distintas.

## 4. Arquitectura

### Estado actual

- Next.js App Router separa `(public)`, `(app)` y `(admin)`; es una frontera comprensible.
- La API es el backend dominante: no se encontraron Server Actions.
- La logica vive en cuatro estilos: route handlers gruesos, `lib`, servicios/repositorios en `domains` y servicios/hooks locales del admin.
- Los conceptos de negocio son ricos: cuentas, perfiles, chips, organizaciones, productos, ordenes, fabrica, QA, inventario, despacho, devoluciones y garantias.
- Conviven `Order` como modelo comercial heredado y `OperationCommercialOrder` como modelo operacional, unidos por sincronizacion.

### Mapa de modulos

| Modulo | Ubicacion principal | Responsabilidad observada | Riesgo dominante |
|---|---|---|---|
| Web publica | `app/(public)`, `components/public`, `components/home` | Marketing, contacto, demo y perfil de emergencia | Contrato de contacto roto y docs/promesa de alertas |
| Cliente personal | `app/(app)` | Cuenta, perfiles, chips, pedidos y salud | Componentes cliente grandes y fetch disperso |
| Empresas | `app/(app)/dashboard/empresas`, `app/api/organizations` | Organizaciones, empleados, productos y distribucion | Logica mixta y diferencias Product/Package |
| Administracion | `app/(admin)/admin`, `app/api/admin` | Usuarios, pedidos, inventario y control operacional | Mega-componentes, duplicacion y polling |
| Comercio/pagos | `app/api/orders`, `app/api/payments`, `domains/orders` | Ordenes, comprobantes, Stripe y fulfillment | Idempotencia y numeracion concurrente |
| Operaciones | `lib/operations`, modelos `Operation*` | Fabrica, reserva, QA, despacho, entrega y activacion | Reserva no atomica y sync best-effort |
| Identidad/seguridad | `lib/auth.ts`, `lib/rbac.ts`, `domains/users` | Login, roles, MFA y recuperacion | Claims stale, reset y cifrado CBC |
| Persistencia | `prisma`, repositorios | Schema, migraciones y acceso a datos | Constraints faltantes y Float monetario |
| Plataforma | `middleware.ts`, `next.config.ts`, cron, providers | Headers, rate limit, observabilidad e integraciones | Dependencias, fallback local y falta de CI |

### Evaluacion

La arquitectura muestra evolucion incremental mas que limites de dominio uniformes. Las rutas frecuentemente autentican, validan, consultan, mutan y formatean respuestas en el mismo archivo. Los servicios de dominio existen, pero su adopcion no es sistematica. Esto aumenta duplicacion y hace que reglas criticas tengan dos implementaciones.

### Recomendacion

- Definir bounded contexts propietarios: Identity, Emergency Profile, Commerce, Organizations y Operations.
- Mantener route handlers delgados: parseo, auth, llamada a caso de uso y serializacion.
- Prohibir duplicar invariantes de inventario, activacion, pago y sincronizacion fuera de un unico servicio.
- Introducir eventos/outbox entre Commerce y Operations en vez de llamadas best-effort posteriores al commit.

## 5. Backend y APIs

### Fortalezas

- Los handlers admin revisados usan guard de autenticacion/rol.
- Stripe valida firma y contrasta paquete, monto y moneda desde servidor.
- Uploads restringen bucket, tipo, firma magica, tamano y ownership.
- El proxy de imagen valida bucket/ruta y protege comprobantes.
- La resolucion de perfil publico centraliza estado de chip, perfil y contexto corporativo.

### Brechas

- 160 routes, de las cuales aproximadamente 100 parsean JSON; solo 64 muestran uso de Zod/`safeParse` segun inspeccion estatica.
- Contratos de respuesta no uniformes: solo 23 routes usan de forma visible `success: true`.
- 16 routes retornan `error.message` al cliente, exponiendo detalles internos; entre ellas ordenes, activacion y estados operacionales.
- De 123 routes mutantes, solo 22 referencian `auditLog`; no existe una politica transversal verificable.
- El rate limit aparece en una fraccion de rutas sensibles. Sin Upstash, el fallback en memoria es por instancia y no ofrece limite global.
- `generateOrderNumber` usa conteo/aleatoriedad/comprobacion antes del create; puede colisionar concurrentemente y, en webhook, usa el cliente global fuera de la transaccion recibida.
- `requestedQty` se acepta en `reserve-stock`, pero el helper reserva segun cantidades completas de items; el parametro se ignora semanticamente.

### Contrato recomendado

- Esquemas Zod por endpoint y DTOs separados del modelo Prisma.
- Envelope comun: `{ data, error, meta }`, codigos de error estables y mensajes internos solo en logs.
- Middleware/caso de uso comun para auth, auditoria, idempotency key y rate limit.
- Paginacion obligatoria para colecciones y limites maximos de servidor.

## 6. Frontend

### Estado

- La aplicacion cubre flujos publicos, personales, corporativos y administrativos.
- Hay responsive breakpoints extensos, `skip-to-content` y CSS para `prefers-reduced-motion`.
- Se encontraron 217 llamadas `fetch` en frontend, sin una capa uniforme de cache/query.
- Solo existe un componente en `components/ui`; el sistema reusable es insuficiente para el tamano del producto.
- Hay 43,283 lineas en client components.

### Complejidad

Archivos de especial riesgo por tamano:

- `app/(admin)/admin/_components/PedidosSection.tsx`: 2,848 lineas.
- Dashboard empresas: 2,410 lineas.
- `FinishedGoodsSection.tsx`: 1,883 lineas.
- `CommercialSection.tsx`: 1,717 lineas.
- `ProductionQueueSection.tsx`: 1,709 lineas.
- `QualitySection.tsx`: 1,440 lineas.
- Cliente publico de emergencia: 1,196 lineas.

Estos componentes mezclan datos, polling, estado, formularios, tablas y modales, aumentando regresiones y costo de prueba.

### UX, accesibilidad y build

- No hay `loading.tsx` y solo se encontro un `error.tsx`; los loaders locales existen, pero no hay estrategia de errores de ruta consistente.
- Hay elementos `div` clicables sin semantica de teclado en tarjetas/listas y previews; requiere auditoria automatizada y manual WCAG.
- El build advierte uso de `<img>` en cinco componentes y una dependencia incompleta de `useCallback`.
- El JS compartido inicial es 224 kB; `/admin` alcanza aproximadamente 345 kB de first load y middleware 144 kB.

### Recomendacion

- Extraer casos de uso y hooks por pantalla; objetivo inicial: ningun componente de negocio por encima de 500-700 lineas.
- Consolidar data fetching, cache, revalidacion y errores.
- Crear tokens y primitivas accesibles: Button, Input, Dialog, Table, Badge, EmptyState y Skeleton.
- Añadir pruebas de componentes criticos y Playwright para compra, contacto, escaneo, reserva, despacho y activacion.

## 7. Base de datos y Prisma

### Fortalezas

- `npx prisma validate` termina correctamente.
- El dominio operacional tiene relaciones e indices detallados.
- La cadena activa parte de un baseline y separa expansiones operacionales/mapping.

### Riesgos de integridad

- 59 modelos y cero enums Prisma. Se observaron 586 campos `String` y 72 defaults string; estados y categorias dependen de validacion de aplicacion.
- Importes y precios usan `Float`, por ejemplo `Order.amount` y `OrderItem.unitPrice/totalPrice`; esto introduce redondeo binario. Usar `Decimal` o centavos enteros.
- Falta unicidad activa de pago Stripe por proveedor/referencia.
- `OrderItem` pierde identidad de Product y mapping operacional.
- `AdminUser` permanece en schema aunque el runtime usa `User`; un script afirma que ya fue removido. Requiere auditoria de datos antes de eliminar.
- `Notification` permanece como historial/modelo, pero el flujo emisor esta deshabilitado.
- `Consent` aparece en borrado/auditoria, sin flujo de creacion identificado; requiere revision legal y funcional.

### Indices para verificar

PostgreSQL no crea automaticamente indices para foreign keys. El analisis estatico detecto candidatos sin indice propio: `Account.packageId`, `User.accountId`, `Contact.userId`, `Chip.assignedProfileId`, `Organization.accountId`, ubicaciones/departamentos de organizaciones, varias FK de `OrganizationMember`, `ChipClaimToken`, `Consent`, `CorporateProductRequest` y algunas FK de unidades terminadas.

No deben agregarse en bloque: medir consultas y cardinalidad, confirmar indices reales de produccion y crear los que respalden joins/filtros frecuentes.

### Migraciones

Las migraciones anteriores al baseline estan archivadas en `docs/prisma-migrations-legacy`. El repositorio no permite demostrar que produccion tenga exactamente la cadena activa. Antes de cualquier cambio P0 se debe comparar `_prisma_migrations`, indices reales y schema esperado.

## 8. Productos y flujo operacional

### Flujo nominal

`Product -> ProductOperationalMapping -> OperationFinishedGood` es una direccion correcta. La tienda resuelve mapping publicado/activo y la sincronizacion acepta `productId`, mapping y finished good explicitos. Las ordenes corporativas preservan Product en sus items.

El ciclo reserva -> produccion -> QA -> despacho -> entrega -> activacion esta modelado con separacion suficiente y eventos operacionales. Esta es una fortaleza estructural.

### Brechas

- La reserva concurrente no garantiza exclusividad.
- `/api/orders` crea snapshots sin `productId` persistido; un retry no puede reconstruir el mapping original.
- La sincronizacion usa `notes` como clave tecnica y puede duplicar/fallar por carrera.
- La sincronizacion post-commit no tiene outbox ni reconciliador durable.
- `store-order-fulfillment` calcula disponibilidad, pero no reserva; su resultado puede quedar obsoleto entre lectura y confirmacion.
- Los flujos Package legacy y Product operacional conviven. No deben forzarse bajo una equivalencia ficticia.
- `/api/orders` usa nomenclatura `legacy_order` aun cuando consume mapping moderno, señal de deuda semantica.

### Decision recomendada

Mantener el bridge temporal, pero hacer explicita la fuente en columnas `sourceType/sourceId` con unique, persistir el snapshot operacional en cada item y emitir un evento transaccional. Los flujos Package deben tener una fase de migracion separada, con reglas comerciales propias.

## 9. Codigo muerto y superficies sin consumidor

### Seguro eliminar, sujeto a una ultima compilacion

El grafo de imports locales no encontro consumidores para:

- `components/home/BentoBenefits.tsx`
- `components/home/PricingSection.tsx`
- `components/home/StickerDesign.tsx`
- `components/home/TrustSection.tsx`
- `components/home/VisualHowItWorks.tsx`
- `domains/chips/repositories/chip.repository.ts`
- `domains/orders/services/order.service.ts`
- `lib/dashboard/client-design-system.ts`
- `src/lib/request-ip.ts`, duplicado mas limitado de `lib/request-ip.ts`
- `app/(admin)/admin/_hooks/useOrdersPolling.ts`

Estos archivos no tienen imports entrantes ni rol de ambient declaration. Aun asi, el borrado debe hacerse en una fase separada y cerrar con typecheck/build, porque el analisis estatico no observa carga externa por nombre.

### Probablemente eliminar

- Dependencias directas sin imports detectados: `@base-ui/react` y `class-variance-authority`.
- Endpoint duplicado `reserve-units`, sin caller frontend identificado; `reserve-stock` es el flujo actual.
- `setup-storage.js` o `.ts`: mantener una sola fuente una vez confirmado el entorno que consume cada variante.
- Scripts de auditorias W cerradas que no forman parte de un runbook vigente; archivar antes de borrar si son evidencia historica.

`lib/notifications.ts` tampoco tiene consumidor, pero no debe borrarse sin la decision P0 sobre alertas.

### Requieren revision funcional o de datos

- `AdminUser`, `Notification` y `Consent`.
- Rutas sin caller estatico como organizaciones `actions/current`, inventario admin y profile-link. Los servicios indirectos pueden ocultar consumidores, por lo que requieren logs/telemetria antes de retirar.
- Tests de activacion/demo hoy obsoletos respecto al contrato: deben actualizarse, no eliminarse, porque cubren controles de negocio relevantes.
- Documentos W6 y auditorias reemplazadas: conservar como historicos, marcar `SUPERSEDED` y retirarlos del indice vigente.

No se encontraron archivos TS byte-a-byte duplicados.

## 10. Duplicacion

- `getFirstValidationMessage` aparece en 13 helpers operacionales.
- La reserva de unidades esta duplicada entre helper y route.
- Existen al menos cuatro variantes de `isAdmin`.
- Fecha, moneda, badges de estado, auth/error handling y validacion se repiten en multiples pantallas/routes.
- `useOrdersPolling` esta sin uso mientras `PedidosSection` implementa polling propio.
- `setup-storage.js` y `.ts` son duplicados declarados/documentados.

La duplicacion mas costosa no es cosmetica: son reglas de negocio mutables. Priorizar consolidacion de inventario, activacion, autorizacion, errores y sincronizacion antes de helpers visuales.

## 11. Hardcoding

### Legitimo

- Constantes de dominio centralizadas como tipos de cuenta y precio adicional pueden ser validas si tienen propietario y politica de cambio.
- Dominio canonico para SEO/QR puede ser fijo si despliegue y contratos lo requieren.

### Riesgoso

- `DEMO-ADMIN-VIP` aparece en API y componentes, incluyendo bypass de demo.
- `admin@prerescatepty.com` funciona como identidad de fundador/autorizacion en layout, API y UI; debe ser rol/configuracion, no email.
- Host de proyecto Supabase y URLs demo aparecen fijados en configuracion/codigo.
- Codigos/tipos de producto fijos aparecen en 24 archivos con 58 referencias pese a existir mapping operacional.
- El precio `$25` se repite en UI.
- La estimacion de produccion de 14 dias esta embebida en fulfillment.
- Admin orders genera URLs temporales con `/e/NEW`.

### UI

Se contaron aproximadamente 684 colores hex, 575 colores Tailwind arbitrarios y 391 radios arbitrarios. Hay tokens, pero no dominan. El resultado es alto costo de consistencia y theming.

## 12. Legacy

### Legacy activo

- `Order`/Package y `OperationCommercialOrder`/Product representan generaciones distintas.
- El sync bridge reduce ruptura inmediata, pero no garantiza entrega ni reconstruccion.
- Scripts y docs conservan migraciones, auditorias y fases W historicas.

### Riesgo

La palabra legacy no esta gobernada por fecha de retiro, propietario ni telemetria. Esto permite que endpoints, modelos y scripts permanezcan indefinidamente.

### Politica propuesta

Cada activo legacy debe registrar: propietario, consumidores, volumen 30/90 dias, sustituto, incompatibilidades, fecha de freeze y criterio de eliminacion. No eliminar `AdminUser`, Package flows ni rutas sin confirmar datos y trafico.

## 13. Pruebas

### Resultado real

- `npx vitest run`: **fallo**. 27 archivos pasan y 2 fallan; 330 pruebas pasan y 21 fallan.
- 20 fallos estan en `tests/routes/chips-activate.test.ts`: mocks/expectativas no representan el guard moderno de entrega/despacho y reciben 409.
- 1 fallo esta en `tests/routes/public-demo.test.ts`: contrato/mock de resolucion normal de perfil quedo obsoleto.
- `npm run test:coverage -- --run`: **fallo antes de ejecutar** por falta de `@vitest/coverage-v8`.

### Cobertura estructural

- Solo 16 archivos de tests de routes importan handlers frente a 160 routes.
- No hay integracion real con PostgreSQL para constraints, aislamiento o concurrencia.
- Los mocks de `$transaction` ejecutan callback sobre un objeto y no modelan locking.
- No hay suite browser E2E, pruebas de componentes ni auditoria a11y automatizada.
- Los scripts llamados smoke/e2e frecuentemente operan contra DB y no forman un gate CI reproducible.

### Prioridad

Primero recuperar una suite verde sin debilitar guards. Luego agregar tests de integracion para reserva y webhook, y Playwright para los seis journeys criticos. Instalar coverage con thresholds por dominio; no perseguir porcentaje global sin criticidad.

## 14. Documentacion

### Estado

- Hay 279 documentos Markdown y 85 documentos `w6*`; solo 10 archivos estan archivados formalmente.
- 25 documentos contienen rutas absolutas `/Users/geancusatti/...`, no portables.
- `INSTRUCTIONS.md` indica 163 archivos, 38 API routes y 22 pages, frente a 896, 160 y 40 actuales.
- `docs/01-arquitectura/estructura-actual.md` declara 78 handlers y cero tests; ya no representa el repositorio.
- Un analisis historico afirma notificaciones activas, mientras el mapa funcional actual reconoce que estan deshabilitadas.
- Auditorias W605/W608 presentan seguridad del flujo competidor basada en una prueba secuencial; esa conclusion debe corregirse.
- Los documentos W6.08G/H son acertados al separar Product mapping de Package legacy y reconocer perdida de contexto de retry.

### Recomendacion

Crear un indice canonico con documentos `CURRENT`, `HISTORICAL` y `SUPERSEDED`; mover cierres W a archivo por trimestre. Toda afirmacion operacional debe llevar fecha, commit y evidencia ejecutable. Los docs historicos no deben ser fuente de verdad de produccion.

## 15. Seguridad

### Controles positivos

- Auth en rutas admin revisadas y guard central de roles.
- Login rate-limited, password hashing y MFA TOTP.
- Firma y validacion server-side en Stripe.
- Uploads con MIME, magic bytes, tamano, bucket y ownership.
- Headers HSTS, frame deny, nosniff, referrer y permissions policy.
- Campos medicos cifrados en escrituras de repositorio.
- No se detectaron secretos reales versionados ni SQL raw inseguro.

### Riesgos

- 19 vulnerabilidades de dependencias de produccion.
- JWT con claims de autorizacion potencialmente stale por 30 dias.
- AES-CBC sin autenticacion y fallback de decrypt a plaintext.
- Token de reset en claro y consumo no atomico.
- CSP permite `'unsafe-inline'` y `'unsafe-eval'`, reduciendo defensa XSS.
- Mensajes de error internos llegan a clientes en varias routes.
- Auditoria de mutaciones y rate limit no son transversales.
- Fallback de rate limit en memoria no es global en despliegue multi-instancia.

### Datos y privacidad

Por tratar datos medicos y ubicacion, se requiere una matriz formal de minimizacion, retencion, consentimiento, acceso y borrado. La mera existencia del modelo `Consent` no demuestra consentimiento efectivo. Validar logs para evitar PII y definir acceso break-glass/auditoria para soporte.

## 16. Performance y escalabilidad

### Backend

- El loader de inventario trae productos/unidades y agrega en Node; crecera linealmente.
- Existen `findMany` sin paginacion en endpoints administrativos.
- `OrderFulfillmentService` consulta chips individualmente.
- Acciones de organizaciones, detalle admin y pasos de produccion realizan queries/writes dentro de loops.
- Liberacion de reservas actualiza unidades una por una.
- La disponibilidad calculada sin reserva es una fotografia que envejece bajo concurrencia.

### Frontend

- Operaciones hace polling cada 30 segundos; ScanMonitor cada 10 segundos.
- 217 fetches y ausencia de cache/query comun elevan solicitudes duplicadas.
- Componentes gigantes y first-load admin de ~345 kB limitan interactividad en dispositivos modestos.

### Acciones

- Paginacion cursor, selects minimos y agregaciones DB.
- Batch writes/reads y eliminar N+1.
- Revalidacion por eventos/SSE donde aporte valor; mantener polling con backoff y pausa al ocultar tab.
- Medir p95/p99, query timings, tamaño de payload y Web Vitals antes de optimizar cosmeticamente.

## 17. Calidad de codigo y operacion

### Validaciones

| Comando | Resultado |
|---|---|
| `git diff --check` | Pasa antes del informe. |
| `npx prisma validate` | Pasa. |
| `npm run typecheck` | Pasa. |
| `npm run lint` | Falla: 97 problemas, 91 errores y 6 warnings. |
| `npx vitest run` | Falla: 330/351 pasan; 21 fallan. |
| `npm run test:coverage -- --run` | Falla: falta `@vitest/coverage-v8`. |
| `npm run build` | Pasa con warnings. |
| `npm audit --omit=dev` | Falla: 19 vulnerabilidades. |

### Warnings de build

- Uso de `<img>` en `QrPreviewModal`, `ReceiptModal`, `ProductionQueueSection`, `DemoContent` y `DemoSection`.
- Dependencia de hook incompleta en pagina de distribucion corporativa.

### Lint

Los errores incluyen `no-explicit-any`, simbolos no usados y numerosos scripts/tests. Hay errores tambien en runtime, por ejemplo servicios de notificacion de orden y repositorios. El build verde no sustituye el gate de lint.

### Nombres, tipos y principios

- **Nombres:** el dominio operacional es descriptivo, pero `Order` frente a `OperationCommercialOrder`, `legacy_order` para ordenes modernas y varias representaciones de producto generan ambiguedad semantica.
- **Tipos:** TypeScript estricto/typecheck aporta valor, pero estados, roles, categorias y dinero pierden seguridad al entrar al schema como `String`/`Float`; los `any` reportados por lint erosionan el borde.
- **SRP/SOLID:** los mega-componentes y route handlers gruesos acumulan UI, IO y reglas. La inyeccion de cliente DB en helpers operacionales es una buena base que debe extenderse.
- **DRY:** reglas de reserva, auth admin, mensajes Zod y formatters estan repetidas. La duplicacion de invariantes es prioritaria; no conviene crear abstracciones prematuras para cada fragmento visual.
- **KISS:** el bridge comercial-operacional evita una reescritura y es pragmatico, pero usar `notes` como clave tecnica hace simple el primer paso a costa de integridad futura.
- **Consistencia:** coexistencia de repositorios/servicios y Prisma directo, envelopes distintos y auditoria parcial. Hace falta una convencion exigible, no otra capa opcional.

**Calificacion de calidad:** **5/10**. La legibilidad local es generalmente suficiente y el typecheck pasa, pero la consistencia global y los gates no sostienen aun el volumen del repositorio.

### CI/CD

No existe pipeline versionado. Como minimo, cada PR debe ejecutar install reproducible, Prisma validate, format/diff check, lint, typecheck, unit/integration, build, audit controlado y migracion dry-run. Proteger `master` contra merge con gates rojos.

## 18. Riesgos, fortalezas y deuda

### Matriz de riesgos

| Riesgo | Probabilidad | Impacto | Prioridad |
|---|---|---|---|
| Doble reserva de unidad | Alta bajo concurrencia | Critico | P0 |
| Orden Stripe duplicada | Media | Critico financiero | P0 |
| Emergencia sin alerta | Cierta en estado actual | Critico reputacional/funcional | P0 |
| Explotacion de dependencia vulnerable | Variable | Alto | P0 |
| Contacto publico inutilizable | Cierta | Alto comercial | P1 inmediato |
| Usuario degradado conserva JWT | Media | Alto | P1 |
| Sync comercial-operacional perdido | Media | Alto | P1 |
| Token reset reutilizable concurrentemente | Baja-media | Alto | P1 |
| Corrupcion/manipulacion no detectada de ciphertext | Baja-media | Alto | P1 |
| Degradacion por N+1/polling | Alta con crecimiento | Medio-alto | P2 |
| Documentacion equivocada guia decisiones | Alta | Medio-alto | P2 |

### Priorizacion por severidad

- **Criticos:** doble reserva; idempotencia Stripe no garantizada; alertas de emergencia deshabilitadas respecto a una promesa activa; vulnerabilidades high sin remediar.
- **Altos:** contacto roto; JWT stale; sync perdido; reset concurrente; cifrado no autenticado; tests/lint sin gate; dinero Float y estados sin constraints.
- **Medios:** N+1, polling, listas no acotadas, bundles, componentes gigantes, hardcoding y documentacion obsoleta.
- **Bajos:** formatters/badges repetidos, dependencias posiblemente sin uso, archivos historicos fuera de indice y warnings `<img>` aislados. Pueden escalar si siguen creciendo, pero no deben desplazar P0/P1.

### Fortalezas que conviene preservar

- Modelo operacional profundo y trazable.
- Separacion explicita entre reserva, produccion, QA, despacho, entrega y activacion.
- Mapping Product -> finished good como direccion de arquitectura.
- Guards de rutas admin y resolucion publica centralizada.
- Validacion cuidadosa de archivos y comprobantes.
- Stripe no confia en monto/paquete enviados por cliente.
- MFA, rate limits parciales y headers defensivos.
- Formulario medico compartido entre contextos personal/corporativo.
- Responsive, reduced motion y skip navigation ya considerados.
- Gran historial de decisiones y auditorias, util si se gobierna su vigencia.

### Registro maestro de deuda

| ID | Deuda | Tipo | Severidad | Evidencia de cierre |
|---|---|---|---|---|
| D-001 | Reserva no atomica | Integridad | Critica | Test PostgreSQL concurrente verde y una sola implementacion. |
| D-002 | Stripe sin unique de idempotencia | Pagos/DB | Critica | Migracion activa, indice real y test concurrente. |
| D-003 | Alertas deshabilitadas | Producto | Critica | Servicio durable o promesa retirada formalmente. |
| D-004 | Dependencias vulnerables | Seguridad | Critica | Audit sin high y excepciones documentadas. |
| D-005 | Contact endpoint incorrecto | Funcional | Alta | E2E de formulario verde. |
| D-006 | Sync post-commit sin outbox | Arquitectura | Alta | Outbox, worker, retry, reconciliacion y metricas. |
| D-007 | `OrderItem` sin identidad Product | Datos | Alta | Snapshot/migracion y retry determinista. |
| D-008 | JWT stale | Seguridad | Alta | Revalidacion/revocacion probada. |
| D-009 | CBC y reset token | Seguridad | Alta | AES-GCM versionado; token hasheado/atomico. |
| D-010 | Suite/lint/coverage rojos | Calidad | Alta | Gates verdes en CI. |
| D-011 | Float para dinero/estados String | Datos | Alta | Plan de migracion y constraints. |
| D-012 | Componentes/routes gigantes | Mantenibilidad | Media | Limites y tests por modulo. |
| D-013 | N+1, polling y listas no acotadas | Performance | Media | Budgets p95/payload y queries medidas. |
| D-014 | UI hardcoded/sin primitivas | Frontend | Media | Tokens y componentes adoptados. |
| D-015 | Docs/scripts historicos sin gobernanza | Operacion | Media | Indice canonico, owners y archivo. |
| D-016 | Codigo/modelos/rutas posiblemente muertos | Higiene | Baja-media | Telemetria/datos confirmados y retiro seguro. |

## 19. Roadmap maestro

### P0 - Integridad y promesa de producto

1. **Reserva atomica:** diseñar claim DB, eliminar duplicado, migrar caller y probar dos transacciones concurrentes.
2. **Stripe idempotente:** inspeccionar indice real, agregar migracion activa/constraint, manejar `P2002` y probar delivery concurrente/repetido.
3. **Alertas:** decidir alcance contractual. Si se mantienen, implementar outbox, cola, retries, dedupe, auditoria, health checks y runbook.
4. **Parches de seguridad:** Next 15.5.20 o superior compatible, NextAuth y dependencias directas/transitivas; smoke por lote.
5. **Contacto publico:** corregir ruta y cubrir con prueba.
6. **Gate minimo:** recuperar lint y suite completa; CI requerido en `master`.

**Criterio de salida P0:** ninguna reserva doble en prueba real; webhook exactamente-una-orden; decision/servicio de alertas verificable; cero vulnerabilidades high aceptadas sin excepcion; contacto funcional; build, lint, typecheck y tests verdes en CI.

### P1 - Seguridad y consistencia transaccional

1. Outbox para Commerce -> Operations y reconciliador observable.
2. Columnas fuente unicas en orden operacional; dejar de usar `notes` como clave.
3. Persistir `productId`, mapping y snapshot operacional en `OrderItem`.
4. Hash de reset token, consumo atomico y revocacion de sesiones.
5. Revalidacion de estado/rol para operaciones sensibles y estrategia de invalidacion JWT.
6. Cifrado versionado AES-GCM y migracion auditable de datos.
7. Migrar dinero a Decimal/centavos y estados criticos a enums/check constraints.
8. Integracion PostgreSQL, coverage y Playwright de journeys criticos.

**Criterio de salida P1:** ninguna mutacion critica depende solo de convencion de aplicacion; retries son deterministas; accesos revocados dejan de funcionar dentro del SLA definido.

### P2 - Escalabilidad y mantenibilidad

1. Dividir mega-componentes y route handlers en casos de uso testeables.
2. Unificar validacion, errores, auth, auditoria e idempotencia API.
3. Paginacion, batch operations, eliminacion N+1 y agregaciones DB.
4. Capa comun de data fetching; reducir polling y bundle admin.
5. Sistema UI con tokens/primitivas y cierre de accesibilidad.
6. `loading/error/not-found` y estados vacios/error coherentes.
7. Canon de documentacion vigente y archivo de fases/scripts.

**Criterio de salida P2:** budgets de p95, queries, payload, JS y accesibilidad medidos en CI/observabilidad; ownership claro por dominio.

### P3 - Limpieza y optimizacion continua

1. Retirar codigo, endpoints, modelos y dependencias sin uso tras telemetria.
2. Archivar scripts historicos y documentar los destructivos restantes.
3. Eliminar hardcodes restantes mediante configuracion/mapping.
4. Consolidar formatters, badges y patrones visuales.
5. Revisiones trimestrales de dependencias, schema, permisos, docs y DR.

## 20. Orden de ejecucion recomendado

### Primeras 48 horas

- Corregir contacto publico.
- Abrir workstreams separados para reserva e idempotencia Stripe.
- Confirmar oficialmente el estado de alertas y ajustar comunicacion si estan prometidas.
- Preparar upgrades de seguridad y CI sin mezclar cambios funcionales.

### Primeras dos semanas

- Cerrar P0 con pruebas PostgreSQL/E2E.
- Reparar suite/lint/coverage.
- Auditar migraciones e indices de produccion.
- Instrumentar errores de sync, pagos, reservas y notificaciones.

### Siguientes 30-60 dias

- Implementar outbox, snapshots de item, revocacion, AES-GCM y modelo monetario.
- Comenzar modularizacion por las pantallas de mayor cambio/riesgo.
- Establecer budgets y gobernanza documental.

## 21. Conclusion CTO

PreRescatePTY no es un prototipo vacio: tiene amplitud funcional, conocimiento de dominio y varios controles de seguridad bien implementados. El problema principal es que la confiabilidad declarada supera hoy las garantias transaccionales y operativas demostrables.

El camino recomendado no es una reescritura. Es proteger primero las invariantes criticas en base de datos, hacer durable la comunicacion entre comercio y operaciones, decidir honestamente la promesa de alertas, recuperar gates automaticos y despues reducir complejidad. Con ese orden, el equipo preserva el valor ya construido y convierte la plataforma en una base defendible para produccion y escala.

**Decision final:** **NO-GO para escala o SLA de emergencia hasta completar P0.** Uso controlado puede continuar con comunicacion explicita de limitaciones, monitoreo y sin asumir que build verde equivale a integridad operacional.
