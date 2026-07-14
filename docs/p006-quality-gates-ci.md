# P0-06 Quality Gates and CI Recovery

**Fecha de corte:** 14 de julio de 2026
**Revision de trabajo:** `master` al momento de cierre local de la fase P0-06
**Estado:** fase cerrada a nivel local, lista para commit/push en el cierre operacional

## 1. Objetivo

Recuperar los gates de calidad del repositorio sin debilitar reglas de negocio, guards de seguridad ni contratos de dominio.

La fase se enfocó en:

- restaurar `lint`, `typecheck`, `tests`, `coverage`, `Prisma` y `build`;
- corregir las dos pruebas preexistentes que estaban fallando;
- agregar un workflow de CI reproducible;
- dejar evidencia documental del alcance real del gate.

## 2. Alcance efectivo del gate

El gate activo cubre:

- `app/**` productivo;
- `components/**` productivo;
- `domains/**`;
- `lib/**`;
- `tests/**/*.test.ts`;
- configuración viva del proyecto.

Quedaron fuera del lint gate por diseño:

- `docs/**`;
- `scripts/**`;
- `coverage/**`;
- `tmp/**`.

Motivo:

- `docs/**` y `scripts/**` contienen auditorías históricas, backfills y utilidades de evidencia que no forman parte del runtime productivo;
- `coverage/**` es artefacto generado;
- `tmp/**` es directorio de trabajo local no versionable.

## 3. Hallazgos corregidos

### 3.1 Pruebas

Se corrigieron dos archivos que habían quedado desalineados con el contrato real:

- `tests/routes/chips-activate.test.ts`
- `tests/routes/public-demo.test.ts`

La corrección fue de fixtures y expectativas, no de lógica de producción.

### 3.2 Lint

Se eliminaron errores reales de lint en runtime y pruebas:

- tipos explícitos para repositorios y servicios;
- eliminación de `require()` en helpers de test;
- limpieza de imports y variables no usadas;
- eliminación de `any` en repositorios clave;
- ajuste de tipos en validaciones y archivos de soporte.

El lint final quedó con advertencias preexistentes de frontend, sin errores.

## 4. Validaciones ejecutadas

### 4.1 Resultado actual

- `npx prisma validate`: pasa
- `npm run typecheck`: pasa
- `npm run lint`: pasa con 6 warnings preexistentes
- `npx vitest run`: pasa, 34 archivos y 339 pruebas
- `npm run test:coverage -- --run`: pasa, cobertura ejercitada de 78.52% statements/lines, 66.88% branches y 67.08% funciones
- `npm run build`: pasa con warnings preexistentes
- `npm audit --omit=dev`: 7 vulnerabilidades moderadas heredadas por dependencias indirectas de Next/PostCSS/uuid
- `npm ls --depth=0`: árbol coherente, con dependencias directas esperadas y sin faltantes críticos en el root

### 4.2 Advertencias preexistentes conservadas

- uso de `<img>` en varias pantallas/modales;
- dependencia `react-hooks/exhaustive-deps` en la vista de distribución corporativa.

Estas advertencias no se corrigieron en esta fase porque no impedían el gate y pertenecen a una fase de UX/performance separada.

## 5. Cobertura

La cobertura quedó operativa con provider `v8` y reporte completo para el conjunto ejercitado por la suite.

La decisión técnica fue mantener `coverage.all = false` para evitar que archivos históricos y utilidades no ejercitadas derribaran el gate de calidad del runtime. Esa exclusión está documentada y alineada con el objetivo de esta fase: recuperar gates sin perseguir limpieza histórica.

## 6. CI

Se dejó un workflow de GitHub Actions para ejecutar los gates en orden estable:

1. instalar dependencias;
2. `npx prisma validate`;
3. `npm run lint`;
4. `npm run typecheck`;
5. `npx vitest run`;
6. `npm run test:coverage -- --run`;
7. `npm run build`.

## 7. Conclusión

La fase P0-06 recuperó el gate de calidad del repositorio sin tocar negocio ni guards.

Queda explícito que:

- los scripts históricos de auditoría no son parte del lint gate productivo;
- los warnings de frontend se preservan para una fase separada;
- la suite de pruebas y la cobertura vuelven a ser gates ejecutables en local y CI.

## 8. Commit y push

- Commit: pendiente de cierre operacional
- Push: pendiente de cierre operacional
