#!/usr/bin/env npx tsx
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { syncOperationsProductToStore } from "@/lib/operations/sync-operations-product-to-store";

const prisma = new PrismaClient();

const AUTH_EMAILS = {
  superadmin: "superadmin@prerescatepty.com",
  client: "cliente@prerescatepty.com",
  corporate: "corporativo@prerescatepty.com",
} as const;

const REQUIRED_PASSWORD_VARS = ["SEED_SUPERADMIN_PASSWORD", "SEED_CLIENT_PASSWORD", "SEED_CORPORATE_PASSWORD"] as const;

const PACKAGE_SEEDS = [
  {
    name: "Combo Estándar",
    slug: "combo-estandar",
    maxChips: 1,
    maxProfiles: 1,
    price: 25.0,
    description: "1 Chip Inteligente NFC + 1 Perfil Médico",
    isActive: true,
    accountType: "personal",
    displayOrder: 1,
    icon: "✨",
    color: "standard",
    recommended: false,
    savings: null,
    allowsFamilyProfiles: false,
    allowsOrganizationModule: false,
    allowsSchoolModule: false,
    serviceDurationMonths: 24,
  },
  {
    name: "Combo Dúo",
    slug: "combo-duo",
    maxChips: 2,
    maxProfiles: 2,
    price: 45.0,
    description: "2 Chips Inteligentes NFC + 2 Perfiles Médicos",
    isActive: true,
    accountType: "personal",
    displayOrder: 2,
    icon: "👥",
    color: "duo",
    recommended: false,
    savings: "$5 (10%)",
    allowsFamilyProfiles: true,
    allowsOrganizationModule: false,
    allowsSchoolModule: false,
    serviceDurationMonths: 24,
  },
  {
    name: "Combo Familiar",
    slug: "combo-familiar",
    maxChips: 3,
    maxProfiles: 3,
    price: 65.0,
    description: "3 Chips Inteligentes NFC + 3 Perfiles Médicos",
    isActive: true,
    accountType: "personal",
    displayOrder: 3,
    icon: "🏠",
    color: "family",
    recommended: true,
    savings: "$10 (13%)",
    allowsFamilyProfiles: true,
    allowsOrganizationModule: false,
    allowsSchoolModule: false,
    serviceDurationMonths: 24,
  },
  {
    name: "Combo Hogar Full",
    slug: "combo-hogar-full",
    maxChips: 5,
    maxProfiles: 5,
    price: 95.0,
    description: "5 Chips Inteligentes NFC + 5 Perfiles Médicos",
    isActive: true,
    accountType: "personal",
    displayOrder: 4,
    icon: "🔥",
    color: "hogar",
    recommended: false,
    savings: "$30 (24%)",
    allowsFamilyProfiles: true,
    allowsOrganizationModule: false,
    allowsSchoolModule: false,
    serviceDurationMonths: 24,
  },
  {
    name: "Combo Empresa",
    slug: "combo-empresa",
    maxChips: 20,
    maxProfiles: 20,
    price: 250.0,
    description: "20 Chips Inteligentes NFC + 20 Perfiles",
    isActive: true,
    accountType: "company",
    displayOrder: 5,
    icon: "🏢",
    color: "empresa",
    recommended: false,
    savings: "$250 (50%)",
    allowsFamilyProfiles: true,
    allowsOrganizationModule: true,
    allowsSchoolModule: false,
    serviceDurationMonths: 24,
  },
  {
    name: "Corporativo",
    slug: "combo-corporativo",
    maxChips: 50,
    maxProfiles: 50,
    price: 450.0,
    description: "50 Chips Inteligentes NFC + 50 Perfiles",
    isActive: true,
    accountType: "company",
    displayOrder: 6,
    icon: "👔",
    color: "corporativo",
    recommended: false,
    savings: "$800 (64%)",
    allowsFamilyProfiles: true,
    allowsOrganizationModule: true,
    allowsSchoolModule: true,
    serviceDurationMonths: 24,
  },
] as const;

const MATERIAL_SEEDS = [
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
] as const;

function requirePasswords() {
  for (const key of REQUIRED_PASSWORD_VARS) {
    if (!process.env[key]?.trim()) {
      throw new Error(`Missing required env var: ${key}`);
    }
  }
}

function decimal(value: number | string) {
  return new Prisma.Decimal(value);
}

async function upsertPasswordUser(email: string, password: string, role: string, isAdmin: boolean, adminRole: string | null, accountId: string | null) {
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    return prisma.user.update({
      where: { email },
      data: {
        passwordHash,
        role,
        isAdmin,
        adminRole,
        accountId,
        status: "active",
      },
    });
  }

  return prisma.user.create({
    data: {
      email,
      passwordHash,
      role,
      isAdmin,
      adminRole,
      accountId,
      status: "active",
    },
  });
}

async function upsertPackageSeed(seed: {
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
}) {
  return prisma.package.upsert({
    where: { name: seed.name },
    update: seed,
    create: seed,
  });
}

async function ensureFinishedGood(code: string, name: string, productType: string, notes: string) {
  return prisma.operationFinishedGood.upsert({
    where: { code },
    update: { name, productType, status: "active", unit: "unit", notes },
    create: { code, name, productType, status: "active", unit: "unit", notes },
  });
}

async function ensureInventoryUnit(input: {
  internalLabel: string;
  productCode: string;
  productName: string;
  productType: string;
  status: "assembled" | "available" | "reserved" | "qa_pending" | "qa_failed" | "dispatched" | "delivered" | "activated" | "discarded" | "cancelled";
  qaStatus: "pending" | "passed" | "failed" | null;
  activationStatus: "not_activated" | "activated";
  reservedOrderId?: string | null;
  notes?: string | null;
}) {
  const existing = await prisma.operationFinishedGoodUnit.findUnique({
    where: { internalLabel: input.internalLabel },
    select: { id: true },
  });

  const data = {
    productCode: input.productCode,
    productName: input.productName,
    productType: input.productType,
    status: input.status,
    qaStatus: input.qaStatus,
    activationStatus: input.activationStatus,
    reservedOrderId: input.reservedOrderId || null,
    notes: input.notes || null,
  };

  if (existing) {
    return prisma.operationFinishedGoodUnit.update({
      where: { internalLabel: input.internalLabel },
      data,
    });
  }

  return prisma.operationFinishedGoodUnit.create({
    data: {
      internalLabel: input.internalLabel,
      ...data,
    },
  });
}

async function ensureChip(input: {
  id: string;
  shortCode: string;
  serialPublic: string;
  nfcUrl: string;
  qrUrl: string;
  accountId: string;
  ownerUserId: string;
  assignedProfileId?: string | null;
  status: string;
  serviceStatus: string;
  productType: string;
  internalLabel: string;
  isPhysical?: boolean;
  activatedAt?: Date | null;
}) {
  const data = {
    shortCode: input.shortCode,
    serialPublic: input.serialPublic,
    nfcUrl: input.nfcUrl,
    qrUrl: input.qrUrl,
    accountId: input.accountId,
    ownerUserId: input.ownerUserId,
    assignedProfileId: input.assignedProfileId || null,
    status: input.status,
    serviceStatus: input.serviceStatus,
    productType: input.productType,
    internalLabel: input.internalLabel,
    isPhysical: input.isPhysical ?? true,
    activatedAt: input.activatedAt || null,
  };

  const existing = await prisma.chip.findUnique({ where: { id: input.id }, select: { id: true } });
  if (existing) {
    return prisma.chip.update({ where: { id: input.id }, data });
  }
  return prisma.chip.create({ data: { id: input.id, ...data } });
}

async function ensureContact(input: { id: string; userId: string; fullName: string; phone: string; email: string }) {
  const existing = await prisma.contact.findFirst({ where: { id: input.id } });
  const data = {
    userId: input.userId,
    fullName: input.fullName,
    phone: input.phone,
    email: input.email,
  };
  if (existing) {
    return prisma.contact.update({ where: { id: input.id }, data });
  }
  return prisma.contact.create({ data: { id: input.id, ...data } });
}

async function ensureProfileContact(input: {
  id: string;
  profileId: string;
  contactId: string;
  relationship: string;
  contactType: string;
  priorityOrder: number;
}) {
  const existing = await prisma.profileContact.findUnique({
    where: { profileId_contactId: { profileId: input.profileId, contactId: input.contactId } },
  }).catch(() => null);
  const data = {
    relationship: input.relationship,
    contactType: input.contactType,
    priorityOrder: input.priorityOrder,
  };
  if (existing) {
    return prisma.profileContact.update({
      where: { profileId_contactId: { profileId: input.profileId, contactId: input.contactId } },
      data,
    });
  }
  return prisma.profileContact.create({
    data: {
      id: input.id,
      profileId: input.profileId,
      contactId: input.contactId,
      ...data,
    },
  });
}

async function ensureStoreProduct(input: {
  code: string;
  name: string;
  description: string;
  price: number;
  category: string;
  productType: string;
  isActive: boolean;
}) {
  return syncOperationsProductToStore({
    operationsProductCode: input.code,
    operationsProductName: input.name,
    productType: input.code,
    defaultPrice: input.price,
    category: input.category,
    isActive: input.isActive,
    description: input.description,
  });
}

async function ensureProductMapping(input: {
  productId: string;
  finishedGoodId: string;
  productCode: string;
  deviceType: string;
  storeSection: string;
  purchaseFlow: string;
  activationFlow: string;
  requiresCompanyContext?: boolean;
  requiresApproval?: boolean;
  requiresPersonalization?: boolean;
  isPublished?: boolean;
  sortOrder?: number;
  badgeLabel?: string | null;
  badgeColor?: string | null;
}) {
  const existing = await prisma.productOperationalMapping.findUnique({
    where: { productId: input.productId },
  }).catch(() => null);

  const data = {
    finishedGoodId: input.finishedGoodId,
    productCode: input.productCode,
    deviceType: input.deviceType,
    storeSection: input.storeSection,
    purchaseFlow: input.purchaseFlow,
    activationFlow: input.activationFlow,
    requiresCompanyContext: input.requiresCompanyContext ?? false,
    requiresApproval: input.requiresApproval ?? false,
    requiresPersonalization: input.requiresPersonalization ?? false,
    isPublished: input.isPublished ?? true,
    sortOrder: input.sortOrder ?? 0,
    badgeLabel: input.badgeLabel ?? null,
    badgeColor: input.badgeColor ?? null,
  };

  if (existing) {
    return prisma.productOperationalMapping.update({ where: { productId: input.productId }, data });
  }

  return prisma.productOperationalMapping.create({
    data: {
      productId: input.productId,
      ...data,
    },
  });
}

async function ensureOrder(input: {
  id: string;
  orderNumber: string;
  userId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  organizationId?: string | null;
  orderType: string;
  items: Array<{
    id: string;
    productId: string;
    productType: string;
    productName: string;
    productCode: string;
    operationalMappingId: string;
    operationalFinishedGoodId: string;
    quantity: number;
    unitPrice: number;
  }>;
}) {
  const existing = await prisma.order.findUnique({
    where: { orderNumber: input.orderNumber },
    include: { items: true },
  });

  const base = {
    userId: input.userId,
    amount: decimal(input.amount),
    currency: "USD",
    provider: "manual",
    orderStatus: "pending" as const,
    paymentStatus: "pending" as const,
    paymentMethod: "manual",
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    organizationId: input.organizationId || null,
    orderType: input.orderType,
    adminReviewStatus: "pending" as const,
  };

  if (!existing) {
    return prisma.order.create({
      data: {
        id: input.id,
        orderNumber: input.orderNumber,
        ...base,
        items: {
          create: input.items.map((item) => ({
            id: item.id,
            productId: item.productId,
            productType: item.productType,
            productName: item.productName,
            productCode: item.productCode,
            operationalMappingId: item.operationalMappingId,
            operationalMappingStatus: "mapped",
            operationalFinishedGoodId: item.operationalFinishedGoodId,
            operationalProductCode: item.productCode,
            operationalProductName: item.productName,
            quantity: item.quantity,
            unitPrice: decimal(item.unitPrice),
            totalPrice: decimal(item.unitPrice * item.quantity),
          })),
        },
      },
    });
  }

  await prisma.order.update({
    where: { id: existing.id },
    data: {
      ...base,
    },
  });

  for (const item of input.items) {
    const existingItem = existing.items.find((current) => current.id === item.id);
    if (existingItem) {
      await prisma.orderItem.update({
        where: { id: item.id },
        data: {
          productId: item.productId,
          productType: item.productType,
          productName: item.productName,
          productCode: item.productCode,
          operationalMappingId: item.operationalMappingId,
          operationalMappingStatus: "mapped",
          operationalFinishedGoodId: item.operationalFinishedGoodId,
          operationalProductCode: item.productCode,
          operationalProductName: item.productName,
          quantity: item.quantity,
          unitPrice: decimal(item.unitPrice),
          totalPrice: decimal(item.unitPrice * item.quantity),
        },
      });
    } else {
      await prisma.orderItem.create({
        data: {
          id: item.id,
          orderId: existing.id,
          productId: item.productId,
          productType: item.productType,
          productName: item.productName,
          productCode: item.productCode,
          operationalMappingId: item.operationalMappingId,
          operationalMappingStatus: "mapped",
          operationalFinishedGoodId: item.operationalFinishedGoodId,
          operationalProductCode: item.productCode,
          operationalProductName: item.productName,
          quantity: item.quantity,
          unitPrice: decimal(item.unitPrice),
          totalPrice: decimal(item.unitPrice * item.quantity),
        },
      });
    }
  }

  return existing;
}

async function ensureCommercialOrder(input: {
  id: string;
  code: string;
  sourceType: string;
  sourceId: string;
  customerType: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  items: Array<{
    id: string;
    finishedGoodId: string;
    productCode: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
}) {
  const existing = await prisma.operationCommercialOrder.findUnique({
    where: { code: input.code },
    include: { items: true },
  });

  const base = {
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    status: "draft",
    customerType: input.customerType,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    salesChannel: "admin",
    paymentStatus: "pending",
    fulfillmentStatus: "pending",
    totalAmount: decimal(input.totalAmount),
    currency: "USD",
  };

  if (!existing) {
    return prisma.operationCommercialOrder.create({
      data: {
        id: input.id,
        code: input.code,
        ...base,
        items: {
          create: input.items.map((item) => ({
            id: item.id,
            finishedGoodId: item.finishedGoodId,
            productCode: item.productCode,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: decimal(item.unitPrice),
            totalPrice: decimal(item.unitPrice * item.quantity),
          })),
        },
      },
    });
  }

  await prisma.operationCommercialOrder.update({
    where: { id: existing.id },
    data: base,
  });

  for (const item of input.items) {
    const existingItem = existing.items.find((current) => current.id === item.id);
    if (existingItem) {
      await prisma.operationCommercialOrderItem.update({
        where: { id: item.id },
        data: {
          finishedGoodId: item.finishedGoodId,
          productCode: item.productCode,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: decimal(item.unitPrice),
          totalPrice: decimal(item.unitPrice * item.quantity),
        },
      });
    } else {
      await prisma.operationCommercialOrderItem.create({
        data: {
          id: item.id,
          commercialOrderId: existing.id,
          finishedGoodId: item.finishedGoodId,
          productCode: item.productCode,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: decimal(item.unitPrice),
          totalPrice: decimal(item.unitPrice * item.quantity),
        },
      });
    }
  }

  return existing;
}

async function main() {
  requirePasswords();

  const superadminPassword = process.env.SEED_SUPERADMIN_PASSWORD!;
  const clientPassword = process.env.SEED_CLIENT_PASSWORD!;
  const corporatePassword = process.env.SEED_CORPORATE_PASSWORD!;

  const superadmin = await prisma.user.findUnique({ where: { email: AUTH_EMAILS.superadmin }, include: { account: true } });
  const client = await prisma.user.findUnique({ where: { email: AUTH_EMAILS.client }, include: { account: { include: { profiles: true } }, profile: true } });
  const corporate = await prisma.user.findUnique({ where: { email: AUTH_EMAILS.corporate }, include: { account: { include: { organizations: true, profiles: true } }, profile: true } });

  if (!superadmin || !client || !corporate) {
    throw new Error("Missing recovery identities. Run scripts/restore-auth-access.ts first.");
  }

  const [packages, baseMaterials, baseFinishedGoods] = await Promise.all([
    Promise.all(PACKAGE_SEEDS.map(upsertPackageSeed)),
    Promise.all(
      MATERIAL_SEEDS.map((material) =>
        prisma.operationMaterial.upsert({
          where: { code: material.code },
          update: material,
          create: material,
        })
      )
    ),
    Promise.all([
      ensureFinishedGood("PRP-FG-STICKER", "Sticker PreRescatePTY", "sticker_prerescatepty", "Producto terminado base normal."),
      ensureFinishedGood("PRP-FG-STICKER-EMP", "Sticker PreRescatePTY Empresarial", "sticker_prerescatepty_empresarial", "Producto terminado base empresarial."),
    ]),
  ]);

  const [stickerProduct, enterpriseStickerProduct, initialChipProduct] = await Promise.all([
    ensureStoreProduct({
      code: "PRP-FG-STICKER",
      name: "Sticker PreRescatePTY",
      description: "Sticker oficial PreRescatePTY para identificación y red de protección.",
      price: 25.0,
      category: "accesorios",
      productType: "PRP-FG-STICKER",
      isActive: true,
    }),
    ensureStoreProduct({
      code: "PRP-FG-STICKER-EMP",
      name: "Sticker PreRescatePTY Empresarial",
      description: "Sticker empresarial oficial para distribución corporativa.",
      price: 25.0,
      category: "corporate",
      productType: "PRP-FG-STICKER-EMP",
      isActive: true,
    }),
    (async () => {
      const existing = await prisma.product.findFirst({ where: { productType: "initial_chip" } });
      if (existing) {
        return prisma.product.update({
          where: { id: existing.id },
          data: {
            name: "Primer chip empresarial",
            description: "Chip base corporativo que activa la vinculación empresarial y permite asociar futuros accesorios.",
            price: decimal(25),
            category: "corporate",
            stock: 9999,
            isActive: true,
            estimatedProductionTime: null,
            requiresPersonalization: false,
            productType: "initial_chip",
          },
        });
      }
      return prisma.product.create({
        data: {
          name: "Primer chip empresarial",
          description: "Chip base corporativo que activa la vinculación empresarial y permite asociar futuros accesorios.",
          price: decimal(25),
          category: "corporate",
          stock: 9999,
          productType: "initial_chip",
          estimatedProductionTime: null,
          requiresPersonalization: false,
          isActive: true,
        },
      });
    })(),
  ]);

  const [stickerFinishedGood, enterpriseFinishedGood] = baseFinishedGoods;

  await Promise.all([
    ensureProductMapping({
      productId: stickerProduct.storeProductId,
      finishedGoodId: stickerFinishedGood.id,
      productCode: "PRP-FG-STICKER",
      deviceType: "personal",
      storeSection: "personal_devices",
      purchaseFlow: "direct_purchase",
      activationFlow: "personal_profile",
      requiresCompanyContext: false,
      requiresApproval: false,
      requiresPersonalization: false,
      isPublished: true,
      sortOrder: 1,
      badgeLabel: "Disponible",
      badgeColor: "emerald",
    }),
    ensureProductMapping({
      productId: enterpriseStickerProduct.storeProductId,
      finishedGoodId: enterpriseFinishedGood.id,
      productCode: "PRP-FG-STICKER-EMP",
      deviceType: "business",
      storeSection: "business_devices",
      purchaseFlow: "company_request",
      activationFlow: "business_profile",
      requiresCompanyContext: true,
      requiresApproval: true,
      requiresPersonalization: false,
      isPublished: true,
      sortOrder: 2,
      badgeLabel: "Corporativo",
      badgeColor: "indigo",
    }),
  ]);

  const [clientContact] = await Promise.all([
    ensureContact({
      id: "seed-contact-client-1",
      userId: client.id,
      fullName: "Contacto de Prueba",
      phone: "+50760000001",
      email: "contacto.prueba@prerescatepty.com",
    }),
  ]);

  await ensureProfileContact({
    id: "seed-profile-contact-client-1",
    profileId: client.profile?.id || client.account?.profiles?.[0]?.id || "",
    contactId: clientContact.id,
    relationship: "Familiar",
    contactType: "auxilio",
    priorityOrder: 1,
  }).catch(() => undefined);

  await Promise.all([
    ensureChip({
      id: "seed-chip-personal-inventory-1",
      shortCode: "SEED-PRP-PER-001",
      serialPublic: "SEED-SERIAL-PER-001",
      nfcUrl: "https://example.local/chips/seed-personal-1",
      qrUrl: "https://example.local/qr/seed-personal-1",
      accountId: client.accountId || client.account?.id || "",
      ownerUserId: client.id,
      assignedProfileId: client.profile?.id || null,
      status: "inventory",
      serviceStatus: "active",
      productType: "sticker_nfc_qr",
      internalLabel: "SEED-CHIP-INVENTORY-1",
      isPhysical: true,
    }),
    ensureChip({
      id: "seed-chip-personal-activated-1",
      shortCode: "SEED-PRP-PER-002",
      serialPublic: "SEED-SERIAL-PER-002",
      nfcUrl: "https://example.local/chips/seed-personal-2",
      qrUrl: "https://example.local/qr/seed-personal-2",
      accountId: client.accountId || client.account?.id || "",
      ownerUserId: client.id,
      assignedProfileId: client.profile?.id || null,
      status: "activated",
      serviceStatus: "active",
      productType: "sticker_nfc_qr",
      internalLabel: "SEED-CHIP-ACTIVATED-1",
      isPhysical: true,
      activatedAt: new Date(),
    }),
  ]);

  await ensureInventoryUnit({
    internalLabel: "SEED-FGU-STICKER-AVAILABLE-1",
    productCode: "PRP-FG-STICKER",
    productName: "Sticker PreRescatePTY",
    productType: "sticker_prerescatepty",
    status: "available",
    qaStatus: "passed",
    activationStatus: "not_activated",
    notes: "Unidad semilla con inventario disponible.",
  });

  await ensureInventoryUnit({
    internalLabel: "SEED-FGU-STICKER-QA-PENDING-1",
    productCode: "PRP-FG-STICKER",
    productName: "Sticker PreRescatePTY",
    productType: "sticker_prerescatepty",
    status: "qa_pending",
    qaStatus: "pending",
    activationStatus: "not_activated",
    notes: "Unidad semilla pendiente de QA.",
  });

  await ensureOrder({
    id: "seed-order-client-1",
    orderNumber: "SEED-ORDER-CLIENT-001",
    userId: client.id,
    amount: 25.0,
    customerName: `${client.profile?.firstName || "Cliente"} ${client.profile?.lastName || "Prueba"}`.trim(),
    customerEmail: client.email,
    orderType: "manual",
    items: [
      {
        id: "seed-order-item-client-1",
        productId: stickerProduct.storeProductId,
        productType: "Sticker PreRescatePTY",
        productName: "Sticker PreRescatePTY",
        productCode: "PRP-FG-STICKER",
        operationalMappingId: (await prisma.productOperationalMapping.findUnique({ where: { productId: stickerProduct.storeProductId } }))!.id,
        operationalFinishedGoodId: stickerFinishedGood.id,
        quantity: 1,
        unitPrice: 25.0,
      },
    ],
  });

  await ensureOrder({
    id: "seed-order-corporate-1",
    orderNumber: "SEED-ORDER-CORP-001",
    userId: corporate.id,
    amount: 25.0,
    customerName: corporate.profile ? `${corporate.profile.firstName} ${corporate.profile.lastName}`.trim() : "Corporativo de Prueba",
    customerEmail: corporate.email,
    organizationId: corporate.account?.organizations?.[0]?.id || null,
    orderType: "corporate",
    items: [
      {
        id: "seed-order-item-corp-1",
        productId: enterpriseStickerProduct.storeProductId,
        productType: "Sticker PreRescatePTY Empresarial",
        productName: "Sticker PreRescatePTY Empresarial",
        productCode: "PRP-FG-STICKER-EMP",
        operationalMappingId: (await prisma.productOperationalMapping.findUnique({ where: { productId: enterpriseStickerProduct.storeProductId } }))!.id,
        operationalFinishedGoodId: enterpriseFinishedGood.id,
        quantity: 1,
        unitPrice: 25.0,
      },
    ],
  });

  await ensureCommercialOrder({
    id: "seed-commercial-order-1",
    code: "CO-SEED-001",
    sourceType: "seed",
    sourceId: "seed-order-corp-1",
    customerType: "internal",
    customerName: corporate.profile ? `${corporate.profile.firstName} ${corporate.profile.lastName}`.trim() : "Corporativo de Prueba",
    customerEmail: corporate.email,
    totalAmount: 25.0,
    items: [
      {
        id: "seed-commercial-item-1",
        finishedGoodId: enterpriseFinishedGood.id,
        productCode: "PRP-FG-STICKER-EMP",
        productName: "Sticker PreRescatePTY Empresarial",
        quantity: 1,
        unitPrice: 25.0,
      },
    ],
  });

  await Promise.all([
    upsertPasswordUser(AUTH_EMAILS.superadmin, superadminPassword, "owner", true, "superadmin", null),
    upsertPasswordUser(AUTH_EMAILS.client, clientPassword, "owner", false, null, client.accountId || client.account?.id || null),
    upsertPasswordUser(AUTH_EMAILS.corporate, corporatePassword, "owner", false, null, corporate.accountId || corporate.account?.id || null),
  ]);

  console.log(
    JSON.stringify({
      packages: packages.length,
      materials: baseMaterials.length,
      finishedGoods: baseFinishedGoods.length,
      storeProducts: 2,
      chips: 2,
      orders: 2,
      commercialOrders: 1,
      profiles: 1,
      contacts: 1,
    }, null, 2)
  );
}

main()
  .catch((error) => {
    console.error("SEED_FAILED", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
