#!/usr/bin/env npx tsx
/**
 * ============================================================
 * BASE REAL DE PRODUCTOS TERMINADOS — PRE RESCATE PTY
 * ============================================================
 *
 * Crea/actualiza solo los productos terminados base del flujo operativo.
 * No crea stock inicial, no crea eventos y no borra datos.
 *
 * Requiere:
 *   CONFIRM_SEED_BASE_FINISHED_GOODS=YES_SEED_BASE_FINISHED_GOODS
 * ============================================================
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type FinishedGoodSeed = {
  code: string;
  name: string;
  productType: string;
  unit: string;
  notes: string;
  status: string;
};

const FINISHED_GOODS: FinishedGoodSeed[] = [
  {
    code: "PRP-FG-STICKER",
    name: "Sticker PreRescatePTY",
    productType: "sticker_prerescatepty",
    unit: "unidad",
    notes: "Producto terminado base normal. Venta, despacho y activacion siguen siendo etapas separadas.",
    status: "active",
  },
  {
    code: "PRP-FG-STICKER-EMP",
    name: "Sticker PreRescatePTY Empresarial",
    productType: "sticker_prerescatepty_empresarial",
    unit: "unidad",
    notes: "Producto terminado base empresarial. Requiere reglas operativas empresariales antes de activacion.",
    status: "active",
  },
];

function requireConfirmation(): void {
  const confirm = process.env.CONFIRM_SEED_BASE_FINISHED_GOODS?.trim();
  if (confirm !== "YES_SEED_BASE_FINISHED_GOODS") {
    console.error("");
    console.error("❌ CONFIRMACIÓN REQUERIDA");
    console.error("   Ejecute con:");
    console.error("   CONFIRM_SEED_BASE_FINISHED_GOODS=YES_SEED_BASE_FINISHED_GOODS npx tsx scripts/seed-operations-base-finished-goods.ts");
    console.error("");
    process.exit(1);
  }
}

async function main(): Promise<void> {
  requireConfirmation();

  let created = 0;
  let updated = 0;
  let existing = 0;

  for (const finishedGood of FINISHED_GOODS) {
    const current = await prisma.operationFinishedGood.findUnique({
      where: { code: finishedGood.code },
      select: {
        id: true,
        name: true,
        productType: true,
        unit: true,
        notes: true,
        status: true,
      },
    });

    if (!current) {
      await prisma.operationFinishedGood.create({
        data: finishedGood,
      });
      created += 1;
      console.log(`✅ ${finishedGood.code} creado`);
      continue;
    }

    const needsUpdate =
      current.name !== finishedGood.name ||
      current.productType !== finishedGood.productType ||
      current.unit !== finishedGood.unit ||
      (current.notes || "") !== finishedGood.notes ||
      current.status !== finishedGood.status;

    if (needsUpdate) {
      await prisma.operationFinishedGood.update({
        where: { code: finishedGood.code },
        data: {
          name: finishedGood.name,
          productType: finishedGood.productType,
          unit: finishedGood.unit,
          notes: finishedGood.notes,
          status: finishedGood.status,
        },
      });
      updated += 1;
      console.log(`🔄 ${finishedGood.code} actualizado`);
      continue;
    }

    existing += 1;
    console.log(`↩️  ${finishedGood.code} ya existia`);
  }

  console.log("");
  console.log("Resumen de productos terminados base:");
  console.log(`- Creados: ${created}`);
  console.log(`- Actualizados: ${updated}`);
  console.log(`- Existentes: ${existing}`);
}

main()
  .catch((error) => {
    console.error("❌ Error durante seed de productos terminados base:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
