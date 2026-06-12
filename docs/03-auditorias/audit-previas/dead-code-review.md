# Dead Code Review (preliminary)

Se listan archivos que parecen temporales, no referenciados o sospechosos. No borrar automáticamente — revisar antes de eliminar.

- tmp-db-inspect.js
  - Motivo: script de inspección ad-hoc.
  - Referencias encontradas: ninguna por búsqueda rápida.
  - Recomendación: mover a `scripts/` con README o eliminar si redundante.

- tmp-db-check.ts
  - Motivo: comprobación ad-hoc de DB.
  - Referencias: ninguna.
  - Recomendación: archivar en `scripts/` o eliminar.

- tmp-db-check2.ts
  - Motivo: variante de comprobación.
  - Referencias: ninguna.
  - Recomendación: consolidar en `scripts/` o eliminar.

Notas:
- Antes de eliminar, ejecutar `git grep <filename>` y revisar historial de commits.
- Si alguno es necesario para operaciones ad-hoc, mover a `scripts/` con encabezado explicativo.


---
*Originalmente en: docs/audit/*