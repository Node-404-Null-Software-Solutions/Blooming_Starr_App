-- CreateEnum
CREATE TYPE "PlantSkuReferenceScope" AS ENUM ('plant', 'category', 'variety');

-- CreateTable
CREATE TABLE "PlantSkuReference" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "scope" "PlantSkuReferenceScope" NOT NULL,
    "displayName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantSkuReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlantSkuReference_businessId_scope_normalizedName_key" ON "PlantSkuReference"("businessId", "scope", "normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "PlantSkuReference_businessId_scope_code_key" ON "PlantSkuReference"("businessId", "scope", "code");

-- CreateIndex
CREATE INDEX "PlantSkuReference_businessId_scope_active_idx" ON "PlantSkuReference"("businessId", "scope", "active");

-- AddCheck
ALTER TABLE "PlantSkuReference"
ADD CONSTRAINT "PlantSkuReference_code_uppercase_format_check"
CHECK ("code" = UPPER("code") AND "code" ~ '^[A-Z0-9]+(-[0-9]+)?$');

-- AddForeignKey
ALTER TABLE "PlantSkuReference" ADD CONSTRAINT "PlantSkuReference_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
