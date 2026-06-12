# 📚 Índice de Documentación — PreRescatePTY

Bienvenido al índice principal de documentación del proyecto PreRescatePTY.

---

## Propósito de la carpeta `docs/`

`docs/` contiene toda la documentación técnica, funcional, operativa y de auditoría del proyecto. Los números al inicio de los nombres de carpeta indican la estructura canónica preferida.

---

## 🗂️ Estructura actual

### Carpetas numeradas (estructura canónica)

| Carpeta | Descripción |
|---------|-------------|
| [`00-indice/`](../00-indice/) | Este índice y guías de inicio |
| [`01-arquitectura/`](../01-arquitectura/) | Arquitectura general, diagramas, estructura del proyecto (canónica) |
| [`02-mapa-funcional/`](../02-mapa-funcional/) | Mapas de funcionalidad por dominio (canónico) |
| [`03-auditorias/`](../03-auditorias/) | Auditorías técnicas, RBAC, flujos corporativos, historial de reorganización |
| [`04-operaciones/`](../04-operaciones/) | Runbooks, deploy, variables de entorno, bitácora, quick reference |

### Carpetas archivadas

| Carpeta | Contenido | Notas |
|---------|-----------|-------|
| [`_archivado/analysis/`](../_archivado/analysis/) | 6 archivos de análisis duplicados (Panel, Web) | Archivados en D2A |
| [`_archivado/architecture/`](../_archivado/architecture/) | 4 planes históricos de refactor | Archivados en D2B |

### Carpetas pendientes de revisión

| Carpeta | Contenido | Notas |
|---------|-----------|-------|
| [`05-qa/`](../05-qa/) | 6 archivos de QA, checklists, runbooks | ✅ Renombrado en D3A |
| [`logic/`](../logic/) | 4 archivos de lógica de negocio (estados, máquinas) | Contenido estable |
| [`obsidian/`](../obsidian/) | 4 notas estilo Obsidian | Contenido estable |
| [`production/`](../production/) | 2 archivos de readiness y rate limiting | Contenido estable |
| [`cleanup/`](../cleanup/) | 1 archivo de candidatos legacy | Contenido estable |
| [`official/`](../official/) | 1 archivo de state machine oficial | Contenido estable |

> **Regla:** Las carpetas numeradas (`00-` a `04-`) son la estructura preferida. Las carpetas sin número son válidas pero estarán sujetas a consolidación futura.

---

## 🚀 Guías rápidas por dominio

| Dominio | Archivo | Qué contiene |
|---------|---------|-------------|
| Website | [website.md](../02-mapa-funcional/website.md) | Landing, páginas públicas, marketing |
| Auth/Seguridad | [auth-seguridad.md](../02-mapa-funcional/auth-seguridad.md) | Login, registro, MFA, RBAC |
| Panel Cliente | [panel-cliente.md](../02-mapa-funcional/panel-cliente.md) | Dashboard, fichas médicas, chips, órdenes |
| Ficha Médica | [ficha-medica.md](../02-mapa-funcional/ficha-medica.md) | Creación, validación, cifrado |
| Chips/QR/NFC | [chips-qr-nfc.md](../02-mapa-funcional/chips-qr-nfc.md) | Activación, escaneo, estados |
| Panel Admin | [panel-admin.md](../02-mapa-funcional/panel-admin.md) | Consola administrativa, operaciones |
| Pedidos/Pagos | [pedidos-pagos.md](../02-mapa-funcional/pedidos-pagos.md) | Tienda, checkout, Stripe |
| API/Backend | [api-backend.md](../02-mapa-funcional/api-backend.md) | Endpoints, handlers |
| Base de datos | [base-datos.md](../02-mapa-funcional/base-datos.md) | Prisma schema, modelos |
| Notificaciones | [notificaciones.md](../02-mapa-funcional/notificaciones.md) | Email, SMS, WhatsApp |

---

## 📄 Documentos importantes

| Documento | Ubicación | Descripción |
|-----------|-----------|-------------|
| Análisis del proyecto | [`03-auditorias/ANALISIS_PROYECTO.md`](../03-auditorias/ANALISIS_PROYECTO.md) | Análisis exhaustivo: stack, arquitectura, flujos, endpoints |
| Bitácora de cambios | [`04-operaciones/BITACORA.md`](../04-operaciones/BITACORA.md) | Registro cronológico de cambios por fase |
| Quick Reference | [`04-operaciones/QUICK_REFERENCE.md`](../04-operaciones/QUICK_REFERENCE.md) | Comandos, endpoints, cheatsheet de desarrollo |
| Cierre estabilización | [`04-operaciones/cierre-estabilizacion-produccion-2026-06-12.md`](../04-operaciones/cierre-estabilizacion-produccion-2026-06-12.md) | Reporte de cierre de fase de estabilización |
| Scripts | [`../../scripts/README.md`](../../scripts/README.md) | Documentación de scripts de mantenimiento |

---

## 🛠️ Operaciones

- [Variables de entorno](../04-operaciones/environment-variables.md)
- [Runbook de deploy](../04-operaciones/runbook-deploy.md)
- [Prisma baseline incident](../04-operaciones/prisma-baseline-incident-2026-05-27.md)
- [Reset total superadmin](../04-operaciones/reset-total-superadmin.md)

---

## 📊 Auditorías

- [Auditoría RBAC](../03-auditorias/auditoria-rbac.md)
- [Flujo corporativo chips](../03-auditorias/auditoria-flujo-corporativo-chips.md)
- [Matriz roles admin](../03-auditorias/roles-admin-section-matrix.md)
- [30+ auditorías previas](../03-auditorias/audit-previas/)
- [Historial de reorganización](../03-auditorias/estructura-repo/)

---

## 📋 Estado actual

- **Producción estabilizada** — cierre completado 2026-06-12
- **Scripts reorganizados y endurecidos** — fase de scripts cerrada
- **Migración safeReturn normalizada** — incidente resuelto
- **Docs raíz parcialmente limpiados** — 3 archivos movidos a `docs/`
- **Docs consolidados** — `docs/analysis/` y `docs/architecture/` eliminados; contenido movido a `02-mapa-funcional/`, `01-arquitectura/` y `_archivado/`

---

## ⏳ Pendientes

- [ ] Evaluar `INSTRUCTIONS.md` (permanecer en root o mover a `docs/`)
- [x] Consolidar `docs/analysis/` con `docs/02-mapa-funcional/`
- [x] Consolidar `docs/architecture/` con `docs/01-arquitectura/`
- [x] Revisar naming de `docs/qa/` → `docs/05-qa/`

---

*Última actualización: 2026-06-12 — Micro-fase D2B de consolidación de docs*