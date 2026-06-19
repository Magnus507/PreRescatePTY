/**
 * Delete eligibility helper for inventory chips.
 * 
 * Determines whether a chip can be safely deleted based on data
 * available in the inventory list response.
 * 
 * The backend is the final authority — this is only preventive UX.
 */

import type { ChipAdmin } from "../_types/admin";

export interface DeleteEligibility {
  canDelete: boolean;
  reasons: string[];
}

/**
 * Checks if an inventory chip is eligible for deletion.
 * Returns true only for truly virgin inventory records.
 */
export function canDeleteInventoryChip(chip: ChipAdmin): DeleteEligibility {
  const reasons: string[] = [];

  // Must be in inventory status
  if (chip.status !== "inventory") {
    reasons.push("El estado del chip no es 'inventario'");
  }

  // Must have no owner
  if (chip.ownerUserId) {
    reasons.push("Tiene un propietario asignado");
  }

  // Must have no assigned profile
  if (chip.assignedProfile) {
    reasons.push("Tiene un perfil clínico asignado");
  }

  // Must have no service dates
  if (chip.serviceStartDate) {
    reasons.push("Tiene fecha de inicio de servicio");
  }
  if (chip.serviceEndDate) {
    reasons.push("Tiene fecha de vencimiento de servicio");
  }

  // Must not be activated
  if (chip.activatedAt) {
    reasons.push("Ha sido activado");
  }

  // Must not be consigned
  if (chip.pointOfSaleId) {
    reasons.push("Está consignado en un punto de venta");
  }
  if (chip.consignedAt) {
    reasons.push("Tiene registro de consignación");
  }

  // Must have no claim tokens (activation codes)
  if (chip.claimTokens && chip.claimTokens.length > 0) {
    reasons.push("Tiene códigos de activación asociados");
  }

  // Must have no scan history
  if (chip._count?.scanEvents && chip._count.scanEvents > 0) {
    reasons.push("Tiene historial de escaneos");
  }

  return {
    canDelete: reasons.length === 0,
    reasons,
  };
}