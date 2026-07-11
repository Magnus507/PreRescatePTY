import { Prisma } from "@prisma/client";

type SequentialCodeModel = "commercialOrder" | "productionOrder";

type SequentialCodeConfig = {
  tx: Prisma.TransactionClient;
  model: SequentialCodeModel;
  prefix: string;
  digits?: number;
  maxAttempts?: number;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function generateSequentialCode({
  tx,
  model,
  prefix,
  digits = 4,
  maxAttempts = 5,
}: SequentialCodeConfig) {
  const pattern = new RegExp(`^${escapeRegExp(prefix)}-(\\d+)$`);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const existingCodes =
      model === "commercialOrder"
        ? await tx.operationCommercialOrder.findMany({
            where: {
              code: {
                startsWith: `${prefix}-`,
              },
            },
            select: { code: true },
          })
        : await tx.operationProductionOrder.findMany({
            where: {
              code: {
                startsWith: `${prefix}-`,
              },
            },
            select: { code: true },
          });

    let maxSequence = 0;
    for (const row of existingCodes) {
      const match = pattern.exec(row.code);
      if (!match) continue;
      const sequence = Number.parseInt(match[1], 10);
      if (Number.isFinite(sequence)) {
        maxSequence = Math.max(maxSequence, sequence);
      }
    }

    const nextCode = `${prefix}-${String(maxSequence + 1).padStart(digits, "0")}`;
    const exists =
      model === "commercialOrder"
        ? await tx.operationCommercialOrder.findUnique({
            where: { code: nextCode },
            select: { id: true },
          })
        : await tx.operationProductionOrder.findUnique({
            where: { code: nextCode },
            select: { id: true },
          });

    if (!exists) {
      return nextCode;
    }

    await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)));
  }

  throw new Error(`CODE_COLLISION:${prefix}`);
}
