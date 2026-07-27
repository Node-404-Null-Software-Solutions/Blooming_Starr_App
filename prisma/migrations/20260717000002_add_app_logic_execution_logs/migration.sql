CREATE TABLE "AppLogicExecutionLog" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceRowId" TEXT,
    "requestId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "statementCount" INTEGER NOT NULL DEFAULT 0,
    "actionCount" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppLogicExecutionLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AppLogicExecutionLog_businessId_createdAt_idx"
    ON "AppLogicExecutionLog"("businessId", "createdAt");
CREATE INDEX "AppLogicExecutionLog_businessId_status_createdAt_idx"
    ON "AppLogicExecutionLog"("businessId", "status", "createdAt");
CREATE INDEX "AppLogicExecutionLog_businessId_ruleId_createdAt_idx"
    ON "AppLogicExecutionLog"("businessId", "ruleId", "createdAt");

ALTER TABLE "AppLogicExecutionLog"
    ADD CONSTRAINT "AppLogicExecutionLog_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
    "AppLogicExecutionLog"
TO blooming_starr_tenant;

ALTER TABLE "AppLogicExecutionLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AppLogicExecutionLog" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_business_isolation ON "AppLogicExecutionLog"
    FOR ALL TO blooming_starr_tenant
    USING ("businessId" = NULLIF(current_setting('app.business_id', true), ''))
    WITH CHECK ("businessId" = NULLIF(current_setting('app.business_id', true), ''));
