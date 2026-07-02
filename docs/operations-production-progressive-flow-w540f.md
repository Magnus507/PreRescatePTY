# W5.40F - Produccion por etapas progresivas

## Objetivo

Evitar que la pantalla de Produccion muestre todas las fases del flujo al mismo tiempo y mostrar los datos digitales completos por unidad.

## Cambio aplicado

- La pantalla de Produccion ahora es progresiva por etapa.
- La preparacion digital se mantiene visible hasta que todos los items esten listos.
- La etapa de imprenta solo aparece cuando la preparacion digital esta completa.
- Ensamblaje fisico solo aparece despues de imprenta recibida.
- QC solo aparece cuando la produccion ya paso por ensamblaje o ya tiene resultados de QC.
- El resultado final solo aparece cuando hay unidades con QC pasado o fallado.
- Cada item digital muestra:
  - `internalLabel`
  - `shortCode`
  - `activationUrl`
  - `qrUrl`
  - `nfcUrl`
  - estados NFC / QR
  - acciones de copia
  - acciones de marcacion operativa

## Alcance excluido

- No se uso `prisma db push`.
- No se uso `prisma migrate reset`.
- No se tocaron migraciones historicas.
- No se toco checkout legacy.
- No se tocaron `Order` / `Product` legacy.
- No se reescribio activacion legacy.
- No se asigno usuario final.
- No se activo desde operaciones.
- No se creo despacho.

