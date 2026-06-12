# Estructura propuesta del repositorio

## Objetivo
Una estructura clara donde cada persona o IA pueda entender rápido dónde está cada cosa.

## Estructura target
```
docs/
  00-indice/
    README.md                    <- Índice maestro
    quickstart.md                <- Guía rápida de inicio
  
  01-arquitectura/
    estructura-actual.md         <- Este documento
    estructura-propuesta.md      <- Este documento
    boot-flow.md                 <- Cómo arranca el sistema
  
  02-mapa-funcional/
    website.md                   <- Mapa website público
    auth-seguridad.md            <- Mapa auth/RBAC
    panel-cliente.md             <- Mapa dashboard cliente
    ficha-medica.md              <- Mapa fichas médicas
    chips-qr-nfc.md              <- Mapa chips/emergencia
    pedidos-pagos.md             <- Mapa tienda/ordenes
    panel-admin.md               <- Mapa admin console
    api-backend.md               <- Mapa endpoints
    base-datos.md                <- Mapa Prisma
    notificaciones.md            <- Mapa notificaciones
  
  03-auditorias/
    estructura-repo/             <- Esta auditoría
      auditoria-estructura-repositorio.md
      plan-reorganizacion-segura.md
      archivos-raiz-a-mover.md
      archivos-no-tocar.md
      resumen-ejecutivo.md
    seguridad/
    base-datos/
    codigo-muerto/
  
  04-operaciones/
    runbooks.md                  <- Deploy, backup, secrets
    incidents.md                 <- Plantilla incidentes
    cron-jobs.md                 <- Cron Vercel
  
  05-seguridad/
    auth-flows.md                <- Flujos de auth
    data-protection.md           <- Datos médicos/cifrado
    rbac-matrix.md               <- Matriz de roles
  
  06-producto/
    glossary.md                  <- Glosario de negocio
    decisions.md                 <- ADRs
  
  07-tests/
    strategy.md                  <- Estrategia de testing
    missing.md                   <- Tests faltantes
  
  08-bitacoras/
    daily.md                     <- Registro diario
    planning.md                  <- Planes futuros
  
  09-recursos/
    images/                      <- Assets documentales
    tools/                       <- Scripts/documentación
  
  10-pendientes/
    tech-debt.md                 <- Deuda técnica
    improvements.md              <- Mejoras pendientes
```

## Regla de oro
- Cada dominio funcional → archivo en `02-mapa-funcional/`
- Cada auditoría → subcarpeta en `03-auditorias/`
- Cada operación → archivo en `04-operaciones/`
- Nada en raíz (solo configs obligatorios)

*Generado a partir de task t_c51d84c7*