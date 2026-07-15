-- P1-06B: estados fuertes por dominio
-- Migración manual para evitar drop/recreate destructivo en columnas de texto existentes.

CREATE TYPE "OrderPaymentStatus" AS ENUM ('pending', 'under_review', 'paid', 'rejected', 'cancelled');
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'processing', 'shipped', 'completed', 'cancelled');
CREATE TYPE "OrderAdminReviewStatus" AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE "CommerceOrderSyncOutboxStatus" AS ENUM ('pending', 'processing', 'processed', 'retrying', 'failed');
CREATE TYPE "OperationFinishedGoodUnitStatus" AS ENUM ('assembled', 'available', 'reserved', 'qa_pending', 'qa_failed', 'dispatched', 'delivered', 'activated', 'discarded', 'cancelled');
CREATE TYPE "OperationFinishedGoodUnitQaStatus" AS ENUM ('pending', 'passed', 'failed');
CREATE TYPE "OperationFinishedGoodUnitActivationStatus" AS ENUM ('not_activated', 'activated');

ALTER TABLE "Order"
  ALTER COLUMN "paymentStatus" DROP DEFAULT,
  ALTER COLUMN "paymentStatus" TYPE "OrderPaymentStatus" USING "paymentStatus"::text::"OrderPaymentStatus",
  ALTER COLUMN "paymentStatus" SET DEFAULT 'pending',
  ALTER COLUMN "orderStatus" DROP DEFAULT,
  ALTER COLUMN "orderStatus" TYPE "OrderStatus" USING "orderStatus"::text::"OrderStatus",
  ALTER COLUMN "orderStatus" SET DEFAULT 'pending',
  ALTER COLUMN "adminReviewStatus" DROP DEFAULT,
  ALTER COLUMN "adminReviewStatus" TYPE "OrderAdminReviewStatus" USING "adminReviewStatus"::text::"OrderAdminReviewStatus",
  ALTER COLUMN "adminReviewStatus" SET DEFAULT 'pending';

ALTER TABLE "CommerceOrderSyncOutbox"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "CommerceOrderSyncOutboxStatus" USING "status"::text::"CommerceOrderSyncOutboxStatus",
  ALTER COLUMN "status" SET DEFAULT 'pending';

ALTER TABLE "OperationFinishedGoodUnit"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "OperationFinishedGoodUnitStatus" USING "status"::text::"OperationFinishedGoodUnitStatus",
  ALTER COLUMN "status" SET DEFAULT 'qa_pending',
  ALTER COLUMN "qaStatus" TYPE "OperationFinishedGoodUnitQaStatus" USING "qaStatus"::text::"OperationFinishedGoodUnitQaStatus",
  ALTER COLUMN "activationStatus" DROP DEFAULT,
  ALTER COLUMN "activationStatus" TYPE "OperationFinishedGoodUnitActivationStatus" USING "activationStatus"::text::"OperationFinishedGoodUnitActivationStatus",
  ALTER COLUMN "activationStatus" SET DEFAULT 'not_activated';

CREATE INDEX IF NOT EXISTS "Order_orderStatus_idx" ON "Order"("orderStatus");
CREATE INDEX IF NOT EXISTS "Order_paymentStatus_idx" ON "Order"("paymentStatus");
CREATE INDEX IF NOT EXISTS "CommerceOrderSyncOutbox_status_availableAt_idx" ON "CommerceOrderSyncOutbox"("status", "availableAt");
CREATE INDEX IF NOT EXISTS "OperationFinishedGoodUnit_status_idx" ON "OperationFinishedGoodUnit"("status");
CREATE INDEX IF NOT EXISTS "OperationFinishedGoodUnit_activationStatus_idx" ON "OperationFinishedGoodUnit"("activationStatus");
