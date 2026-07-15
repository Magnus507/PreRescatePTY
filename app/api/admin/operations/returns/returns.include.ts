export const warrantySelect = {
  id: true,
  code: true,
  status: true,
  coverageStatus: true,
  customerName: true,
} as const;

export const replacementSelect = {
  id: true,
  code: true,
  status: true,
  replacementType: true,
} as const;

export const commercialOrderSelect = {
  id: true,
  code: true,
  status: true,
  customerName: true,
  customerEmail: true,
  customerPhone: true,
} as const;

export const finishedGoodSelect = {
  id: true,
  code: true,
  name: true,
  productType: true,
  status: true,
  unit: true,
} as const;

export const dispatchSelect = {
  id: true,
  code: true,
  status: true,
  destinationType: true,
  destinationName: true,
} as const;

export const unitSelect = {
  id: true,
  internalLabel: true,
  productCode: true,
  productName: true,
  status: true,
  activationStatus: true,
  deliveredAt: true,
  activatedAt: true,
} as const;

export const returnInclude = {
  warranty: {
    select: warrantySelect,
  },
  replacement: {
    select: replacementSelect,
  },
  commercialOrder: {
    select: commercialOrderSelect,
  },
  finishedGood: {
    select: finishedGoodSelect,
  },
  originalDispatch: {
    select: dispatchSelect,
  },
  unit: {
    select: unitSelect,
  },
  events: {
    orderBy: { createdAt: "desc" },
    take: 10,
  },
} as const;
