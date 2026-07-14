# P0-05 - Corrección del formulario público de contacto

**Fecha:** 14 de julio de 2026  
**Alcance:** corrección puntual del formulario público `/contacto` y su contrato con `POST /api/contacts/public`  
**Estado:** cerrado localmente, pendiente de commit y push

## 1. Resumen

La fase P0-05 corrige el formulario público de contacto para que deje de llamar la ruta obsoleta `/api/contacts/publics/public` y utilice el endpoint activo `/api/contacts/public`.

El cambio es intencionalmente pequeño:

- se corrige el path del `fetch`;
- se mantiene la validación y el envío del backend;
- se agrega una barrera simple contra doble envío;
- se documenta el contrato y la regresión;
- se añaden pruebas del endpoint y del contrato del componente.

No se modificaron schema, migraciones, Stripe, alertas, reserva, producción, despacho, activación, tienda, dashboard, design system, autenticación, permisos ni dependencias.

## 2. Problema original

El formulario público apuntaba a una URL inexistente:

- frontend: `/api/contacts/publics/public`
- backend real: `/api/contacts/public`

Ese desajuste provocaba 404 en el envío y rompía el flujo de soporte público.

## 3. Archivos tocados

- `app/(public)/contacto/ContactoContent.tsx`
- `tests/routes/contact-public.test.ts`
- `tests/routes/contact-public-contract.test.ts`
- `docs/p005-public-contact-form-fix.md`

## 4. Comportamiento confirmado

- el formulario usa ahora `/api/contacts/public`;
- el botón queda deshabilitado mientras el envío está en progreso;
- el handler bloquea reentradas simples con una bandera local;
- la respuesta exitosa sigue devolviendo `success: true` y un mensaje de confirmación;
- los errores del proveedor o del runtime se convierten en un error genérico;
- el rate limit sigue activo;
- la validación de nombre, email y mensaje permanece en la ruta;
- no se exponen detalles internos al cliente.

## 5. Validaciones esperadas

Se deben ejecutar y conservar los resultados de:

- `git diff`
- `git diff --check`
- `git status --short`
- `npx prisma validate`
- `npm run typecheck`
- `npm run lint`
- `npx vitest run`
- `npm run build`
- tests focalizados del formulario y del endpoint

## 6. Pruebas agregadas

- caso feliz con envío válido y correo sanitizado;
- rechazo por campos obligatorios faltantes;
- rechazo por email inválido;
- error genérico cuando falla el proveedor;
- rechazo por rate limit;
- contrato fuente del componente, asegurando que ya no referencia la ruta vieja.

## 7. Riesgos y límites

- no se agregó un refactor general del flujo de contacto;
- no se cambió el esquema de persistencia;
- no se incorporó una nueva plataforma de mensajería;
- la validación de anti-spam sigue dependiendo de la rate limit existente;
- las pruebas de contrato del frontend son ligeras y complementan, no reemplazan, una prueba browser E2E.

## 8. Conclusión

La regresión 404 del formulario público de contacto queda cerrada cuando el frontend y la API usan el mismo contrato y el envío válido funciona de punta a punta.

El cambio es acotado, documentado y verificable.

