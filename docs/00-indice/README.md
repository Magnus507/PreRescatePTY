# 📚 Índice del Proyecto PreRescatePTY

Bienvenido al índice principal de documentación del proyecto PreRescatePTY.

## 🗂️ Estructura de documentación

- **00-indice/** - Este índice y guías de inicio
- **01-arquitectura/** - Documentación de arquitectura y estructura
- **02-mapa-funcional/** - Mapas por dominio funcional
- **03-auditorias/** - Auditorías técnicas y planes de mejora
  - `estructura-repo/` - Auditoría estructural actual
  - `audit-previas/` - Auditorías históricas (34 archivos)
- **04-operaciones/** - Runbooks, deploy, variables de entorno
- **05-seguridad/** - Auditorías de seguridad
- **06-producto/** - Producto y decisiones
- **07-tests/** - Estrategia y tests faltantes
- **08-bitacoras/** - Planes y bitácoras
- **09-recursos/** - Recursos auxiliares
- **10-pendientes/** - Deuda técnica y mejoras

## 🚀 Guías rápidas por dominio

| Dominio | Archivo | Qué contiene |
|---------|---------|-------------|
| Website | [website.md](02-mapa-funcional/website.md) | Landing, páginas públicas, marketing |
| Auth/Seguridad | [auth-seguridad.md](02-mapa-funcional/auth-seguridad.md) | Login, registro, MFA, RBAC |
| Panel Cliente | [panel-cliente.md](02-mapa-funcional/panel-cliente.md) | Dashboard, fichas médicas, chips, órdenes |
| Ficha Médica | [ficha-medica.md](02-mapa-funcional/ficha-medica.md) | Creación, validación, cifrado |
| Chips/QR/NFC | [chips-qr-nfc.md](02-mapa-funcional/chips-qr-nfc.md) | Activación, escaneo, estados |
| Panel Admin | [panel-admin.md](02-mapa-funcional/panel-admin.md) | Consola administrativa, operaciones |
| Pedidos/Pagos | [pedidos-pagos.md](02-mapa-funcional/pedidos-pagos.md) | Tienda, checkout, Stripe |
| API/Backend | [api-backend.md](02-mapa-funcional/api-backend.md) | Endpoints, handlers |
| Base de datos | [base-datos.md](02-mapa-funcional/base-datos.md) | Prisma schema, modelos |
| Notificaciones | [notificaciones.md](02-mapa-funcional/notificaciones.md) | Email, SMS, WhatsApp |

## 🛠️ Operaciones
- [variables de entorno](04-operaciones/environment-variables.md)
- [runbook deploy](04-operaciones/runbook-deploy.md)
- [prisma baseline incident](04-operaciones/prisma-baseline-incident-2026-05-27.md)

## 📊 Auditorías
- [Auditoría de estructura](03-auditorias/estructura-repo/auditoria-estructura-repositorio.md)
- [Plan de reorganización](03-auditorias/estructura-repo/plan-reorganizacion-segura.md)
- [Bitácora de cambios](03-auditorias/audit-previas/ADMIN_CHANGELOG.md)
- [34 auditorías previas](03-auditorias/audit-previas/)

*Actualizado: Fase 1B completada - Documentación reorganizada*