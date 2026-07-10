# W6.05A - Auditoría Read-Only del Panel Cliente y Flujos de Perfil / Chip / Tienda

## Estado actual del panel

El panel cliente actual funciona como un centro híbrido de cuenta, protección, perfiles, chips, tienda y pedidos.

### Lo que muestra hoy

- estado de la cuenta
- chips activos y límite total
- acceso rápido para activar un chip
- bloque para perfiles médicos
- tarjeta de upsell para comprar chips extra
- acceso a tienda
- acceso a pedidos
- acceso a empresa cuando aplica

### Lo que consume

- `/api/account/state`
- `/api/users/perfiles-medicos`
- `/api/chips/dashboard`
- `/api/chips/activate`
- `/api/orders`
- `/api/public/config`
- `/api/public/[shortCode]`

## Hallazgos visuales

- La jerarquía mezcla protección clínica, dispositivos y tienda en la misma superficie.
- El CTA de activar chip compite visualmente con el CTA de comprar chips.
- El vocabulario cambia entre chip, sticker, dispositivo y acceso público.
- La home del dashboard incluye resumen, upsell y acceso a perfiles en una sola vista.
- La navegación móvil comprime demasiadas rutas en un menú secundario.

## Rutas y componentes detectados

### Rutas principales

- `app/(app)/dashboard/page.tsx`
- `app/(app)/dashboard/layout.tsx`
- `app/(app)/dashboard/perfiles-medicos/page.tsx`
- `app/(app)/dashboard/chips/page.tsx`
- `app/(app)/dashboard/tienda/page.tsx`
- `app/(app)/dashboard/pedidos/page.tsx`
- `app/(app)/dashboard/compras/page.tsx`
- `app/(app)/dashboard/empresas/page.tsx`

### Componentes relevantes

- `components/forms/MedicalProfileForm.tsx`
- `components/orders/OrderStatusBadge.tsx`
- `components/enterprise/collaborators/CollaboratorDrawer.tsx`
- `components/enterprise/collaborators/CollaboratorKitTab.tsx`
- `components/enterprise/collaborators/CollaboratorActionCenter.tsx`
- `components/enterprise/orders/EnterpriseOrdersSection.tsx`
- `components/public/MobileStickyCTA.tsx`

## Problemas de UX detectados

- `Activar nuevo chip` y `Chips Extra` parecen dos formas de comprar o activar lo mismo.
- `Mis Dispositivos` usa chip, sticker y código como sinónimos parciales.
- `Mis Pedidos` aparece como salida natural de tienda, pero no como bloque de cuenta bien diferenciado.
- `Gestionar Perfil` y `Gestionar Perfiles` dependen del contexto del usuario y pueden confundir.
- El acceso a la ficha pública está presente, pero no está posicionado como un resultado central del panel.
- Los estados vacíos todavía empujan al usuario hacia compra/activación sin una vista resumen previa.

## Relación con W6.10

- W6.10 dejó estable la ficha pública y el formulario médico.
- El panel cliente todavía no organiza esos módulos como una experiencia unificada.
- Hoy la relación perfil/chip existe, pero está distribuida entre tarjetas, listas y enlaces rápidos.
- La auditoría confirma que la base médica ya está persistida y visible, pero el panel todavía no la presenta como un hub claro.

## Relación con W6.04

- El acceso público sigue dependiendo de `Chip.shortCode` activo y asignado.
- `Profile` no es entrada pública directa.
- `DigitalPass` no abre por sí solo.
- El contexto corporativo no sustituye la ficha pública normal.

## Relación con W6.03

- La tienda usa secciones agrupadas por catálogo.
- El precio de chips extra se toma de la regla de negocio (`BUSINESS_RULES.EXTRA_CHIP_PRICE`), no de un valor suelto.
- Tienda y pedidos están enlazados, pero UX todavía los siente como pasos distintos de un mismo proceso de compra.

## Qué no se debe tocar en esta fase

- schema
- migraciones
- base de datos por script
- pedidos
- productos e inventario
- activación y chips
- empresarial
- mascotas
- `KLFUFPK8`

## Recomendación para W6.05B

Diseñar el panel cliente antes de implementar:

1. Inicio / resumen
2. Mis perfiles médicos
3. Mis dispositivos
4. Activar chip
5. Tienda
6. Mis pedidos
7. Empresa, si aplica
8. Estado de ficha pública
9. Próximos módulos: mascotas, empresarial y personalizados

## Nota final

W6.05A es una auditoría read-only. No cambió el comportamiento del panel, la base de datos ni la seguridad pública.
