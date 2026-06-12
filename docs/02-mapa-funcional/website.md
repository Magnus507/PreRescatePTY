# Website - PreRescatePTY

## Descripción funcional
Website público y páginas de marketing. Es la cara visible del producto con información, ventas y captura de leads.

## Rutas relacionadas
- `/` - Landing page principal
- `/comprar` - Página de compra
- `/como-funciona` - Explicación del producto
- `/faq` - Preguntas frecuentes
- `/contacto` - Formulario de contacto
- `/login`, `/registro` - Autenticación pública
- `/activar` - Activación de chips
- `/terminos`, `/privacidad` - Legal

## Componentes relacionados
- `components/home/*` - Secciones de la landing
- `components/Navbar.tsx` - Navegación principal
- `components/Footer.tsx` - Footer del sitio
- `components/landing/*` - Componentes de marketing
- `components/forms/*` - Formularios públicos

## APIs relacionadas
- `app/api/public/[shortCode]/route.ts` - Perfil público por QR/NFC
- `app/api/public/[shortCode]/scan/route.ts` - Registro de escaneos

## Servicios/helpers
- `lib/validations.ts` - Validaciones Zod
- `lib/encryption.ts` - Cifrado de datos médicos

## Modelos Prisma relacionados
- `Product` - Productos en la tienda
- `Order`, `OrderItem` - Órdenes desde el website
- `Chip`, `Profile` - Para escaneo público

## Variables de entorno
- `NEXT_PUBLIC_SUPABASE_URL` - Storage para imágenes
- `NEXT_PUBLIC_SITE_URL` - URL del sitio

## Tests existentes
Ninguno específico para website.

## Tests faltantes recomendados
- Tests de render de landing
- Tests de formularios públicos
- Tests de escaneo público (cifrado/desglose)

## Riesgos detectados
- `public/logo.jpeg` - posible optimización
- Docs duplicadas en raíz (.md)

## Pendientes
- Optimizar imágenes en `public/`
- Unificar documentación dispersa