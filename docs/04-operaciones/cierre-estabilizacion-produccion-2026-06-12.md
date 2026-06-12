# Cierre de Estabilización de Producción — 2026-06-12

## 1. Resumen Ejecutivo

El 12 de junio de 2026 se detectaron múltiples errores en el entorno de producción de PreRescue ID. La plataforma presentaba fallos en la carga de imágenes (HTTP 400), APIs de perfiles médicos no disponibles y endpoints de organizaciones retornando 404. Tras una investigación sistemática, se identificaron y corrigieron cuatro incidentes distintos. Al cierre de la jornada, la totalidad de los endpoints críticos retornan HTTP 200, las imágenes se sirven correctamente y no se observan advertencias en los logs de Vercel.

## 2. Línea de Tiempo Técnica

| Hora (Panamá) | Evento |
|---|---|
| ~10:00 | Se reportan errores en producción. APIs principales retornan 500 / timeout. |
| ~10:15 | Se identifica que la migración `add_safe_return_location_fields` no fue aplicada por Prisma Migrate Deploy. |
| ~10:30 | Se aplica migración SQL manual contra DIRECT_URL. APIs de perfiles y account/state se recuperan. |
| ~10:47 | Se inicia diagnóstico de errores 400 en `/api/image-proxy` y `/_next/image`. |
| ~10:52 | Se crea helper `resolveImageSrc` y se corrigen 3 componentes UI. Commit `0d727b5`. |
| ~11:09 | Se endurece helper para manejar URLs relativas sin slash y absolutas. Commit `86686d6`. |
| ~11:28 | Se reescribe lógica para siempre parsear y normalizar, evitando anidamiento de proxy URLs. Commit `f46b7dd`. |
| ~11:44 | Se diagnostica 404 de `/api/organizations/members` para usuarios sin organización. |
| ~11:47 | Se aplica guardia frontal en `empresas/page.tsx`. Commit `68b5f03`. |
| ~11:46 | Se diagnostica advertencia de Upstash Redis por token con whitespace. Se limpia variable en Vercel. Sin cambio de código. |
| ~12:00 | Validación final: 159 requests, 158 HTTP 200, 1 HTTP 201, 0 errores. |

## 3. Incidentes Detectados

### Incidente A — Base de datos: columnas faltantes en tabla Profile
- **Síntoma:** `/api/account/state`, `/api/users/profile` y edición de perfiles médicos retornaban error 500.
- **Endpoint afectado:** `GET /api/account/state`, `GET /api/users/profile`, `GET /api/users/perfiles-medicos`.
- **Frecuencia:** ~100 % de solicitudes durante la ventana de incidente.

### Incidente B — Imágenes no cargaban (HTTP 400)
- **Síntoma:** `GET /api/image-proxy` y `GET //_next/image` retornaban 400.
- **Endpoint afectado:** `/api/image-proxy`, `/_next/image`.
- **Frecuencia:** Toda solicitud de imagen de perfil, producto o comprobante de pago.

### Incidente C — Endpoint de miembros de organización retornaba 404
- **Síntoma:** `GET /api/organizations/members?status=approved_unpaid` retornaba 404.
- **Endpoint afectado:** `/api/organizations/members`.
- **Frecuencia:** Cada carga de `/dashboard/empresas` para usuarios sin organización.

### Incidente D — Advertencia de Upstash Redis
- **Síntoma:** Log: `[Upstash Redis] The redis token contains whitespace or newline, which can cause errors!`.
- **Componente afectado:** Cliente Redis en `lib/redis.ts` y `lib/rateLimit.ts`.
- **Frecuencia:** En cada inicialización del cliente Redis.

## 4. Causa Raíz

| Incidente | Causa Raíz |
|---|---|
| A | La carpeta de migración `prisma/migrations/add_safe_return_location_fields/` carecía de timestamp válido, por lo que `prisma migrate deploy` la omitió durante el despliegue. |
| B | Los componentes UI asumían que las URLs de imagen almacenadas eran URLs directas de Supabase Storage. Sin embargo, `storage-utils.ts` guarda URLs relativas del proxy (`/api/image-proxy?...`). La extracción `.split('/').slice(-2).join('/')` corrompía estas URLs ya proxificadas. |
| C | La página `/dashboard/empresas` invocaba `/api/organizations/members` de forma incondicional. El endpoint retorna 404 cuando el `accountId` del usuario no tiene un registro `Organization` asociado. |
| D | La variable de entorno `UPSTASH_REDIS_REST_TOKEN` en Vercel contenía caracteres de whitespace o nueva línea al ser copiada desde el panel de Upstash. |

## 5. Correcciones Aplicadas

### Corrección A — Migración SQL manual
- **Archivos modificados:** Ninguno (solo base de datos).
- **Acción:** Ejecución de migración SQL aditiva directamente contra `DIRECT_URL` para crear las columnas faltantes `safeReturn*` en la tabla `Profile`.
- **Riesgo:** Bajo. Operación aditiva sobre columnas opcionales.

### Corrección B — Sistema de resolución de imágenes
- **Archivo creado:** `lib/resolve-image-src.ts`
- **Archivos modificados:**
  - `app/(app)/dashboard/configuracion/page.tsx`
  - `app/(app)/dashboard/tienda/page.tsx`
  - `app/(admin)/admin/_components/sections/PedidosSection.tsx`
- **Descripción:** Se creó un helper compartido que acepta URLs en 5 formatos distintos (proxy relativo, proxy sin slash, proxy absoluto, Supabase directa, relativa genérica) y las normaliza a `/api/image-proxy?bucket=X&path=Y` con `path` siempre codificado. Incluye un extractor recursivo (`extractInnermostPath`) que desanida proxy URLs accidentamente anidadas.

### Corrección C — Guardia frontal en empresas page
- **Archivo modificado:** `app/(app)/dashboard/empresas/page.tsx` (7 inserciones, 3 eliminaciones).
- **Descripción:** La llamada a `/api/organizations/members` ahora se realiza solo si `myJson.requests.length > 0`. Los usuarios sin organización ya no generan 404s.

### Corrección D — Limpieza de variable de entorno
- **Archivos modificados:** Ninguno.
- **Acción:** Se reingresó manualmente el token `UPSTASH_REDIS_REST_TOKEN` en el panel de Vercel, eliminando caracteres de whitespace. Se redeployó.

## 6. Commits Relacionados

| Hash | Mensaje | Archivos |
|---|---|---|
| `0d727b5` | `fix: support stored proxy image URLs` | 4 archivos (helper + 3 componentes) |
| `86686d6` | `fix: harden proxy image URL resolution` | 1 archivo (helper) |
| `f46b7dd` | `fix: normalize nested proxy image URLs` | 1 archivo (helper, reescritura completa) |
| `68b5f03` | `fix: guard org members call for non-org users` | 1 archivo (empresas page) |

## 7. Validación Final en Producción

Métrica obtenida de logs de Vercel posterior a los despliegues correctivos (ventana ~17:00 UTC):

| Métrica | Valor |
|---|---|
| Total solicitudes revisadas | 159 |
| HTTP 200 | 158 |
| HTTP 201 | 1 |
| HTTP 400 | 0 |
| HTTP 404 | 0 |
| HTTP 500 | 0 |

Endpoints verificados individualmente:

| Endpoint | Estado |
|---|---|
| `/api/account/state` | ✅ 200 |
| `/api/users/perfiles-medicos` | ✅ 200 |
| `/api/chips/dashboard` | ✅ 200 |
| `/api/orders` | ✅ 200 |
| `/api/upload` | ✅ 200 |
| `/api/image-proxy` | ✅ 200 |
| `/_next/image` | ✅ 200 |
| `/api/organizations/my-status` | ✅ 200 |
| Advertencia Upstash Redis | ✅ No observada |

## 8. Estado Final

| Componente | Estado |
|---|---|
| APIs de perfiles médicos | ✅ Saludable |
| Dashboard de cliente | ✅ Saludable |
| Imágenes de perfil, productos y comprobantes | ✅ Cargando correctamente |
| Módulo empresarial / organizaciones | ✅ Sin errores 404 para usuarios sin org |
| Redis / rate limiting | ✅ Sin advertencias |
| Compilación TypeScript | ✅ `tsc --noEmit` exitoso |
| Build de producción | ✅ `BUILD_EXIT:0` |
| Pruebas unitarias | ✅ 3 suites, 5 tests pasando |

## 9. Lecciones Aprendidas

1. **Prisma Migrate Deploy omitió una migración por falta de timestamp.** Las migraciones personalizadas deben seguir estrictamente la convención de nomenclatura `YYYYMMDDHHMMSS_descripcion`. Para migraciones ad-hoc, usar siempre `prisma migrate dev --create-only` en lugar de carpetas manuales.

2. **El patrón `.split('/').slice(-2).join('/')` es frágil.** Asume un formato de URL específico que puede cambiar. Toda extracción de rutas de imágenes debe centralizarse en un helper con manejo explícito de múltiples formatos.

3. **Las páginas que consumen APIs condicionales deben validar precondiciones.** Llamar a endpoints que requieren un contexto específico (como organización) sin verificar primero si ese contexto existe genera falsos positivos en monitoreo.

4. **Las variables de entorno en Vercel pueden contener whitespace invisible.** Al copiar tokens desde paneles de terceros, es recomendable verificar que no incluyan saltos de línea o espacios. El cliente de Upstash Redis advierte sobre esto, pero no falla. Una validación adicional con `.trim()` en el código podría prevenir el warning, aunque no es recomendable mutar tokens de seguridad.

5. **La validación en producción posterior al fix es obligatoria.** Los logs de Vercel mostraron que el primer fix de imágenes (commit `0d727b5`) redujo pero no eliminó los 400s. Solo la reescritura completa del helper (commit `f46b7dd`) logró cero errores.

## 10. Pendientes Posteriores No Críticos

- [ ] Evaluar si `PaymentProofUrl` en órdenes existentes contiene URLs directas de Supabase o URLs proxificadas. Si hay mezcla, podría generar errores intermitentes al visualizar comprobantes antiguos.
- [ ] Agregar prueba unitaria para `resolveImageSrc` cubriendo los 5 formatos de entrada documentados.
- [ ] Considerar agregar `.trim()` defensivo al leer `UPSTASH_REDIS_REST_TOKEN` en `lib/redis.ts` para prevenir el warning incluso si la variable de entorno contiene whitespace.
- [ ] Revisar si existen otros componentes UI que construyan URLs de imágenes manualmente sin pasar por `resolveImageSrc`.
- [ ] Evaluar si el endpoint `GET /api/organizations/members` debería retornar 200 con `{ members: [] }` en lugar de 404 cuando no existe organización, para simplificar el manejo en el frontend.