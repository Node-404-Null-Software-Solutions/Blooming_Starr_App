-- Owner-configurable app logic rules. These are stored per business so custom
-- workflows can be connected to modules without putting arbitrary code in env.
CREATE TABLE "AppLogicRule" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'FORMULA',
    "expression" TEXT NOT NULL,
    "notes" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppLogicRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AppLogicRule_businessId_module_idx" ON "AppLogicRule"("businessId", "module");
CREATE INDEX "AppLogicRule_businessId_enabled_idx" ON "AppLogicRule"("businessId", "enabled");

ALTER TABLE "AppLogicRule"
    ADD CONSTRAINT "AppLogicRule_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
