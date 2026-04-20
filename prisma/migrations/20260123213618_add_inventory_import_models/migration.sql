-- CreateTable
CREATE TABLE "ProductIntake" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "vendor" TEXT,
    "source" TEXT,
    "category" TEXT,
    "size" TEXT,
    "style" TEXT,
    "purchaseNumber" TEXT,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "sku" TEXT NOT NULL,
    "totalCostCents" INTEGER NOT NULL DEFAULT 0,
    "unitCostCents" INTEGER NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "cardLast4" TEXT,
    "invoiceNumber" TEXT,
    "notes" TEXT,
    "externalUid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductIntake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransplantLog" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "originalSku" TEXT,
    "action" TEXT,
    "media" TEXT,
    "fromPot" TEXT,
    "toPot" TEXT,
    "idCode" TEXT,
    "divisionSku" TEXT,
    "dollarsPerCents" INTEGER NOT NULL DEFAULT 0,
    "potColor" TEXT,
    "notes" TEXT,
    "externalUid" TEXT,
    "createdAtSource" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransplantLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreatmentTracking" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "sku" TEXT NOT NULL,
    "target" TEXT,
    "product" TEXT,
    "activeIngredient" TEXT,
    "epaNumber" TEXT,
    "rate" TEXT,
    "potSize" TEXT,
    "method" TEXT,
    "initials" TEXT,
    "nextEarliest" TIMESTAMP(3),
    "nextLatest" TIMESTAMP(3),
    "externalUid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreatmentTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OverheadExpense" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "vendor" TEXT,
    "brand" TEXT,
    "category" TEXT,
    "description" TEXT,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "subTotalCents" INTEGER NOT NULL DEFAULT 0,
    "shippingCents" INTEGER NOT NULL DEFAULT 0,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "unitCostCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "cardLast4" TEXT,
    "invoiceNumber" TEXT,
    "notes" TEXT,
    "externalUid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OverheadExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingEntry" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "sku" TEXT NOT NULL,
    "productName" TEXT,
    "potSku" TEXT,
    "plantCostCents" INTEGER NOT NULL DEFAULT 0,
    "potOrProdCostCents" INTEGER NOT NULL DEFAULT 0,
    "overheadCents" INTEGER NOT NULL DEFAULT 0,
    "totalCostCents" INTEGER NOT NULL DEFAULT 0,
    "estimatedSellPriceCents" INTEGER NOT NULL DEFAULT 0,
    "actualSellPriceCents" INTEGER NOT NULL DEFAULT 0,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "profitCents" INTEGER NOT NULL DEFAULT 0,
    "marginPct" DOUBLE PRECISION,
    "avgQty" INTEGER,
    "status" TEXT,
    "notes" TEXT,
    "mirrorUid" TEXT,
    "msrpCents" INTEGER NOT NULL DEFAULT 0,
    "noteUid" TEXT,
    "externalUid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesEntry" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "sku" TEXT NOT NULL,
    "itemName" TEXT,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "salePriceCents" INTEGER NOT NULL DEFAULT 0,
    "totalSaleCents" INTEGER NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "cardLast4" TEXT,
    "channel" TEXT,
    "costCents" INTEGER NOT NULL DEFAULT 0,
    "profitCents" INTEGER NOT NULL DEFAULT 0,
    "marginPct" DOUBLE PRECISION,
    "notes" TEXT,
    "externalUid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FertilizerLog" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "plantSku" TEXT,
    "potSku" TEXT,
    "product" TEXT,
    "method" TEXT,
    "rate" TEXT,
    "unit" TEXT,
    "nextEarliest" TIMESTAMP(3),
    "nextLatest" TIMESTAMP(3),
    "notes" TEXT,
    "externalUid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FertilizerLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductIntake_businessId_date_idx" ON "ProductIntake"("businessId", "date");

-- CreateIndex
CREATE INDEX "ProductIntake_businessId_sku_idx" ON "ProductIntake"("businessId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "ProductIntake_businessId_externalUid_key" ON "ProductIntake"("businessId", "externalUid");

-- CreateIndex
CREATE INDEX "TransplantLog_businessId_date_idx" ON "TransplantLog"("businessId", "date");

-- CreateIndex
CREATE INDEX "TransplantLog_businessId_originalSku_idx" ON "TransplantLog"("businessId", "originalSku");

-- CreateIndex
CREATE UNIQUE INDEX "TransplantLog_businessId_externalUid_key" ON "TransplantLog"("businessId", "externalUid");

-- CreateIndex
CREATE INDEX "TreatmentTracking_businessId_date_idx" ON "TreatmentTracking"("businessId", "date");

-- CreateIndex
CREATE INDEX "TreatmentTracking_businessId_sku_idx" ON "TreatmentTracking"("businessId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "TreatmentTracking_businessId_externalUid_key" ON "TreatmentTracking"("businessId", "externalUid");

-- CreateIndex
CREATE INDEX "OverheadExpense_businessId_date_idx" ON "OverheadExpense"("businessId", "date");

-- CreateIndex
CREATE INDEX "OverheadExpense_businessId_invoiceNumber_idx" ON "OverheadExpense"("businessId", "invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "OverheadExpense_businessId_externalUid_key" ON "OverheadExpense"("businessId", "externalUid");

-- CreateIndex
CREATE INDEX "PricingEntry_businessId_date_idx" ON "PricingEntry"("businessId", "date");

-- CreateIndex
CREATE INDEX "PricingEntry_businessId_sku_idx" ON "PricingEntry"("businessId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "PricingEntry_businessId_externalUid_key" ON "PricingEntry"("businessId", "externalUid");

-- CreateIndex
CREATE INDEX "SalesEntry_businessId_date_idx" ON "SalesEntry"("businessId", "date");

-- CreateIndex
CREATE INDEX "SalesEntry_businessId_sku_idx" ON "SalesEntry"("businessId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "SalesEntry_businessId_externalUid_key" ON "SalesEntry"("businessId", "externalUid");

-- CreateIndex
CREATE INDEX "FertilizerLog_businessId_date_idx" ON "FertilizerLog"("businessId", "date");

-- CreateIndex
CREATE INDEX "FertilizerLog_businessId_plantSku_idx" ON "FertilizerLog"("businessId", "plantSku");

-- CreateIndex
CREATE UNIQUE INDEX "FertilizerLog_businessId_externalUid_key" ON "FertilizerLog"("businessId", "externalUid");

-- AddForeignKey
ALTER TABLE "ProductIntake" ADD CONSTRAINT "ProductIntake_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransplantLog" ADD CONSTRAINT "TransplantLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentTracking" ADD CONSTRAINT "TreatmentTracking_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OverheadExpense" ADD CONSTRAINT "OverheadExpense_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingEntry" ADD CONSTRAINT "PricingEntry_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesEntry" ADD CONSTRAINT "SalesEntry_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FertilizerLog" ADD CONSTRAINT "FertilizerLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
