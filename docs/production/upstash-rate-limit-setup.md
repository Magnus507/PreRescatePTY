# Upstash Rate Limit Setup (Producción)

Este documento asegura que el login y demás endpoints con rate limiting funcionen correctamente en producción con la política actual (fail-closed cuando falta backend distribuido).

---

## 1) Variables requeridas

Configurar en entorno de despliegue:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Sin estas variables, en `NODE_ENV=production` el rate limiter entra en modo fail-closed.

---

## 2) Crear Redis en Upstash

1. Ir a: https://console.upstash.com/
2. Crear cuenta/iniciar sesión.
3. Crear una base Redis (REST API habilitada por defecto en Upstash Redis).
4. Copiar desde el panel de la DB:
   - **REST URL**
   - **REST TOKEN**

---

## 3) Configurar variables en Vercel

1. Ir a Vercel → Proyecto `PreRescatePTY`.
2. Abrir **Settings → Environment Variables**.
3. Agregar:
   - `UPSTASH_REDIS_REST_URL` = valor REST URL
   - `UPSTASH_REDIS_REST_TOKEN` = valor REST TOKEN
4. Aplicar variables en los ambientes requeridos:
   - Preview
   - Production

---

## 4) Redeploy requerido

Después de guardar variables, realizar redeploy para que el runtime cargue la nueva configuración.

- En Vercel: **Redeploy** del último deployment (o nuevo push).

---

## 5) Cómo validar login después del setup

1. Abrir `/login` en el deployment actualizado.
2. Intentar login con credenciales válidas.
3. Confirmar:
   - autenticación exitosa y redirección normal.
   - que ya no aparezca el mensaje:
     - `Servicio temporalmente no disponible. Intente nuevamente en unos minutos.`

### Validación técnica esperada

Con variables presentes:

- `lib/rateLimit.ts` inicializa `redis = new Redis(...)`.
- `rateLimit("login", ...)` usa Redis y **no** devuelve `errorCode: RATE_LIMIT_BACKEND_UNAVAILABLE` salvo caída real de Upstash.

---

## 6) Notas operativas

- En producción, el sistema mantiene fail-closed para endpoints protegidos si Upstash no está disponible.
- Para evitar impacto en autenticación, mantener monitoreo básico de disponibilidad de Upstash y credenciales vigentes.
