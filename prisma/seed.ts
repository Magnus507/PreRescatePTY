import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- START SEEDING ---');

  // 1. Admin User (unified into User table)
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.warn('⚠️  SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD no definidos. Se omite creación de admin.');
  } else {
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { isAdmin: true, adminRole: 'superadmin', status: 'active' },
      create: {
        email: adminEmail,
        passwordHash: adminPasswordHash,
        role: 'owner',
        isAdmin: true,
        adminRole: 'superadmin',
        status: 'active'
      }
    });
    console.log('✅ Admin user synced (from env).');
  }

  // 2. Official Sales Packages (Paquetes de Venta) 
  // We use "Plan" in the name as it's the commercial term, but they behave as cumulative packs.
  const packages = [
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
      recommended: true,
      icon: '🏠',
      color: 'family',
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
      savings: '$800 (64%)',
      allowsFamilyProfiles: true,
      allowsOrganizationModule: true,
      allowsSchoolModule: true,
      serviceDurationMonths: 24,
    }
  ];


  const packageMap: Record<string, string> = {};

  for (const pkg of packages) {
    // Clear slug from any other record that already owns it to avoid unique conflicts
    if (pkg.slug) {
      await prisma.package.updateMany({
        where: { slug: pkg.slug, name: { not: pkg.name } },
        data: { slug: null },
      });
    }
    const p = await prisma.package.upsert({
      where: { name: pkg.name },
      update: { ...pkg },
      create: pkg,
    });
    if (pkg.slug) packageMap[pkg.slug] = p.id;
  }
  console.log('✅ Official packages synced.');

  // 3. Cleanup: Remove any old names or legacy plans to ensure SSOT
  await prisma.package.deleteMany({
    where: {
      name: {
        in: [
          'Kit Inicial', 'Plan Básico', 'Básico', 'Plan Familiar', 'Plan Residencial', 'Plan Empresarial',
          'Paquete Estándar', 'Paquete Dúo', 'Paquete Empresa', 'Paquete Colegio / Escolar',
          'Plan Estándar', 'Plan Dúo', 'Family Club', 'Hogar Full', 'Hogar', 'Personal Básico', 
          'Personal Pro', 'Familiar Estándar', 'Familiar Premium', 'Empresa Pyme', 'Corporativo Plus',
          'Combo Corporativo'
        ]
      }
    }
  });

  await prisma.package.updateMany({
    where: {
      isActive: true,
      accountType: { in: ['family', 'school', 'usuario'] },
    },
    data: { isActive: false },
  });

  // 4. Sample Organization
  const corpPkgId = packageMap['combo-corporativo'];
  if (corpPkgId) {
    const orgEmail = 'contacto@empresa-demo.com';
    let orgAccount = await prisma.account.findFirst({
      where: { accountName: 'PreRescue ID PTY (Demo)' }
    });

    if (orgAccount) {
      orgAccount = await prisma.account.update({
        where: { id: orgAccount.id },
        data: { packageId: corpPkgId, maxChipsAllocated: 50, maxProfilesAllocated: 50 }

      });
    } else {
      orgAccount = await prisma.account.create({
        data: {
          accountType: 'company',
          status: 'active',
          accountName: 'PreRescue ID PTY (Demo)',
          packageId: corpPkgId,
          maxChipsAllocated: 50,
          maxProfilesAllocated: 50

        }
      });
    }

    const existingOrg = await prisma.organization.findFirst({
      where: { contactEmail: orgEmail }
    });

    if (existingOrg) {
      await prisma.organization.update({
        where: { id: existingOrg.id },
        data: { status: 'active' }
      });
    } else {
      await prisma.organization.create({
        data: {
          accountId: orgAccount.id,
          legalName: 'Empresa de Prueba PTY',
          displayName: 'Empresa Demo',
          organizationType: 'company',
          contactEmail: orgEmail,
          status: 'active'
        }
      });
    }
    console.log('✅ Sample organization synced.');
  }

  console.log('--- SEED COMPLETED ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
