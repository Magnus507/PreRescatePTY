WITH ranked AS (
  SELECT
    "id",
    (ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, "id" ASC) - 1) * 10 AS "displayOrder"
  FROM "Drop"
)
UPDATE "Drop" AS d
SET "displayOrder" = ranked."displayOrder"
FROM ranked
WHERE d."id" = ranked."id";
