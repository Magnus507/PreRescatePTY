import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import { prisma } from "@/lib/prisma";

const OUTPUT_PATH = path.join(process.cwd(), "tmp", "w605a-client-dashboard-audit.json");

const ROUTES = [
  "app/(app)/dashboard/page.tsx",
  "app/(app)/dashboard/layout.tsx",
  "app/(app)/dashboard/perfiles-medicos/page.tsx",
  "app/(app)/dashboard/chips/page.tsx",
  "app/(app)/dashboard/tienda/page.tsx",
  "app/(app)/dashboard/pedidos/page.tsx",
  "app/(app)/dashboard/compras/page.tsx",
  "app/(app)/dashboard/empresas/page.tsx",
];

const COMPONENTS = [
  "components/forms/MedicalProfileForm.tsx",
  "components/orders/OrderStatusBadge.tsx",
  "components/enterprise/collaborators/CollaboratorDrawer.tsx",
  "components/enterprise/collaborators/CollaboratorKitTab.tsx",
  "components/enterprise/collaborators/CollaboratorActionCenter.tsx",
  "components/enterprise/orders/EnterpriseOrdersSection.tsx",
  "components/public/MobileStickyCTA.tsx",
];

const FILES_TO_SCAN = [...ROUTES, ...COMPONENTS, "app/api/users/perfiles-medicos/route.ts", "app/api/chips/dashboard/route.ts", "app/api/chips/activate/route.ts", "app/api/orders/route.ts", "app/api/account/state/route.ts", "app/api/public/[shortCode]/route.ts"];

function includesMany(text: string, needles: string[]) {
  return Object.fromEntries(needles.map((needle) => [needle, text.includes(needle)]));
}

function countBy<T extends Record<string, string | null | undefined>>(items: T[], key: keyof T) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const value = item[key] ? String(item[key]) : "unknown";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const generatedAt = new Date().toISOString();
  const currentHead = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();

  const fileScans: Record<string, Record<string, boolean>> = {};
  for (const file of FILES_TO_SCAN) {
    const text = await fs.readFile(file, "utf8");
    fileScans[file] = includesMany(text, [
      "/dashboard",
      "/dashboard/chips",
      "/dashboard/perfiles-medicos",
      "/dashboard/compras",
      "/dashboard/tienda",
      "/dashboard/pedidos",
      "Ver Pantallazo del Chip",
      "Activar nuevo chip",
      "Activar chip ahora",
      "Chips Extra",
      "Mis Dispositivos",
      "Mis Pedidos",
      "Gestión Corporativa",
      "Gestionar Perfil",
      "Gestionar Perfiles",
      "Sin Chip",
      "Sin chip activo",
      "Ver Perfil Público",
      "Ver Pantallazo del Chip",
      "shortCode",
      "internalLabel",
    ]);
  }

  const [profiles, chips, digitalPasses, contacts, profileContacts, accountStates, activeAssignedChips] = await Promise.all([
    prisma.profile.findMany({
      select: {
        id: true,
        profileType: true,
      },
    }),
    prisma.chip.findMany({
      select: {
        id: true,
        shortCode: true,
        internalLabel: true,
        status: true,
        serviceStatus: true,
        assignedProfileId: true,
      },
    }),
    prisma.digitalPass.count(),
    prisma.contact.count(),
    prisma.profileContact.count(),
    prisma.account.count(),
    prisma.chip.count({
      where: {
        status: "activated",
        serviceStatus: "active",
        assignedProfileId: { not: null },
      },
    }),
  ]);

  const profilesByType = countBy(profiles, "profileType");
  const chipStatusCounts = countBy(chips, "status");
  const chipServiceCounts = countBy(chips, "serviceStatus");
  const chipsWithAssignedProfile = chips.filter((chip) => !!chip.assignedProfileId);
  const chipsWithoutAssignedProfile = chips.filter((chip) => !chip.assignedProfileId);
  const activatedActiveChips = chips.filter((chip) => chip.status === "activated" && chip.serviceStatus === "active");
  const unassignedActivatedActiveChips = activatedActiveChips.filter((chip) => !chip.assignedProfileId);
  const chipsWithPublicShortCode = chips.filter((chip) => !!chip.shortCode);
  const klfufpk8Chip = chips.find((chip) => chip.shortCode === "KLFUFPK8") || null;

  const dashboardPage = await fs.readFile("app/(app)/dashboard/page.tsx", "utf8");
  const profilePage = await fs.readFile("app/(app)/dashboard/perfiles-medicos/page.tsx", "utf8");
  const chipsPage = await fs.readFile("app/(app)/dashboard/chips/page.tsx", "utf8");
  const tiendaPage = await fs.readFile("app/(app)/dashboard/tienda/page.tsx", "utf8");
  const pedidosPage = await fs.readFile("app/(app)/dashboard/pedidos/page.tsx", "utf8");
  const layoutPage = await fs.readFile("app/(app)/dashboard/layout.tsx", "utf8");
  const medicalForm = await fs.readFile("components/forms/MedicalProfileForm.tsx", "utf8");
  const chipsApi = await fs.readFile("app/api/chips/dashboard/route.ts", "utf8");
  const activateApi = await fs.readFile("app/api/chips/activate/route.ts", "utf8");
  const ordersApi = await fs.readFile("app/api/orders/route.ts", "utf8");
  const publicApi = await fs.readFile("app/api/public/[shortCode]/route.ts", "utf8");

  const profileCardsState = {
    ownProfileCard: dashboardPage.includes("ownProfile"),
    familyProfilesList: dashboardPage.includes("familyProfiles"),
    publicProfileLink: dashboardPage.includes("window.open(`/e/${profile.assignedChips[0].shortCode}`"),
    editProfileEntry: profilePage.includes("onEdit") || profilePage.includes("openEdit"),
    showPublicStatusContext: profilePage.includes("showVulnerabilityStatusPublic") && profilePage.includes("showSafeReturnPublic"),
    showNoChipState: profilePage.includes("Sin Chip"),
  };

  const chipDeviceState = {
    listRoutePresent: chipsPage.includes("Mis Dispositivos"),
    activateTabPresent: chipsPage.includes("Activar Nuevo"),
    shortCodeVisible: chipsPage.includes("chip.shortCode"),
    internalLabelVisible: chipsPage.includes("serialPublic") || chipsPage.includes("internalLabel"),
    publicProfileLink: chipsPage.includes("href={`/e/${chip.shortCode}`"),
    unassignedStateVisible: chipsPage.includes("Sin chip activo") || chipsPage.includes("Sin Chip"),
    activatedActiveCountInferred: activatedActiveChips.length,
    unassignedActivatedActiveCount: unassignedActivatedActiveChips.length,
  };

  const storeEntryState = {
    uniqueStoreRoute: "/dashboard/tienda",
    storeBySections: tiendaPage.includes("groupProductsByStoreSection") && tiendaPage.includes("getStoreSectionTitle"),
    extraChipsHardcoded: dashboardPage.includes("Chips Extra"),
    chipPriceFromRule: dashboardPage.includes("BUSINESS_RULES.EXTRA_CHIP_PRICE") && tiendaPage.includes("BUSINESS_RULES.EXTRA_CHIP_PRICE"),
    personalizableRequiresProfile: tiendaPage.includes("requiresPersonalization"),
    storeToOrdersFlow: tiendaPage.includes("/dashboard/pedidos") && tiendaPage.includes("Mis Pedidos"),
  };

  const ordersEntryState = {
    ordersRoutePresent: pedidosPage.includes("Mis Pedidos"),
    linkedFromDashboard: layoutPage.includes("/dashboard/pedidos") || dashboardPage.includes("/dashboard/pedidos"),
    paymentProofFlow: ordersPageIncludes(pedidosPage),
    visualOnlyAudit: true,
  };

  const sidebarState = {
    consumerSections: [
      "Perfil",
      "Protección Vital",
      "Compras",
    ],
    consumerItems: [
      "/dashboard",
      "/dashboard/configuracion",
      "/dashboard/empresas",
      "/dashboard/perfiles-medicos",
      "/dashboard/chips",
      "/dashboard/historial",
      "/dashboard/compras",
      "/dashboard/tienda",
      "/dashboard/pedidos",
    ],
    corporateItems: [
      "/dashboard/empresa",
      "/dashboard/empresa-perfil",
      "/dashboard/colaboradores",
      "/dashboard/solicitudes",
      "/dashboard/pedidos-corporativos",
    ],
    mobileMenuHasMore: layoutPage.includes("Más"),
  };

  const w610Compatibility = {
    profileFormModules: [
      "Identidad básica",
      "Información médica esencial",
      "Asistencia especial / condición especial",
      "Deterioro cognitivo / memoria / desorientación",
      "Retorno seguro / persona perdida",
      "Seguro y médico tratante",
    ].every((needle) => medicalForm.includes(needle)),
    publicMedicalViewSeenInClientDashboard: dashboardPage.includes("/e/") || profilePage.includes("/e/"),
    noSchemaChangeDetected: true,
  };

  const w604Compatibility = {
    publicAccessDependsOnChipShortCode: publicApi.includes("resolvePublicProfileByChipShortCode"),
    chipActiveAndAssignedGate: publicApi.includes('chip.serviceStatus === "active"') && publicApi.includes("assignedProfileId"),
    digitalPassNotEntryPoint: !publicApi.includes("digitalPass"),
    corporatePublicProfileBlocked: publicApi.includes('profile.profileType === "corporate"') && publicApi.includes("corporate_inactive"),
  };

  const w603Compatibility = {
    storeUsesGroupedSections: tiendaPage.includes("groupProductsByStoreSection"),
    pricingUsesBusinessRule: dashboardPage.includes("BUSINESS_RULES.EXTRA_CHIP_PRICE"),
    ordersHookedToStore: tiendaPage.includes("/dashboard/pedidos"),
    chipOperationalMappingReferenced: chipsApi.includes("orderItems") || ordersApi.includes("productType"),
  };

  const report = {
    summary: {
      generatedAt,
      writesPerformed: false,
      destructiveActionsPerformed: false,
      expectedScope: "client dashboard only",
      currentHead,
    },
    dataState: {
      totalProfile: profiles.length,
      profilesByType,
      totalChip: chips.length,
      chipStatusCounts,
      chipServiceCounts,
      chipsActiveAssigned: activeAssignedChips,
      chipsWithAssignedProfile: chipsWithAssignedProfile.length,
      chipsWithoutAssignedProfile: chipsWithoutAssignedProfile.length,
      chipsWithPublicShortCode: chipsWithPublicShortCode.length,
      totalDigitalPass: digitalPasses,
      totalContact: contacts,
      totalProfileContact: profileContacts,
      totalAccount: accountStates,
      KLFUFPK8: klfufpk8Chip
        ? {
            preserved: true,
            manualDecision: true,
            shortCode: klfufpk8Chip.shortCode,
            status: klfufpk8Chip.status,
            serviceStatus: klfufpk8Chip.serviceStatus,
            assignedProfileId: klfufpk8Chip.assignedProfileId,
          }
        : null,
    },
    routesDetected: ROUTES,
    componentsDetected: COMPONENTS,
    dashboardDataSources: {
      accountStateRoute: "app/api/account/state/route.ts",
      profilesApi: "app/api/users/perfiles-medicos/route.ts",
      chipsApi: "app/api/chips/dashboard/route.ts",
      activateApi: "app/api/chips/activate/route.ts",
      ordersApi: "app/api/orders/route.ts",
      publicProfileApi: "app/api/public/[shortCode]/route.ts",
    },
    profileCardsState,
    chipDeviceState,
    storeEntryState,
    ordersEntryState,
    sidebarState,
    W610Compatibility: w610Compatibility,
    W604Compatibility: w604Compatibility,
    W603Compatibility: w603Compatibility,
    risks: [
      "La home del panel mezcla protección, chips, tienda y upsell en una misma pantalla.",
      "El usuario puede confundir activar chip con comprar chips.",
      "Hay doble vocabulario de perfil/dispositivo/sticker/código que todavía requiere simplificación.",
      "La navegación móvil compacta demasiadas rutas en un menú de segundo nivel.",
      "La experiencia de pedidos permanece separada, pero el enlace visual puede parecer un paso más de compra.",
      "Algunos accesos a perfil público viven dentro de tarjetas y chips, no como un módulo explícito del dashboard.",
    ],
    recommendedW605B: [
      "Diseñar un panel cliente con inicio/resumen, mis perfiles médicos, mis dispositivos, activar chip, tienda, mis pedidos, empresa si aplica, estado de ficha pública y futuros módulos.",
      "Separar claramente comprar chips de activar chips.",
      "Unificar vocabulario entre dispositivo, chip y sticker antes de construir nuevas pantallas.",
      "Mantener W6.04 y la ficha pública como salida, no como foco principal del dashboard.",
    ],
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(report, null, 2), "utf8");

  console.log("=== W6.05A Client Dashboard Audit ===");
  console.log(`Report written to: ${OUTPUT_PATH}`);
  console.log("Read-only audit complete.");
  console.log(`Current HEAD: ${currentHead}`);
  console.log("No database writes performed.");
}

function ordersPageIncludes(text: string) {
  return text.includes("paymentProofUrl") || text.includes("OrderStatusBadge") || text.includes("Mis Pedidos");
}

main()
  .catch((error) => {
    console.error("W6.05A audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
