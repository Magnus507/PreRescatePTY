CREATE UNIQUE INDEX IF NOT EXISTS "Order_stripe_providerReference_key"
ON "Order"("provider", "providerReference")
WHERE "provider" = 'stripe' AND "providerReference" IS NOT NULL;

