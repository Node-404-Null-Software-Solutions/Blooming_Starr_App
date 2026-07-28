ALTER TABLE "PlantIntake"
ADD COLUMN "photoContentType" TEXT,
ADD COLUMN "photoData" BYTEA,
ADD COLUMN "photoOriginalName" TEXT,
ADD COLUMN "photoUpdatedAt" TIMESTAMP(3);

ALTER TABLE "ProductIntake"
ADD COLUMN "photoContentType" TEXT,
ADD COLUMN "photoData" BYTEA,
ADD COLUMN "photoOriginalName" TEXT,
ADD COLUMN "photoUpdatedAt" TIMESTAMP(3);
