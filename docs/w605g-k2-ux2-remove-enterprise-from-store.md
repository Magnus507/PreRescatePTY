# W6.05G-K2-UX2 Remove Enterprise Products from Store

## Resumen ejecutivo

Se limpió `/dashboard/tienda` para que el catálogo quede enfocado solo en productos personales comprables. Los productos empresariales ya no aparecen como cards de compra dentro de la tienda y fueron reemplazados por una franja informativa simple que envía al módulo Empresa.

## Problema detectado

- La tienda ya se veía como catálogo personal escalable.
- Aun así, los productos empresariales seguían apareciendo dentro del catálogo.
- Eso mezclaba compra personal con flujo empresarial separado.
- El CTA empresarial seguía sintiéndose como producto de tienda, aunque no abría checkout personal.

## Decisión de producto

- La tienda cliente muestra solo productos personales comprables.
- Los productos empresariales se gestionan desde el módulo Empresa.
- Tienda no debe iniciar selección de producto empresarial.

## Qué se cambió

### Catálogo personal

- Se mantuvieron únicamente los productos personales en el grid principal.
- Se conserva selector de cantidad, precio unitario, stock y total por producto.
- El checkout personal sigue funcionando solo cuando hay un producto personal seleccionado.

### Bloque empresarial

- Se eliminó la renderización de cards empresariales dentro del catálogo.
- Se reemplazó por una franja informativa simple:
  - título: `Compras para empresa`
  - copy: `Gestiona pedidos empresariales desde Empresa.`
  - botón: `Ir a Empresa`
- Ruta usada:
  - `/dashboard/empresas`

### Comportamiento

- No se selecciona ningún producto empresarial desde Tienda.
- No aparece formulario personal por tocar empresa.
- No se muestra precio empresarial ni stock empresarial dentro del catálogo personal.

## Cómo se filtran productos

La separación sigue usando la metadata operativa ya existente:

- `storeSection`
- `deviceType`
- `purchaseFlow`
- `requiresCompanyContext`

La lógica considera empresariales los productos cuya configuración apunta a:

- `business_devices`
- `business`
- `company_request`
- `requiresCompanyContext = true`

## Qué no se tocó

- no se modificó `schema.prisma`;
- no se hicieron migraciones;
- no se tocó la BD;
- no se modificó el payload;
- no se tocó backend;
- no se tocaron endpoints;
- no se tocó pagos/comprobante;
- no se tocó `Mis pedidos`;
- no se tocó `/dashboard/compras`;
- no se creó ningún pedido real;
- no se creó stock;
- no se activaron chips;
- no se tocaron reservas ni despachos.

## Pendientes K3

- Si hace falta, K3 puede reforzar la segmentación del catálogo desde backend o metadata canónica.
- Esta fase no cambia contrato ni backend; solo limpia la UX.

## Skills usadas

- `prerescate-rules`
- `verification-loop`
- `frontend-patterns`
- `coding-standards`

## Validaciones

- `git status --short`
- `git diff`
- `git diff --check`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`

## Conclusión

La tienda volvió a un foco claro: catálogo personal arriba y empresa fuera del catálogo de compra. La navegación a Empresa queda explícita sin mezclar flujos ni disparar checkout personal.
