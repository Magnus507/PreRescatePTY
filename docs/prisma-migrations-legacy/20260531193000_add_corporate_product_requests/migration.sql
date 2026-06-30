-- FASE 2: Corporate Product Request models
-- Employee requests products from their company.
-- The company approves/rejects, then can group into a payment order later.

-- Create CorporateProductRequest table
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

-- Create CorporateProductRequestItem table
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

-- Add foreign keys for CorporateProductRequest
ALTER TABLE "CorporateProductRequest" ADD CONSTRAINT "CorporateProductRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CorporateProductRequest" ADD CONSTRAINT "CorporateProductRequest_organizationMemberId_fkey" FOREIGN KEY ("organizationMemberId") REFERENCES "OrganizationMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CorporateProductRequest" ADD CONSTRAINT "CorporateProductRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CorporateProductRequest" ADD CONSTRAINT "CorporateProductRequest_companyReviewedById_fkey" FOREIGN KEY ("companyReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CorporateProductRequest" ADD CONSTRAINT "CorporateProductRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add foreign keys for CorporateProductRequestItem
ALTER TABLE "CorporateProductRequestItem" ADD CONSTRAINT "CorporateProductRequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "CorporateProductRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CorporateProductRequestItem" ADD CONSTRAINT "CorporateProductRequestItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create indexes for CorporateProductRequest
CREATE INDEX IF NOT EXISTS "CorporateProductRequest_organizationId_idx" ON "CorporateProductRequest"("organizationId");
CREATE INDEX IF NOT EXISTS "CorporateProductRequest_organizationMemberId_idx" ON "CorporateProductRequest"("organizationMemberId");
CREATE INDEX IF NOT EXISTS "CorporateProductRequest_requestedByUserId_idx" ON "CorporateProductRequest"("requestedByUserId");
CREATE INDEX IF NOT EXISTS "CorporateProductRequest_status_idx" ON "CorporateProductRequest"("status");

-- Create indexes for CorporateProductRequestItem
CREATE INDEX IF NOT EXISTS "CorporateProductRequestItem_requestId_idx" ON "CorporateProductRequestItem"("requestId");
CREATE INDEX IF NOT EXISTS "CorporateProductRequestItem_productId_idx" ON "CorporateProductRequestItem"("productId");