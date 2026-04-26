export interface SetupChecklist {
  medicalProfileComplete: boolean;
  chipActivated: boolean;
  emergencyContactAdded: boolean;
  setupComplete: boolean;
}
export interface AccountState {
  accountId: string | null;
  packageId: string | null;
  packagePrice: number;
  accountType: string;
  packageName: string;
  maxChipsAllocated: number;  
  maxProfilesAllocated: number;
  serviceStatus: string; 
  serviceEndDate: Date | null;
  serviceDurationMonths: number;
  isExpired: boolean;
  isInactive: boolean;
  
  // Account Category Flags
  isPersonal: boolean;
  isFamily: boolean;
  isCorporate: boolean; 
  isOrganization: boolean; 
  isOwner: boolean;
  
  // Logic Permissions
  canManageFamilyProfiles: boolean;
  canAccessOrganizationModule: boolean;
  canActivateMoreChips: boolean;
  canAddFamilyMember: boolean;
  
  // Consumption Stats
  activeChipsCount: number;
  physicalChipsInTransitCount: number; // New field for logistics tracking
  familyProfilesCount: number;
  contactsCount: number;
  scansCount: number;
  
  // Achievement/Status Flags
  hasCompletedMedicalProfile: boolean;
  hasEmergencyContact: boolean;
  hasActivatedChip: boolean;
  
  // Checklist
  setupChecklist: SetupChecklist;
}
