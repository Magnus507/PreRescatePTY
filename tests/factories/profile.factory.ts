export interface MockProfile {
  id: string
  accountId: string | null
  userId: string | null
  firstName: string
  lastName: string
  displayNamePublic: string | null
  birthDate: Date | null
  sex: string | null
  bloodType: string
  allergies: string
  chronicConditions: string
  medications: string
  additionalNotes: string
  isInsured: boolean
  insuranceProvider: string | null
  insurancePolicyNumber: string | null
  preferredHospital: string | null
  insuranceEmergencyPhone: string | null
  primaryDoctorName: string | null
  primaryDoctorPhone: string | null
  showInsuranceProviderPublic: boolean
  showPreferredHospitalPublic: boolean
  showPrimaryDoctorPublic: boolean
  showPrimaryDoctorPhonePublic: boolean
  showAdditionalNotesPublic: boolean
  hasCognitiveImpairment: boolean
  hasWanderingRisk: boolean
  isNonVerbal: boolean
  communicationAssistance: string | null
  safeReturnInstructions: string | null
  showVulnerabilityStatusPublic: boolean
  showCommunicationStatusPublic: boolean
  showSafeReturnPublic: boolean
  safeReturnLocationName: string | null
  safeReturnAddress: string | null
  safeReturnLat: number | null
  safeReturnLng: number | null
  safeReturnContactName: string | null
  safeReturnContactPhone: string | null
  showSafeReturnLocationPublic: boolean
  phone: string | null
  nationalId: string
  address: string | null
  city: string | null
  profileVisibilityStatus: string
  photoUrl: string | null
  lastScanAt: Date | null
  lastScanLocation: string | null
  createdAt: Date
  updatedAt: Date
  profileType: string
}

let profileCounter = 0

export function createMockProfile(overrides: Partial<MockProfile> = {}): MockProfile {
  profileCounter++
  const id = `profile-${profileCounter}`
  return {
    id,
    accountId: 'test-account-id',
    userId: null,
    firstName: 'Juan',
    lastName: 'Perez',
    displayNamePublic: null,
    birthDate: new Date('1990-01-01'),
    sex: 'M',
    bloodType: 'O+',
    allergies: '',
    chronicConditions: '',
    medications: '',
    additionalNotes: '',
    isInsured: false,
    insuranceProvider: null,
    insurancePolicyNumber: null,
    preferredHospital: null,
    insuranceEmergencyPhone: null,
    primaryDoctorName: null,
    primaryDoctorPhone: null,
    showInsuranceProviderPublic: false,
    showPreferredHospitalPublic: false,
    showPrimaryDoctorPublic: false,
    showPrimaryDoctorPhonePublic: false,
    showAdditionalNotesPublic: false,
    hasCognitiveImpairment: false,
    hasWanderingRisk: false,
    isNonVerbal: false,
    communicationAssistance: null,
    safeReturnInstructions: null,
    showVulnerabilityStatusPublic: false,
    showCommunicationStatusPublic: false,
    showSafeReturnPublic: false,
    safeReturnLocationName: null,
    safeReturnAddress: null,
    safeReturnLat: null,
    safeReturnLng: null,
    safeReturnContactName: null,
    safeReturnContactPhone: null,
    showSafeReturnLocationPublic: false,
    phone: null,
    nationalId: '',
    address: null,
    city: null,
    profileVisibilityStatus: 'active',
    photoUrl: null,
    lastScanAt: null,
    lastScanLocation: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    profileType: 'personal',
    ...overrides,
  }
}

export function resetProfileCounter(): void {
  profileCounter = 0
}