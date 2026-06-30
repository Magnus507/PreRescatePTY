-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "image" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "stock" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productType" TEXT NOT NULL DEFAULT 'otro',
    "estimatedProductionTime" TEXT,
    "requiresPersonalization" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accountName" TEXT,
    "accountType" TEXT NOT NULL DEFAULT 'personal',
    "maxChipsAllocated" INTEGER NOT NULL DEFAULT 1,
    "maxProfilesAllocated" INTEGER NOT NULL DEFAULT 1,
    "ownerUserId" TEXT,
    "packageId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Package" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "maxChips" INTEGER NOT NULL,
    "maxProfiles" INTEGER NOT NULL DEFAULT 1,
    "price" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "accountType" TEXT NOT NULL DEFAULT 'personal',
    "icon" TEXT,
    "color" TEXT,
    "recommended" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "savings" TEXT,
    "allowsFamilyProfiles" BOOLEAN NOT NULL DEFAULT false,
    "allowsOrganizationModule" BOOLEAN NOT NULL DEFAULT false,
    "allowsSchoolModule" BOOLEAN NOT NULL DEFAULT false,
    "serviceDurationMonths" INTEGER NOT NULL DEFAULT 24,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "accountId" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "adminRole" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "accountId" TEXT,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "displayNamePublic" TEXT,
    "sex" TEXT,
    "bloodType" TEXT NOT NULL,
    "allergies" TEXT NOT NULL DEFAULT '',
    "chronicConditions" TEXT NOT NULL DEFAULT '',
    "medications" TEXT NOT NULL DEFAULT '',
    "additionalNotes" TEXT NOT NULL DEFAULT '',
    "phone" TEXT,
    "profileVisibilityStatus" TEXT NOT NULL DEFAULT 'active',
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nationalId" TEXT DEFAULT '',
    "lastScanAt" TIMESTAMP(3),
    "lastScanLocation" TEXT,
    "address" TEXT,
    "city" TEXT,
    "birthDate" TIMESTAMP(3),
    "isInsured" BOOLEAN NOT NULL DEFAULT false,
    "insuranceProvider" TEXT,
    "insurancePolicyNumber" TEXT,
    "preferredHospital" TEXT,
    "insuranceEmergencyPhone" TEXT,
    "primaryDoctorName" TEXT,
    "primaryDoctorPhone" TEXT,
    "showInsuranceProviderPublic" BOOLEAN NOT NULL DEFAULT false,
    "showPreferredHospitalPublic" BOOLEAN NOT NULL DEFAULT false,
    "showPrimaryDoctorPublic" BOOLEAN NOT NULL DEFAULT false,
    "showPrimaryDoctorPhonePublic" BOOLEAN NOT NULL DEFAULT false,
    "showAdditionalNotesPublic" BOOLEAN NOT NULL DEFAULT false,
    "profileType" TEXT NOT NULL DEFAULT 'personal',
    "hasCognitiveImpairment" BOOLEAN NOT NULL DEFAULT false,
    "hasWanderingRisk" BOOLEAN NOT NULL DEFAULT false,
    "isNonVerbal" BOOLEAN NOT NULL DEFAULT false,
    "communicationAssistance" TEXT,
    "safeReturnInstructions" TEXT,
    "showVulnerabilityStatusPublic" BOOLEAN NOT NULL DEFAULT false,
    "showCommunicationStatusPublic" BOOLEAN NOT NULL DEFAULT false,
    "showSafeReturnPublic" BOOLEAN NOT NULL DEFAULT false,
    "safeReturnLocationName" TEXT,
    "safeReturnAddress" TEXT,
    "safeReturnLat" DOUBLE PRECISION,
    "safeReturnLng" DOUBLE PRECISION,
    "safeReturnContactName" TEXT,
    "safeReturnContactPhone" TEXT,
    "showSafeReturnLocationPublic" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "notifyEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifySms" BOOLEAN NOT NULL DEFAULT false,
    "notifyWhatsapp" BOOLEAN NOT NULL DEFAULT false,
    "relationship" TEXT NOT NULL DEFAULT 'Familiar',

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileContact" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "contactType" TEXT NOT NULL DEFAULT 'auxilio',
    "priorityOrder" INTEGER NOT NULL DEFAULT 1,
    "notifySms" BOOLEAN NOT NULL DEFAULT false,
    "notifyEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifyWhatsapp" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chip" (
    "id" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accountId" TEXT,
    "assignedProfileId" TEXT,
    "batchId" TEXT,
    "chipAlias" TEXT,
    "chipUidInternal" TEXT NOT NULL,
    "isPhysical" BOOLEAN NOT NULL DEFAULT false,
    "lastScanAt" TIMESTAMP(3),
    "nfcUrl" TEXT NOT NULL,
    "nicheType" TEXT NOT NULL DEFAULT 'motorcycle',
    "ownerUserId" TEXT,
    "productType" TEXT NOT NULL DEFAULT 'sticker_nfc_qr',
    "qrUrl" TEXT NOT NULL,
    "serialPublic" TEXT NOT NULL,
    "serviceEndDate" TIMESTAMP(3),
    "serviceStartDate" TIMESTAMP(3),
    "serviceStatus" TEXT NOT NULL DEFAULT 'active',
    "transferLock" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'inventory',
    "lastScanLocation" TEXT,
    "internalLabel" TEXT,
    "pointOfSaleId" TEXT,
    "consignedAt" TIMESTAMP(3),

    CONSTRAINT "Chip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointOfSale" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointOfSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "displayName" TEXT,
    "organizationType" TEXT NOT NULL DEFAULT 'company',
    "taxId" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "address" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "emergencyButton1Label" TEXT DEFAULT 'Brigada Interna',
    "emergencyButton1Phone" TEXT,
    "emergencyButton2Label" TEXT DEFAULT 'Seguridad Control',
    "emergencyButton2Phone" TEXT,
    "emergencyButton3Label" TEXT DEFAULT 'Ambulancia / Clínica',
    "emergencyButton3Phone" TEXT,
    "companyCode" TEXT,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorporatePublicProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "logoUrl" TEXT,
    "displayName" TEXT,
    "legalName" TEXT,
    "ruc" TEXT,
    "foundedYear" INTEGER,
    "industry" TEXT,
    "description" TEXT,
    "slogan" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "website" TEXT,
    "address" TEXT,
    "mapUrl" TEXT,
    "businessHours" TEXT,
    "instagram" TEXT,
    "facebook" TEXT,
    "linkedin" TEXT,
    "tiktok" TEXT,
    "xTwitter" TEXT,
    "youtube" TEXT,
    "mainServices" TEXT,
    "mainProducts" TEXT,
    "branches" TEXT,
    "contactPerson" TEXT,
    "contactDepartment" TEXT,
    "certifications" TEXT,
    "licenses" TEXT,
    "operationNotice" TEXT,
    "securityContactName" TEXT,
    "securityPhone" TEXT,
    "emergencyProcedure" TEXT,
    "meetingPoint" TEXT,
    "receptionPhone" TEXT,
    "corporateWhatsapp" TEXT,
    "customEmployeeMessage" TEXT,
    "showCompanyCode" BOOLEAN NOT NULL DEFAULT false,
    "showLogo" BOOLEAN NOT NULL DEFAULT true,
    "showDisplayName" BOOLEAN NOT NULL DEFAULT true,
    "showLegalName" BOOLEAN NOT NULL DEFAULT false,
    "showRuc" BOOLEAN NOT NULL DEFAULT false,
    "showFoundedYear" BOOLEAN NOT NULL DEFAULT false,
    "showIndustry" BOOLEAN NOT NULL DEFAULT true,
    "showDescription" BOOLEAN NOT NULL DEFAULT true,
    "showSlogan" BOOLEAN NOT NULL DEFAULT true,
    "showPhone" BOOLEAN NOT NULL DEFAULT false,
    "showWhatsapp" BOOLEAN NOT NULL DEFAULT false,
    "showEmail" BOOLEAN NOT NULL DEFAULT false,
    "showWebsite" BOOLEAN NOT NULL DEFAULT false,
    "showAddress" BOOLEAN NOT NULL DEFAULT false,
    "showMapUrl" BOOLEAN NOT NULL DEFAULT false,
    "showBusinessHours" BOOLEAN NOT NULL DEFAULT false,
    "showInstagram" BOOLEAN NOT NULL DEFAULT false,
    "showFacebook" BOOLEAN NOT NULL DEFAULT false,
    "showLinkedin" BOOLEAN NOT NULL DEFAULT false,
    "showTiktok" BOOLEAN NOT NULL DEFAULT false,
    "showXTwitter" BOOLEAN NOT NULL DEFAULT false,
    "showYoutube" BOOLEAN NOT NULL DEFAULT false,
    "showMainServices" BOOLEAN NOT NULL DEFAULT false,
    "showMainProducts" BOOLEAN NOT NULL DEFAULT false,
    "showBranches" BOOLEAN NOT NULL DEFAULT false,
    "showContactPerson" BOOLEAN NOT NULL DEFAULT false,
    "showContactDepartment" BOOLEAN NOT NULL DEFAULT false,
    "showCertifications" BOOLEAN NOT NULL DEFAULT false,
    "showLicenses" BOOLEAN NOT NULL DEFAULT false,
    "showOperationNotice" BOOLEAN NOT NULL DEFAULT false,
    "showSecurityContactName" BOOLEAN NOT NULL DEFAULT false,
    "showSecurityPhone" BOOLEAN NOT NULL DEFAULT false,
    "showEmergencyProcedure" BOOLEAN NOT NULL DEFAULT false,
    "showMeetingPoint" BOOLEAN NOT NULL DEFAULT false,
    "showReceptionPhone" BOOLEAN NOT NULL DEFAULT false,
    "showCorporateWhatsapp" BOOLEAN NOT NULL DEFAULT false,
    "showCustomEmployeeMessage" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorporatePublicProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationLocation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationDepartment" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "internalCode" TEXT,
    "department" TEXT,
    "position" TEXT,
    "memberStatus" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "locationId" TEXT,
    "departmentId" TEXT,
    "employeeId" TEXT,
    "shift" TEXT,
    "occupationalRisks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "medicalRestrictions" TEXT,
    "emergencyProtocol" TEXT,
    "supervisorName" TEXT,
    "supervisorPhone" TEXT,
    "corporateStatus" TEXT NOT NULL DEFAULT 'pending_company_review',
    "employeeNationalId" TEXT,
    "employeeAge" INTEGER,
    "employeePhone" TEXT,
    "employeePosition" TEXT,
    "employeeDepartment" TEXT,
    "employeeInternalId" TEXT,
    "employeeNote" TEXT,
    "corporateProfileId" TEXT,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChipClaimToken" (
    "id" TEXT NOT NULL,
    "chipId" TEXT NOT NULL,
    "activationCode" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderId" TEXT,

    CONSTRAINT "ChipClaimToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanEvent" (
    "id" TEXT NOT NULL,
    "chipId" TEXT NOT NULL,
    "profileId" TEXT,
    "accountId" TEXT,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceType" TEXT NOT NULL DEFAULT 'qr',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "geoLat" DOUBLE PRECISION,
    "geoLng" DOUBLE PRECISION,
    "geoAccuracy" DOUBLE PRECISION,
    "country" TEXT,
    "city" TEXT,
    "address" TEXT,
    "emergencyMode" BOOLEAN NOT NULL DEFAULT true,
    "notificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "rawMetadataJson" TEXT,

    CONSTRAINT "ScanEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consent" (
    "id" TEXT NOT NULL,
    "accountId" TEXT,
    "userId" TEXT,
    "profileId" TEXT,
    "consentType" TEXT NOT NULL,
    "textVersion" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "evidenceJson" TEXT,

    CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "accountId" TEXT,
    "actorUserId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValuesJson" TEXT,
    "newValuesJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "chipId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "providerResponse" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL DEFAULT 'manual',
    "providerReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerDocument" TEXT,
    "customerEmail" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "orderNumber" TEXT NOT NULL,
    "orderStatus" TEXT NOT NULL DEFAULT 'pending',
    "paymentProofUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "shippingAddress" TEXT,
    "shippingCity" TEXT,
    "shippingNotes" TEXT,
    "packageId" TEXT,
    "manualPaymentReference" TEXT,
    "paymentMethod" TEXT NOT NULL DEFAULT 'manual',
    "adminReviewStatus" TEXT NOT NULL DEFAULT 'pending',
    "adminReviewedAt" TIMESTAMP(3),
    "adminReviewedById" TEXT,
    "adminReviewNotes" TEXT,
    "organizationId" TEXT,
    "orderType" TEXT NOT NULL DEFAULT 'manual',
    "corporateDeliveryStatus" TEXT NOT NULL DEFAULT 'preparation_pending',
    "estimatedDeliveryDate" TIMESTAMP(3),
    "deliveryNote" TEXT,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "profileId" TEXT,
    "chipId" TEXT,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorporateOrderEmployeeItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "organizationMemberId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chipId" TEXT,
    "fulfillmentStatus" TEXT NOT NULL DEFAULT 'pending_assignment',
    "activatedAt" TIMESTAMP(3),
    "deliveryStatus" TEXT DEFAULT 'pending',
    "deliveredAt" TIMESTAMP(3),
    "deliveredByUserId" TEXT,
    "receivedByUserId" TEXT,
    "deliveryEvidenceUrl" TEXT,
    "deliveryNote" TEXT,

    CONSTRAINT "CorporateOrderEmployeeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorporateProductRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "organizationMemberId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_company_approval',
    "companyReviewedAt" TIMESTAMP(3),
    "companyReviewedById" TEXT,
    "rejectionReason" TEXT,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorporateProductRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorporateProductRequestItem" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorporateProductRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigitalPass" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "passType" TEXT NOT NULL,
    "passUrl" TEXT,
    "serialNumber" TEXT,
    "authToken" TEXT,
    "lastUpdate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DigitalPass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active',
    "name" TEXT,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Package_name_key" ON "Package"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Package_slug_key" ON "Package"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_isAdmin_idx" ON "User"("isAdmin");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_email_idx" ON "PasswordResetToken"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE INDEX "Profile_accountId_idx" ON "Profile"("accountId");

-- CreateIndex
CREATE INDEX "Profile_userId_idx" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileContact_profileId_contactId_key" ON "ProfileContact"("profileId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "Chip_shortCode_key" ON "Chip"("shortCode");

-- CreateIndex
CREATE UNIQUE INDEX "Chip_chipUidInternal_key" ON "Chip"("chipUidInternal");

-- CreateIndex
CREATE UNIQUE INDEX "Chip_serialPublic_key" ON "Chip"("serialPublic");

-- CreateIndex
CREATE UNIQUE INDEX "Chip_internalLabel_key" ON "Chip"("internalLabel");

-- CreateIndex
CREATE INDEX "Chip_accountId_idx" ON "Chip"("accountId");

-- CreateIndex
CREATE INDEX "Chip_ownerUserId_idx" ON "Chip"("ownerUserId");

-- CreateIndex
CREATE INDEX "Chip_status_idx" ON "Chip"("status");

-- CreateIndex
CREATE INDEX "Chip_serviceEndDate_idx" ON "Chip"("serviceEndDate");

-- CreateIndex
CREATE INDEX "Chip_pointOfSaleId_idx" ON "Chip"("pointOfSaleId");

-- CreateIndex
CREATE UNIQUE INDEX "PointOfSale_name_key" ON "PointOfSale"("name");

-- CreateIndex
CREATE INDEX "PointOfSale_isActive_idx" ON "PointOfSale"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_companyCode_key" ON "Organization"("companyCode");

-- CreateIndex
CREATE UNIQUE INDEX "CorporatePublicProfile_organizationId_key" ON "CorporatePublicProfile"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CorporatePublicProfile_shortCode_key" ON "CorporatePublicProfile"("shortCode");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_corporateProfileId_key" ON "OrganizationMember"("corporateProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "ChipClaimToken_activationCode_key" ON "ChipClaimToken"("activationCode");

-- CreateIndex
CREATE INDEX "ScanEvent_accountId_idx" ON "ScanEvent"("accountId");

-- CreateIndex
CREATE INDEX "ScanEvent_chipId_idx" ON "ScanEvent"("chipId");

-- CreateIndex
CREATE INDEX "ScanEvent_scannedAt_idx" ON "ScanEvent"("scannedAt");

-- CreateIndex
CREATE INDEX "ScanEvent_country_idx" ON "ScanEvent"("country");

-- CreateIndex
CREATE INDEX "ScanEvent_city_idx" ON "ScanEvent"("city");

-- CreateIndex
CREATE INDEX "AuditLog_accountId_idx" ON "AuditLog"("accountId");

-- CreateIndex
CREATE INDEX "AuditLog_entityId_idx" ON "AuditLog"("entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_chipId_idx" ON "Notification"("chipId");

-- CreateIndex
CREATE INDEX "Notification_status_idx" ON "Notification"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_orderStatus_idx" ON "Order"("orderStatus");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");

-- CreateIndex
CREATE INDEX "Order_packageId_idx" ON "Order"("packageId");

-- CreateIndex
CREATE INDEX "Order_organizationId_idx" ON "Order"("organizationId");

-- CreateIndex
CREATE INDEX "Order_orderType_idx" ON "Order"("orderType");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_profileId_idx" ON "OrderItem"("profileId");

-- CreateIndex
CREATE INDEX "OrderItem_chipId_idx" ON "OrderItem"("chipId");

-- CreateIndex
CREATE INDEX "CorporateOrderEmployeeItem_orderId_idx" ON "CorporateOrderEmployeeItem"("orderId");

-- CreateIndex
CREATE INDEX "CorporateOrderEmployeeItem_organizationMemberId_idx" ON "CorporateOrderEmployeeItem"("organizationMemberId");

-- CreateIndex
CREATE INDEX "CorporateOrderEmployeeItem_productId_idx" ON "CorporateOrderEmployeeItem"("productId");

-- CreateIndex
CREATE INDEX "CorporateOrderEmployeeItem_chipId_idx" ON "CorporateOrderEmployeeItem"("chipId");

-- CreateIndex
CREATE INDEX "CorporateOrderEmployeeItem_fulfillmentStatus_idx" ON "CorporateOrderEmployeeItem"("fulfillmentStatus");

-- CreateIndex
CREATE INDEX "CorporateOrderEmployeeItem_deliveryStatus_idx" ON "CorporateOrderEmployeeItem"("deliveryStatus");

-- CreateIndex
CREATE INDEX "CorporateProductRequest_organizationId_idx" ON "CorporateProductRequest"("organizationId");

-- CreateIndex
CREATE INDEX "CorporateProductRequest_organizationMemberId_idx" ON "CorporateProductRequest"("organizationMemberId");

-- CreateIndex
CREATE INDEX "CorporateProductRequest_requestedByUserId_idx" ON "CorporateProductRequest"("requestedByUserId");

-- CreateIndex
CREATE INDEX "CorporateProductRequest_status_idx" ON "CorporateProductRequest"("status");

-- CreateIndex
CREATE INDEX "CorporateProductRequestItem_requestId_idx" ON "CorporateProductRequestItem"("requestId");

-- CreateIndex
CREATE INDEX "CorporateProductRequestItem_productId_idx" ON "CorporateProductRequestItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "DigitalPass_profileId_key" ON "DigitalPass"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "DigitalPass_serialNumber_key" ON "DigitalPass"("serialNumber");

-- CreateIndex
CREATE INDEX "DigitalPass_profileId_idx" ON "DigitalPass"("profileId");

-- CreateIndex
CREATE INDEX "AppNotification_userId_idx" ON "AppNotification"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "SystemConfig"("key");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileContact" ADD CONSTRAINT "ProfileContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileContact" ADD CONSTRAINT "ProfileContact_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chip" ADD CONSTRAINT "Chip_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chip" ADD CONSTRAINT "Chip_assignedProfileId_fkey" FOREIGN KEY ("assignedProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chip" ADD CONSTRAINT "Chip_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chip" ADD CONSTRAINT "Chip_pointOfSaleId_fkey" FOREIGN KEY ("pointOfSaleId") REFERENCES "PointOfSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporatePublicProfile" ADD CONSTRAINT "CorporatePublicProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationLocation" ADD CONSTRAINT "OrganizationLocation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrganizationDepartment" ADD CONSTRAINT "OrganizationDepartment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "OrganizationLocation"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_corporateProfileId_fkey" FOREIGN KEY ("corporateProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "OrganizationDepartment"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "OrganizationLocation"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChipClaimToken" ADD CONSTRAINT "ChipClaimToken_chipId_fkey" FOREIGN KEY ("chipId") REFERENCES "Chip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChipClaimToken" ADD CONSTRAINT "ChipClaimToken_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanEvent" ADD CONSTRAINT "ScanEvent_chipId_fkey" FOREIGN KEY ("chipId") REFERENCES "Chip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_chipId_fkey" FOREIGN KEY ("chipId") REFERENCES "Chip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_adminReviewedById_fkey" FOREIGN KEY ("adminReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_chipId_fkey" FOREIGN KEY ("chipId") REFERENCES "Chip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateOrderEmployeeItem" ADD CONSTRAINT "CorporateOrderEmployeeItem_chipId_fkey" FOREIGN KEY ("chipId") REFERENCES "Chip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateOrderEmployeeItem" ADD CONSTRAINT "CorporateOrderEmployeeItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateOrderEmployeeItem" ADD CONSTRAINT "CorporateOrderEmployeeItem_organizationMemberId_fkey" FOREIGN KEY ("organizationMemberId") REFERENCES "OrganizationMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateOrderEmployeeItem" ADD CONSTRAINT "CorporateOrderEmployeeItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateProductRequest" ADD CONSTRAINT "CorporateProductRequest_companyReviewedById_fkey" FOREIGN KEY ("companyReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateProductRequest" ADD CONSTRAINT "CorporateProductRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateProductRequest" ADD CONSTRAINT "CorporateProductRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateProductRequest" ADD CONSTRAINT "CorporateProductRequest_organizationMemberId_fkey" FOREIGN KEY ("organizationMemberId") REFERENCES "OrganizationMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateProductRequest" ADD CONSTRAINT "CorporateProductRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateProductRequestItem" ADD CONSTRAINT "CorporateProductRequestItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateProductRequestItem" ADD CONSTRAINT "CorporateProductRequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "CorporateProductRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalPass" ADD CONSTRAINT "DigitalPass_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppNotification" ADD CONSTRAINT "AppNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

