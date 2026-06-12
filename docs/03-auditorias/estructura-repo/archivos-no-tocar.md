# Archivos/carpetas que no tocar

## Configuraciones obligatorias (Next.js, Prisma, Vercel)
| Archivo | Razón |
|---------|-------|
| `package.json` | Scripts de build, Vercel, Next.js |
| `next.config.ts` | CSP, redirects, headers de seguridad |
| `tsconfig.json` | Paths y strict mode |
| `tailwind.config.ts` | Theme y JIT |
| `components.json` | shadcn config |
| `vercel.json` | Cron jobs y deploy |
| `prisma/schema.prisma` | Source of truth DB |
| `.env`, `.env.local`, `.env.example` | Secrets y vars de entorno |
| `middleware.ts` | Auth/RBAC de rutas |

## Rutas Next.js críticas
| Ruta | Razón |
|------|-------|
| `app/(app)/**/` | Dashboard cliente con auth |
| `app/(admin)/**/` | Admin console |
| `app/(public)/**/` | Sitio público/QR |
| `app/api/**/route.ts` | 78 handlers HTTP |

## Archivos referenciados en código
| Archivo | Referencias |
|---------|-------------|
| `app/globals.css` | next.config.ts, tailwind.config.ts, components.json (aunque apunta mal a src/app) |

## Código en desarrollo activo
- Cualquier archivo modificado o con branch activo
- Todo bajo `app/(admin)/admin/` (hay otro agente trabajando)

## Scripts de build/deploy
- `scripts/build.sh`
- `scripts/deploy-*.sh`
- Cualquier script en `package.json`

*Generado a partir de task t_c51d84c7*