CREATE TYPE "InvoiceStatus" AS ENUM (
  'pending_configuration',
  'pending_issue',
  'issued',
  'cancelled'
);

CREATE TABLE "Invoice" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "sourcePaymentAttemptId" TEXT,
  "internalNumber" TEXT NOT NULL,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'pending_configuration',
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "subtotal" DECIMAL(18,2) NOT NULL,
  "discountTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "taxRate" DECIMAL(8,6) NOT NULL DEFAULT 0,
  "taxTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(18,2) NOT NULL,
  "priceIncludesTax" BOOLEAN NOT NULL DEFAULT true,
  "buyerName" TEXT,
  "buyerEmail" TEXT,
  "buyerDocument" TEXT,
  "buyerPhone" TEXT,
  "buyerAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Invoice_sourcePaymentAttemptId_fkey" FOREIGN KEY ("sourcePaymentAttemptId") REFERENCES "PaymentAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Invoice_totals_check" CHECK (
    "subtotal" >= 0 AND
    "discountTotal" >= 0 AND
    "taxRate" >= 0 AND
    "taxTotal" >= 0 AND
    "total" >= 0 AND
    "total" = ROUND("subtotal" - "discountTotal" + "taxTotal", 2)
  )
);

CREATE TABLE "InvoiceLine" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "productCode" TEXT,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DECIMAL(18,2) NOT NULL,
  "subtotal" DECIMAL(18,2) NOT NULL,
  "discount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "taxRate" DECIMAL(8,6) NOT NULL DEFAULT 0,
  "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(18,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InvoiceLine_totals_check" CHECK (
    "quantity" > 0 AND
    "unitPrice" >= 0 AND
    "subtotal" >= 0 AND
    "discount" >= 0 AND
    "taxRate" >= 0 AND
    "taxAmount" >= 0 AND
    "total" >= 0 AND
    "total" = ROUND("subtotal" - "discount" + "taxAmount", 2)
  )
);

CREATE UNIQUE INDEX "Invoice_orderId_key" ON "Invoice"("orderId");
CREATE UNIQUE INDEX "Invoice_sourcePaymentAttemptId_key" ON "Invoice"("sourcePaymentAttemptId");
CREATE UNIQUE INDEX "Invoice_internalNumber_key" ON "Invoice"("internalNumber");
CREATE INDEX "Invoice_status_createdAt_idx" ON "Invoice"("status", "createdAt");
CREATE INDEX "InvoiceLine_invoiceId_idx" ON "InvoiceLine"("invoiceId");

ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InvoiceLine" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "Invoice" FROM anon, authenticated;
REVOKE ALL ON TABLE "InvoiceLine" FROM anon, authenticated;
