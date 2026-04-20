-- Blooming Starr: full schema matching prisma/schema.prisma (current version).
-- Use this in Supabase SQL Editor only for a fresh/empty database or after dropping existing tables.
-- Prefer using migrations instead: set DATABASE_URL to Supabase and run: npm run db:migrate
--
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'MANAGER', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "JoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- CreateEnum
CREATE TYPE "RequestedRole" AS ENUM ('MANAGER', 'EMPLOYEE');

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activeBusinessId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "productName" TEXT,
    "defaultCostCents" INTEGER NOT NULL DEFAULT 0,
    "defaultSalePriceCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JoinRequest" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "requestedRole" "RequestedRole" NOT NULL,
    "status" "JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingCoOwnerInvite" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "newOwnerEmail" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingCoOwnerInvite_pkey" PRIMARY KEY ("id")
);

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
    "costCents" INTEGER NOT NULL DEFAULT 0,
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
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Business_slug_key" ON "Business"("slug");

-- CreateIndex
CREATE INDEX "Product_businessId_sku_idx" ON "Product"("businessId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "Product_businessId_sku_key" ON "Product"("businessId", "sku");

-- CreateIndex
CREATE INDEX "PlantIntake_businessId_date_idx" ON "PlantIntake"("businessId", "date");

-- CreateIndex
CREATE INDEX "PlantIntake_businessId_sku_idx" ON "PlantIntake"("businessId", "sku");

-- CreateIndex
CREATE INDEX "PlantIntake_businessId_externalUid_idx" ON "PlantIntake"("businessId", "externalUid");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_businessId_userId_key" ON "Membership"("businessId", "userId");

-- CreateIndex
CREATE INDEX "JoinRequest_businessId_status_idx" ON "JoinRequest"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "JoinRequest_businessId_requesterId_key" ON "JoinRequest"("businessId", "requesterId");

-- CreateIndex
CREATE UNIQUE INDEX "PendingCoOwnerInvite_token_key" ON "PendingCoOwnerInvite"("token");

-- CreateIndex
CREATE INDEX "PendingCoOwnerInvite_businessId_idx" ON "PendingCoOwnerInvite"("businessId");

-- CreateIndex
CREATE INDEX "PendingCoOwnerInvite_token_idx" ON "PendingCoOwnerInvite"("token");

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
ALTER TABLE "Product" ADD CONSTRAINT "Product_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantIntake" ADD CONSTRAINT "PlantIntake_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JoinRequest" ADD CONSTRAINT "JoinRequest_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingCoOwnerInvite" ADD CONSTRAINT "PendingCoOwnerInvite_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
