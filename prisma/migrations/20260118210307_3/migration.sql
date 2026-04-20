-- CreateTable
CREATE TABLE "PlantIntake" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "source" TEXT NOT NULL,
    "genus" TEXT NOT NULL,
    "cultivar" TEXT NOT NULL,
    "locationCode" TEXT,
    "sku" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "costCents" INTEGER NOT NULL DEFAULT 0,
    "msrpCents" INTEGER NOT NULL DEFAULT 0,
    "potType" TEXT,
    "paymentMethod" TEXT,
    "cardLast4" TEXT,
    "location" TEXT,
    "status" TEXT,
    "externalUid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantIntake_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlantIntake_businessId_date_idx" ON "PlantIntake"("businessId", "date");

-- CreateIndex
CREATE INDEX "PlantIntake_businessId_sku_idx" ON "PlantIntake"("businessId", "sku");

-- CreateIndex
CREATE INDEX "PlantIntake_businessId_externalUid_idx" ON "PlantIntake"("businessId", "externalUid");

-- AddForeignKey
ALTER TABLE "PlantIntake" ADD CONSTRAINT "PlantIntake_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
