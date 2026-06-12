export interface MockOrganizationMember {
  id: string
  organizationId: string
  profileId: string
  locationId: string | null
  departmentId: string | null
  corporateProfileId: string | null
  employeeId: string | null
  internalCode: string | null
  position: string | null
  shift: string | null
  occupationalRisks: string[]
  medicalRestrictions: string | null
  emergencyProtocol: string | null
  supervisorName: string | null
  supervisorPhone: string | null
  corporateStatus: string
  employeeNationalId: string | null
  employeeAge: number | null
  employeePhone: string | null
  employeePosition: string | null
  employeeDepartment: string | null
  employeeInternalId: string | null
  employeeNote: string | null
  memberStatus: string
  createdAt: Date
  updatedAt: Date
}

let memberCounter = 0

export function createMockOrganizationMember(overrides: Partial<MockOrganizationMember> = {}): MockOrganizationMember {
  memberCounter++
  const id = `member-${memberCounter}`
  return {
    id,
    organizationId: 'org-1',
    profileId: `profile-${memberCounter}`,
    locationId: null,
    departmentId: null,
    corporateProfileId: null,
    employeeId: `EMP${String(memberCounter).padStart(4, '0')}`,
    internalCode: null,
    position: 'Empleado',
    shift: 'Diurno',
    occupationalRisks: [],
    medicalRestrictions: null,
    emergencyProtocol: null,
    supervisorName: null,
    supervisorPhone: null,
    corporateStatus: 'paid_active',
    employeeNationalId: null,
    employeeAge: null,
    employeePhone: null,
    employeePosition: null,
    employeeDepartment: null,
    employeeInternalId: null,
    employeeNote: null,
    memberStatus: 'active',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }
}

export function resetOrganizationMemberCounter(): void {
  memberCounter = 0
}