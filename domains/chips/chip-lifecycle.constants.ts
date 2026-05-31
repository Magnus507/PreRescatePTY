export const CHIP_STATUS = {
  INVENTORY: "inventory",
  SOLD: "sold",
  ACTIVATED: "activated",
  SUSPENDED: "suspended",
  DAMAGED: "damaged",
  LOST: "lost",
} as const;

export const CHIP_SERVICE_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  EXPIRED: "expired",
  SUSPENDED: "suspended",
} as const;

export const ACTIVATABLE_CHIP_STATUSES = [
  CHIP_STATUS.INVENTORY,
  CHIP_STATUS.SOLD,
] as const;

export const USED_CAPACITY_CHIP_STATUSES = [
  CHIP_STATUS.ACTIVATED,
  CHIP_STATUS.SUSPENDED,
] as const;

export const PUBLIC_ACTIVE_CHIP_STATUSES = [
  CHIP_STATUS.ACTIVATED,
] as const;

export const UNAVAILABLE_INVENTORY_STATUSES = [
  CHIP_STATUS.SOLD,
  CHIP_STATUS.ACTIVATED,
  CHIP_STATUS.SUSPENDED,
  CHIP_STATUS.DAMAGED,
  CHIP_STATUS.LOST,
] as const;
