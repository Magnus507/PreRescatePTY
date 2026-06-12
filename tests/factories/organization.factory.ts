export interface MockOrganization {
  id: string
  accountId: string
  legalName: string
  displayName: string | null
  companyCode: string | null
  organizationType: string
  taxId: string | null
  contactEmail: string | null
  contactPhone: string | null
  address: string | null
  status: string
  emergencyButton1Label: string | null
  emergencyButton1Phone: string | null
  emergencyButton2Label: string | null
  emergencyButton2Phone: string | null
  emergencyButton3Label: string | null
  emergencyButton3Phone: string | null
  createdAt: Date
  updatedAt: Date
}

let orgCounter = 0

export function createMockOrganization(overrides: Partial<MockOrganization> = {}): MockOrganization {
  orgCounter++
  const id = `org-${orgCounter}`
  return {
    id,
    accountId: 'test-account-id',
    legalName: `Empresa ${orgCounter}`,
    displayName: `Empresa ${orgCounter}`,
    companyCode: `EMP-${String(orgCounter).padStart(4, '0')}`,
    organizationType: 'company',
    taxId: null,
    contactEmail: `contact${orgCounter}@empresa.com`,
    contactPhone: '+5076000000',
    address: null,
    status: 'active',
    emergencyButton1Label: 'Brigada Interna',
    emergencyButton1Phone: null,
    emergencyButton2Label: 'Seguridad Control',
    emergencyButton2Phone: null,
    emergencyButton3Label: 'Ambulancia / Clínica',
    emergencyButton3Phone: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }
}

export function resetOrganizationCounter(): void {
  orgCounter = 0
}