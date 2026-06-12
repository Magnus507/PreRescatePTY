import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CONFIRMATION_ENV = "CONFIRM_CORPORATE_BACKFILL";
const REQUIRED_VALUE = "YES_CREATE_CORPORATE_PROFILES";
const DRY_RUN = process.env[CONFIRMATION_ENV] !== REQUIRED_VALUE;

async function main() {
  console.log("\n🔧 P1 Fase C — Backfill de perfiles corporativos legacy");
  console.log(`   Modo: ${DRY_RUN ? "🔍 DRY RUN (solo lectura)" : "✏️  REAL (escritura)"}\n`);

  if (DRY_RUN) {
    console.log("   Para ejecutar escritura real, establezca:");
    console.log(`   ${CONFIRMATION_ENV}=${REQUIRED_VALUE}\n`);
  }

  // Find all OrganizationMembers without a corporateProfileId
  const legacyMembers = await prisma.organizationMember.findMany({
    where: { corporateProfileId: null } as any,
    include: { profile: true, organization: true },
  }) as any[];

  console.log(`📋 Organizaciones encontrados sin perfil corporativo: ${legacyMembers.length}\n`);

  if (legacyMembers.length === 0) {
    console.log("✅ No hay miembros legacy por backfillear. Todo al día.");
    await prisma.$disconnect();
    return;
  }

  let created = 0;
  let skipped = 0;
  let wouldCreate = 0;
  const anomalies: string[] = [];

  for (const member of legacyMembers) {
    const profile = member.profile as any;
    const organization = member.organization as any;
    const label = `${profile?.firstName || "?"} ${profile?.lastName || "?"} → ${organization?.displayName || organization?.legalName || "?"}`;

    // Skip if no profile to base the corporate profile on
    if (!profile) {
      anomalies.push(`⚠️  ${label} — Sin profile personal (profileId: ${member.profileId})`);
      skipped++;
      continue;
    }

    try {
      if (DRY_RUN) {
        console.log(`   🔍 [DRY RUN] Se crearía perfil corporativo para: ${label}`);
        wouldCreate++;
        continue;
      }

      // Create corporate profile with only minimal safe data
      const corporateProfile = await prisma.profile.create({
        data: {
          firstName: profile.firstName || "Pendiente",
          lastName: profile.lastName || "Pendiente",
          bloodType: "Pendiente",
          profileType: "corporate",
          accountId: profile.accountId || null,
          // NO copy: userId, allergies, chronicConditions, medications,
          // isInsured, insuranceProvider, insurancePolicyNumber,
          // preferredHospital, insuranceEmergencyPhone,
          // primaryDoctorName, primaryDoctorPhone
        },
      });

      // Link corporate profile to the OrganizationMember
      await prisma.organizationMember.update({
        where: { id: member.id },
        data: { corporateProfileId: corporateProfile.id } as any,
      });

      console.log(`   ✅ Creado perfil corporativo para: ${label} → ID: ${corporateProfile.id}`);
      created++;
    } catch (err: any) {
      anomalies.push(`❌  ${label} — Error: ${err.message}`);
      skipped++;
    }
  }

  console.log(`\n📊 Resumen:`);
  console.log(`   Miembros legacy: ${legacyMembers.length}`);
  if (DRY_RUN) {
    console.log(`   Perfiles que se crearían: ${wouldCreate}`);
    console.log(`   (Ejecutar con ${CONFIRMATION_ENV}=${REQUIRED_VALUE} para escritura real)`);
  } else {
    console.log(`   Perfiles corporativos creados: ${created}`);
  }
  console.log(`   Saltados/con error: ${skipped}`);

  if (anomalies.length > 0) {
    console.log(`\n⚠️  Anomalías encontradas:`);
    anomalies.forEach((a) => console.log(`   ${a}`));
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("❌ Error fatal:", err);
  process.exit(1);
});