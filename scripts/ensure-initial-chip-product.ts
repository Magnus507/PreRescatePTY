#!/usr/bin/env npx tsx
/**
 * ============================================================
 * ENSURE INITIAL CHIP PRODUCT — PRE RESCATE PTY
 * ============================================================
 *
 * Verifica que el producto "Primer chip empresarial" existe en la BD.
 * Si no existe, lo crea con los valores definitivos.
 *
 * No modifica endpoints, no crea migraciones, no modifica Prisma.
 * Idempotente: safe para ejecutar múltiples veces.
 * ============================================================
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PRODUCT = {
  name: 'Primer chip empresarial',
  description: 'Chip base corporativo que activa la vinculación empresarial y permite asociar futuros accesorios.',
  price: 25.00,
  category: 'corporate',
  stock: 9999,
  productType: 'initial_chip',
  requiresPersonalization: false,
  isActive: true,
  estimatedProductionTime: null,
};

async function main() {
  console.log('🔍 Buscando producto "Primer chip empresarial"...');

  const existing = await prisma.product.findFirst({
    where: { productType: 'initial_chip' },
  });

  if (existing) {
    console.log('✅ Producto encontrado:', {
      id: existing.id,
      name: existing.name,
      productType: existing.productType,
      isActive: existing.isActive,
      stock: existing.stock,
      price: existing.price,
    });
    console.log('ℹ️  No se requiere acción adicional.');
  } else {
    console.log('❌ Producto NO encontrado. Creando...');
    const created = await prisma.product.create({ data: PRODUCT });
    console.log('✅ Producto creado:', {
      id: created.id,
      name: created.name,
      productType: created.productType,
      isActive: created.isActive,
      stock: created.stock,
      price: created.price,
    });
  }
}

main()
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());