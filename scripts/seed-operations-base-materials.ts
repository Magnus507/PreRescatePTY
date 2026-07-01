#!/usr/bin/env npx tsx
/**
 * ============================================================
 * BASE REAL DE MATERIALES — PRE RESCATE PTY
 * ============================================================
 *
 * Crea/actualiza únicamente materiales base del flujo operativo.
 * No crea stock, no crea movimientos, no borra datos.
 *
 * Requiere:
 *   CONFIRM_SEED_BASE_MATERIALS=YES_SEED_BASE_MATERIALS
 * ============================================================
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type MaterialSeed = {
  code: string;
  name: string;
  category: string;
  unit: string;
  description: string;
  supplierName: string;
  notes: string;
  status: string;
};

const MATERIALS: MaterialSeed[] = [
  {
    code: "PRP-MAT-NFC-BLANK",
    name: "NFC chip en blanco",
    category: "componente_nfc",
    unit: "unidad",
    description: "Chip NFC en blanco para programacion operativa posterior.",
    supplierName: "Amazon",
    notes: "Base real de materiales del flujo operativo.",
    status: "active",
  },
  {
    code: "PRP-MAT-STICKER-BLANK",
    name: "Sticker en blanco",
    category: "impresion",
    unit: "unidad",
    description: "Sticker en blanco que luego recibe arte y QR mediante imprenta.",
    supplierName: "PanamaSticker",
    notes: "El QR no es un material separado.",
    status: "active",
  },
  {
    code: "PRP-MAT-ACTIVATION-CARD",
    name: "Tarjeta con código de activación / presentación",
    category: "presentacion",
    unit: "unidad",
    description: "Tarjeta de activacion y presentacion para el paquete final.",
    supplierName: "Imprenta por definir",
    notes: "Se usa en la entrega final al cliente o empresa.",
    status: "active",
  },
  {
    code: "PRP-MAT-PACKAGING",
    name: "Empaque / presentación",
    category: "empaque",
    unit: "unidad",
    description: "Empaque final del producto terminado.",
    supplierName: "Imprenta por definir",
    notes: "No incluye stock inicial ni movimientos.",
    status: "active",
  },
];

function requireConfirmation(): void {
  const confirm = process.env.CONFIRM_SEED_BASE_MATERIALS?.trim();
  if (confirm !== "YES_SEED_BASE_MATERIALS") {
    console.error("");
    console.error("❌ CONFIRMACIÓN REQUERIDA");
    console.error("   Ejecute con:");
    console.error("   CONFIRM_SEED_BASE_MATERIALS=YES_SEED_BASE_MATERIALS npx tsx scripts/seed-operations-base-materials.ts");
    console.error("");
    process.exit(1);
  }
}

async function main(): Promise<void> {
  requireConfirmation();

  let created = 0;
  let updated = 0;
  let existing = 0;

  for (const material of MATERIALS) {
    const current = await prisma.operationMaterial.findUnique({
      where: { code: material.code },
      select: {
        id: true,
        name: true,
        category: true,
        unit: true,
        description: true,
        supplierName: true,
        notes: true,
        status: true,
      },
    });

    if (!current) {
      await prisma.operationMaterial.create({
        data: material,
      });
      created += 1;
      console.log(`✅ ${material.code} creado`);
      continue;
    }

    const needsUpdate =
      current.name !== material.name ||
      current.category !== material.category ||
      current.unit !== material.unit ||
      (current.description || "") !== material.description ||
      (current.supplierName || "") !== material.supplierName ||
      (current.notes || "") !== material.notes ||
      current.status !== material.status;

    if (needsUpdate) {
      await prisma.operationMaterial.update({
        where: { code: material.code },
        data: {
          name: material.name,
          category: material.category,
          unit: material.unit,
          description: material.description,
          supplierName: material.supplierName,
          notes: material.notes,
          status: material.status,
        },
      });
      updated += 1;
      console.log(`🔄 ${material.code} actualizado`);
      continue;
    }

    existing += 1;
    console.log(`↩️  ${material.code} ya existia`);
  }

  console.log("");
  console.log("Resumen de materiales base:");
  console.log(`- Creados: ${created}`);
  console.log(`- Actualizados: ${updated}`);
  console.log(`- Existentes: ${existing}`);
}

main()
  .catch((error) => {
    console.error("❌ Error durante seed de materiales base:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
