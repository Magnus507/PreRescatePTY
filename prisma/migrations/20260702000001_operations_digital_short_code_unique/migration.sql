-- Create unique constraint for digital shortCode to guarantee one public identity per unit.
CREATE UNIQUE INDEX "OperationDigitalBatchItem_shortCode_key" ON "OperationDigitalBatchItem"("shortCode");
