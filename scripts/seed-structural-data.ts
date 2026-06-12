#!/usr/bin/env npx tsx
/**
 * ============================================================
 * SEED ESTRUCTURAL — PRE RESCATE PTY
 * ============================================================
 *
 * Crea/actualiza únicamente datos estructurales:
 *   - Package (paquetes/comerciales)
 *   - Product (productos de tienda)
 *   - SystemConfig (configuración pública y pagos)
 *
 * NO toca: User, Account, Profile, Chip, Organization, Order.
 *
 * Idempotente: usa upsert por claves únicas (Package.name, Product.name,
 * SystemConfig.key). Ejecutar múltiples veces no duplica.
 *
 * Requiere variable de entorno: CONFIRM_STRUCTURAL_SEED=YES_CREATE_STRUCTURAL_DATA
 * ============================================================
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Confirmación ───────────────────────────────────────────
function requireConfirmation(): void {
  const confirm = process.env.CONFIRM_STRUCTURAL_SEED?.trim();
  if (confirm !== 'YES_CREATE_STRUCTURAL_DATA') {
    console.error('');
    console.error('❌ CONFIRMACIÓN REQUERIDA');
    console.error('   Ejecute con:');
    console.error('   CONFIRM_STRUCTURAL_SEED=YES_CREATE_STRUCTURAL_DATA npx tsx scripts/seed-structural-data.ts');
    console.error('');
    process.exit(1);
  }
}

// ─── Paquetes ───────────────────────────────────────────────
// Mismos nombres, slugs, precios y campos que prisma/seed.ts (versión actual)
interface PackageSeed {
  name: string;
  slug: string;
  maxChips: number;
  maxProfiles: number;
  price: number;
  description: string;
  isActive: boolean;
  accountType: string;
  displayOrder: number;
  icon: string;
  color: string;
  recommended: boolean;
  savings: string | null;
  allowsFamilyProfiles: boolean;
  allowsOrganizationModule: boolean;
  allowsSchoolModule: boolean;
  serviceDurationMonths: number;
}

const PACKAGES: PackageSeed[] = [
  {
    name: 'Combo Estándar',
    slug: 'combo-estandar',
    maxChips: 1,
    maxProfiles: 1,
    price: 25.00,
    description: '1 Chip Inteligente NFC + 1 Perfil Médico',
    isActive: true,
    accountType: 'personal',
    displayOrder: 1,
    icon: '✨',
    color: 'standard',
    recommended: false,
    savings: null,
    allowsFamilyProfiles: false,
    allowsOrganizationModule: false,
    allowsSchoolModule: false,
    serviceDurationMonths: 24,
  },
  {
    name: 'Combo Dúo',
    slug: 'combo-duo',
    maxChips: 2,
    maxProfiles: 2,
    price: 45.00,
    description: '2 Chips Inteligentes NFC + 2 Perfiles Médicos',
    isActive: true,
    accountType: 'personal',
    displayOrder: 2,
    icon: '👥',
    color: 'duo',
    recommended: false,
    savings: '$5 (10%)',
    allowsFamilyProfiles: true,
    allowsOrganizationModule: false,
    allowsSchoolModule: false,
    serviceDurationMonths: 24,
  },
  {
    name: 'Combo Familiar',
    slug: 'combo-familiar',
    maxChips: 3,
    maxProfiles: 3,
    price: 65.00,
    description: '3 Chips Inteligentes NFC + 3 Perfiles Médicos',
    isActive: true,
    accountType: 'personal',
    displayOrder: 3,
    icon: '🏠',
    color: 'family',
    recommended: true,
    savings: '$10 (13%)',
    allowsFamilyProfiles: true,
    allowsOrganizationModule: false,
    allowsSchoolModule: false,
    serviceDurationMonths: 24,
  },
  {
    name: 'Combo Hogar Full',
    slug: 'combo-hogar-full',
    maxChips: 5,
    maxProfiles: 5,
    price: 95.00,
    description: '5 Chips Inteligentes NFC + 5 Perfiles Médicos',
    isActive: true,
    accountType: 'personal',
    displayOrder: 4,
    icon: '🔥',
    color: 'hogar',
    recommended: false,
    savings: '$30 (24%)',
    allowsFamilyProfiles: true,
    allowsOrganizationModule: false,
    allowsSchoolModule: false,
    serviceDurationMonths: 24,
  },
  {
    name: 'Combo Empresa',
    slug: 'combo-empresa',
    maxChips: 20,
    maxProfiles: 20,
    price: 250.00,
    description: '20 Chips Inteligentes NFC + 20 Perfiles',
    isActive: true,
    accountType: 'company',
    displayOrder: 5,
    icon: '🏢',
    color: 'empresa',
    recommended: false,
    savings: '$250 (50%)',
    allowsFamilyProfiles: true,
    allowsOrganizationModule: true,
    allowsSchoolModule: false,
    serviceDurationMonths: 24,
  },
  {
    name: 'Corporativo',
    slug: 'combo-corporativo',
    maxChips: 50,
    maxProfiles: 50,
    price: 450.00,
    description: '50 Chips Inteligentes NFC + 50 Perfiles',
    isActive: true,
    accountType: 'company',
    displayOrder: 6,
    icon: '👔',
    color: 'corporativo',
    recommended: false,
    savings: '$800 (64%)',
    allowsFamilyProfiles: true,
    allowsOrganizationModule: true,
    allowsSchoolModule: true,
    serviceDurationMonths: 24,
  },
];

// ─── Productos de tienda (catálogo real anterior al reset) ──
// productType usa los valores definidos en TiendaSection PRODUCT_TYPES:
//   sticker, llavero, tarjeta, brazalete, combo, otro
// Todos requieren personalización (profileId + chipId en OrderItem).
// Precios, stock, descripciones e imágenes: NO recuperables de git history.
// Se marcan como PENDIENTES para que el usuario los defina.
interface ProductSeed {
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  productType: string;
  requiresPersonalization: boolean;
  isActive: boolean;
  estimatedProductionTime: string | null;
}

const PRODUCTS: ProductSeed[] = [
  {
    name: 'Llavero NFC',
    description: 'Llavero inteligente NFC con chip reutilizable. Ideal para llevar tu perfil médico siempre contigo en tus llaves.',
    price: 14.99,
    category: 'accesorios',
    stock: 500,
    productType: 'llavero',
    requiresPersonalization: true,
    isActive: true,
    estimatedProductionTime: '2-3 días hábiles',
  },
  {
    name: 'Sticker Adicional / Renovación',
    description: 'Sticker NFC adhesivo de alta durabilidad. Perfecto para reponer o añadir a cascos, mochilas y billeteras.',
    price: 9.99,
    category: 'accesorios',
    stock: 500,
    productType: 'sticker',
    requiresPersonalization: true,
    isActive: true,
    estimatedProductionTime: '1-2 días hábiles',
  },
  {
    name: 'Tag NFC',
    description: 'Tag NFC compacto con diseño discreto. Fácil de colocar en superficies lisas como teléfonos, tablets o carteras.',
    price: 9.99,
    category: 'accesorios',
    stock: 500,
    productType: 'sticker',
    requiresPersonalization: true,
    isActive: true,
    estimatedProductionTime: '1-2 días hábiles',
  },
  {
    name: 'Credencial NFC',
    description: 'Credencial tipo tarjeta plástica con chip NFC integrado. Formato carnet para llevar en billetera o porta credencial.',
    price: 12.99,
    category: 'accesorios',
    stock: 500,
    productType: 'tarjeta',
    requiresPersonalization: true,
    isActive: true,
    estimatedProductionTime: '3-5 días hábiles',
  },
];

// ─── SystemConfig ───────────────────────────────────────────
// Claves consumidas por:
//   - /api/public/config  →  yappy_handle, yappy_qr_url, bank_name,
//                            bank_account_type, bank_account_number, bank_account_name
//   - /api/orders         →  sender_email (para notificaciones)
//   - checkout UI         →  demo_profile_shortcode (para landing demo)
// Valores bancarios/Yappy: se marcan vacíos para que el admin los configure.
interface SystemConfigSeed {
  key: string;
  value: string;
  purpose: string;
}

const SYSTEM_CONFIGS: SystemConfigSeed[] = [
  {
    key: 'yappy_handle',
    value: '',
    purpose: 'Método de pago — Visible en checkout. Completar vía admin panel.',
  },
  {
    key: 'yappy_qr_url',
    value: '',
    purpose: 'QR de pago — Visible en checkout. Completar vía admin panel.',
  },
  {
    key: 'bank_name',
    value: '',
    purpose: 'Método de pago — Visible en checkout. Completar vía admin panel.',
  },
  {
    key: 'bank_account_type',
    value: '',
    purpose: 'Método de pago — Visible en checkout. Completar vía admin panel.',
  },
  {
    key: 'bank_account_number',
    value: '',
    purpose: 'Método de pago — Visible en checkout. Completar vía admin panel.',
  },
  {
    key: 'bank_account_name',
    value: '',
    purpose: 'Método de pago — Visible en checkout. Completar vía admin panel.',
  },
  {
    key: 'sender_email',
    value: '',
    purpose: 'Email remitente para notificaciones del sistema. Completar vía admin panel.',
  },
  {
    key: 'demo_profile_shortcode',
    value: '',
    purpose: 'ShortCode del perfil demo en la landing pública. Opcional.',
  },
];

// ─── Reporte previo ─────────────────────────────────────────
function printPlan(): void {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   PLAN — SEED ESTRUCTURAL                   ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  console.log('📦 PAQUETES a crear/actualizar:');
  for (const p of PACKAGES) {
    const saved = p.savings ? ` (ahorro: ${p.savings})` : '';
    console.log(`   • ${p.name.padEnd(20)} — $${p.price.toFixed(2)}  (${p.maxChips} chip(s), ${p.accountType})${saved}`);
  }

  console.log('');
  console.log('🏷️  PRODUCTOS a crear/actualizar:');
  for (const p of PRODUCTS) {
    const priceLabel = p.price === 0 ? '💰 PRECIO PENDIENTE' : `$${p.price.toFixed(2)}`;
    const stockLabel = p.stock === 0 ? '📦 STOCK PENDIENTE' : `stock: ${p.stock}`;
    const descLabel = p.description?.startsWith('PENDIENTE') ? '📝 DESCRIPCIÓN PENDIENTE' : '';
    const timeLabel = p.estimatedProductionTime?.startsWith('PENDIENTE') ? '⏱ TIEMPO PENDIENTE' : '';
    const flags = [priceLabel, stockLabel, descLabel, timeLabel].filter(Boolean).join(' | ');
    console.log(`   • ${p.name.padEnd(32)} [${p.productType}]  ${flags}`);
  }

  console.log('');
  console.log('⚙️  SYSTEM CONFIG a crear/actualizar (valores vacíos — completar en admin panel):');
  for (const c of SYSTEM_CONFIGS) {
    console.log(`   • ${c.key.padEnd(30)} — ${c.purpose}`);
  }

  console.log('');
  console.log('⚠️  NO se tocarán: User, Account, Profile, Chip, Organization, Order.');
  console.log('');
}

// ─── Ejecución ──────────────────────────────────────────────
async function main(): Promise<void> {
  requireConfirmation();
  printPlan();

  // ── Packages ──────────────────────────────────────────────
  console.log('');
  console.log('🔄 Creando/actualizando paquetes...');

  for (const pkg of PACKAGES) {
    await prisma.package.updateMany({
      where: { slug: pkg.slug, name: { not: pkg.name } },
      data: { slug: null },
    });

    await prisma.package.upsert({
      where: { name: pkg.name },
      update: { ...pkg },
      create: { ...pkg },
    });
    console.log(`   ✅ ${pkg.name}`);
  }

  // Cleanup legacy names (same as original seed)
  const LEGACY_NAMES = [
    'Kit Inicial', 'Plan Básico', 'Básico', 'Plan Familiar', 'Plan Residencial', 'Plan Empresarial',
    'Paquete Estándar', 'Paquete Dúo', 'Paquete Empresa', 'Paquete Colegio / Escolar',
    'Plan Estándar', 'Plan Dúo', 'Family Club', 'Hogar Full', 'Hogar', 'Personal Básico',
    'Personal Pro', 'Familiar Estándar', 'Familiar Premium', 'Empresa Pyme', 'Corporativo Plus',
    'Combo Corporativo',
  ];

  const deletedCount = (await prisma.package.deleteMany({
    where: { name: { in: LEGACY_NAMES } },
  })).count;
  if (deletedCount > 0) {
    console.log(`   🗑️  Limpieza: ${deletedCount} paquete(s) legacy eliminados`);
  }

  // ── Products ──────────────────────────────────────────────
  console.log('');
  console.log('🔄 Creando/actualizando productos...');

  for (const prod of PRODUCTS) {
    const existing = await prisma.product.findFirst({
      where: { name: prod.name },
    });

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: { ...prod },
      });
      console.log(`   ✅ ${prod.name} (actualizado)`);
    } else {
      await prisma.product.create({
        data: { ...prod },
      });
      console.log(`   ✅ ${prod.name} (creado)`);
    }
  }

  // ── SystemConfig ──────────────────────────────────────────
  console.log('');
  console.log('🔄 Creando/actualizando configuraciones del sistema...');

  for (const cfg of SYSTEM_CONFIGS) {
    await (prisma as any).systemConfig.upsert({
      where: { key: cfg.key },
      update: { value: cfg.value },
      create: { key: cfg.key, value: cfg.value },
    });
    console.log(`   ✅ ${cfg.key}`);
  }

  // ── Conteos finales ───────────────────────────────────────
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('📊 CONTEO FINAL');
  console.log('═══════════════════════════════════════');

  const [packageCount, productCount, configCount, userCount, profileCount, chipCount, orderCount] =
    await Promise.all([
      prisma.package.count(),
      prisma.product.count(),
      (prisma as any).systemConfig.count(),
      prisma.user.count(),
      prisma.profile.count(),
      prisma.chip.count(),
      prisma.order.count(),
    ]);

  console.log(`   Package       = ${packageCount}`);
  console.log(`   Product       = ${productCount}`);
  console.log(`   SystemConfig  = ${configCount}`);
  console.log(`   User          = ${userCount} (intacto)`);
  console.log(`   Profile       = ${profileCount} (intacto)`);
  console.log(`   Chip          = ${chipCount}`);
  console.log(`   Order         = ${orderCount}`);
  console.log('');

  console.log('✅ SEED ESTRUCTURAL COMPLETADO');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Error durante seed estructural:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });