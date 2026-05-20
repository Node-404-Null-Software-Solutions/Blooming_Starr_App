CREATE TABLE "BusinessLogo" (
    "businessId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'image/png',
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessLogo_pkey" PRIMARY KEY ("businessId")
);

ALTER TABLE "BusinessLogo"
ADD CONSTRAINT "BusinessLogo_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "Business"
SET "logoUrl" = NULL
WHERE "logoUrl" LIKE '/uploads/logos/%';
