export const warrantySelect = {
  id: true,
  code: true,
  status: true,
  coverageStatus: true,
  customerName: true,
  serialReference: true,
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
  dispatchedAt: true,
  deliveredAt: true,
  activatedAt: true,
} as const;

export const replacementInclude = {
  warranty: {
    select: warrantySelect,
  },
  commercialOrder: {
    select: commercialOrderSelect,
  },
  originalFinishedGood: {
    select: finishedGoodSelect,
  },
  replacementFinishedGood: {
    select: finishedGoodSelect,
  },
  originalDispatch: {
    select: dispatchSelect,
  },
  replacementDispatch: {
    select: dispatchSelect,
  },
  originalUnit: {
    select: unitSelect,
  },
  replacementUnit: {
    select: unitSelect,
  },
  events: {
    orderBy: { createdAt: "desc" },
    take: 10,
  },
} as const;
