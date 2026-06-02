/**
 * BACKFILL: Asignar assignedProfileId a chips corporativos históricos.
 *
 * Contexto:
 * El commit 3ccedee corrigió el flujo nuevo para que los chips empresariales
 * asignados apunten al corporateProfile (Chip.assignedProfileId = OrganizationMember.corporateProfileId).
 * Pero los chips asignados antes de ese commit pueden tener assignedProfileId = NULL.
 *
 * Este script audita y corrige esos chips.
 *
 * DRY_RUN=true (default)  → solo audit, no escribe
 * DRY_RUN=false            → ejecuta UPDATE real
 *
 * Uso:
 *   DRY_RUN=true  npx tsx scripts/backfill-corporate-chip-profiles.ts   # solo audit
 *   DRY_RUN=false npx tsx scripts/backfill-corporate-chip-profiles.ts   # escritura real
 *
 * No toca:
 *   - chips personales
 *   - chips con assignedProfileId ya definido
 *   - chips lost/damaged
 *   - schema
 *   - migraciones
 */

import { config } from "dotenv";
import { resolve } from "path";

// Cargar .env.local (Prisma no lo hace automáticamente fuera de Next.js)
config({ path: resolve(__dirname, "../.env.local") });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DRY_RUN = process.env.DRY_RUN !== "false";

/**
 * Estados de chip que NO deben modificarse bajo ninguna circunstancia.
 */
const BLOCKED_CHIP_STATUSES = ["lost", "damaged", "stolen", "revoked", "expired"];

interface ChipFixCandidate {
  itemId: string;
  chipId: string;
  shortCode: string;
  chipStatus: string;
  fulfillmentStatus: string;
  orgMemberId: string;
  corporateProfileId: string;
  assignedProfileId: string | null;
  organizationId: string;
  orderId: string;
}

async function audit(): Promise<ChipFixCandidate[]> {
  console.log("================================================================");
  console.log(" AUDITORÍA / BACKFILL — Chips corporativos con assignedProfileId NULL");
  console.log(` Modo: ${DRY_RUN ? "🔍 DRY RUN (solo lectura)" : "✏️  REAL (escritura)"}`);
  console.log("================================================================");
  console.log();

  // Buscar CorporateOrderEmployeeItem donde:
  //  - chipId no es null
  //  - el chip asociado tiene assignedProfileId = null
  //  - el miembro de la organización tiene corporateProfileId no null
  const items = await prisma.corporateOrderEmployeeItem.findMany({
    where: {
      chipId: { not: null },
      fulfillmentStatus: { notIn: ["pending_assignment"] },
    },
    include: {
      chip: {
        select: {
          id: true,
          shortCode: true,
          status: true,
          assignedProfileId: true,
        },
      },
      organizationMember: {
        select: {
          id: true,
          corporateProfileId: true,
          corporateStatus: true,
          organizationId: true,
        },
      },
      order: {
        select: {
          id: true,
          orderNumber: true,
        },
      },
    },
  });

  console.log(`Total CorporateOrderEmployeeItem con chip asignado: ${items.length}`);
  console.log();

  // Filtrar solo los que tienen assignedProfileId null EN el chip
  // Y corporateProfileId existe en el miembro
  const candidates: ChipFixCandidate[] = [];

  for (const item of items) {
    if (!item.chip) continue;
    if (item.chip.assignedProfileId !== null) continue;
    if (!item.organizationMember?.corporateProfileId) continue;

    candidates.push({
      itemId: item.id,
      chipId: item.chip.id,
      shortCode: item.chip.shortCode,
      chipStatus: item.chip.status,
      fulfillmentStatus: item.fulfillmentStatus,
      orgMemberId: item.organizationMember.id,
      corporateProfileId: item.organizationMember.corporateProfileId,
      assignedProfileId: item.chip.assignedProfileId,
      organizationId: item.organizationMember.organizationId,
      orderId: item.order.id,
    });
  }

  // Chips únicos (un mismo chip puede aparecer en varios items? no debería, pero por seguridad)
  const uniqueChipIds = new Set(candidates.map((c) => c.chipId));

  console.log(`Items afectados (chip.assignedProfileId IS NULL + corporateProfileId existe): ${candidates.length}`);
  console.log(`Chips únicos afectados: ${uniqueChipIds.size}`);
  console.log();

  if (candidates.length === 0) {
    console.log("✅ No hay chips corporativos históricos por corregir.");
    return [];
  }

  // Breakdown by chip status
  const byStatus: Record<string, number> = {};
  for (const c of candidates) {
    byStatus[c.chipStatus] = (byStatus[c.chipStatus] || 0) + 1;
  }

  console.log("--- DESGLOSE POR STATUS DEL CHIP ---");
  for (const [status, count] of Object.entries(byStatus)) {
    const blocked = BLOCKED_CHIP_STATUSES.includes(status) ? " ⛔ BLOQUEADO" : "";
    console.log(`  ${status}: ${count}${blocked}`);
  }
  console.log();

  // Chips bloqueados (lost/damaged/stolen/revoked/expired)
  const blocked = candidates.filter((c) => BLOCKED_CHIP_STATUSES.includes(c.chipStatus));
  const fixable = candidates.filter((c) => !BLOCKED_CHIP_STATUSES.includes(c.chipStatus));

  if (blocked.length > 0) {
    console.log(`⚠️  Chips en estado bloqueado (${blocked.length}) — NO se modificarán:`);
    for (const c of blocked) {
      console.log(`    ${c.shortCode} → status: ${c.chipStatus}`);
    }
    console.log();
  }

  if (fixable.length > 0) {
    console.log(`✅ Chips CORREGIBLES: ${fixable.length}`);
    console.log();
    console.log("--- DETALLE ---");
    for (const c of fixable) {
      console.log(`  shortCode:           ${c.shortCode}`);
      console.log(`  chip.id:             ${c.chipId}`);
      console.log(`  chip.status:         ${c.chipStatus}`);
      console.log(`  chip.assignedProfileId: ${c.assignedProfileId ?? "null"}`);
      console.log(`  fulfillmentStatus:   ${c.fulfillmentStatus}`);
      console.log(`  orgMember.id:        ${c.orgMemberId}`);
      console.log(`  corporateProfileId:  ${c.corporateProfileId}`);
      console.log(`  order.id:            ${c.orderId}`);
      console.log(`  ---`);
    }
  }

  return fixable;
}

async function backfill(candidates: ChipFixCandidate[]) {
  if (candidates.length === 0) {
    console.log("No hay chips que corregir. Saliendo.");
    return;
  }

  if (DRY_RUN) {
    console.log();
    console.log("🔍 DRY RUN — No se ejecutaron cambios.");
    console.log(`   Para ejecutar el backfill real, usar: DRY_RUN=false npx tsx scripts/backfill-corporate-chip-profiles.ts`);
    return;
  }

  console.log();
  console.log("✏️  EJECUTANDO BACKFILL REAL...");
  console.log();

  let updated = 0;
  let errors = 0;

  for (const c of candidates) {
    try {
      await prisma.chip.update({
        where: { id: c.chipId },
        data: {
          assignedProfileId: c.corporateProfileId,
        },
      });
      console.log(`  ✅ ${c.shortCode}: assignedProfileId = ${c.corporateProfileId}`);
      updated++;
    } catch (err: any) {
      console.error(`  ❌ ${c.shortCode}: Error — ${err.message}`);
      errors++;
    }
  }

  console.log();
  console.log("================================================================");
  console.log(" RESUMEN BACKFILL");
  console.log("================================================================");
  console.log(`  Candidatos:     ${candidates.length}`);
  console.log(`  Actualizados:   ${updated}`);
  console.log(`  Errores:        ${errors}`);
  console.log("================================================================");
}

async function main() {
  try {
    const candidates = await audit();
    await backfill(candidates);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});